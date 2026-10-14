/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { QueueDisplayScreen } from "@/modules/patients";
import { getStoredJwtToken } from "@/core/http";

/**
 * Route standalone `/ecran-attente`.
 *
 * Pensée pour être ouverte dans une fenêtre séparée du navigateur sur le
 * 2e moniteur du PC de l'accueil (mode plein écran navigateur, F11).
 * Volontairement SANS MainLayout/AppSidebar : c'est un écran d'affichage
 * passif pour les patients, pas un poste de travail.
 *
 * L'auth réutilise le JWT déjà stocké en localStorage (partagé entre
 * fenêtres de la même origine) — pas de nouvelle connexion nécessaire
 * si l'agent d'accueil est déjà connecté sur le poste.
 */
export const QueueDisplayPage: React.FC = () => {
  const isAuthenticated = !!getStoredJwtToken();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-lg font-bold text-slate-300">Session requise</div>
          <p className="text-sm text-slate-500">
            Connecte-toi d'abord sur le poste accueil (onglet principal), puis recharge cette page.
          </p>
          <a
            href="/"
            className="inline-block mt-2 px-4 py-2 bg-asina-600 hover:bg-asina-700 rounded-lg text-xs font-bold transition"
          >
            Aller à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <QueueDisplayScreen />
    </div>
  );
};

export default QueueDisplayPage;
