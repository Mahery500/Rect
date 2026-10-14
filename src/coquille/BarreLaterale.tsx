/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Users,
  HeartPulse,
  Stethoscope,
  Package,
  Sliders,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useSession } from "@/cerveau/session";

export type VueCoquille = "accueil" | "infirmerie" | "consultation" | "stock" | "administration";

export interface BarreLateraleProps {
  vueActive: VueCoquille;
  sousOngletActif: string | null;
  onChangerVue: (vue: VueCoquille, sousId?: string) => void;
  reduite: boolean;
  onBasculerReduite: () => void;
  mobileOuvert: boolean;
  onFermerMobile: () => void;
}

interface SousItemNavigation {
  id: string;
  libelle: string;
  rolesAutorises?: string[];
}

interface ItemNavigation {
  id: VueCoquille;
  libelle: string;
  description: string;
  icone: React.ComponentType<{ className?: string }>;
  rolesAutorises?: string[];
  sousItems?: SousItemNavigation[];
}

const ITEMS_NAVIGATION: ItemNavigation[] = [
  {
    id: "accueil",
    libelle: "Accueil & Réception",
    description: "Vérification, tickets et RDV",
    icone: Users,
    rolesAutorises: [
      "ROLE_ADMIN",
      "ROLE_SUPER_ADMIN",
      "ROLE_RECEPTION",
      "ROLE_SECRETAIRE",
      "ROLE_MEDECIN",
      "ROLE_INFIRMIER",
    ],
    sousItems: [
      {
        id: "verification",
        libelle: "Vérification & Contrôle",
        rolesAutorises: ["ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_RECEPTION", "ROLE_SECRETAIRE"],
      },
      {
        id: "tickets",
        libelle: "File d'Attente & Tickets",
        rolesAutorises: ["ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_RECEPTION", "ROLE_SECRETAIRE"],
      },
      {
        id: "rendezvous",
        libelle: "Rendez-vous",
        rolesAutorises: [
          "ROLE_ADMIN",
          "ROLE_SUPER_ADMIN",
          "ROLE_RECEPTION",
          "ROLE_SECRETAIRE",
          "ROLE_MEDECIN",
        ],
      },
      {
        id: "patients",
        libelle: "Dossiers Patients",
        rolesAutorises: [
          "ROLE_ADMIN",
          "ROLE_SUPER_ADMIN",
          "ROLE_RECEPTION",
          "ROLE_SECRETAIRE",
          "ROLE_MEDECIN",
          "ROLE_INFIRMIER",
        ],
      },
      { id: "ecran", libelle: "Écran Salle d'Attente" },
    ],
  },
  {
    id: "infirmerie",
    libelle: "Infirmerie & Soins",
    description: "File de soins et constantes",
    icone: HeartPulse,
    rolesAutorises: ["ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_INFIRMIER"],
    sousItems: [
      { id: "file", libelle: "File de Soins" },
      { id: "constantes", libelle: "Constantes Vitales" },
      { id: "soins", libelle: "Actes & Soins" },
      { id: "historique", libelle: "Historique" },
    ],
  },
  {
    id: "consultation",
    libelle: "Consultations Médecin",
    description: "Examen clinique et diagnostics",
    icone: Stethoscope,
    rolesAutorises: ["ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_MEDECIN"],
    sousItems: [
      { id: "file", libelle: "File d'Attente" },
      { id: "active", libelle: "Consultation Active" },
      { id: "dossiers", libelle: "Dossiers Médicaux" },
    ],
  },
  {
    id: "stock",
    libelle: "Pharmacie & Stocks",
    description: "Inventaire, flux et dispensation",
    icone: Package,
    rolesAutorises: [
      "ROLE_ADMIN",
      "ROLE_SUPER_ADMIN",
      "ROLE_GESTIONNAIRE_STOCK",
      "ROLE_RESPONSABLE_STOCK",
      "ROLE_DISPENSATEUR",
    ],
    sousItems: [
      { id: "niveaux", libelle: "État des Stocks" },
      { id: "dispensation", libelle: "Dispensation" },
      { id: "commandes", libelle: "Commandes" },
      { id: "appro", libelle: "Approvisionnements" },
      { id: "mouvements", libelle: "Mouvements" },
      { id: "transferts", libelle: "Transferts" },
      { id: "ajustements", libelle: "Inventaires" },
      { id: "catalogue", libelle: "Référentiel Médicaments" },
    ],
  },
  {
    id: "administration",
    libelle: "Administration SIH",
    description: "Comptes, sites et référentiels",
    icone: Sliders,
    rolesAutorises: ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"],
    sousItems: [
      { id: "utilisateurs", libelle: "Comptes Utilisateurs" },
      { id: "affectations", libelle: "Affectations" },
      { id: "sites", libelle: "Sites Médicaux" },
      { id: "services", libelle: "Services Médicaux" },
      { id: "entreprises", libelle: "Entreprises" },
      { id: "catalogue", libelle: "Catalogue des Actes" },
      { id: "observations", libelle: "Définitions Observations" },
      { id: "diagnostics", libelle: "Définitions Diagnostics" },
    ],
  },
];

