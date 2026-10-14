/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Ticket,
  Volume2,
  Users,
  Clock,
  Tv,
  Plus,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertCircle,
  Megaphone,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useTicketsAccueil } from "../hooks/useTicketsAccueil";
import { FormulaireNouveauTicketModale } from "./FormulaireNouveauTicketModale";

export interface PanneauTicketsAccueilProps {
  mode?: ModeAffichage;
  siteId?: number;
}

export const PanneauTicketsAccueil: React.FC<PanneauTicketsAccueilProps> = ({
  mode = "edition",
  siteId,
}) => {
  const estLectureSeule = mode === "lecture";

  const {
    enAttente,
    enCours,
    tousEnAttente,
    tousEnCours,
    statistiques,
    chargement,
    actionEnCours,
    filtreService,
    setFiltreService,
    patients,
    services,
    recharger,
    emettreTicket,
    appelerTicket,
  } = useTicketsAccueil(siteId);

  const [vueActive, setVueActive] = useState<"guichet" | "ecran">("guichet");
  const [modaleTicketOuverte, setModaleTicketOuverte] = useState(false);

  const ouvrirFenetreEcran = () => {
    window.open("/ecran-attente", "asina-ecran-attente", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-asina-600" />
            <span>Gestion de la File d'Attente & Tickets</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervision des aiguillages patients en temps réel, appel vocal des tickets au guichet
            et orientation vers les services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={chargement}
            onClick={recharger}
            className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Actualiser la file d'attente"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={ouvrirFenetreEcran}
            className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Ouvrir l'écran d'affichage dédié dans une fenêtre séparée"
          >
            <Tv className="h-4 w-4 text-asina-600" />
            <span>Écran Salle d'Attente</span>
          </button>

          {!estLectureSeule && (
            <button
              type="button"
              onClick={() => setModaleTicketOuverte(true)}
              className="btn-primary py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Émettre un Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartes de statistiques & Sous-navigation */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Métriques */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                En attente
              </span>
              <div className="text-xl font-black text-amber-700">{statistiques.totalEnAttente}</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                En cours d'appel
              </span>
              <div className="text-xl font-black text-emerald-700">{statistiques.totalEnCours}</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Services actifs
              </span>
              <div className="text-xl font-black text-blue-700">{services.length}</div>
            </div>
          </div>
        </div>

        {/* Sélecteur de sous-vue et filtre service */}
        <div className="flex items-center gap-2">
          {/* Bascule vue guichet / aperçu écran */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setVueActive("guichet")}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                vueActive === "guichet"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Guichet d'Appel</span>
            </button>
            <button
              type="button"
              onClick={() => setVueActive("ecran")}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                vueActive === "ecran"
                  ? "bg-white text-asina-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>Aperçu Écran</span>
            </button>
          </div>

          {/* Filtre service */}
          <select
            value={filtreService}
            onChange={(e) => setFiltreService(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Tous les services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenu principal selon la vue */}
      {vueActive === "guichet" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne Gauche : Tickets En Cours (appelés / au guichet) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4.5 w-4.5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Tickets En Cours d'Appel
                  </h3>
                </div>

                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-2 py-0.5 rounded-full">
                  {enCours.length}
                </span>
              </div>

              {enCours.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                  <CheckCircle2 className="h-7 w-7 text-slate-300 mx-auto mb-1" />
                  <p className="font-semibold text-slate-600">Aucun patient au guichet</p>
                  <p className="text-[11px]">
                    Les tickets pris en charge par les professionnels apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enCours.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black font-mono text-emerald-950">
                            {a.numTicket}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                            Au guichet
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-xs">
                          {a.patientNom || `Patient #${a.patientId}`}
                        </div>

                        <div className="text-[11px] text-slate-600 flex items-center gap-2">
                          <span className="font-semibold text-emerald-700">{a.serviceNom}</span>
                          <span>•</span>
                          <span className="text-slate-400">Appelé à {a.heureAffichee}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => appelerTicket(a)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-2xs shrink-0"
                        title="Rejouer l'annonce vocale en salle d'attente"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>Rappeler</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne Droite : Tickets En Attente */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    File d'Attente (Salle d'Attente)
                  </h3>
                </div>

                <span className="font-mono text-[10px] bg-amber-50 text-amber-700 font-bold border border-amber-200 px-2 py-0.5 rounded-full">
                  {enAttente.length}
                </span>
              </div>

              {enAttente.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                  <Clock className="h-7 w-7 text-slate-300 mx-auto mb-1" />
                  <p className="font-semibold text-slate-600">Salle d'attente vide</p>
                  <p className="text-[11px]">
                    Aucun patient en attente pour le service sélectionné.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">N° Ticket</th>
                        <th className="py-2.5 px-3">Patient Adhérent</th>
                        <th className="py-2.5 px-3">Service Destinataire</th>
                        <th className="py-2.5 px-3">Arrivée</th>
                        <th className="py-2.5 px-3 text-right">Attente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enAttente.map((a, index) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-black text-sm text-asina-700">
                              {a.numTicket}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">
                              {a.patientNom || `Patient #${a.patientId}`}
                            </div>
                            {a.patientMatricule && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {a.patientMatricule}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-slate-700 font-medium">{a.serviceNom}</td>

                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {a.heureAffichee}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.dureeAttenteMinutes > 30
                                  ? "bg-rose-100 text-rose-800"
                                  : a.dureeAttenteMinutes > 15
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {a.dureeAttenteMinutes} min
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Aperçu Écran Salle d'Attente */
        <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-10 shadow-2xl border border-slate-800 space-y-8 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-asina-600 rounded-xl flex items-center justify-center font-black text-white text-xl">
                A
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-wider text-white">
                  ASINA MÉDICAL • SALLE D'ATTENTE
                </h1>
                <p className="text-xs text-slate-400">
                  Système d'Appel Numéroté & Orientation Médicale
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-xl font-bold text-white">
                {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-[11px] text-slate-400 uppercase">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
            </div>
          </div>

          {/* Ticket en vedette */}
          {enCours.length > 0 ? (
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div>
                <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  <span>Dernier Ticket Appelé</span>
                </div>
                <div className="text-6xl sm:text-7xl font-black font-mono tracking-wider text-white mt-2">
                  {enCours[0].numTicket}
                </div>
                <div className="text-base text-slate-300 font-semibold mt-2">
                  {enCours[0].patientNom || "Patient"}
                </div>
              </div>

              <div className="text-center md:text-right bg-white/5 border border-white/10 rounded-xl p-5">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                  Veuillez vous présenter au service
                </span>
                <span className="text-2xl font-black text-emerald-400 block mt-1">
                  {enCours[0].serviceNom}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              En attente du prochain appel patient.
            </div>
          )}

          {/* Tableaux côte à côte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>En cours de consultation ({enCours.length})</span>
              </h4>
              <div className="space-y-2">
                {enCours.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-800/60 rounded-lg flex items-center justify-between"
                  >
                    <span className="font-mono text-xl font-black text-emerald-400">
                      {t.numTicket}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">{t.serviceNom}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Prochains tickets en attente ({enAttente.length})</span>
              </h4>
              <div className="space-y-2">
                {enAttente.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-800/60 rounded-lg flex items-center justify-between"
                  >
                    <span className="font-mono text-xl font-bold text-slate-300">
                      {t.numTicket}
                    </span>
                    <span className="text-xs text-slate-400">{t.serviceNom}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'émission de ticket */}
      <FormulaireNouveauTicketModale
        ouvert={modaleTicketOuverte}
        patients={patients}
        services={services}
        onFermer={() => setModaleTicketOuverte(false)}
        onEnregistrer={emettreTicket}
      />
    </div>
  );
};
