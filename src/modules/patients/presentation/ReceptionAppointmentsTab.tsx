/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Calendar, Users, ChevronRight } from "lucide-react";
import { ASINAState, Rendez_vous, Encounter } from "@/core/types";

interface ReceptionAppointmentsTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
  activeSiteId: number;
}

export default function ReceptionAppointmentsTab({
  state,
  updateState,
  triggerNotification,
  activeSiteId,
}: ReceptionAppointmentsTabProps) {
  const [rdvPatientId, setRdvPatientId] = useState<number>(() => {
    return state.Patient[0]?.Id_Patient || 1;
  });
  const [rdvDate, setRdvDate] = useState("2026-05-21");
  const [rdvPraticienId, setRdvPraticienId] = useState<number>(() => {
    const doc = state.StaffProfile.find((sp) => sp.Type.startsWith("Médecin"));
    return doc ? doc.Id_staff_profile : 3;
  });
  const [rdvServiceId, setRdvServiceId] = useState<number>(() => {
    const serv = state.Service.find((s) => s.Id_Site === activeSiteId);
    return serv ? serv.Id_Service : 1;
  });
  const [rdvMotif, setRdvMotif] = useState("");

  const handleScheduleRdv = (e: React.FormEvent) => {
    e.preventDefault();
    const nextRdvId =
      state.Rendez_vous.length > 0
        ? Math.max(...state.Rendez_vous.map((r) => r.Id_Rendez_vous)) + 1
        : 1;

    const newRdv: Rendez_vous = {
      Id_Rendez_vous: nextRdvId,
      Date_Debut: rdvDate,
      Date_Fin: rdvDate,
      Statut: "Confirmé",
      Motif: rdvMotif || "Consultation standard",
      DateCreation: "2026-05-20",
      Id_Patient: Number(rdvPatientId),
      Id_staff_profile: Number(rdvPraticienId),
      Id_Site: activeSiteId,
      Id_Service: Number(rdvServiceId),
    };

    updateState({
      Rendez_vous: [...state.Rendez_vous, newRdv],
    });

    triggerNotification("success", "Rendez-vous planifié avec succès.");
    setRdvMotif("");
  };

  const handleRegisterArrival = (rdv: Rendez_vous) => {
    const nextEncounterId =
      state.Encounter.length > 0 ? Math.max(...state.Encounter.map((e) => e.Id_Encounter)) + 1 : 1;

    const updatedRdvs = state.Rendez_vous.map((r) => {
      if (r.Id_Rendez_vous === rdv.Id_Rendez_vous) {
        return { ...r, Statut: "Réalisé", Id_Encounter: nextEncounterId };
      }
      return r;
    });

    const patientInfo = state.Patient.find((p) => p.Id_Patient === rdv.Id_Patient);

    const liveEncounter: Encounter = {
      Id_Encounter: nextEncounterId,
      Statut: "En attente",
      Note: "",
      Motif: rdv.Motif,
      DateE: "2026-05-20 16:41:52",
      Id_Site: activeSiteId,
      Id_Service: rdv.Id_Service,
      Id_staff_profile: rdv.Id_staff_profile,
      Id_Type_Encounter: 1,
      Id_Patient: rdv.Id_Patient,
    };

    updateState({
      Rendez_vous: updatedRdvs,
      Encounter: [...state.Encounter, liveEncounter],
    });

    triggerNotification(
      "success",
      `Arrivée du patient ${patientInfo?.Nom} enregistrée. Orienté vers la file d'attente.`,
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
      {/* Schedule form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          Planifier un Rendez-vous
        </h3>

        <form onSubmit={handleScheduleRdv} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Patient concerné
            </label>
            <select
              value={rdvPatientId}
              onChange={(e) => setRdvPatientId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-hidden"
            >
              {state.Patient.map((p) => (
                <option key={p.Id_Patient} value={p.Id_Patient}>
                  [{p.Matricule}] {p.Nom} {p.Prenom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date planifiée</label>
            <input
              type="date"
              required
              value={rdvDate}
              onChange={(e) => setRdvDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Praticien disponible
            </label>
            <select
              value={rdvPraticienId}
              onChange={(e) => setRdvPraticienId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
            >
              {state.StaffProfile.filter((sp) => sp.Type.startsWith("Médecin")).map((doc) => {
                const u = state.User_.find((user) => user.Id_User === doc.Id_User);
                const spec = state.Specialite.find((s) => s.Id_Specialite === doc.Id_Specialite);
                return (
                  <option key={doc.Id_staff_profile} value={doc.Id_staff_profile}>
                    Dr {u?.nom} {u?.prenom} ({spec?.Libelle})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Service d'orientation
            </label>
            <select
              value={rdvServiceId}
              onChange={(e) => setRdvServiceId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
            >
              {state.Service.filter((s) => s.Id_Site === activeSiteId).map((serv) => (
                <option key={serv.Id_Service} value={serv.Id_Service}>
                  {serv.Libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Motif de la venue
            </label>
            <textarea
              placeholder="Symptômes ou type d'examen requis..."
              value={rdvMotif}
              onChange={(e) => setRdvMotif(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs h-20"
            />
          </div>

          <button
            type="submit"
            className="w-full btn-primary py-2 text-xs font-bold hover:cursor-pointer"
          >
            Confirmer la planification
          </button>
        </form>
      </div>

      {/* Active Bookings list with Arrival orientation button */}
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              Rendez-vous et Ateliers du jour
            </h3>
            <span className="px-2.5 py-1 text-xs bg-gray-100 font-bold rounded-full text-gray-600">
              Total actifs: {state.Rendez_vous.filter((r) => r.Statut === "Confirmé").length}
            </span>
          </div>

          <div className="space-y-3">
            {state.Rendez_vous.filter((r) => r.Statut === "Confirmé").map((rdv) => {
              const patient = state.Patient.find((p) => p.Id_Patient === rdv.Id_Patient);
              const docProfile = state.StaffProfile.find(
                (sp) => sp.Id_staff_profile === rdv.Id_staff_profile,
              );
              const docUser = state.User_.find((u) => u.Id_User === docProfile?.Id_User);
              const service = state.Service.find((s) => s.Id_Service === rdv.Id_Service);

              return (
                <div
                  key={rdv.Id_Rendez_vous}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 border border-gray-200 rounded-xl p-4 gap-4 animate-fade-in"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-gray-500">
                        [{patient?.Matricule}]
                      </span>
                      <span className="font-bold text-sm text-gray-950">
                        {patient?.Nom} {patient?.Prenom}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 font-semibold italic">
                      Motif : "{rdv.Motif}"
                    </p>
                    <div className="text-xs text-gray-500 flex gap-4">
                      <span>
                        Date : <strong>{rdv.Date_Debut}</strong>
                      </span>
                      <span>
                        Service : <strong className="text-gray-700">{service?.Libelle}</strong>
                      </span>
                      <span>
                        Praticien : <strong>Dr {docUser?.nom}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRegisterArrival(rdv)}
                    className="w-full md:w-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg transition shrink-0 cursor-pointer"
                  >
                    Enregistrer Arrivée (File d'attente)
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {state.Rendez_vous.filter((r) => r.Statut === "Confirmé").length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm italic">
                Aucun rendez-vous planifé pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* Waiting list in clinical rooms */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-asina-500" />
            Dépistage & Consultation - Personnels en Salle d'attente
          </h3>

          <div className="space-y-2">
            {state.Encounter.filter(
              (enc) => enc.Statut === "En attente" && enc.Id_Site === activeSiteId,
            ).map((enc) => {
              const patient = state.Patient.find((p) => p.Id_Patient === enc.Id_Patient);
              const service = state.Service.find((s) => s.Id_Service === enc.Id_Service);
              const doctorProfile = state.StaffProfile.find(
                (sp) => sp.Id_staff_profile === enc.Id_staff_profile,
              );
              const doctorUser = state.User_.find((u) => u.Id_User === doctorProfile?.Id_User);

              return (
                <div
                  key={enc.Id_Encounter}
                  className="flex items-center justify-between border-l-4 border-amber-500 bg-amber-50/20 p-3 rounded-lg border border-gray-200 animate-fade-in"
                >
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {patient?.Nom} {patient?.Prenom}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Enregistré à {enc.DateE.split(" ")[1]} ➜ {service?.Libelle} (Dr{" "}
                      {doctorUser?.nom})
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full">
                    En attente consultation
                  </span>
                </div>
              );
            })}

            {state.Encounter.filter(
              (enc) => enc.Statut === "En attente" && enc.Id_Site === activeSiteId,
            ).length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm italic">
                La file d'attente de cet établissement est vide.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
