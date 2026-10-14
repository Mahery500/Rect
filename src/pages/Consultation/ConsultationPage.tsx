/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Activity, FileText, HeartPulse, Stethoscope, ClipboardList } from "lucide-react";
import { ASINAState, Encounter, Patient } from "@/core/types";
import { formatUserDisplayName } from "@/core/utils/formatters";
import {
  DoctorTabType,
  DoctorQueueTab,
  DoctorClinicalRecordsTab,
  DoctorActiveConsultationTab,
} from "@/modules/consultations";
import { StockPrescriptionsTab } from "@/modules/stock";

export interface ConsultationPageProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  activeSiteId: number;
  activeServiceId: number;
  activeDrProfile: any;
  overrideTab?: DoctorTabType;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export const ConsultationPage: React.FC<ConsultationPageProps> = ({
  state,
  updateState,
  activeSiteId,
  activeServiceId,
  activeDrProfile,
  overrideTab,
  triggerNotification,
}) => {
  const [internalTab, setInternalTab] = useState<DoctorTabType>("attente");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);

  const activeTab =
    overrideTab === "consultation" && !selectedPatient ? "attente" : overrideTab || internalTab;

  const currentDoctorUser = state.User_.find((u) => u.Id_User === activeDrProfile?.Id_User);
  const doctorSpeciality = state.Specialite.find(
    (s) => s.Id_Specialite === activeDrProfile?.Id_Specialite,
  );

  const waitingPatientsEncounters = state.Encounter.filter(
    (enc) =>
      enc.Statut === "En attente" &&
      enc.Id_Site === activeSiteId &&
      enc.Id_Service === activeServiceId,
  );

  const handleStartConsultation = (encounter: Encounter) => {
    const patient = state.Patient.find((p) => p.Id_Patient === encounter.Id_Patient);
    if (!patient) return;
    setSelectedPatient(patient);
    setActiveEncounter(encounter);
    setInternalTab("consultation");
  };

  const handleSaveConsultation = (updatedState: Partial<ASINAState>, successMessage: string) => {
    updateState(updatedState);
    triggerNotification("success", successMessage);
    setSelectedPatient(null);
    setActiveEncounter(null);
    setInternalTab("attente");
  };

  const handleCancelConsultation = () => {
    setSelectedPatient(null);
    setActiveEncounter(null);
    setInternalTab("attente");
  };

  return (
    <div className="space-y-6">
      {/* Specialty Workspace Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 rounded-xl shadow-xs text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-asina-500/20 rounded-lg border border-asina-500/30 text-asina-400">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cabinet de Consultation Spécialisée</h2>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">
                Praticien d'affectation :{" "}
                <strong className="text-slate-200">
                  {formatUserDisplayName(currentDoctorUser)}
                </strong>{" "}
                | Spécialité :{" "}
                <strong className="text-asina-400">
                  {doctorSpeciality?.Libelle || "Médecine Générale"}
                </strong>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-mono text-slate-400">Salle d'attente active</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {waitingPatientsEncounters.length} Patients
            </span>
          </div>
        </div>
      </div>

      {/* Internal Nav Tabs */}
      {!overrideTab && (
        <div className="border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 -mb-px min-w-max pb-0.5">
            <button
              onClick={() => setInternalTab("attente")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "attente"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Activity className="h-4 w-4 text-slate-400" />
              <span>Patients en Attente ({waitingPatientsEncounters.length})</span>
            </button>
            <button
              onClick={() => setInternalTab("dossiers")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "dossiers"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="h-4 w-4 text-slate-400" />
              <span>Répertoire Clinique & Dossiers Historiques</span>
            </button>
            <button
              onClick={() => setInternalTab("prescriptions")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "prescriptions"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ClipboardList className="h-4 w-4 text-slate-400" />
              <span>Prescriptions</span>
            </button>
            {activeEncounter && selectedPatient && (
              <button
                onClick={() => setInternalTab("consultation")}
                className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                  activeTab === "consultation"
                    ? "border-asina-600 text-asina-700 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <HeartPulse className="h-4 w-4 text-rose-500 animate-pulse" />
                <span>
                  Consultation Active : {selectedPatient?.Nom} {selectedPatient?.Prenom}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === "attente" && (
        <DoctorQueueTab
          state={state}
          activeSiteId={activeSiteId}
          activeServiceId={activeServiceId}
          onStartConsultation={handleStartConsultation}
        />
      )}

      {activeTab === "dossiers" && (
        <DoctorClinicalRecordsTab
          state={state}
          selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient}
        />
      )}

      {activeTab === "prescriptions" && <StockPrescriptionsTab activeSiteId={activeSiteId} />}

      {activeTab === "consultation" && selectedPatient && activeEncounter && (
        <DoctorActiveConsultationTab
          state={state}
          selectedPatient={selectedPatient}
          activeEncounter={activeEncounter}
          activeDrProfile={activeDrProfile}
          activeSiteId={activeSiteId}
          onSaveConsultation={handleSaveConsultation}
          onCancel={handleCancelConsultation}
        />
      )}
    </div>
  );
};

export default ConsultationPage;
