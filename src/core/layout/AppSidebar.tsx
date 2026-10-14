/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Users,
  Package,
  BookOpen,
  Building2,
  Sliders,
  UserPlus,
  Search,
  Calendar,
  Upload,
  Activity,
  FileText,
  Clock,
  HeartPulse,
  ShoppingCart,
  BarChart3,
  CloudLightning,
  LogOut,
  ChevronRight,
  ChevronLeft,
  X,
  Ticket,
  CreditCard,
  LifeBuoy,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import { User_, role } from "../types";
import { formatRoleLabel, formatUserDisplayName, getUserAvatarInitial } from "../utils/formatters";

export interface SidebarCategoryItem {
  view:
    | "admin"
    | "accueil"
    | "doctor"
    | "stock"
    | "analysis"
    | "infirmerie"
    | "api_config"
    | "ticketing";
  subTab?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Codes de la table locale des rôles (activeRole.code) */
  requiredRoleCode?: string[];
  /** Rôles Symfony issus du JWT (activeUser.roles), ex: ROLE_GESTIONNAIRE_STOCK */
  requiredSymfonyRoles?: string[];
}

export interface SidebarCategory {
  title: string;
  requiredPanel:
    | "admin"
    | "accueil"
    | "doctor"
    | "stock"
    | "analysis"
    | "infirmerie"
    | "api_config"
    | "ticketing";
  items: SidebarCategoryItem[];
}

export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    title: "Administration",
    requiredPanel: "admin",
    items: [
      { view: "admin", subTab: "utilisateurs", label: "Utilisateurs & Permissions", icon: Users },
      { view: "admin", subTab: "catalogue", label: "Catalogue Produits", icon: Package },
      { view: "admin", subTab: "referentiels", label: "Référentiels CIM-10", icon: BookOpen },
      { view: "admin", subTab: "services", label: "Sites & Services", icon: Building2 },
      { view: "admin", subTab: "affectations", label: "Affectations", icon: Sliders },
    ],
  },
  {
    title: "Accueil & Secrétariat",
    requiredPanel: "accueil",
    items: [
      { view: "accueil", subTab: "ticketing", label: "Tickets File d'Attente", icon: Ticket },
      { view: "accueil", subTab: "cartes", label: "Cartes d'Adhérents", icon: CreditCard },
      { view: "accueil", subTab: "rechercher", label: "Recherche & Dossiers", icon: Search },
      { view: "accueil", subTab: "rendezvous", label: "Rendez-vous & Files", icon: Calendar },
      { view: "accueil", subTab: "importation", label: "Importation Massive", icon: Upload },
    ],
  },
  {
    title: "Infirmerie",
    requiredPanel: "infirmerie",
    items: [
      { view: "infirmerie", subTab: "vitals", label: "Prise Constantes", icon: Activity },
      { view: "infirmerie", subTab: "actes", label: "Actes Paramédicaux", icon: FileText },
      { view: "infirmerie", subTab: "history", label: "Registre Soins", icon: Clock },
    ],
  },
  {
    title: "Médecin / Consultation",
    requiredPanel: "doctor",
    items: [
      { view: "doctor", subTab: "attente", label: "File d'Attente", icon: Users },
      { view: "doctor", subTab: "dossiers", label: "Répertoire Clinique", icon: FileText },
      { view: "doctor", subTab: "consultation", label: "Consultation Active", icon: HeartPulse },
      { view: "doctor", subTab: "prescriptions", label: "Prescriptions", icon: ClipboardList },
    ],
  },
  {
    title: "Pharmacie & Stocks",
    requiredPanel: "stock",
    items: [
      {
        view: "stock",
        subTab: "dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
        requiredRoleCode: ["ADMIN", "GESTIONNAIRE_STOCK"],
        requiredSymfonyRoles: ["ROLE_GESTIONNAIRE_STOCK"],
      },
      { view: "stock", subTab: "visualiser", label: "Niveaux de Stocks", icon: Package },
      {
        view: "stock",
        subTab: "commandes",
        label: "Commandes Fournisseurs",
        icon: ShoppingCart,
        requiredRoleCode: ["ADMIN", "STOCK_CENTRAL", "GESTIONNAIRE_STOCK", "RESPONSABLE_STOCK"],
        requiredSymfonyRoles: ["ROLE_GESTIONNAIRE_STOCK", "ROLE_RESPONSABLE_STOCK"],
      },
      {
        view: "stock",
        subTab: "dispensation",
        label: "Dispensations Cliniques",
        icon: HeartPulse,
        requiredRoleCode: [
          "ADMIN",
          "DISPENSATEUR",
          "STOCK_CENTRAL",
          "GESTIONNAIRE_STOCK",
          "RESPONSABLE_STOCK",
        ],
        requiredSymfonyRoles: [
          "ROLE_DISPENSATEUR",
          "ROLE_GESTIONNAIRE_STOCK",
          "ROLE_RESPONSABLE_STOCK",
        ],
      },
      {
        view: "stock",
        subTab: "referentiels",
        label: "Référentiels",
        icon: BookOpen,
        requiredRoleCode: ["ADMIN", "STOCK_CENTRAL", "GESTIONNAIRE_STOCK", "RESPONSABLE_STOCK"],
        requiredSymfonyRoles: ["ROLE_GESTIONNAIRE_STOCK", "ROLE_RESPONSABLE_STOCK"],
      },
    ],
  },
  {
    title: "Support & Ticketing",
    requiredPanel: "ticketing",
    items: [{ view: "ticketing", label: "Demandes d'Intervention", icon: LifeBuoy }],
  },
  {
    title: "Pilotage",
    requiredPanel: "analysis",
    items: [{ view: "analysis", label: "Stats & Tableaux", icon: BarChart3 }],
  },
];

