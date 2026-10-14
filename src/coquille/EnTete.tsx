/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Menu, LogOut } from "lucide-react";
import { useSession } from "@/cerveau/session";

export interface EnTeteProps {
  vueActive: string;
  onBasculerMenuMobile: () => void;
  menuMobileOuvert: boolean;
}

export const EnTete: React.FC<EnTeteProps> = ({
  vueActive,
  onBasculerMenuMobile,
  menuMobileOuvert,
}) => {
  const { utilisateur, deconnecter } = useSession();

  const getLibelleVue = () => {
    switch (vueActive) {
      case "accueil":
        return "Accueil & Réception";
      case "infirmerie":
        return "Infirmerie & Soins";
      case "consultation":
        return "Consultations Médicales";
      case "stock":
        return "Pharmacie & Stocks";
      case "administration":
        return "Administration SIH";
      default:
        return "Système Hospitalier";
    }
  };

  const initiales = utilisateur?.nom ? utilisateur.nom.slice(0, 2).toUpperCase() : "U";

  const rolePrincipal = utilisateur?.roles?.[0]?.replace("ROLE_", "") || "UTILISATEUR";

  return (
    <header className="bg-white border-b border-[#D2E6D6] shadow-xs px-4 sm:px-6 py-2 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0">
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-4">
          {/* Logo ASINA (le PNG a des marges internes : on les compense pour ne pas gonfler l'en-tête) */}
          <img
            src="/images/logo-sans-txt.png"
            alt="ASINA – Association Sanitaire Interentreprises d'Antananarivo"
            className="h-16 w-auto -my-2 -ml-2 select-none shrink-0"
            draggable={false}
          />

          <div className="hidden sm:block h-8 w-px bg-[#D2E6D6]" aria-hidden="true" />

          <div>
            <h1 className="sr-only">ASINA</h1>
            <span className="text-[11px] text-slate-500 font-medium block leading-none">
              Association Sanitaire Interentreprises d'Antananarivo
            </span>
            <span className="text-sm text-[#1E7F3A] font-bold block mt-1 leading-tight">
              {getLibelleVue()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onBasculerMenuMobile}
            className="p-2 rounded-lg bg-[#E4F3E8] border border-[#C5E2CC] hover:bg-[#D3EBD9] text-[#14532D] transition duration-200 cursor-pointer flex items-center gap-1.5 font-bold text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2FA14A]"
            title={menuMobileOuvert ? "Fermer le menu" : "Afficher le menu"}
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>
        </div>
      </div>

      {/* Profil */}
      <div className="flex flex-wrap items-center justify-end w-full md:w-auto gap-3">
        {/* Badge Utilisateur & Déconnexion */}
        <div className="flex items-center gap-3 border-l border-[#D2E6D6] pl-3">
          <div className="hidden sm:block text-right">
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              {utilisateur?.nom || utilisateur?.email || "Personnel"}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
              {rolePrincipal}
            </span>
          </div>

          <div
            className="h-8 w-8 rounded-lg bg-[#1E7F3A] text-white flex items-center justify-center font-bold text-xs select-none shadow-2xs"
            title={utilisateur?.nom || ""}
          >
            {initiales}
          </div>

          <button
            type="button"
            onClick={deconnecter}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};