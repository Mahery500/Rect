/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react"; // ← fix 1 : useState
import {
  Users,
  UserCheck,
  CalendarClock,
  ClipboardList,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useInfirmerieFile } from "../hooks/useInfirmerieFile";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import { EtatRendezVous, PatientEnCours } from "../modele/infirmerie-file.types"; // ← fix 2 : fusion des deux imports
import {
  jouerCarillonFile,
  annoncerVocalementTicket,
  diffuserAnnonceTicket,
} from "@/noyau/utils/carillon";
import { ModaleSelectionTypeEncounter } from "@/briques/type-encounters"; // ← fix 3

export interface PriseEnChargeInfo {
  patientId: number;
  encounterId: number;
  numTicket: string;
  patientNom?: string;
}

export interface PanneauInfirmerieFileProps {
  mode?: ModeAffichage;
  siteActifId?: number | null;
  patientEnCoursActif?: {
    patientId: number;
    encounterId: number;
    numTicket?: string;
    patientNom?: string;
  } | null;
  onPrendreEnChargeSucces?: (info: PriseEnChargeInfo) => void;
  onOuvrirSoinsPatient?: () => void;
}

const ETAT_LABELS: Record<EtatRendezVous, { label: string; classe: string }> = {
  PAS_ENCORE_ARRIVE: {
    label: "Pas encore arrivé",
    classe: "bg-slate-100 text-slate-600 border-slate-200",
  },
  ARRIVE: { label: "Arrivé au centre", classe: "bg-sky-50 text-sky-700 border-sky-200" },
  EN_ATTENTE: { label: "En attente", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  EN_COURS: { label: "En cours", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  TERMINE: { label: "Terminé", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const PanneauInfirmerieFile: React.FC<PanneauInfirmerieFileProps> = ({
  mode = "edition",
  patientEnCoursActif,
  onPrendreEnChargeSucces,
  onOuvrirSoinsPatient,
}) => {
  const {
    fileAttente,
    patientEnCours,
    prochainPatient,
    rendezVous,
    rdvArrives,
    actesAFaire,
    actesUrgents,
    chargement,
    erreur,
    actionEnCours,
    prendreEnCharge,
    rafraichir,
    appeler,
  } = useInfirmerieFile();

  const { notifierSucces, notifierErreur } = useNotifier();

  const estModifiable = mode === "edition";

  // État de la modale de sélection de type
  const [aiguillageAConfirmer, setAiguillageAConfirmer] = useState<{
    id: number;
    numTicket: string;
    patientNom?: string;
  } | null>(null);

  // L'état du hook est TOUJOURS prioritaire. La prop parent ne sert que de repli
  // quand le hook n'a pas encore fini son premier chargement.
  const enCoursEffectif: PatientEnCours | null =
    patientEnCours ??
    (patientEnCoursActif
      ? {
          enCours: true,
          patientId: patientEnCoursActif.patientId,
          encounterId: patientEnCoursActif.encounterId,
          numTicket: patientEnCoursActif.numTicket ?? null,
          patientNom: patientEnCoursActif.patientNom ?? null,
          dureeMinutes: 0,
          aiguillageId: null,
          ticketId: null,
          debut: null,
        }
      : null);

  /** Étape 1bis : le clic ouvre la modale, rien n'est encore envoyé. */
  const ouvrirModalePriseEnCharge = (
    aiguillageId: number,
    numTicket: string,
    patientNom?: string,
  ) => {
    setAiguillageAConfirmer({ id: aiguillageId, numTicket, patientNom });
  };

  /** Étape 2 : la modale a validé, on envoie le POST avec le type. */
  const confirmerPriseEnCharge = async (typeEncounterId: number): Promise<boolean> => {
    if (!aiguillageAConfirmer) return false;
    const { id: aiguillageId, numTicket, patientNom: nomDepuisModale } = aiguillageAConfirmer;

    try {
      const res = await prendreEnCharge(aiguillageId, typeEncounterId);
      notifierSucces(`Patient pris en charge avec succès (Ticket ${res.numTicket}).`);

      // Pas d'annonce audio ici : le patient a déjà été appelé via gererAppel().

      const patientConcerne = fileAttente.find((f) => f.aiguillageId === aiguillageId);
      const patientNom =
        patientConcerne?.patientNom ||
        nomDepuisModale ||
        (prochainPatient?.aiguillageId === aiguillageId ? prochainPatient.patientNom : undefined);

      if (onPrendreEnChargeSucces) {
        onPrendreEnChargeSucces({
          patientId: res.patientId,
          encounterId: res.encounterId,
          numTicket: res.numTicket || numTicket,
          patientNom: patientNom || `Patient #${res.patientId}`,
        });
      }
      return true;
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
      return false;
    }
  };

  const ouvrirSoinsPatientEnCours = () => {
    if (onOuvrirSoinsPatient) {
      onOuvrirSoinsPatient();
      return;
    }
    if (
      enCoursEffectif &&
      onPrendreEnChargeSucces &&
      enCoursEffectif.patientId &&
      enCoursEffectif.encounterId
    ) {
      onPrendreEnChargeSucces({
        patientId: enCoursEffectif.patientId,
        encounterId: enCoursEffectif.encounterId,
        numTicket: enCoursEffectif.numTicket || "",
        patientNom: enCoursEffectif.patientNom || undefined,
      });
    }
  };

  const gererAppel = async (aiguillageId: number, numTicket: string) => {
    if (!estModifiable) return;
    try {
      const res = await appeler(aiguillageId);
      jouerCarillonFile();
      annoncerVocalementTicket(res.numTicket, "Infirmerie");
      diffuserAnnonceTicket({
        ticketId: res.ticketId,
        numTicket: res.numTicket,
        serviceLabel: "Infirmerie",
        at: Date.now(),
      });
      notifierSucces(`Patient appelé (${numTicket}).`);
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des autorisations nécessaires pour consulter la file d'attente des
        soins.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre d'action et rafraîchissement */}
      <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock className="h-4 w-4 text-rose-600" />
          <span>Synchronisation automatique active</span>
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

      {/* Cartes métriques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-rose-600 flex items-center justify-between">
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
              File
            </span>
          </div>
          <span className="block mt-2 font-bold font-mono text-2xl text-slate-900">
            {fileAttente.length}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
            Patients en attente
          </span>
        </div>

        <div
          onClick={enCoursEffectif?.enCours ? ouvrirSoinsPatientEnCours : undefined}
          className={`p-4 bg-white rounded-xl border border-slate-200 shadow-2xs transition ${
            enCoursEffectif?.enCours
              ? "hover:border-emerald-300 hover:shadow-xs cursor-pointer bg-emerald-50/20"
              : ""
          }`}
        >
          <div className="text-emerald-600 flex items-center justify-between">
            <UserCheck className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              En cours
            </span>
          </div>
          <span className="block mt-2 font-bold text-sm text-slate-900 truncate">
            {enCoursEffectif?.enCours ? enCoursEffectif.patientNom : "Aucun"}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {enCoursEffectif?.enCours
                ? `Ticket ${enCoursEffectif.numTicket} · ${enCoursEffectif.dureeMinutes || 0} min`
                : "Poste disponible"}
            </span>
            {enCoursEffectif?.enCours && (
              <span className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-0.5">
                <span>Ouvrir</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-sky-600 flex items-center justify-between">
            <CalendarClock className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
              Planning
            </span>
          </div>
          <span className="block mt-2 font-bold font-mono text-2xl text-slate-900">
            {rdvArrives} / {rendezVous.length}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
            RDV du jour arrivés
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-amber-600 flex items-center justify-between">
            <ClipboardList className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              Demandes
            </span>
          </div>
          <span className="block mt-2 font-bold font-mono text-2xl text-slate-900">
            {actesAFaire.length}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
            Actes à faire ({actesUrgents.length} urgent{actesUrgents.length > 1 ? "s" : ""})
          </span>
        </div>
      </div>

      {/* Alerte actes urgents */}
      {actesUrgents.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-red-800 uppercase tracking-wide text-[11px]">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>Actes prioritaires / urgents en attente</span>
          </div>
          <ul className="space-y-1 divide-y divide-red-100">
            {actesUrgents.map((a) => (
              <li key={a.id} className="pt-1.5 flex justify-between items-center text-red-950">
                <div>
                  <strong className="font-semibold">{a.acteDefinitionLibelle}</strong>
                  <span className="text-red-700 ml-2">· {a.patientNom}</span>
                  {a.commentaire && (
                    <span className="text-red-600 italic ml-1">({a.commentaire})</span>
                  )}
                </div>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">
                  URGENT
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bannière d'accès direct au patient actuellement en cours */}
      {enCoursEffectif?.enCours && (
        <div className="p-4 bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold">
              <UserCheck className="h-4 w-4 text-emerald-300" />
              <span>Prise en charge active au poste de soins</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono tracking-wider bg-white/20 px-2.5 py-0.5 rounded-lg">
                {enCoursEffectif.numTicket}
              </span>
              <span className="text-base font-bold">
                {enCoursEffectif.patientNom || `Patient #${enCoursEffectif.patientId}`}
              </span>
              {enCoursEffectif.encounterId && (
                <span className="text-xs bg-emerald-800/60 px-2 py-0.5 rounded font-mono text-emerald-200">
                  Dossier #{enCoursEffectif.encounterId}
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-100">
              Pris en charge depuis {enCoursEffectif.dureeMinutes || 0} minute
              {(enCoursEffectif.dureeMinutes || 0) > 1 ? "s" : ""}. Vous pouvez continuer la saisie
              des constantes ou réaliser les actes prescrits.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={ouvrirSoinsPatientEnCours}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ArrowRight className="h-4 w-4 text-emerald-700" />
              <span>Ouvrir les soins du patient</span>
            </button>
          </div>
        </div>
      )}

      {/* Bloc principal : File d'attente et Prise en charge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File d'attente (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Patients en attente de soins ({fileAttente.length})
              </h3>
              <p className="text-xs text-slate-500">
                Ordre de passage prioritaire selon heure d'aiguillage
              </p>
            </div>
            {prochainPatient && estModifiable && (
              <button
                type="button"
                disabled={actionEnCours !== null || Boolean(enCoursEffectif?.enCours)}
                onClick={() =>
                  ouvrirModalePriseEnCharge(
                    // ← fix 4a
                    prochainPatient.aiguillageId,
                    prochainPatient.numTicket,
                    prochainPatient.patientNom,
                  )
                }
                title={
                  enCoursEffectif?.enCours
                    ? `Clôturez d'abord le ticket ${enCoursEffectif.numTicket} pour appeler le suivant.`
                    : undefined
                }
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                <span>Appeler {prochainPatient.numTicket}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {chargement && fileAttente.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Chargement de la file…</p>
          ) : fileAttente.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Aucun patient n'attend actuellement dans ce service.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {fileAttente.map((f) => (
                <li
                  key={f.aiguillageId}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 p-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center font-mono font-bold text-slate-900 shrink-0">
                      #{f.position}
                    </span>
                    <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {f.numTicket}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{f.patientNom}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>Attente :</span>
                        <strong className="text-slate-700 font-mono">{f.attenteMinutes} min</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                        f.type === "RDV"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {f.type === "RDV" ? "RDV" : "Sans RDV"}
                    </span>

                    {estModifiable && (
                      <div className="flex items-center gap-1.5">
                        {/* Bouton Appeler / Rappeler — inchangé */}
                        <button
                          type="button"
                          disabled={actionEnCours !== null}
                          onClick={() => gererAppel(f.aiguillageId, f.numTicket)}
                          title={f.appele ? "Rappeler le patient" : "Appeler le patient"}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                            f.appele
                              ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>
                            {actionEnCours === f.aiguillageId
                              ? "Appel…"
                              : f.appele
                                ? "Rappeler"
                                : "Appeler"}
                          </span>
                        </button>

                        {/* Bouton Prendre en charge — ouvre la modale */}
                        {f.appele && (
                          <button
                            type="button"
                            disabled={actionEnCours !== null || Boolean(enCoursEffectif?.enCours)}
                            onClick={() =>
                              ouvrirModalePriseEnCharge(
                                // ← fix 4b
                                f.aiguillageId,
                                f.numTicket,
                                f.patientNom,
                              )
                            }
                            title={
                              enCoursEffectif?.enCours
                                ? `Vous avez déjà le ticket ${enCoursEffectif.numTicket} en cours.`
                                : undefined
                            }
                            className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold text-xs hover:bg-rose-800 disabled:opacity-50 transition cursor-pointer"
                          >
                            Prendre en charge
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Planning et RDV du jour (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Rendez-vous du jour ({rendezVous.length})
            </h3>
            <p className="text-xs text-slate-500">Planning prévisionnel du service</p>
          </div>

          {rendezVous.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Aucun rendez-vous prévu aujourd'hui.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {rendezVous.map((r) => {
                const conf = ETAT_LABELS[r.etat] || {
                  label: r.etat,
                  classe: "bg-slate-100 text-slate-600 border-slate-200",
                };
                return (
                  <li key={r.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-slate-900 block">
                        {r.heure.length >= 5 ? r.heure.slice(0, 5) : r.heure}
                      </span>
                      <p className="text-slate-800 font-medium truncate">{r.patientNom}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold shrink-0 ${conf.classe}`}
                    >
                      {conf.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ← fix 5 : la modale doit être rendue */}
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

export default PanneauInfirmerieFile;
