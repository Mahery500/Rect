/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Megaphone, Clock, Maximize2, Minimize2, Shield, Volume2 } from "lucide-react";
import { useEcranAttente } from "../hooks/useEcranAttente";
import { jouerCarillonFile } from "@/noyau/utils/carillon";

export interface AffichageEcranSalleAttenteProps {
  siteId: number;
}

export const AffichageEcranSalleAttente: React.FC<AffichageEcranSalleAttenteProps> = ({
  siteId,
}) => {
  const { enAttente, dernierAppele, heureCourante, dateCourante } = useEcranAttente(siteId);

  const [estPleinEcran, setEstPleinEcran] = useState(false);

  const basculerPleinEcran = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setEstPleinEcran(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setEstPleinEcran(false))
        .catch(() => {});
    }
  };

  const testerSon = () => {
    jouerCarillonFile();
  };

  return (
    <div className="bg-slate-950 text-white min-h-[85vh] rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-850 flex flex-col justify-between space-y-8 select-none">
      {/* Barre supérieure : Branding, Horloge et Contrôles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-asina-600 border border-asina-400/40 flex items-center justify-center font-black text-white text-2xl shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white font-sans flex items-center gap-2">
              <span>ASINA SANTÉ AU TRAVAIL</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-asina-500/20 text-asina-300 border border-asina-400/30">
                SALLE D'ATTENTE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Système d'Appel Numéroté & Orientation Médicale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider">
              {heureCourante}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {dateCourante}
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
            <button
              type="button"
              onClick={testerSon}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Tester le carillon audio"
              aria-label="Tester le carillon audio"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={basculerPleinEcran}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Mode plein écran moniteur"
              aria-label={estPleinEcran ? "Quitter le plein écran" : "Passer en plein écran"}
            >
              {estPleinEcran ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hero : Dernier Ticket Appelé (affiché en très gros) */}
      {dernierAppele ? (
        <div className="relative overflow-hidden bg-linear-to-r from-emerald-950 via-slate-900 to-slate-900 border-2 border-emerald-500 rounded-3xl p-8 sm:p-10 shadow-2xl animate-fade-in">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-black uppercase tracking-widest">
                <Megaphone className="h-4 w-4 animate-bounce" />
                <span>Ticket en cours d'appel</span>
              </div>

              <div className="text-7xl sm:text-8xl md:text-9xl font-black font-mono tracking-wider text-white drop-shadow-md">
                {dernierAppele.numTicket}
              </div>

              {dernierAppele.patientNom && (
                <div className="text-xl font-bold text-slate-200">{dernierAppele.patientNom}</div>
              )}
            </div>

            <div className="text-center md:text-right bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl">
              <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider block">
                Veuillez vous présenter au service :
              </span>
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 block mt-2 tracking-wide">
                {dernierAppele.serviceNom}
              </span>
              <span className="text-xs text-slate-400 block mt-3 italic">
                Appelé à {dernierAppele.heureAffichee}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 border border-dashed border-slate-800 rounded-3xl space-y-2">
          <Clock className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-lg font-bold text-slate-300">En attente d'appel</p>
          <p className="text-xs text-slate-500">
            Les numéros de tickets apparaîtront automatiquement sur cet écran lors de votre appel.
          </p>
        </div>
      )}

      {/* Prochains passages (affichés en petit) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Prochains passages</span>
          </h3>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {enAttente.length}
          </span>
        </div>

        {enAttente.length === 0 ? (
          <div className="text-center p-6 text-xs text-slate-500">
            Aucun patient en attente pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {enAttente.slice(0, 12).map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-1"
              >
                <span className="font-mono text-2xl font-bold text-slate-200 tracking-wider">
                  {t.numTicket}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider text-center truncate w-full">
                  {t.serviceNom}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barre de pied */}
      <div className="border-t border-slate-800/80 pt-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p>
          Merci de garder votre ticket en main et de préparer votre pièce d'identité ou badge
          employeur.
        </p>
        <span className="font-mono text-[10px] text-slate-600 font-bold">
          ASINA SIH • SYSTÈME SÉCURISÉ
        </span>
      </div>
    </div>
  );
};

export default AffichageEcranSalleAttente;
