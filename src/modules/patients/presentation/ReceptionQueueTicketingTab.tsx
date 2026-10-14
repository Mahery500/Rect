/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Ticket,
  Volume2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RotateCcw,
  Tv,
  Printer,
  Sparkles,
  ArrowRight,
  UserCheck,
  Check,
  X,
} from "lucide-react";
import { ASINAState } from "@/core/types";
import {
  QueueTicket,
  QueueTicketPriority,
  QueueTicketServiceCode,
} from "@/core/types/ticketing.types";
import { queueTicketingService } from "@/modules/ticketing/application/queueTicketing.service";
import { playQueueChime } from "@/core/utils/audioChime";
import { QueueDisplayScreen } from "./QueueDisplayScreen";

interface ReceptionQueueTicketingTabProps {
  state: ASINAState;
  triggerNotification?: (type: "success" | "error", text: string) => void;
}

export const ReceptionQueueTicketingTab: React.FC<ReceptionQueueTicketingTabProps> = ({
  state,
  triggerNotification,
}) => {
  const [tickets, setTickets] = useState<QueueTicket[]>(() => queueTicketingService.getAll());
  const [activeSubView, setActiveSubView] = useState<"guichet" | "borne" | "ecran">("guichet");
  const [activeCounter, setActiveCounter] = useState<number>(1);
  const [filterService, setFilterService] = useState<string>("ALL");

  // Kiosk form states
  const [selectedServiceCode, setSelectedServiceCode] =
    useState<QueueTicketServiceCode>("CONSULTATION");
  const [kioskPriority, setKioskPriority] = useState<QueueTicketPriority>("normal");
  const [kioskPatientName, setKioskPatientName] = useState<string>("");
  const [issuedTicketModal, setIssuedTicketModal] = useState<QueueTicket | null>(null);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = queueTicketingService.subscribe(() => {
      setTickets(queueTicketingService.getAll());
    });
    return unsubscribe;
  }, []);

  const waitingTickets = tickets.filter((t) => t.status === "en_attente");
  const calledTickets = tickets.filter((t) => t.status === "appele" || t.status === "en_cours");
  const currentCounterTicket = calledTickets.find((t) => t.counterNumber === activeCounter);

  const serviceDefinitions: Array<{
    code: QueueTicketServiceCode;
    label: string;
    letter: string;
    description: string;
    color: string;
  }> = [
    {
      code: "CONSULTATION",
      label: "Consultation Médecine Générale",
      letter: "A",
      description: "Consultation médicale, examen clinique, ordonnance",
      color: "bg-blue-500 text-white border-blue-600",
    },
    {
      code: "INFIRMERIE",
      label: "Infirmerie & Constantes",
      letter: "B",
      description: "Prise de constantes, pansements, injections, soins",
      color: "bg-emerald-500 text-white border-emerald-600",
    },
    {
      code: "APTITUDE",
      label: "Médecine du Travail / Aptitude",
      letter: "C",
      description: "Visite d'embauche, périodique, reprise de travail",
      color: "bg-purple-500 text-white border-purple-600",
    },
    {
      code: "PHARMACIE",
      label: "Délivrance Pharmacie",
      letter: "D",
      description: "Retrait des médicaments et consommables prescrits",
      color: "bg-amber-500 text-white border-amber-600",
    },
    {
      code: "SECRETARIAT",
      label: "Accueil & Renseignements",
      letter: "E",
      description: "Création dossier, attestations, orientation générale",
      color: "bg-asina-600 text-white border-asina-700",
    },
  ];

  // Call next ticket
  const handleCallNext = (serviceCode?: QueueTicketServiceCode) => {
    const called = queueTicketingService.callNext(serviceCode, activeCounter);
    if (called) {
      playQueueChime();
      if (triggerNotification) {
        triggerNotification(
          "success",
          `Ticket ${called.number} appelé au Guichet ${activeCounter}`,
        );
      }
    } else {
      if (triggerNotification) {
        triggerNotification("error", "Aucun ticket en attente pour cette file");
      }
    }
  };

  // Re-call / Chime
  const handleRecall = (ticket: QueueTicket) => {
    playQueueChime();
    queueTicketingService.callTicket(ticket.id, activeCounter);
    if (triggerNotification) {
      triggerNotification("success", `Rappel sonore émis pour le ticket ${ticket.number}`);
    }
  };

  // Set status
  const handleSetStatus = (ticketId: string, status: any) => {
    queueTicketingService.setStatus(ticketId, status);
  };

  // Issue ticket from kiosk
  const handleIssueTicket = (srvCode: QueueTicketServiceCode) => {
    const srv = serviceDefinitions.find((s) => s.code === srvCode);
    if (!srv) return;

    const newT = queueTicketingService.issueTicket({
      serviceCode: srv.code,
      serviceLabel: srv.label,
      priority: kioskPriority,
      patientName: kioskPatientName.trim() || undefined,
    });

    setIssuedTicketModal(newT);
    setKioskPatientName("");
    setKioskPriority("normal");
  };

  return (
    <div className="space-y-6">
      {/* Sub navigation between Guichet, Borne Kiosk, and TV Screen */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubView("guichet")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-2 ${
              activeSubView === "guichet"
                ? "bg-white text-asina-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guichet d'Appel Agent</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView("borne")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-2 ${
              activeSubView === "borne"
                ? "bg-white text-asina-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Borne de Distribution</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView("ecran")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-2 ${
              activeSubView === "ecran"
                ? "bg-white text-asina-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-emerald-600" />
            <span>Écran Salle d'Attente</span>
          </button>
        </div>

        {/* Counter selector & statistics */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Mon Guichet :</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setActiveCounter(num)}
                  className={`w-7 h-7 rounded-md text-xs font-bold transition cursor-pointer ${
                    activeCounter === num
                      ? "bg-asina-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  G{num}
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <button
            type="button"
            onClick={() => playQueueChime()}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title="Tester le carillon sonore (Chime)"
          >
            <Volume2 className="w-4 h-4 text-asina-600" />
          </button>
        </div>
      </div>

      {/* 1. GUICHET D'APPEL (OPERATIONAL VIEW FOR DESK AGENT) */}
      {activeSubView === "guichet" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Call Console at current counter */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Guichet Actif :{" "}
                    <span className="text-asina-600 font-extrabold">N° {activeCounter}</span>
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600">
                  {waitingTickets.length} en attente globale
                </span>
              </div>

              {/* Display of current called ticket */}
              {currentCounterTicket ? (
                <div className="bg-gradient-to-br from-asina-50 to-teal-50/40 rounded-2xl border-2 border-asina-300 p-6 text-center space-y-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-asina-700">
                    Numéro en Traitement
                  </span>
                  <div className="text-5xl font-black font-mono tracking-tight text-asina-900 animate-pulse">
                    {currentCounterTicket.number}
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {currentCounterTicket.serviceLabel}
                  </div>
                  {currentCounterTicket.patientName && (
                    <div className="text-xs text-slate-500 font-medium">
                      Adhérent :{" "}
                      <span className="text-slate-800 font-semibold">
                        {currentCounterTicket.patientName}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRecall(currentCounterTicket)}
                      className="px-3.5 py-2 bg-asina-600 hover:bg-asina-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Rappeler le Ticket</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetStatus(currentCounterTicket.id, "termine")}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Terminer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetStatus(currentCounterTicket.id, "absent")}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      title="Marquer comme absent"
                    >
                      <X className="w-4 h-4" />
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-400 flex items-center justify-center mx-auto">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    Guichet libre — Aucun ticket en cours
                  </div>
                  <p className="text-xs text-slate-400">
                    Appelez le prochain ticket de la file d'attente pour commencer.
                  </p>
                </div>
              )}

              {/* Call Next Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCallNext()}
                  className="w-full py-3 px-4 bg-asina-600 hover:bg-asina-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Appeler le Prochain Ticket (Toutes Files)</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCallNext("CONSULTATION")}
                    className="p-2.5 text-left border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between"
                  >
                    <span>Consultation [A]</span>
                    <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-[10px]">
                      {waitingTickets.filter((t) => t.serviceCode === "CONSULTATION").length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCallNext("INFIRMERIE")}
                    className="p-2.5 text-left border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between"
                  >
                    <span>Infirmerie [B]</span>
                    <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-[10px]">
                      {waitingTickets.filter((t) => t.serviceCode === "INFIRMERIE").length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCallNext("APTITUDE")}
                    className="p-2.5 text-left border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-900 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between"
                  >
                    <span>Aptitude [C]</span>
                    <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-[10px]">
                      {waitingTickets.filter((t) => t.serviceCode === "APTITUDE").length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCallNext("PHARMACIE")}
                    className="p-2.5 text-left border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between"
                  >
                    <span>Pharmacie [D]</span>
                    <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-[10px]">
                      {waitingTickets.filter((t) => t.serviceCode === "PHARMACIE").length}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Real-time Queue Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">File d'Attente Actuelle</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualisation temps réel des patients enregistrés avec leur rang de passage
                </p>
              </div>

              {/* Filter by service */}
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white font-medium"
              >
                <option value="ALL">Tous les Services</option>
                <option value="CONSULTATION">Médecine Générale (A)</option>
                <option value="INFIRMERIE">Infirmerie & Constantes (B)</option>
                <option value="APTITUDE">Médecine du Travail (C)</option>
                <option value="PHARMACIE">Pharmacie (D)</option>
                <option value="SECRETARIAT">Accueil & Secrétariat (E)</option>
              </select>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {waitingTickets.filter(
                (t) => filterService === "ALL" || t.serviceCode === filterService,
              ).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Aucun patient en attente dans cette file actuellement.
                </div>
              ) : (
                waitingTickets
                  .filter((t) => filterService === "ALL" || t.serviceCode === filterService)
                  .map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-asina-300 bg-slate-50/70 hover:bg-asina-50/40 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="font-mono font-black text-lg text-slate-900">
                          {t.number}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{t.serviceLabel}</div>
                          <div className="text-[11px] text-slate-500">
                            {t.patientName || "Adhérent"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {t.priority !== "normal" && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.priority === "urgence"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {t.priority}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(t.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            queueTicketingService.callTicket(t.id, activeCounter);
                            playQueueChime();
                          }}
                          className="px-3 py-1 bg-white hover:bg-asina-600 hover:text-white border border-slate-300 text-asina-700 font-bold rounded-lg transition cursor-pointer text-xs shadow-2xs"
                        >
                          Appeler
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. BORNE DE DISTRIBUTION (KIOSK / TICKETING TERMINAL) */}
      {activeSubView === "borne" && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border-2 border-slate-300 p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2 border-b border-slate-200 pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-asina-50 text-asina-700 text-xs font-bold border border-asina-200">
              <Sparkles className="w-3.5 h-3.5 text-asina-600" />
              <span>Borne Tactile d'Accueil ASINA</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Bienvenue au Centre Médical ASINA
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Veuillez sélectionner le motif de votre visite pour obtenir votre ticket numéroté de
              file d'attente.
            </p>
          </div>

          {/* Quick optional patient name and priority toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nom & Prénom (Facultatif)
              </label>
              <input
                type="text"
                value={kioskPatientName}
                onChange={(e) => setKioskPatientName(e.target.value)}
                placeholder="Ex: RAKOTO Hery"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priorité Spéciale</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "normal", label: "Standard" },
                  { id: "prioritaire", label: "PMR / Enceinte" },
                  { id: "urgence", label: "Urgence" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setKioskPriority(p.id as any)}
                    className={`py-2 px-1 text-center rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                      kioskPriority === p.id
                        ? "bg-asina-600 text-white border-asina-700 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Service Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceDefinitions.map((srv) => {
              const countWaiting = waitingTickets.filter((t) => t.serviceCode === srv.code).length;
              return (
                <button
                  key={srv.code}
                  type="button"
                  onClick={() => handleIssueTicket(srv.code)}
                  className="p-5 rounded-2xl border-2 border-slate-200 hover:border-asina-500 bg-slate-50 hover:bg-asina-50/40 transition-all text-left flex items-start justify-between gap-4 cursor-pointer group shadow-2xs hover:shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-8 h-8 rounded-xl font-mono font-black text-sm flex items-center justify-center shadow-xs ${srv.color}`}
                      >
                        {srv.letter}
                      </span>
                      <span className="font-bold text-sm text-slate-900 group-hover:text-asina-700 transition">
                        {srv.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-10">{srv.description}</p>
                  </div>

                  <span className="text-[10px] font-bold font-mono px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                    {countWaiting} en attente
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ÉCRAN SALLE D'ATTENTE (aperçu — la version plein écran vit sur la route /ecran-attente) */}
      {activeSubView === "ecran" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">
              Aperçu de l'écran salle d'attente. Pour l'afficher en plein écran sur le 2<sup>e</sup>{" "}
              moniteur, ouvre{" "}
              <code className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
                /ecran-attente
              </code>{" "}
              dans une nouvelle fenêtre du navigateur.
            </p>
            <a
              href="/ecran-attente"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-asina-600 hover:bg-asina-700 text-white transition"
            >
              <Tv className="w-3.5 h-3.5" />
              Ouvrir en plein écran
            </a>
          </div>
          <QueueDisplayScreen />
        </div>
      )}

      {/* Simulated Thermal Ticket Modal upon dispensing */}
      {issuedTicketModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-fade-in text-center">
            {/* Ticket receipt design */}
            <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-4 font-mono text-slate-800 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <div className="font-black text-base tracking-wider uppercase">ASINA MEDICAL</div>
                <div className="text-[10px] text-slate-500">Système de File d'Attente</div>
              </div>

              <div className="py-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Votre Numéro
                </div>
                <div className="text-5xl font-black text-slate-900 tracking-tight my-1">
                  {issuedTicketModal.number}
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  {issuedTicketModal.serviceLabel}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 border-t border-dashed border-slate-400 pt-3 space-y-1">
                <div>
                  Date : {new Date(issuedTicketModal.createdAt).toLocaleDateString("fr-FR")}{" "}
                  {new Date(issuedTicketModal.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div>
                  Tickets avant vous :{" "}
                  <span className="font-bold text-slate-800">
                    {
                      waitingTickets.filter((t) => t.serviceCode === issuedTicketModal.serviceCode)
                        .length
                    }
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 mt-2 italic">
                  Merci de conserver ce ticket et de vous présenter au guichet lors de l'appel.
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIssuedTicketModal(null)}
                className="w-full py-2.5 bg-asina-600 hover:bg-asina-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                Fermer & Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionQueueTicketingTab;