export interface AppSidebarProps {
  activeView: string;
  activeSubTab: string;
  onNavigate: (view: any, subTab?: string) => void;
  activeUser: User_ | null;
  activeRole: role | null | undefined;
  isAuthorized: (panelName: any) => boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarOpenMobile: boolean;
  setSidebarOpenMobile: (open: boolean) => void;
  onLogout: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeView,
  activeSubTab,
  onNavigate,
  activeUser,
  activeRole,
  isAuthorized,
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarOpenMobile,
  setSidebarOpenMobile,
  onLogout,
}) => {
  const userSymfonyRoles: string[] = activeUser?.roles ?? [];

  const isItemAllowed = (item: SidebarCategoryItem): boolean => {
    // Aucune restriction sur l'entrée : visible pour tous ceux qui ont accès au panneau
    if (!item.requiredRoleCode && !item.requiredSymfonyRoles) return true;

    // Restriction par code de rôle local (table des rôles)
    if (item.requiredRoleCode?.includes(activeRole?.code || "")) return true;

    // Restriction par rôle Symfony (JWT)
    if (item.requiredSymfonyRoles?.some((r) => userSymfonyRoles.includes(r))) return true;

    // L'administrateur voit toujours tout
    if (userSymfonyRoles.includes("ROLE_ADMIN") || activeRole?.code === "ADMIN") return true;

    return false;
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-350"
          onClick={() => setSidebarOpenMobile(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out z-50
        fixed inset-y-0 left-0 md:static md:translate-x-0 border-r border-slate-800/80 w-72 p-6
        ${sidebarOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        ${sidebarCollapsed ? "md:w-20 md:p-4 md:items-center" : "md:w-64 md:p-6"}
      `}
      >
        <div className="space-y-4 md:space-y-6 w-full flex flex-col">
          <div
            className={`flex items-center w-full ${sidebarCollapsed ? "justify-center" : "justify-between gap-2"}`}
          >
            {(!sidebarCollapsed || sidebarOpenMobile) && (
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Espace de Travail
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {/* Mobile close button */}
              <button
                type="button"
                onClick={() => setSidebarOpenMobile(false)}
                className="md:hidden p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Fermer le menu"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Desktop collapse button */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer items-center justify-center"
                title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4 font-bold" />
                ) : (
                  <ChevronLeft className="h-4 w-4 font-bold" />
                )}
              </button>
            </div>
          </div>

          {/* Connected User profile badge on mobile */}
          <div className="md:hidden p-3 bg-slate-800/40 border border-slate-800/60 rounded-xl flex items-center gap-3 w-full overflow-hidden">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs select-none shadow-xs">
              {getUserAvatarInitial(activeUser)}
            </div>
            <div className="overflow-hidden text-left col-span-1">
              <span className="block text-xs font-bold text-white truncate leading-tight">
                {formatUserDisplayName(activeUser)}
              </span>
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">
                {formatRoleLabel(activeRole?.libelle || activeUser?.role || activeUser?.roles?.[0])}
              </span>
            </div>
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {SIDEBAR_CATEGORIES.map((category) => {
              if (!isAuthorized(category.requiredPanel)) return null;

              const visibleItems = category.items.filter(isItemAllowed);

              if (visibleItems.length === 0) return null;

              return (
                <div key={category.title} className="space-y-1">
                  {(!sidebarCollapsed || sidebarOpenMobile) && (
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-2 mb-1">
                      {category.title}
                    </h4>
                  )}
                  <ul className="space-y-1">
                    {visibleItems.map((item) => {
                      const isItemSelected =
                        activeView === item.view &&
                        (item.subTab ? activeSubTab === item.subTab : true);
                      const Icon = item.icon;

                      return (
                        <li key={`${item.view}_${item.subTab || ""}`}>
                          <button
                            onClick={() => onNavigate(item.view, item.subTab)}
                            className={`w-full px-3 py-2 rounded-lg transition flex items-center cursor-pointer text-xs ${
                              sidebarCollapsed && !sidebarOpenMobile
                                ? "md:justify-center"
                                : "justify-between text-left"
                            } ${
                              isItemSelected
                                ? "bg-asina-600 text-white font-semibold shadow-sm"
                                : "text-slate-400 hover:bg-slate-800/80 hover:text-white font-medium"
                            }`}
                            title={item.label}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <Icon
                                className={`h-4 w-4 shrink-0 ${isItemSelected ? "text-white" : "text-slate-400"}`}
                              />
                              <span
                                className={`truncate ${sidebarCollapsed && !sidebarOpenMobile ? "md:hidden" : "block"}`}
                              >
                                {item.label}
                              </span>
                            </div>
                            {(!sidebarCollapsed || sidebarOpenMobile) && isItemSelected && (
                              <div className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          className={`pt-4 md:pt-6 border-t border-slate-800 mt-6 md:mt-10 w-full space-y-2 ${sidebarCollapsed ? "md:flex md:flex-col md:items-center" : ""}`}
        >
          <button
            onClick={() => onNavigate("api_config")}
            className={`w-full py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeView === "api_config"
                ? "bg-asina-600 text-white"
                : "bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800"
            } ${sidebarCollapsed ? "justify-center" : "justify-start"}`}
            title="Liaison API Backend"
          >
            <CloudLightning className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className={`truncate ${sidebarCollapsed ? "md:hidden" : "inline"}`}>
              Configuration API
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-full bg-rose-950/30 hover:bg-rose-950 hover:text-rose-300 border border-rose-900/40 py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-rose-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className={`truncate ${sidebarCollapsed ? "md:hidden" : "inline"}`}>
              Se Déconnecter
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
