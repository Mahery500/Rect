/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { QueueTicket } from "@/core/types/ticketing.types";
import { queueTicketingService } from "@/modules/ticketing/application/queueTicketing.service";

/**
 * Écran d'affichage de la file d'attente (salle d'attente).
 *
 * Composant purement présentationnel et autonome : il s'abonne lui-même au
 * queueTicketingService, donc il peut être monté aussi bien :
 *  - en sous-onglet dans ReceptionQueueTicketingTab (aperçu depuis le poste accueil)
 *  - en route standalone plein écran pour un second moniteur (voir QueueDisplayPage)
 */
export const QueueDisplayScreen: React.FC = () => {
  const [tickets, setTickets] = useState<QueueTicket[]>(() => queueTicketingService.getAll());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const unsubscribe = queueTicketingService.subscribe(() => {
      setTickets(queueTicketingService.getAll());
    });
    return unsubscribe;
  }, []);

  // Horloge live (utile en kiosque plein écran, affiché en continu)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  const waitingTickets = tickets.filter((t) => t.status === "en_attente");
  const calledTickets = tickets.filter((t) => t.status === "appele" || t.status === "en_cours");

  return (
    <div className="bg-slate-950 text-white rounded-3xl p-8 shadow-2xl border border-slate-800 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-asina-600 rounded-xl flex items-center justify-center font-black text-white text-xl">
            A
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider">
              ASINA MEDICAL • SALLE D'ATTENTE
            </h1>
            <p className="text-xs text-slate-400">
              Système d'Appel Numéroté & Orientation Médicale
            </p>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-2xl font-black text-emerald-400">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-xs text-slate-400">
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* Main Giant Call Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 bg-gradient-to-br from-asina-900/60 to-slate-900 border-2 border-asina-500/80 rounded-3xl p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
              APPEL EN COURS
            </span>
          </div>

          {calledTickets[0] ? (
            <>
              <div className="text-base font-extrabold uppercase tracking-widest text-slate-300">
                NUMÉRO APPELÉ
              </div>
              <div className="text-7xl sm:text-8xl font-black font-mono tracking-tight text-white py-2 animate-bounce">
                {calledTickets[0].number}
              </div>
              <div className="text-2xl font-black text-emerald-400 uppercase tracking-wide">
                GUICHET {calledTickets[0].counterNumber || 1}
              </div>
              <div className="text-base font-semibold text-slate-300">
                {calledTickets[0].serviceLabel}
              </div>
            </>
          ) : (
            <div className="py-12 space-y-3">
              <div className="text-3xl font-black text-slate-400">MERCI DE PATIENTER</div>
              <p className="text-sm text-slate-500">
                Les prochains numéros s'afficheront dès leur appel au guichet.
              </p>
            </div>
          )}
        </div>

        {/* Waiting list side panel */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Prochains Tickets en Attente</span>
            <span className="font-mono text-emerald-400">{waitingTickets.length} au total</span>
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {waitingTickets.slice(0, 6).map((t, idx) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-700 font-bold text-xs flex items-center justify-center text-slate-300">
                    {idx + 1}
                  </span>
                  <span className="font-mono font-black text-lg text-white">{t.number}</span>
                  <span className="text-xs text-slate-300 font-medium">{t.serviceLabel}</span>
                </div>
                {t.priority !== "normal" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                    Prioritaire
                  </span>
                )}
              </div>
            ))}

            {waitingTickets.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 italic">
                Aucun ticket en attente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueDisplayScreen;
