/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNotifier } from "@/noyau/notifications";
import { messageErreur } from "@/noyau/utils/erreur";
import {
  EntreprisePartenaire,
  NouvelleEntrepriseInput,
  ModificationEntrepriseInput,
} from "../modele/entreprise.types";
import { entreprisesApi } from "../api/entreprises.api";

export function useEntreprises() {
  const notif = useNotifier();
  const [entreprises, setEntreprises] = useState<EntreprisePartenaire[]>([]);
  const [chargement, setChargement] = useState<boolean>(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState<string>("");

  const chargerEntreprises = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const liste = await entreprisesApi.lister();
      setEntreprises(liste);
    } catch (err) {
      const msg = messageErreur(err, "Impossible de charger la liste des entreprises partenaires.");
      setErreur(msg);
      notif.erreur(msg);
    } finally {
      setChargement(false);
    }
  }, [notif]);

  useEffect(() => {
    chargerEntreprises();
  }, [chargerEntreprises]);

  const creerEntreprise = useCallback(
    async (saisie: NouvelleEntrepriseInput): Promise<boolean> => {
      try {
        const nouvelle = await entreprisesApi.creer(saisie);
        setEntreprises((prev) => [...prev, nouvelle]);
        notif.succes(`Entreprise « ${nouvelle.nom} » enregistrée avec succès.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de l'enregistrement de l'entreprise."));
        return false;
      }
    },
    [notif],
  );

  const modifierEntreprise = useCallback(
    async (id: number, saisie: ModificationEntrepriseInput): Promise<boolean> => {
      try {
        const modifiee = await entreprisesApi.modifier(id, saisie);
        setEntreprises((prev) => prev.map((e) => (e.id === id ? modifiee : e)));
        notif.succes(`Entreprise « ${modifiee.nom} » mise à jour.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la modification de l'entreprise."));
        return false;
      }
    },
    [notif],
  );

  const supprimerEntreprise = useCallback(
    async (id: number, nom: string): Promise<boolean> => {
      try {
        await entreprisesApi.supprimer(id);
        setEntreprises((prev) => prev.filter((e) => e.id !== id));
        notif.succes(`Entreprise « ${nom} » supprimée.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la suppression de l'entreprise."));
        return false;
      }
    },
    [notif],
  );

  const entreprisesFiltrees = useMemo(() => {
    if (!recherche.trim()) return entreprises;
    const q = recherche.toLowerCase().trim();
    return entreprises.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        (e.raisonSociale && e.raisonSociale.toLowerCase().includes(q)) ||
        e.adresse.toLowerCase().includes(q) ||
        e.contact.toLowerCase().includes(q) ||
        (e.numeroCnaps && e.numeroCnaps.toLowerCase().includes(q)) ||
        (e.matriculeAsina && e.matriculeAsina.toLowerCase().includes(q)),
    );
  }, [entreprises, recherche]);

  return {
    entreprises: entreprisesFiltrees,
    totalEntreprises: entreprises.length,
    chargement,
    erreur,
    recherche,
    setRecherche,
    recharger: chargerEntreprises,
    creerEntreprise,
    modifierEntreprise,
    supprimerEntreprise,
  };
}

export default useEntreprises;
