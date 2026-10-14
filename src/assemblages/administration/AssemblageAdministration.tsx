/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Users,
  UserCheck,
  Building2,
  FolderTree,
  Briefcase,
  BookOpenCheck,
  Activity,
  FileText,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions";
import { SousOnglets, OngletElement } from "@/noyau/ui/SousOnglets";
import { PanneauUtilisateurs } from "@/briques/utilisateurs";
import { PanneauAffectations } from "@/briques/affectations";
import { PanneauSites } from "@/briques/sites";
import { PanneauServices } from "@/briques/services";
import { PanneauEntreprises } from "@/briques/entreprises";
import { PanneauCatalogueActes } from "@/briques/catalogue-actes";
import { PanneauObservationDefinitions } from "@/briques/observation-definitions";
import { PanneauDiagnosticDefinitions } from "@/briques/diagnostic-definitions";
import { PanneauTypeEncounters } from "@/briques/type-encounters";

export interface AssemblageAdministrationProps {
  siteActifId?: number | null;
  serviceActifId?: number | null;
  ongletParDefaut?: string;
  modes?: {
    utilisateurs?: ModeAffichage;
    affectations?: ModeAffichage;
    sites?: ModeAffichage;
    services?: ModeAffichage;
    entreprises?: ModeAffichage;
    catalogue?: ModeAffichage;
    observations?: ModeAffichage;
    diagnostics?: ModeAffichage;
    typeEncounters?: ModeAffichage;
  };
  sousOngletActif?: string | null;
  onSousOngletChange?: (id: string) => void;
}

export const AssemblageAdministration: React.FC<AssemblageAdministrationProps> = ({
  ongletParDefaut = "utilisateurs",
  modes = {},
  sousOngletActif,
  onSousOngletChange,
}) => {
  const [ongletInterne, setOngletInterne] = useState(ongletParDefaut);
  const ongletActif = sousOngletActif ?? ongletInterne;

  const changerOnglet = (id: string) => {
    setOngletInterne(id);
    onSousOngletChange?.(id);
  };

  const modeUtilisateurs = modes.utilisateurs ?? "edition";
  const modeAffectations = modes.affectations ?? "edition";
  const modeSites = modes.sites ?? "edition";
  const modeServices = modes.services ?? "edition";
  const modeEntreprises = modes.entreprises ?? "edition";
  const modeCatalogue = modes.catalogue ?? "edition";
  const modeObservations = modes.observations ?? "edition";
  const modeDiagnostics = modes.diagnostics ?? "edition";
  const modeTypeEncounters = modes.typeEncounters ?? "edition";

  const onglets: OngletElement[] = [
    {
      id: "utilisateurs",
      libelle: "Comptes Utilisateurs",
      icone: <Users className="w-4 h-4" />,
    },
    {
      id: "affectations",
      libelle: "Affectations du Personnel",
      icone: <UserCheck className="w-4 h-4" />,
    },
    {
      id: "sites",
      libelle: "Sites Médicaux",
      icone: <Building2 className="w-4 h-4" />,
    },
    {
      id: "services",
      libelle: "Services Médicaux",
      icone: <FolderTree className="w-4 h-4" />,
    },
    {
      id: "entreprises",
      libelle: "Entreprises Adhérentes",
      icone: <Briefcase className="w-4 h-4" />,
    },
    {
      id: "catalogue",
      libelle: "Catalogue des Actes",
      icone: <BookOpenCheck className="w-4 h-4" />,
    },
    {
      id: "observations",
      libelle: "Définitions d’Observations",
      icone: <Activity className="w-4 h-4" />,
    },
    {
      id: "diagnostics",
      libelle: "Définitions de Diagnostics",
      icone: <FileText className="w-4 h-4" />,
    },
    {
      id: "type-encounters",
      libelle: "Types de Prise en Charge",
      icone: <Activity className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <SousOnglets onglets={onglets} ongletActif={ongletActif} onChanger={changerOnglet} />

      {ongletActif === "utilisateurs" && <PanneauUtilisateurs mode={modeUtilisateurs} />}

      {ongletActif === "affectations" && <PanneauAffectations mode={modeAffectations} />}

      {ongletActif === "sites" && <PanneauSites mode={modeSites} />}

      {ongletActif === "services" && <PanneauServices mode={modeServices} />}

      {ongletActif === "entreprises" && <PanneauEntreprises mode={modeEntreprises} />}

      {ongletActif === "catalogue" && <PanneauCatalogueActes mode={modeCatalogue} />}

      {ongletActif === "observations" && <PanneauObservationDefinitions mode={modeObservations} />}

      {ongletActif === "diagnostics" && <PanneauDiagnosticDefinitions mode={modeDiagnostics} />}

      {ongletActif === "type-encounters" && <PanneauTypeEncounters mode={modeTypeEncounters} />}
    </div>
  );
};

export default AssemblageAdministration;
