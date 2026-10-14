// src/briques/actes-realisation/ui/PanneauActes.tsx
import React, { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import { actesApi } from "../api/actes.api";
import { ActeEnregistre } from "../modele/acte.types";
import { SelecteurActe } from "./SelecteurActe";
import { ModaleReorientationService } from "./ModaleReorientationService";

export interface PanneauActesProps {
  mode?: ModeAffichage;
  encounterId?: number | null;
  patientId?: number | null;
  patientNom?: string;
  serviceActuelId?: number | null;
  siteId?: number | null;
  filtreCategorieCodes?: string[];
  onEnregistre?: (acte: ActeEnregistre) => void;
}

export const PanneauActes: React.FC<PanneauActesProps> = ({
  mode = "edition",
  encounterId,
  patientId,
  patientNom,
  serviceActuelId,
  siteId,
  filtreCategorieCodes,
  onEnregistre,
}) => {
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const { notifierSucces, notifierErreur } = useNotifier();

  const selecteur = (
    <SelecteurActe
      mode={mode}
      encounterId={encounterId}
      patientId={patientId}
      filtreCategorieCodes={filtreCategorieCodes}
      onEnregistre={onEnregistre}
    />
  );

  if (!encounterId || mode !== "edition") return selecteur;

  const orienter = async (serviceId: number): Promise<boolean> => {
    try {
      await actesApi.orienter(encounterId, serviceId);
      notifierSucces("Patient réorienté. Il apparaîtra dans la file du service destinataire.");
      return true;
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Actes & soins
          </span>
          <span className="font-bold text-slate-900 text-base">{patientNom || "Patient"}</span>
          <span className="text-xs text-slate-400 font-mono ml-2">Dossier #{encounterId}</span>
        </div>
        <button
          type="button"
          onClick={() => setModaleOuverte(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-2xs transition cursor-pointer"
          title="Orienter le patient vers un autre service sans clôturer la prise en charge"
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>Réorienter vers un service</span>
        </button>
      </div>

      {selecteur}

      <ModaleReorientationService
        ouvert={modaleOuverte}
        encounterId={encounterId}
        serviceActuelId={serviceActuelId}
        siteId={siteId}
        onFermer={() => setModaleOuverte(false)}
        onOrienter={orienter}
      />
    </div>
  );
};

export default PanneauActes;