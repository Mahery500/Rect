/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  User,
  Stethoscope,
  Activity,
  Ticket,
  CreditCard,
  Package,
  ShieldCheck,
  Clock,
  Calendar,
  MapPin,
  LifeBuoy,
  BarChart3,
  Users,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { ASINAState, User_ } from "@/core/types";
import {
  DashboardOverviewCards,
  DashboardServiceChart,
  DashboardSpecialityChart,
  DashboardOccupationalRisks,
} from "@/modules/dashboard";
import { queueTicketingService } from "@/modules/ticketing/application/queueTicketing.service";
import { supportTicketingService } from "@/modules/ticketing/application/supportTicketing.service";
import { QueueTicket, SupportTicket } from "@/core/types/ticketing.types";

export interface DashboardPageProps {
  state: ASINAState;
  activeSiteId: number;
  activeUser?: User_ | null;
  onNavigate?: (view: any, subTab?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  state,
  activeSiteId,
  activeUser: propActiveUser,
  onNavigate,
}) => {
  // Allow user to toggle between "Personal User Dashboard" and "Global Clinic Dashboard"
  const [dashboardMode, setDashboardMode] = useState<"personal" | "global">("personal");

  // Allow switching viewed user to inspect dashboards for different profiles
  const [selectedUserId, setSelectedUserId] = useState<number>(() => {
    return propActiveUser?.Id_User || state.User_[0]?.Id_User || 1;
  });

  // Real-time queue and support ticket data
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>(() =>
    queueTicketingService.getAll(),
  );
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() =>
    supportTicketingService.getAll(),
  );

  useEffect(() => {
    const unsubQ = queueTicketingService.subscribe(() => {
      setQueueTickets(queueTicketingService.getAll());
    });
    const unsubS = supportTicketingService.subscribe(() => {
      setSupportTickets(supportTicketingService.getAll());
    });
    return () => {
      unsubQ();
      unsubS();
    };
  }, []);

  // Current active inspected user
  const inspectedUser = useMemo(() => {
    return (
      state.User_.find((u) => u.Id_User === selectedUserId) || propActiveUser || state.User_[0]
    );
  }, [state.User_, selectedUserId, propActiveUser]);

  // Find staff profile for the inspected user
  const staffProfile = useMemo(() => {
    if (!inspectedUser) return null;
    return state.StaffProfile.find((sp) => sp.Id_User === inspectedUser.Id_User) || null;
  }, [state.StaffProfile, inspectedUser]);

  // Find user's affectations
  const userAffectations = useMemo(() => {
    if (!staffProfile) return [];
    return state.Affectation.filter(
      (aff) => aff.Id_staff_profile === staffProfile.Id_staff_profile,
    );
  }, [state.Affectation, staffProfile]);

  const activeSite = state.Site.find((s) => s.Id_Site === activeSiteId) || state.Site[0];

  // Role categorization for custom dashboard widgets
  const userRoleCode = (inspectedUser?.role || staffProfile?.Type || "ADMIN").toUpperCase();
  const isDoctor = userRoleCode.includes("MED") || userRoleCode.includes("DOCTOR");
  const isNurse = userRoleCode.includes("INFIRM") || userRoleCode.includes("NURSE");
  const isReception = userRoleCode.includes("ACCUEIL") || userRoleCode.includes("SECRETAIRE");
  const isStockOrPharm = userRoleCode.includes("STOCK") || userRoleCode.includes("PHARM");
  const isAdmin = userRoleCode.includes("ADMIN");

  // User's support tickets
  const userSupportTickets = useMemo(() => {
    if (!inspectedUser) return [];
    return supportTickets.filter(
      (t) => t.createdById === inspectedUser.Id_User || t.assignedToId === inspectedUser.Id_User,
    );
  }, [supportTickets, inspectedUser]);

  // Reception queue stats
  const waitingQueueCount = queueTickets.filter((t) => t.status === "en_attente").length;
  const inProgressQueueCount = queueTickets.filter(
    (t) => t.status === "en_cours" || t.status === "appele",
  ).length;

  // Encounters stats
  const encountersToday = state.Encounter.slice(0, 10);
  const myEncountersCount = state.Encounter.filter((enc) => enc.Id_Service === 1).length;

  // Global charts data
  const encountersByService = state.Service.filter((s) => s.Id_Site === activeSiteId).map(
    (serv) => {
      const count = state.Encounter.filter((enc) => enc.Id_Service === serv.Id_Service).length;
      return {
        label: serv.Libelle,
        value: count,
      };
    },
  );

  const encountersBySpec = state.Specialite.map((spec) => {
    const count = state.Encounter.filter((enc) => enc.Id_Specialite === spec.Id_Specialite).length;
    return {
      label: spec.Libelle,
      value: count,
    };
  });

  const riskFactors = state.Type_D_Travail.map((risk) => {
    const count = state.Encounter.filter((enc) => {
      const details = state.Detail_encounter.filter(
        (d) =>
          d.Id_Encounter === enc.Id_Encounter &&
          d.key === "OCCUPATIONAL_HAZARD_ID" &&
          Number(d.valeur) === risk.Id_Type_D_Travail,
      );
      return details.length > 0;
    }).length;

    return {
      label: risk.Libelle,
      value: count,
    };
  });

  const getRolePresentation = () => {
    if (isDoctor) {
      return {
        title: "Praticien / Médecin Clinicien",
        icon: Stethoscope,
        color: "bg-blue-600 text-white",
        banner: "from-blue-700 via-indigo-800 to-slate-900",
        badge: "bg-blue-500/20 text-blue-200 border-blue-400/30",
      };
    }
    if (isNurse) {
      return {
        title: "Infirmier(ère) / Soins & Triage",
        icon: Activity,
        color: "bg-emerald-600 text-white",
        banner: "from-emerald-700 via-teal-800 to-slate-900",
        badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
      };
    }
    if (isReception) {
      return {
        title: "Accueil & Gestion des Files d'Attente",
        icon: Ticket,
        color: "bg-asina-600 text-white",
        banner: "from-teal-700 via-asina-800 to-slate-900",
        badge: "bg-teal-500/20 text-teal-200 border-teal-400/30",
      };
    }
    if (isStockOrPharm) {
      return {
        title: "Responsable Pharmacie & Stocks",
        icon: Package,
        color: "bg-amber-600 text-white",
        banner: "from-amber-700 via-yellow-800 to-slate-900",
        badge: "bg-amber-500/20 text-amber-200 border-amber-400/30",
      };
    }
    return {
      title: "Administrateur Système & Direction",
      icon: ShieldCheck,
      color: "bg-purple-600 text-white",
      banner: "from-purple-800 via-indigo-900 to-slate-900",
      badge: "bg-purple-500/20 text-purple-200 border-purple-400/30",
    };
  };

  const roleStyle = getRolePresentation();
  const RoleIcon = roleStyle.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setDashboardMode("personal")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-2 ${
                dashboardMode === "personal"
                  ? "bg-white text-asina-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Mon Espace Personnel</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardMode("global")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-2 ${
                dashboardMode === "global"
                  ? "bg-white text-asina-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Pilotage Global & Décision Médicale</span>
            </button>
          </div>
        </div>

        {/* User Context Selector to switch between staff views */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Vue Utilisateur :</span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-asina-500"
          >
            {state.User_.map((u) => (
              <option key={u.Id_User} value={u.Id_User}>
                {u.nom} {u.prenom} ({u.role || "Personnel"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {dashboardMode === "personal" ? (
        <div className="space-y-6">
          {/* Personalized User Welcome Banner */}
          <div
            className={`relative rounded-2xl p-6 text-white bg-gradient-to-r ${roleStyle.banner} shadow-lg border border-white/10 overflow-hidden`}
          >
            <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-6 pointer-events-none">
              <RoleIcon className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl font-black shadow-inner">
                  {inspectedUser?.prenom?.[0] || "U"}
                  {inspectedUser?.nom?.[0] || "P"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black tracking-tight">
                      Bonjour, {inspectedUser?.prenom} {inspectedUser?.nom}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${roleStyle.badge}`}
                    >
                      {roleStyle.title}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 mt-1 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-300" />
                      <span>Site : {activeSite?.Libelle}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-teal-300" />
                      <span>
                        Service en ligne •{" "}
                        {new Date().toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Shortcuts according to role */}
              <div className="flex items-center gap-2 flex-wrap">
                {isDoctor && (
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("doctor", "attente")}
                    className="px-3.5 py-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span>Ma File Consultations</span>
                  </button>
                )}

                {isNurse && (
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("infirmerie", "vitals")}
                    className="px-3.5 py-2 bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Saisir Constantes</span>
                  </button>
                )}

                {isReception && (
                  <>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate("accueil", "ticketing")}
                      className="px-3.5 py-2 bg-white text-teal-900 hover:bg-teal-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Ticket className="w-4 h-4 text-teal-600" />
                      <span>Guichet d'Appel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate("accueil", "cartes")}
                      className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-white/20"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Cartes d'Adhérents</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("ticketing")}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-white/20"
                  title="Ouvrir un ticket d'assistance ou de maintenance"
                >
                  <LifeBuoy className="w-4 h-4" />
                  <span>Assistance & Ticketing</span>
                </button>
              </div>
            </div>
          </div>

          {/* Metric KPIs personalized for this role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isDoctor
                    ? "Consultations du Jour"
                    : isNurse
                      ? "Constantes Relevées"
                      : isReception
                        ? "Tickets Distribués"
                        : "Patients Pris en Charge"}
                </span>
                <div className="p-2 rounded-xl bg-asina-50 text-asina-600">
                  {isDoctor ? (
                    <Stethoscope className="w-4 h-4" />
                  ) : isNurse ? (
                    <Activity className="w-4 h-4" />
                  ) : (
                    <Ticket className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {isDoctor
                  ? myEncountersCount
                  : isNurse
                    ? state.Vitals.length
                    : isReception
                      ? queueTickets.length
                      : state.Patient.length}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Flux actif sur le site {activeSite?.Libelle}</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isReception ? "Patients en Attente" : "Rendez-vous Confirmés"}
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {isReception
                  ? waitingQueueCount
                  : state.Rendez_vous.filter((r) => r.Statut === "Confirmé").length}
              </div>
              <div className="text-[11px] text-slate-400">
                {waitingQueueCount > 0
                  ? `${waitingQueueCount} personnes en salle d'attente`
                  : "File d'attente fluide"}
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Mes Tickets & Requêtes
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <LifeBuoy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {userSupportTickets.length}
              </div>
              <div className="text-[11px] text-amber-700 font-medium">
                {
                  userSupportTickets.filter(
                    (t) => t.status === "en_cours" || t.status === "nouveau",
                  ).length
                }{" "}
                demande(s) en cours de traitement
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isAdmin ? "Utilisateurs Actifs" : "Total Adhérents Enregistrés"}
                </span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {isAdmin ? state.User_.length : state.Patient.length}
              </div>
              <div className="text-[11px] text-slate-400">Base centralisée synchronisée</div>
            </div>
          </div>

          {/* Dual Column: My Support Tickets & My Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: User's Support Tickets */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-asina-600" />
                    <span>Mes Demandes & Tickets de Support</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Incidents signalés ou affectés à mon attention
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("ticketing")}
                  className="text-xs font-bold text-asina-600 hover:text-asina-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Tous les tickets</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {userSupportTickets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Vous n'avez aucun ticket de support en cours.
                  </div>
                ) : (
                  userSupportTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onNavigate && onNavigate("ticketing")}
                      className="p-3 rounded-xl border border-slate-200 hover:border-asina-300 bg-slate-50/60 hover:bg-asina-50/30 transition flex items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-asina-800 text-[11px]">
                            {t.code}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">{t.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Signalé le {new Date(t.createdAt).toLocaleDateString("fr-FR")} •{" "}
                          {t.category}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            t.status === "resolu"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t.status}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Operational Queue Status & Shortcuts */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-600" />
                    <span>État de la File d'Attente Accueil</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Flux des adhérents au centre médical
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate("accueil", "ticketing")}
                  className="text-xs font-bold text-asina-600 hover:text-asina-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Gérer la file</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {queueTickets.filter((t) => t.status === "appele" || t.status === "en_cours")
                  .length > 0 ? (
                  queueTickets
                    .filter((t) => t.status === "appele" || t.status === "en_cours")
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <div>
                            <span className="font-mono font-black text-sm text-emerald-950">
                              {t.number}
                            </span>
                            <span className="text-slate-700 ml-2 font-semibold">
                              {t.serviceLabel}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-800 text-xs">
                          Guichet {t.counterNumber || 1}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Aucun guichet n'a de ticket en cours d'appel actuellement.
                  </div>
                )}

                {/* Next waiting tickets preview */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Prochains patients en attente ({waitingQueueCount}) :
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {queueTickets
                      .filter((t) => t.status === "en_attente")
                      .slice(0, 4)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="font-mono font-bold text-slate-900">{t.number}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {t.serviceLabel}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Global Clinic & Medical Decision Dashboard */
        <div className="space-y-6">
          <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider">
            Tableau de bord de décision médicale — Site actif :{" "}
            <span className="text-asina-700 font-bold">{activeSite?.Libelle}</span>
          </h3>

          <DashboardOverviewCards state={state} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardServiceChart data={encountersByService} />
            <DashboardSpecialityChart data={encountersBySpec} />
            <DashboardOccupationalRisks data={riskFactors} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
