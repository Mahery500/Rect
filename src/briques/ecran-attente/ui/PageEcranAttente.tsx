/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AffichageEcranSalleAttente } from "./AffichageEcranSalleAttente";
import { obtenirJetonJwt, obtenirSiteActifId } from "@/noyau/http/session";

export const PageEcranAttente: React.FC = () => {
  const isAuthenticated = !!obtenirJetonJwt();
  const siteId = obtenirSiteActifId();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-lg font-bold text-slate-300">Session requise</div>
          <p className="text-sm text-slate-500">
            Connectez-vous d'abord sur le poste accueil, puis rechargez cette page.
          </p>
          <a
            href="/"
            className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold transition text-white"
          >
            Aller à la connexion
          </a>
        </div>
      </div>
    );
  }

  if (!siteId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-lg font-bold text-slate-300">Aucun site actif configuré</div>
          <p className="text-sm text-slate-500">
            Sélectionnez un site dans l’en-tête de l’application principale avant d’ouvrir cet
            écran.
          </p>
          <a
            href="/"
            className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold transition text-white"
          >
            Retourner à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <AffichageEcranSalleAttente siteId={siteId} />
    </div>
  );
};

export default PageEcranAttente;
