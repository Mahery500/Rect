/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "@/cerveau/session";
import { resoudreModeBrique } from "@/cerveau/permissions";
import { PanneauAuthentification } from "@/briques/authentification";
import {
  AssemblageAccueil,
  AssemblageInfirmerie,
  AssemblageConsultation,
  AssemblageStock,
  AssemblageAdministration,
} from "@/assemblages";
import { EnTete } from "./EnTete";
import { BarreLaterale, VueCoquille } from "./BarreLaterale";
import { PiedDePage } from "./PiedDePage";

export const CoquilleApplicative: React.FC = () => {
  const { estConnecte, utilisateur, siteActifId, serviceActifId, definirUtilisateur } =
    useSession();

  const [reduite, setReduite] = useState(false);
  const [mobileOuvert, setMobileOuvert] = useState(false);
  const [sousOngletParVue, setSousOngletParVue] = useState<Record<VueCoquille, string | null>>({
    accueil: null,
    infirmerie: null,
    consultation: null,
    stock: null,
    administration: null,
  });

  // Détermination de la vue par défaut en fonction des rôles
  const vueParDefaut = useMemo<VueCoquille>(() => {
    const roles = utilisateur?.roles ?? [];
    if (roles.includes("ROLE_ADMIN") || roles.includes("ROLE_SUPER_ADMIN")) {
      return "administration";
    }
    if (roles.includes("ROLE_MEDECIN")) {
      return "consultation";
    }
    if (roles.includes("ROLE_INFIRMIER")) {
      return "infirmerie";
    }
    if (roles.includes("ROLE_RECEPTION") || roles.includes("ROLE_SECRETAIRE")) {
      return "accueil";
    }
    if (
      roles.includes("ROLE_GESTIONNAIRE_STOCK") ||
      roles.includes("ROLE_RESPONSABLE_STOCK") ||
      roles.includes("ROLE_DISPENSATEUR")
    ) {
      return "stock";
    }
    return "accueil";
  }, [utilisateur?.roles]);

  const [vueActive, setVueActive] = useState<VueCoquille>(vueParDefaut);

  // Synchroniser avec les rôles quand l'utilisateur change
  useEffect(() => {
    setVueActive(vueParDefaut);
  }, [vueParDefaut]);

  const sousOngletActif = sousOngletParVue[vueActive];

  const handleChangerSousOnglet = (id: string) => {
    setSousOngletParVue((prev) => ({ ...prev, [vueActive]: id }));
  };

  const handleChangerVue = (vue: VueCoquille, sousId?: string) => {
    setVueActive(vue);
    if (sousId) {
      setSousOngletParVue((prev) => ({ ...prev, [vue]: sousId }));
    }
  };

  // Résolution des permissions pour chaque sous-brique
  const roles = utilisateur?.roles ?? [];

  const modesAccueil = useMemo(
    () => ({
      verification: resoudreModeBrique(roles, "verification_adherent"),
      tickets: resoudreModeBrique(roles, "ticket_file"),
      rendezvous: resoudreModeBrique(roles, "rendez_vous"),
      patients: resoudreModeBrique(roles, "patient"),
    }),
    [roles],
  );

  const modesInfirmerie = useMemo(
    () => ({
      file: resoudreModeBrique(roles, "infirmerie_file"),
      constantes: resoudreModeBrique(roles, "constante_vitale"),
      soins: resoudreModeBrique(roles, "soin_acte"),
      historique: resoudreModeBrique(roles, "infirmerie_historique"),
    }),
    [roles],
  );

  const modesConsultation = useMemo(
    () => ({
      file: resoudreModeBrique(roles, "consultation_file"),
      active: resoudreModeBrique(roles, "consultation_active"),
      dossiers: resoudreModeBrique(roles, "dossier_medical"),
    }),
    [roles],
  );

  const modesStock = useMemo(
    () => ({
      niveaux: resoudreModeBrique(roles, "stock_niveau"),
      dispensation: resoudreModeBrique(roles, "stock_dispensation"),
      mouvements: resoudreModeBrique(roles, "stock_mouvement"),
      ajustements: resoudreModeBrique(roles, "stock_ajustement"),
      catalogue: resoudreModeBrique(roles, "stock_catalogue"),
    }),
    [roles],
  );

  const modesAdmin = useMemo(
    () => ({
      utilisateurs: resoudreModeBrique(roles, "utilisateur"),
      affectations: resoudreModeBrique(roles, "affectation"),
      sites: resoudreModeBrique(roles, "site"),
      services: resoudreModeBrique(roles, "service"),
      entreprises: resoudreModeBrique(roles, "entreprise"),
      catalogue: resoudreModeBrique(roles, "catalogue_actes"),
      observations: resoudreModeBrique(roles, "observation_definition"),
      diagnostics: resoudreModeBrique(roles, "diagnostic_definition"),
      typeEncounters: resoudreModeBrique(roles, "type_encounter"),
    }),
    [roles],
  );

  // Si non connecté, afficher le panneau d'authentification
  if (!estConnecte || !utilisateur) {
    return <PanneauAuthentification onConnexionReussie={(u) => definirUtilisateur(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500/20">
      <EnTete
        vueActive={vueActive}
        onBasculerMenuMobile={() => setMobileOuvert((prev) => !prev)}
        menuMobileOuvert={mobileOuvert}
      />

      <div className="flex-1 flex overflow-hidden">
        <BarreLaterale
          vueActive={vueActive}
          sousOngletActif={sousOngletActif}
          onChangerVue={handleChangerVue}
          reduite={reduite}
          onBasculerReduite={() => setReduite((prev) => !prev)}
          mobileOuvert={mobileOuvert}
          onFermerMobile={() => setMobileOuvert(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {vueActive === "accueil" && (
              <AssemblageAccueil
                siteActifId={siteActifId}
                serviceActifId={serviceActifId}
                modes={modesAccueil}
                sousOngletActif={sousOngletActif}
                onSousOngletChange={handleChangerSousOnglet}
              />
            )}

            {vueActive === "infirmerie" && (
              <AssemblageInfirmerie
                siteActifId={siteActifId}
                serviceActifId={serviceActifId}
                modes={modesInfirmerie}
                sousOngletActif={sousOngletActif}
                onSousOngletChange={handleChangerSousOnglet}
              />
            )}

            {vueActive === "consultation" && (
              <AssemblageConsultation
                siteActifId={siteActifId}
                serviceActifId={serviceActifId}
                modes={modesConsultation}
                sousOngletActif={sousOngletActif}
                onSousOngletChange={handleChangerSousOnglet}
              />
            )}

            {vueActive === "stock" && (
              <AssemblageStock
                siteActifId={siteActifId}
                serviceActifId={serviceActifId}
                modes={modesStock}
                sousOngletActif={sousOngletActif}
                onSousOngletChange={handleChangerSousOnglet}
              />
            )}

            {vueActive === "administration" && (
              <AssemblageAdministration
                siteActifId={siteActifId}
                serviceActifId={serviceActifId}
                modes={modesAdmin}
                sousOngletActif={sousOngletActif}
                onSousOngletChange={handleChangerSousOnglet}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CoquilleApplicative;
