/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNotifier } from "@/noyau/notifications";
import { messageErreur } from "@/noyau/utils/erreur";
import { ErreurApi } from "@/noyau/http/erreurApi";
import { useSession } from "@/cerveau/session";
import {
  AdherentComplet,
  RendezVousDuJour,
  ServiceOrientationOption,
} from "../modele/verification-adherent.types";
import { verificationAdherentApi } from "../api/verification-adherent.api";

export function useVerificationAdherent(siteIdInitial?: number) {
  const { siteActifId } = useSession();
  const notifier = useNotifier();

  // Site actif depuis la session noyau ou argument
  const siteIdActif = siteIdInitial ?? siteActifId ?? undefined;

  // États de recherche
  const [termeRecherche, setTermeRecherche] = useState("");
  const [resultatsRecherche, setResultatsRecherche] = useState<AdherentComplet[]>([]);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);

  // État de l'adhérent sélectionné
  const [adherentActif, setAdherentActif] = useState<AdherentComplet | null>(null);
  const [rendezVous, setRendezVous] = useState<RendezVousDuJour[]>([]);
  const [chargementRdv, setChargementRdv] = useState(false);

  // États du formulaire d'orientation
  const [servicesOrientation, setServicesOrientation] = useState<ServiceOrientationOption[]>([]);
  const [serviceSelectionneId, setServiceSelectionneId] = useState<number | null>(null);
  const [identiteVerifiee, setIdentiteVerifiee] = useState(false);

  // État d'émission et dernier ticket
  const [actionEnCours, setActionEnCours] = useState(false);
  const [dernierTicketEmis, setDernierTicketEmis] = useState<{
    numTicket: string;
    dateEmission: string;
    estRdv: boolean;
  } | null>(null);

  // Charger la liste des services d'orientation pour le site actif
  useEffect(() => {
    let monte = true;
    const chargerServices = async () => {
      try {
        const liste = await verificationAdherentApi.listerServicesOrientation(siteIdActif);
        if (monte) {
          setServicesOrientation(liste);
          setServiceSelectionneId((prev) => {
            if (prev && liste.some((s) => s.id === prev)) {
              return prev;
            }
            return liste.length > 0 ? liste[0].id : null;
          });
        }
      } catch (err) {
        console.warn("Impossible de charger les services pour le site", err);
      }
    };
    chargerServices();
    return () => {
      monte = false;
    };
  }, [siteIdActif]);

  // Recherche avec debounce
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!termeRecherche.trim() || termeRecherche.trim().length < 2) {
      setResultatsRecherche([]);
      setRechercheEnCours(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setRechercheEnCours(true);
    const timer = setTimeout(async () => {
      try {
        const res = await verificationAdherentApi.rechercher(termeRecherche, ac.signal);
        setResultatsRecherche(res);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        notifier.erreur(messageErreur(err, "Erreur lors de la recherche des patients."));
      } finally {
        setRechercheEnCours(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [termeRecherche, notifier]);

  // Sélection d'un adhérent et chargement de ses RDV
  const selectionnerAdherent = useCallback(
    async (adherent: AdherentComplet) => {
      setAdherentActif(adherent);
      setTermeRecherche("");
      setResultatsRecherche([]);
      setIdentiteVerifiee(false);
      setDernierTicketEmis(null);

      setChargementRdv(true);
      try {
        const rdvList = await verificationAdherentApi.listerRendezVous(adherent.patient.id);
        setRendezVous(rdvList);
      } catch (err) {
        notifier.erreur(
          messageErreur(err, "Impossible de charger les rendez-vous de cet adhérent."),
        );
        setRendezVous([]);
      } finally {
        setChargementRdv(false);
      }
    },
    [notifier],
  );

  const reinitialiserSelection = useCallback(() => {
    setAdherentActif(null);
    setRendezVous([]);
    setIdentiteVerifiee(false);
    setDernierTicketEmis(null);
  }, []);

  const rechargerRendezVous = useCallback(async () => {
    if (!adherentActif) return;
    setChargementRdv(true);
    try {
      const rdvList = await verificationAdherentApi.listerRendezVous(adherentActif.patient.id);
      setRendezVous(rdvList);
    } catch (err) {
      notifier.erreur(messageErreur(err, "Impossible d’actualiser les rendez-vous."));
    } finally {
      setChargementRdv(false);
    }
  }, [adherentActif, notifier]);

  // Confirmer l'arrivée d'un RDV planifié (POST /api/rendez-vous/{id}/confirmer-arrivee)
  const confirmerArriveeRdv = useCallback(
    async (rdvId: number): Promise<boolean> => {
      if (!adherentActif) return false;

      const serviceCible = servicesOrientation.find(
        (s) =>
          s.id ===
          (serviceSelectionneId ||
            (servicesOrientation.length > 0 ? servicesOrientation[0].id : null)),
      );
      const idService = serviceCible?.id ?? serviceSelectionneId;

      if (!idService) {
        notifier.avertissement("Veuillez sélectionner un service médical d'orientation.");
        return false;
      }

      // Valider la présence/identité si ce n'était pas encore coché
      if (!identiteVerifiee) {
        setIdentiteVerifiee(true);
      }

      setActionEnCours(true);
      try {
        const siteIdEffectif = serviceCible?.siteId ?? siteIdActif ?? 1;

        const resultat = await verificationAdherentApi.confirmerArrivee(
          rdvId,
          siteIdEffectif,
          idService,
        );

        setDernierTicketEmis({
          numTicket: resultat.numTicket,
          dateEmission: resultat.dateEmission,
          estRdv: true,
        });

        notifier.succes(
          `Arrivée confirmée avec succès ! Ticket numéro ${resultat.numTicket} émis.`,
        );

        await rechargerRendezVous();
        return true;
      } catch (err) {
        if (err instanceof ErreurApi && err.statut === 403) {
          notifier.erreur(
            "Accès refusé (403) : Votre compte ne dispose pas des droits requis (rôle ROLE_RECEPTION, ROLE_SECRETAIRE ou ROLE_ADMIN requis) ou n'est pas affecté à ce site pour émettre des tickets.",
          );
        } else {
          notifier.erreur(
            messageErreur(err, "Échec lors de la confirmation d'arrivée du rendez-vous."),
          );
        }
        return false;
      } finally {
        setActionEnCours(false);
      }
    },
    [
      adherentActif,
      identiteVerifiee,
      serviceSelectionneId,
      siteIdActif,
      servicesOrientation,
      notifier,
      rechargerRendezVous,
    ],
  );

  // Émettre un ticket de visite spontanée sans RDV (POST /api/tickets)
  const emettreTicketSpontane = useCallback(async (): Promise<boolean> => {
    if (!adherentActif) return false;

    const serviceCible = servicesOrientation.find(
      (s) =>
        s.id ===
        (serviceSelectionneId ||
          (servicesOrientation.length > 0 ? servicesOrientation[0].id : null)),
    );
    const idService = serviceCible?.id ?? serviceSelectionneId;

    if (!idService) {
      notifier.avertissement("Veuillez sélectionner un service médical d'orientation.");
      return false;
    }

    // Valider la présence/identité si ce n'était pas encore coché
    if (!identiteVerifiee) {
      setIdentiteVerifiee(true);
    }

    setActionEnCours(true);
    try {
      const siteIdEffectif = serviceCible?.siteId ?? siteIdActif ?? 1;

      const res = await verificationAdherentApi.emettreTicketSpontane(
        adherentActif.patient.id,
        siteIdEffectif,
        idService,
      );

      setDernierTicketEmis({
        numTicket: res.numTicket,
        dateEmission: res.dateEmission,
        estRdv: false,
      });

      notifier.succes(`Ticket visite spontanée n° ${res.numTicket} émis.`);
      return true;
    } catch (err) {
      if (err instanceof ErreurApi && err.statut === 403) {
        notifier.erreur(
          "Accès refusé (403) : Votre compte ne dispose pas des droits requis (rôle ROLE_RECEPTION, ROLE_SECRETAIRE ou ROLE_ADMIN requis) ou n'est pas affecté à ce site pour émettre des tickets.",
        );
      } else {
        notifier.erreur(messageErreur(err, "Échec lors de l'émission du ticket."));
      }
      return false;
    } finally {
      setActionEnCours(false);
    }
  }, [
    adherentActif,
    identiteVerifiee,
    serviceSelectionneId,
    siteIdActif,
    servicesOrientation,
    notifier,
  ]);

  return {
    termeRecherche,
    setTermeRecherche,
    resultatsRecherche,
    rechercheEnCours,
    adherentActif,
    selectionnerAdherent,
    reinitialiserSelection,
    rendezVous,
    chargementRdv,
    rechargerRendezVous,
    servicesOrientation,
    serviceSelectionneId,
    setServiceSelectionneId,
    identiteVerifiee,
    setIdentiteVerifiee,
    dernierTicketEmis,
    actionEnCours,
    confirmerArriveeRdv,
    emettreTicketSpontane,
  };
}
