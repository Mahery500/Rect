/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Clock,
  Filter,
  RotateCcw,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  ShieldAlert,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useInfirmerieHistorique } from "../hooks/useInfirmerieHistorique";
import { formaterDateHeure } from "@/noyau/utils/dates";
import { StatutActe } from "../modele/infirmerie-historique.types";

export interface PanneauInfirmerieHistoriqueProps {
  mode?: ModeAffichage;
  patientIdFiltre?: number | null;
  patientId?: number | null;
}

const STATUT_LABELS: Record<StatutActe, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  realise: "Réalisé",
  annule: "Annulé",
  saisi_par_erreur: "Saisi par erreur",
};

export const PanneauInfirmerieHistorique: React.FC<PanneauInfirmerieHistoriqueProps> = ({
  mode = "lecture",
}) => {
  const [saisiePatient, setSaisiePatient] = useState("");
  const [saisieDu, setSaisieDu] = useState("");
  const [saisieAu, setSaisieAu] = useState("");
  const [erreurFiltre, setErreurFiltre] = useState<string | null>(null);

  const { items, chargement, hasMore, erreur, appliquerFiltres, chargerPlus } =
    useInfirmerieHistorique();

  const handleFiltrer = (e: React.FormEvent) => {
    e.preventDefault();
    const p = saisiePatient.trim();
    if (p !== "" && !/^\d+$/.test(p)) {
      setErreurFiltre("Le numéro de patient doit être un identifiant numérique.");
      return;
    }
    if (saisieDu && saisieAu && saisieDu > saisieAu) {
      setErreurFiltre("La date de début doit être antérieure à la date de fin.");
      return;
    }
    setErreurFiltre(null);
    appliquerFiltres({
      patientId: p === "" ? undefined : Number(p),
      du: saisieDu || undefined,
      au: saisieAu || undefined,
    });
  };

  const handleReinitialiser = () => {
    setSaisiePatient("");
    setSaisieDu("");
    setSaisieAu("");
    setErreurFiltre(null);
    appliquerFiltres({});
  };

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des autorisations nécessaires pour consulter l'historique des soins.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre de filtres */}
      <form
        onSubmit={handleFiltrer}
        className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
          <Filter className="h-4 w-4 text-rose-600" />
          <span>Filtres de recherche médico-légale</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              N° Dossier Patient
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: 1042"
                value={saisiePatient}
                onChange={(e) => setSaisiePatient(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden pl-7"
              />
              <User className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Date début (Du)
            </label>
            <div className="relative">
              <input
                type="date"
                value={saisieDu}
                onChange={(e) => setSaisieDu(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden pl-7"
              />
              <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Date fin (Au)
            </label>
            <div className="relative">
              <input
                type="date"
                value={saisieAu}
                onChange={(e) => setSaisieAu(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden pl-7"
              />
              <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Appliquer</span>
            </button>
            <button
              type="button"
              onClick={handleReinitialiser}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              title="Réinitialiser les filtres"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </form>

      {(erreur || erreurFiltre) && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{erreurFiltre || erreur}</span>
        </div>
      )}

      {/* Liste des soins réalisés */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Actes et soins enregistrés ({items.length} {hasMore ? "+" : ""})
            </h3>
            <p className="text-xs text-slate-500">
              Historique des soins paramédicaux dispensés par votre compte
            </p>
          </div>
        </div>

        {!chargement && items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs space-y-1">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p>Aucun acte enregistré pour les critères sélectionnés.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li
                key={a.id}
                className="py-4 first:pt-1 text-xs space-y-2 hover:bg-slate-50/50 p-2 rounded-lg transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formaterDateHeure(a.dateRealisation)}
                    </span>
                    <strong
                      className={`text-sm ${
                        a.saisiParErreur
                          ? "line-through text-slate-400"
                          : "text-slate-950 font-bold"
                      }`}
                    >
                      {a.acteDefinitionLibelle}
                    </strong>
                    <span className="font-mono text-[10px] text-slate-400">
                      ({a.acteDefinitionCode})
                    </span>
                    <span className="text-slate-600 font-semibold">· {a.patientNom}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                      a.saisiParErreur
                        ? "bg-red-50 text-red-700 border-red-200"
                        : a.statut === "realise"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {a.saisiParErreur ? "Saisi par erreur" : STATUT_LABELS[a.statut]}
                  </span>
                </div>

                {a.commentaire && (
                  <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                    {a.commentaire}
                  </p>
                )}

                {/* Observations */}
                {a.observations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {a.observations.map((o) => (
                      <span
                        key={o.id}
                        className="px-2 py-1 bg-slate-100 text-slate-800 rounded border border-slate-200 text-[11px]"
                      >
                        <strong className="font-semibold">{o.code} :</strong> {o.valeur}{" "}
                        {o.unite ?? ""}
                        {o.interpretation ? ` (${o.interpretation})` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Résultats */}
                {a.resultats.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {a.resultats.map((r) => (
                      <span
                        key={r.id}
                        className="px-2 py-1 bg-emerald-50 text-emerald-900 rounded border border-emerald-200 text-[11px]"
                      >
                        <strong className="font-semibold">{r.type} :</strong> {r.resultat}
                        {r.interpretation ? ` (${r.interpretation})` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {chargement && (
          <p className="text-xs text-slate-500 py-3 text-center">Chargement en cours…</p>
        )}

        {hasMore && !chargement && (
          <div className="text-center pt-3">
            <button
              type="button"
              onClick={chargerPlus}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Charger plus d'actes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
