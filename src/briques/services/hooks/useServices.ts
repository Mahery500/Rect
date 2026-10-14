/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNotifier } from "@/noyau/notifications";
import { messageErreur } from "@/noyau/utils/erreur";
import {
  ServiceMedical,
  TypeServiceMedical,
  NouveauServiceInput,
  ModificationServiceInput,
  NouveauTypeServiceInput,
  ModificationTypeServiceInput,
} from "../modele/service.types";
import { servicesApi } from "../api/services.api";

export function useServices() {
  const notif = useNotifier();

  const [services, setServices] = useState<ServiceMedical[]>([]);
  const [types, setTypes] = useState<TypeServiceMedical[]>([]);
  const [sitesDisponibles, setSitesDisponibles] = useState<
    { id: number; nom: string; code: string }[]
  >([]);

  const [chargement, setChargement] = useState<boolean>(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [sousOnglet, setSousOnglet] = useState<"cartographie" | "types">("cartographie");
  const [recherche, setRecherche] = useState<string>("");
  const [siteFiltreId, setSiteFiltreId] = useState<number | "tous">("tous");

  const rechargerTout = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [resServices, resTypes, resSites] = await Promise.allSettled([
        servicesApi.listerServices(),
        servicesApi.listerTypes(),
        servicesApi.listerSitesPourSelection(),
      ]);

      if (resServices.status === "fulfilled") {
        setServices(resServices.value);
      }
      if (resTypes.status === "fulfilled") {
        setTypes(resTypes.value);
      }
      if (resSites.status === "fulfilled") {
        setSitesDisponibles(resSites.value);
      }
    } catch (err) {
      const msg = messageErreur(err, "Erreur lors du chargement des services médicaux.");
      setErreur(msg);
      notif.erreur(msg);
    } finally {
      setChargement(false);
    }
  }, [notif]);

  useEffect(() => {
    rechargerTout();
  }, [rechargerTout]);

  // Actions sur les services
  const creerService = useCallback(
    async (saisie: NouveauServiceInput): Promise<boolean> => {
      try {
        const nouveau = await servicesApi.creerService(saisie);
        setServices((prev) => [...prev, nouveau]);
        notif.succes("Service rattaché avec succès au site médical.");
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec du déploiement du service."));
        return false;
      }
    },
    [notif],
  );

  const modifierService = useCallback(
    async (id: number, saisie: ModificationServiceInput): Promise<boolean> => {
      try {
        const modifie = await servicesApi.modifierService(id, saisie);
        setServices((prev) => prev.map((s) => (s.id === id ? modifie : s)));
        notif.succes("Service mis à jour avec succès.");
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la modification du service."));
        return false;
      }
    },
    [notif],
  );

  const supprimerService = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await servicesApi.supprimerService(id);
        setServices((prev) => prev.filter((s) => s.id !== id));
        notif.succes("Service détaché du site médical.");
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la suppression du service."));
        return false;
      }
    },
    [notif],
  );

  // Actions sur les types de services
  const creerType = useCallback(
    async (saisie: NouveauTypeServiceInput): Promise<boolean> => {
      try {
        const nouveau = await servicesApi.creerType(saisie);
        setTypes((prev) => [...prev, nouveau]);
        notif.succes(`Type « ${nouveau.nom} » créé.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la création du type de service."));
        return false;
      }
    },
    [notif],
  );

  const modifierType = useCallback(
    async (id: number, saisie: ModificationTypeServiceInput): Promise<boolean> => {
      try {
        const modifie = await servicesApi.modifierType(id, saisie);
        setTypes((prev) => prev.map((t) => (t.id === id ? modifie : t)));
        notif.succes(`Type « ${modifie.nom} » mis à jour.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la modification du type."));
        return false;
      }
    },
    [notif],
  );

  const supprimerType = useCallback(
    async (id: number, nom: string): Promise<boolean> => {
      try {
        await servicesApi.supprimerType(id);
        setTypes((prev) => prev.filter((t) => t.id !== id));
        notif.succes(`Type « ${nom} » supprimé.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la suppression du type."));
        return false;
      }
    },
    [notif],
  );

  // Filtrages locaux
  const servicesFiltres = useMemo(() => {
    let resultat = services;
    if (siteFiltreId !== "tous") {
      resultat = resultat.filter((s) => s.siteId === siteFiltreId);
    }
    if (recherche.trim()) {
      const q = recherche.toLowerCase().trim();
      resultat = resultat.filter(
        (s) =>
          s.nomTypeService.toLowerCase().includes(q) ||
          s.nomSite.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    return resultat;
  }, [services, siteFiltreId, recherche]);

  const typesFiltres = useMemo(() => {
    if (!recherche.trim()) return types;
    const q = recherche.toLowerCase().trim();
    return types.filter(
      (t) =>
        t.nom.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [types, recherche]);

  return {
    services: servicesFiltres,
    totalServices: services.length,
    types: typesFiltres,
    totalTypes: types.length,
    sitesDisponibles,
    chargement,
    erreur,
    sousOnglet,
    setSousOnglet,
    recherche,
    setRecherche,
    siteFiltreId,
    setSiteFiltreId,
    recharger: rechargerTout,
    creerService,
    modifierService,
    supprimerService,
    creerType,
    modifierType,
    supprimerType,
  };
}

export default useServices;
