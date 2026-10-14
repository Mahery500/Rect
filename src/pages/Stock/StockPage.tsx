/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { ASINAState } from "@/core/types";
import {
  StockTabType,
  StockVisualizerTab,
  StockOrdersTab,
  StockDispensationTab,
  StockReferentielsTab,
  StockPrescriptionsTab,
  StockDashboardTab,
} from "@/modules/stock";
import { prescriptionsRepository } from "@/modules/stock/infrastructure/prescriptions.repository";

export interface StockPageProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  activeSiteId: number;
  activeRoleCode: string;
  overrideTab?: StockTabType;
}

// Codes de rôle autorisés (alignés sur le sidebar)
const ORDER_ROLE_CODES = ["ADMIN", "STOCK_CENTRAL", "GESTIONNAIRE_STOCK", "RESPONSABLE_STOCK"];
const DISPENSE_ROLE_CODES = [
  "ADMIN",
  "DISPENSATEUR",
  "STOCK_CENTRAL",
  "GESTIONNAIRE_STOCK",
  "RESPONSABLE_STOCK",
];

export const StockPage: React.FC<StockPageProps> = ({
  state,
  updateState,
  activeSiteId,
  activeRoleCode,
  overrideTab,
}) => {
  const [internalTab, setInternalTab] = useState<StockTabType>("visualiser");
  const activeTab = overrideTab || internalTab;

  const canManageOrders = ORDER_ROLE_CODES.includes(activeRoleCode);
  const canDispense = DISPENSE_ROLE_CODES.includes(activeRoleCode);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Compteur de prescriptions en attente pour le badge de l'onglet — vient
  // désormais de l'API réelle, plus du mock state.Prescription.
  const [pendingPrescriptionsCount, setPendingPrescriptionsCount] = useState(0);

  useEffect(() => {
    prescriptionsRepository
      .findAll()
      .then((list) =>
        setPendingPrescriptionsCount(list.filter((p) => p.statut === "en_attente").length),
      )
      .catch(() => {
        // silencieux : le badge reste à 0 si l'appel échoue, l'onglet
        // lui-même affichera l'erreur via son propre fetch.
      });
  }, [activeTab]); // recalculé à chaque changement d'onglet, pour rester à jour après une dispensation

  const triggerNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 animate-fade-in ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.text}</span>
        </div>
      )}

      {/* Tabs */}
      {!overrideTab && (
        <div className="border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 -mb-px min-w-max pb-0.5">
            <button
              type="button"
              onClick={() => setInternalTab("visualiser")}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === "visualiser"
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Package className="h-4 w-4 text-slate-400" />
              <span>Niveaux de Stocks & Expirations (Multi-site)</span>
            </button>

            {canManageOrders && (
              <button
                type="button"
                onClick={() => setInternalTab("commandes")}
                className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  activeTab === "commandes"
                    ? "border-asina-600 text-asina-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <ShoppingCart className="h-4 w-4 text-slate-400" />
                <span>
                  Commandes Fournisseurs & Réceptions (
                  {state.Commande.filter((c) => c.Statut === "Commandée").length})
                </span>
              </button>
            )}

            {canDispense && (
              <button
                type="button"
                onClick={() => setInternalTab("prescriptions")}
                className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  activeTab === "prescriptions"
                    ? "border-asina-600 text-asina-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <ClipboardList className="h-4 w-4 text-emerald-600" />
                <span>Prescriptions à dispenser ({pendingPrescriptionsCount})</span>
              </button>
            )}

            {canDispense && (
              <button
                type="button"
                onClick={() => setInternalTab("dispensation")}
                className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  activeTab === "dispensation"
                    ? "border-asina-600 text-asina-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                <span>Dispensation libre (hors ordonnance)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === "dashboard" && (
        <StockDashboardTab activeSiteId={activeSiteId} onGoTo={setInternalTab} />
      )}

      {activeTab === "visualiser" && (
        <StockVisualizerTab state={state} activeSiteId={activeSiteId} />
      )}

      {activeTab === "commandes" && (
        <StockOrdersTab
          state={state}
          updateState={updateState}
          activeSiteId={activeSiteId}
          triggerNotification={triggerNotification}
        />
      )}

      {activeTab === "prescriptions" && <StockPrescriptionsTab activeSiteId={activeSiteId} />}

      {activeTab === "dispensation" && <StockDispensationTab activeSiteId={activeSiteId} />}

      {activeTab === "referentiels" && (
        <StockReferentielsTab state={state} activeSiteId={activeSiteId} />
      )}
    </div>
  );
};

export default StockPage;
