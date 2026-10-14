/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HeartPulse, ClipboardList, Gauge, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { ASINAState, StaffProfile } from "@/core/types";
import {
  InfirmerieTabType,
  InfirmerieVitalsTab,
  InfirmerieActesTab,
  InfirmerieHistoryTab,
} from "@/modules/infirmerie";

export interface InfirmeriePageProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  activeSiteId: number;
  activeStaffProfile: StaffProfile;
  overrideTab?: InfirmerieTabType;
}

export const InfirmeriePage: React.FC<InfirmeriePageProps> = ({
  state,
  updateState,
  activeSiteId,
  activeStaffProfile,
  overrideTab,
}) => {
  const [internalTab, setInternalTab] = useState<InfirmerieTabType>("vitals");
  const activeTab = overrideTab || internalTab;
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const triggerNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const activeEncounters = state.Encounter.filter(
    (enc) =>
      enc.Id_Site === activeSiteId &&
      (enc.Statut === "En attente" || enc.Statut === "En consultation"),
  );

  const prescribedActes = state.prescription_acte.filter((pa) => {
    const presc = state.Prescription.find((p) => p.Id_Prescription === pa.Id_Prescription);
    if (!presc) return false;

    const relatedEnc = state.Encounter.find(
      (enc) =>
        enc.Id_Patient === presc.Id_Patient &&
        enc.Id_Site === activeSiteId &&
        enc.Statut !== "Terminé",
    );
    if (!relatedEnc) return false;

    return !state.Actes.some(
      (a) => a.Id_Encounter === relatedEnc.Id_Encounter && a.Id_Acte_Def === pa.Id_Acte_Def,
    );
  });

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 animate-fade-in ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          } text-xs font-semibold shadow-xs`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Top Infirmary banner */}
      <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-rose-950 border border-rose-800/40 p-5 rounded-xl shadow-xs text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 rounded-lg border border-rose-500/30 text-rose-400">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Unité de Soins Infirmiers & Prise de Constantes</h2>
              <div className="text-xs text-slate-300 mt-0.5 font-medium">
                Poste actif :{" "}
                <strong className="text-white">
                  {state.StaffProfile.find(
                    (sp) => sp.Id_staff_profile === activeStaffProfile?.Id_staff_profile,
                  )?.Matricule || "Soignant"}
                </strong>{" "}
                | Site :{" "}
                <strong className="text-rose-300">
                  {state.Site.find((s) => s.Id_Site === activeSiteId)?.Nom}
                </strong>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-mono text-slate-300">Patients à trier</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {activeEncounters.length} File Vitals
            </span>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      {!overrideTab && (
        <div className="border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 -mb-px min-w-max pb-0.5">
            <button
              onClick={() => setInternalTab("vitals")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === "vitals"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Gauge className="h-4 w-4 text-slate-400" />
              <span>Prise de Constantes (Observations)</span>
            </button>
            <button
              onClick={() => setInternalTab("actes")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === "actes"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ClipboardList className="h-4 w-4 text-slate-400" />
              <span>Actes Médicaux Paramédicaux ({prescribedActes.length})</span>
            </button>
            <button
              onClick={() => setInternalTab("history")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === "history"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Registre Historique de l'Infirmerie</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === "vitals" && (
        <InfirmerieVitalsTab
          state={state}
          updateState={updateState}
          activeSiteId={activeSiteId}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "actes" && (
        <InfirmerieActesTab
          state={state}
          updateState={updateState}
          activeSiteId={activeSiteId}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "history" && <InfirmerieHistoryTab state={state} />}
    </div>
  );
};

export default InfirmeriePage;
