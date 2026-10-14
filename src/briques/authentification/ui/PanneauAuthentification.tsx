/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { FormulaireConnexion } from "./FormulaireConnexion";
import { UtilisateurConnecte } from "../modele/authentification.types";

export interface PanneauAuthentificationProps {
  mode?: ModeAffichage;
  onConnexionReussie?: (utilisateur: UtilisateurConnecte) => void;
}

/**
 * Couleurs tirées du logo ASINA :
 *  bleu  #1BB0EC  |  vert  #2FA14A  |  ambre #FBB74A  |  encre #0E2F44
 */

/** Croix médicale du logo, utilisée en filigrane. */
const CroixFiligrane: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" className={className} fill="currentColor">
    <path d="M38 0h24v38h38v24H62v38H38V62H0V38h38z" />
  </svg>
);

export const PanneauAuthentification: React.FC<PanneauAuthentificationProps> = ({
  mode = "edition",
  onConnexionReussie,
}) => {
  if (mode === "masque") {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F1F8F3] flex items-center justify-center p-4 sm:p-6 md:p-10 text-[#0E2F44] font-sans">
      {/* Croix en filigrane sur le fond de page */}
      <CroixFiligrane className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 text-[#2FA14A]/[0.08]" />
      <CroixFiligrane className="pointer-events-none absolute -right-28 -bottom-28 h-[26rem] w-[26rem] text-[#2FA14A]/[0.10]" />

      <div className="relative w-full max-w-5xl bg-white rounded-[28px] border border-[#D2E6D6] shadow-[0_30px_70px_-25px_rgba(20,83,45,0.35)] overflow-hidden flex flex-col md:flex-row animate-fade-in">
        {/* ─── Colonne identité ─── */}
        <aside className="relative md:w-[46%] bg-[#E4F3E8] px-8 py-12 sm:px-12 flex flex-col items-center justify-center text-center overflow-hidden">
          <CroixFiligrane className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 text-[#2FA14A]/[0.14]" />
          <CroixFiligrane className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 text-[#2FA14A]/[0.12]" />

          <img
            src="/images/asina-logo.png"
            alt="ASINA – Association Sanitaire Interentreprises d'Antananarivo"
            className="relative w-56 sm:w-64 md:w-72 h-auto select-none"
            draggable={false}
          />

          {/* Signature tricolore : bleu / vert / ambre */}
          <div className="relative mt-1 flex h-1.5 w-28 overflow-hidden rounded-full" aria-hidden="true">
            <span className="flex-[3] bg-[#2FA14A]" />
            <span className="flex-1 bg-[#1BB0EC]" />
            <span className="flex-1 bg-[#FBB74A]" />
          </div>

          <h2 className="relative mt-8 max-w-xs text-xl sm:text-2xl font-bold leading-snug tracking-tight text-[#14532D]">
            Le dossier de santé de vos équipes, réuni au même endroit
          </h2>
          <p className="relative mt-3 max-w-xs text-sm leading-relaxed text-[#0E2F44]/70">
            Dossiers patients, rendez-vous et stock : tout se gère depuis votre espace.
          </p>
        </aside>

        {/* ─── Colonne formulaire ─── */}
        <main className="flex-1 flex flex-col justify-center bg-white px-6 py-12 sm:px-12 md:px-16">
          <div className="w-full max-w-sm mx-auto">
            <FormulaireConnexion onConnexionReussie={onConnexionReussie} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PanneauAuthentification;