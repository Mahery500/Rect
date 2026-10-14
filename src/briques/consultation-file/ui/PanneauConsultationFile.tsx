/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react"; // ← fix 1 : useState manquant
import {
  Users,
  UserCheck,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useConsultationFile } from "../hooks/useConsultationFile";
import type { PatientFileMedecin } from "../modele/consultation-file.types"; // ← fix 2 : type manquant
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import {
  jouerCarillonFile,
  annoncerVocalementTicket,
  diffuserAnnonceTicket,
} from "@/noyau/utils/carillon";
import { ModaleSelectionTypeEncounter } from "@/briques/type-encounters";

export interface PanneauConsultationFileProps {
  mode?: ModeAffichage;
  siteActifId?: number | null;
  onPriseEnChargeSucces?: () => void;
  onPrendreEnChargeSucces?: (patientId: number, encounterId?: number) => void;
}

export const PanneauConsultationFile: React.FC<PanneauConsultationFileProps> = ({
  mode = "edition",
  onPriseEnChargeSucces,
  onPrendreEnChargeSucces,
}) => {
  const {
    fileAttente,
    patientEnCours,
    chargement,
    appelEnCours,
    erreur,
    prendreEnCharge,
    appeler,
    rafraichir,
  } = useConsultationFile();

  const { notifierSucces, notifierErreur } = useNotifier();

  const estModifiable = mode === "edition";

  // État de la modale de sélection de type
  const [aiguillageAConfirmer, setAiguillageAConfirmer] = useState<{
    id: number;
    numTicket: string;
    patientNom?: string;
  } | null>(null);

  /** Étape 1 : Appeler le patient (voix + écran). Ne crée PAS l'Encounter. */
  const gererAppel = async (aiguillageId: number, numTicket: string) => {
    if (!estModifiable) return;
    try {
      const res = await appeler(aiguillageId);
      jouerCarillonFile();
      annoncerVocalementTicket(res.numTicket, "Consultation médicale");
      diffuserAnnonceTicket({
        ticketId: res.ticketId,
        numTicket: res.numTicket,
        serviceLabel: "Consultation médicale",
        at: Date.now(),
      });
      notifierSucces(`Patient appelé (${numTicket}).`);
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  /** Étape 1bis : le clic ouvre la modale, rien n'est encore envoyé. */
  const ouvrirModalePriseEnCharge = (p: PatientFileMedecin) => {
    setAiguillageAConfirmer({
      id: p.aiguillageId,
      numTicket: p.numTicket,
      patientNom: p.patientNom,
    });
  };

  /** Étape 2 : la modale a validé, on envoie le POST avec le type. */
  const confirmerPriseEnCharge = async (typeEncounterId: number): Promise<boolean> => {
    if (!aiguillageAConfirmer) return false;
    try {
      const res = await prendreEnCharge(aiguillageAConfirmer.id, typeEncounterId);
      notifierSucces("Patient pris en charge en consultation.");

      if (onPriseEnChargeSucces) onPriseEnChargeSucces();
      if (onPrendreEnChargeSucces) {
        onPrendreEnChargeSucces(res?.patientId ?? 0, res?.encounterId ?? undefined);
      }
      return true;
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
      return false;
    }
  };

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des autorisations requises pour consulter la file d'attente médicale.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre d'état et rafraîchissement */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Salle d'attente médicale ({fileAttente.length} patient
              {fileAttente.length > 1 ? "s" : ""})
            </h3>
            <p className="text-xs text-slate-500">
              {patientEnCours?.enCours
                ? `Consultation en cours : ${patientEnCours.patientNom} (${patientEnCours.numTicket})`
                : "Aucune consultation en cours au cabinet."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={rafraichir}
          disabled={chargement}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${chargement ? "animate-spin" : ""}`} />
          <span>Rafraîchir</span>
        </button>
      </div>

      {erreur && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Cartes des patients en attente */}
      {fileAttente.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
          <HeartPulse className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Aucun patient en attente</h4>
          <p className="text-xs text-slate-400">
            Tous les patients orientés vers ce service ont été pris en charge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fileAttente.map((p) => (
            <div
              key={p.aiguillageId}
              className={`bg-white rounded-xl border p-5 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between ${
                p.appele ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {p.numTicket}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      #{p.position}
                    </span>
                  </div>
                  {p.groupeSanguin && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 rounded border border-rose-200">
                      {p.groupeSanguin}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{p.patientNom}</h4>
                  {p.matricule && (
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      Matricule : {p.matricule}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                      p.type === "RDV"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {p.type === "RDV" ? "Rendez-vous" : "Sans RDV"}
                  </span>

                  <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>
                      Attente : <strong>{p.attenteMinutes} min</strong>
                    </span>
                  </span>
                </div>

                {p.appele && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Appelé
                    </span>
                    {p.appelExpire && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                        Appel expiré
                      </span>
                    )}
                  </div>
                )}
              </div>

              {estModifiable && (
                <div className="flex items-center gap-1.5">
                  {/* Bouton Appeler / Rappeler — inchangé */}
                  <button
                    type="button"
                    disabled={appelEnCours !== null}
                    onClick={() => gererAppel(p.aiguillageId, p.numTicket)}
                    title={p.appele ? "Rappeler le patient" : "Appeler le patient"}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                      p.appele
                        ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>
                      {appelEnCours === p.aiguillageId
                        ? "Appel…"
                        : p.appele
                          ? "Rappeler"
                          : "Appeler"}
                    </span>
                  </button>

                  {/* Bouton Prendre en charge — ouvre désormais la modale */}
                  {p.appele && (
                    <button
                      type="button"
                      disabled={appelEnCours !== null}
                      onClick={() => ouvrirModalePriseEnCharge(p)}
                      className="flex-1 py-2 px-3 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Prendre en charge</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ← fix 4 : la modale doit être rendue, sinon le clic ne fait rien */}
      <ModaleSelectionTypeEncounter
        ouvert={aiguillageAConfirmer !== null}
        titre={`Type de prise en charge${
          aiguillageAConfirmer ? ` — Ticket ${aiguillageAConfirmer.numTicket}` : ""
        }`}
        patientNom={aiguillageAConfirmer?.patientNom}
        numTicket={aiguillageAConfirmer?.numTicket}
        onFermer={() => setAiguillageAConfirmer(null)}
        onValider={confirmerPriseEnCharge}
      />
    </div>
  );
};

export default PanneauConsultationFile;
