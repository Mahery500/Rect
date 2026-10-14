/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Users, Package, BookHeart, Building2, Briefcase } from "lucide-react";
import { ASINAState } from "@/core/types";
import {
  AdminTabType,
  AdminUsersTab,
  AdminCatalogueTab,
  AdminReferentielsTab,
  AdminServicesTab,
  AdminAffectationsTab,
  AdminCompaniesTab,
} from "@/modules/administration";

export interface AdministrationPageProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  activeSiteId: number;
  overrideTab?: AdminTabType;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export const AdministrationPage: React.FC<AdministrationPageProps> = ({
  state,
  updateState,
  overrideTab,
  triggerNotification,
}) => {
  const [internalTab, setInternalTab] = useState<AdminTabType>("utilisateurs");
  const activeTab = overrideTab || internalTab;

  return (
    <div className="space-y-6">
      {/* Top Tab Bar if not overridden by sidebar */}
      {!overrideTab && (
        <div className="border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 -mb-px min-w-max pb-0.5">
            <button
              onClick={() => setInternalTab("utilisateurs")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "utilisateurs"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="h-4 w-4 text-slate-400" />
              <span>Utilisateurs & Permissions</span>
            </button>
            <button
              onClick={() => setInternalTab("catalogue")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "catalogue"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Package className="h-4 w-4 text-slate-400" />
              <span>Catalogue Produits & Substances</span>
            </button>
            <button
              onClick={() => setInternalTab("referentiels")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "referentiels"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <BookHeart className="h-4 w-4 text-slate-400" />
              <span>Référentiels Cliniques (CIM-10)</span>
            </button>
            <button
              onClick={() => setInternalTab("services")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "services"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>Sites & Services</span>
            </button>
            <button
              onClick={() => setInternalTab("affectations")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "affectations"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Briefcase className="h-4 w-4 text-slate-400" />
              <span>Affectations du Personnel</span>
            </button>
            <button
              onClick={() => setInternalTab("entreprises")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                activeTab === "entreprises"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>Entreprises Conventionnées ({state.Entreprise.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Tab Panel Render */}
      {activeTab === "utilisateurs" && (
        <AdminUsersTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "catalogue" && (
        <AdminCatalogueTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "referentiels" && (
        <AdminReferentielsTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "services" && (
        <AdminServicesTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "affectations" && (
        <AdminAffectationsTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "entreprises" && (
        <AdminCompaniesTab
          state={state}
          updateState={updateState}
          triggerNotification={triggerNotification}
        />
      )}
    </div>
  );
};

export default AdministrationPage;