export const BarreLaterale: React.FC<BarreLateraleProps> = ({
  vueActive,
  sousOngletActif,
  onChangerVue,
  reduite,
  onBasculerReduite,
  mobileOuvert,
  onFermerMobile,
}) => {
  const { utilisateur } = useSession();
  const userRoles = utilisateur?.roles ?? [];

  const itemsVisibles = ITEMS_NAVIGATION.filter((item) => {
    if (!item.rolesAutorises) return true;
    return item.rolesAutorises.some((r) => userRoles.includes(r));
  });

  const contenuSidebar = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800">
      {/* En-tête sidebar mobile */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 md:hidden">
        <span className="font-bold text-white text-sm">Navigation Métier</span>
        <button
          type="button"
          onClick={onFermerMobile}
          className="p-1 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bascule réduite (desktop) — en haut */}
      <div className="hidden md:flex p-3 border-b border-slate-800 justify-end">
        <button
          type="button"
          onClick={onBasculerReduite}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title={reduite ? "Agrandir la barre latérale" : "Réduire la barre latérale"}
        >
          {reduite ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {itemsVisibles.map((item) => {
          const estActif = vueActive === item.id;
          const Icone = item.icone;
          const sousItemsVisibles = (item.sousItems ?? []).filter((si) => {
            if (!si.rolesAutorises) return true;
            return si.rolesAutorises.some((r) => userRoles.includes(r));
          });

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => onChangerVue(item.id)}
                title={reduite ? item.libelle : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  estActif
                    ? "bg-emerald-600 text-white font-semibold shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icone
                  className={`w-5 h-5 shrink-0 ${estActif ? "text-white" : "text-slate-400 group-hover:text-emerald-400"}`}
                />
                {!reduite && (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate leading-tight">
                      {item.libelle}
                    </div>
                    <div
                      className={`text-[10px] truncate leading-tight mt-0.5 ${estActif ? "text-emerald-100" : "text-slate-500"}`}
                    >
                      {item.description}
                    </div>
                  </div>
                )}
              </button>

              {estActif && !reduite && sousItemsVisibles.length > 0 && (
                <ul className="mt-1 ml-3 pl-3 border-l border-slate-700/60 space-y-0.5">
                  {sousItemsVisibles.map((si) => {
                    const estSousActif = sousOngletActif === si.id;
                    return (
                      <li key={si.id}>
                        <button
                          type="button"
                          onClick={() => onChangerVue(item.id, si.id)}
                          className={`w-full text-left text-[11px] py-1.5 px-2 rounded-md transition ${
                            estSousActif
                              ? "bg-emerald-700/40 text-emerald-100 font-semibold"
                              : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          {si.libelle}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 select-none ${
          reduite ? "w-16" : "w-60"
        }`}
      >
        {contenuSidebar}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOuvert && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onFermerMobile} />
          <div className="relative w-64 max-w-xs z-10 animate-slide-right">{contenuSidebar}</div>
        </div>
      )}
    </>
  );
};