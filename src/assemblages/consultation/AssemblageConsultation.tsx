/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { Users, Stethoscope, FolderHeart } from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions";
import { SousOnglets, OngletElement } from "@/noyau/ui/SousOnglets";
import { PanneauConsultationFile, consultationFileApi } from "@/briques/consultation-file";
import { PanneauConsultationActive } from "@/briques/consultation-active";
import { PanneauDossiersMedicaux } from "@/briques/dossiers-medicaux";

export interface AssemblageConsultationProps {
  siteActifId?: number | null;
  serviceActifId?: number | null;
  ongletParDefaut?: string;
  modes?: {
    file?: ModeAffichage;
    active?: ModeAffichage;
    dossiers?: ModeAffichage;
  };
  sousOngletActif?: string | null;
  onSousOngletChange?: (id: string) => void;
}

const CLE_STOCKAGE_CONSULTATION = "asina_consultation_patient_actif";

export const AssemblageConsultation: React.FC<AssemblageConsultationProps> = ({
  siteActifId,
  ongletParDefaut = "file",
  modes = {},
  sousOngletActif,
  onSousOngletChange,
}) => {
  // État interne : sert de repli quand le parent ne pilote pas l'onglet
  const [ongletInterne, setOngletInterne] = useState(ongletParDefaut);

  // L'onglet effectif : la prop parente est prioritaire sur l'état interne
  const ongletActif = sousOngletActif ?? ongletInterne;

  const [consultationEnCours, setConsultationEnCours] = useState<{
    patientId?: number;
    encounterId?: number;
    numTicket?: string;
    patientNom?: string;
  } | null>(() => {
    try {
      const sauve = localStorage.getItem(CLE_STOCKAGE_CONSULTATION);
      return sauve ? JSON.parse(sauve) : null;
    } catch {
      return null;
    }
  });

  // Handler unique : met à jour l'état interne ET notifie le parent
  const changerOnglet = (id: string) => {
    setOngletInterne(id);
    onSousOngletChange?.(id);
  };

  const modeFile = modes.file ?? "edition";
  const modeActive = modes.active ?? "edition";
  const modeDossiers = modes.dossiers ?? "edition";

  // Synchronisation avec l'état réel backend du médecin connecté (GET /api/me/patient_en_cours)
  const synchroniserConsultationEnCours = useCallback(async () => {
    try {
      const enCours = await consultationFileApi.obtenirPatientEnCours();
      if (enCours?.enCours && enCours.patientId && enCours.encounterId) {
        const maj = {
          patientId: enCours.patientId,
          encounterId: enCours.encounterId,
          numTicket: enCours.numTicket ?? undefined,
          patientNom: enCours.patientNom ?? undefined,
        };
        setConsultationEnCours(maj);
        try {
          localStorage.setItem(CLE_STOCKAGE_CONSULTATION, JSON.stringify(maj));
        } catch {
          // ignore
        }
      } else {
        // Le serveur dit explicitement : plus personne (clôture locale OU externe)
        setConsultationEnCours(null);
        try {
          localStorage.removeItem(CLE_STOCKAGE_CONSULTATION);
        } catch {
          // ignore
        }
      }
    } catch {
      // Ignorer si non connecté — on conserve l'état local courant
    }
  }, []);

  useEffect(() => {
    synchroniserConsultationEnCours();
    const intervalle = setInterval(synchroniserConsultationEnCours, 15000);
    return () => clearInterval(intervalle);
  }, [synchroniserConsultationEnCours]);

  const onglets: OngletElement[] = [
    {
      id: "file",
      libelle: "File d’Attente Médecin",
      icone: <Users className="w-4 h-4" />,
    },
    {
      id: "active",
      libelle: "Consultation Active",
      icone: <Stethoscope className="w-4 h-4" />,
      badge: consultationEnCours
        ? `En cours : ${consultationEnCours.numTicket || "#" + consultationEnCours.encounterId}`
        : undefined,
    },
    {
      id: "dossiers",
      libelle: "Dossiers Médicaux Cliniques",
      icone: <FolderHeart className="w-4 h-4" />,
    },
  ];

  const handlePriseEnChargeSucces = (patientId: number, encounterId?: number) => {
    const nouveau = { patientId, encounterId };
    setConsultationEnCours(nouveau);
    try {
      localStorage.setItem(CLE_STOCKAGE_CONSULTATION, JSON.stringify(nouveau));
    } catch {
      // ignore
    }
    changerOnglet("active"); // ← remonte aussi vers la sidebar
  };

  const handleConsultationTerminee = () => {
    try {
      localStorage.removeItem(CLE_STOCKAGE_CONSULTATION);
    } catch {
      // ignore
    }
    setConsultationEnCours(null);
    changerOnglet("file"); // ← remonte aussi vers la sidebar
    synchroniserConsultationEnCours();
  };

  return (
    <div className="space-y-6">
      <SousOnglets onglets={onglets} ongletActif={ongletActif} onChanger={changerOnglet} />

      {ongletActif === "file" && (
        <PanneauConsultationFile
          mode={modeFile}
          siteActifId={siteActifId ?? undefined}
          onPrendreEnChargeSucces={handlePriseEnChargeSucces}
        />
      )}

      {ongletActif === "active" && (
        <PanneauConsultationActive
          mode={modeActive}
          encounterId={consultationEnCours?.encounterId}
          patientId={consultationEnCours?.patientId}
          patientNom={consultationEnCours?.patientNom}
          ticketNumero={consultationEnCours?.numTicket}
          onConsultationTerminee={handleConsultationTerminee}
        />
      )}

      {ongletActif === "dossiers" && (
        <PanneauDossiersMedicaux
          mode={modeDossiers}
          patientIdFiltre={consultationEnCours?.patientId}
        />
      )}
    </div>
  );
};

export default AssemblageConsultation;
