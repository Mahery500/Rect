/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserPlus, Search, Calendar, Upload, Ticket, CreditCard } from "lucide-react";
import { ASINAState } from "@/core/types";
import {
  ReceptionTabType,
  ReceptionRegisterTab,
  ReceptionSearchTab,
  ReceptionAppointmentsTab,
  ReceptionImportTab,
  ReceptionQueueTicketingTab,
  ReceptionAdherentCardTab,
} from "@/modules/patients";

export interface ReceptionPageProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  activeSiteId: number;
  overrideTab?: ReceptionTabType;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export const ReceptionPage: React.FC<ReceptionPageProps> = ({
  state,
  updateState,
  activeSiteId,
  overrideTab,
  triggerNotification,
}) => {
  const [internalTab, setInternalTab] = useState<ReceptionTabType>("ticketing");
  const activeTab = overrideTab || internalTab;

  return (
    <div className="space-y-6">
      {/* Reception Nav Tabs */}
      {!overrideTab && (
        <div className="border-b border-slate-200 overflow-x-auto scrollbar-none font-sans">
          <div className="flex gap-1 -mb-px min-w-max pb-0.5">
            <button
              onClick={() => setInternalTab("ticketing")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "ticketing"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Ticket className="h-4 w-4 text-emerald-600" />
              <span>Tickets File d'Attente</span>
            </button>
            <button
              onClick={() => setInternalTab("cartes")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "cartes"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <CreditCard className="h-4 w-4 text-asina-600" />
              <span>Cartes d'Adhérents</span>
            </button>
            <button
              onClick={() => setInternalTab("enregistrer")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "enregistrer"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <UserPlus className="h-4 w-4 text-slate-400" />
              <span>Enregistrer un Patient</span>
            </button>
            <button
              onClick={() => setInternalTab("rechercher")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "rechercher"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span>Rechercher & Dossiers admin ({state.Patient.length})</span>
            </button>
            <button
              onClick={() => setInternalTab("rendezvous")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "rendezvous"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>
                Rendez-vous ({state.Rendez_vous.filter((r) => r.Statut === "Confirmé").length})
              </span>
            </button>
            <button
              onClick={() => setInternalTab("importation")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "importation"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Upload className="h-4 w-4 text-slate-400" />
              <span>Importation Massive</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Sections */}
      {activeTab === "ticketing" && (
        <ReceptionQueueTicketingTab state={state} triggerNotification={triggerNotification} />
      )}

      {activeTab === "cartes" && (
        <ReceptionAdherentCardTab state={state} triggerNotification={triggerNotification} />
      )}

      {activeTab === "enregistrer" && (
        <ReceptionRegisterTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "rechercher" && (
        <ReceptionSearchTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "rendezvous" && (
        <ReceptionAppointmentsTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
          activeSiteId={activeSiteId}
        />
      )}

      {activeTab === "importation" && (
        <ReceptionImportTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}
    </div>
  );
};

export default ReceptionPage;
