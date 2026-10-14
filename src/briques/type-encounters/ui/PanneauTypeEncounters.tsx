/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";

import { Activity, Plus, RefreshCw, Edit2, ToggleLeft, ToggleRight } from "lucide-react";

import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import { useServices } from "@/briques/services";

import {
  TypeEncounter,
  NouveauTypeEncounterInput,
  ModificationTypeEncounterInput,
} from "../modele/type-encounter.types";

import { useTypeEncounters } from "../hooks/useTypeEncounters";
import { FormulaireTypeEncounterModale } from "./FormulaireTypeEncounterModale";

export interface PanneauTypeEncountersProps {
  mode?: ModeAffichage;
}

export const PanneauTypeEncounters: React.FC<PanneauTypeEncountersProps> = ({
  mode = "edition",
}) => {
  const estLectureSeule = mode === "lecture";

  const {
    types,
    typesTous,
    chargement,
    erreur,
    stats,
    recherche,
    setRecherche,
    filtreActif,
    setFiltreActif,
    recharger,
    creer,
    modifier,
    basculerActivation,
    definirTypesService,
  } = useTypeEncounters();

  const { types: typesServices } = useServices();

  const typesServicesDisponibles = typesServices.map((t) => ({
    id: t.id,
    nom: t.nom,
    code: t.code,
  }));

  const [modalOuverte, setModalOuverte] = useState(false);
  const [typeEnEdition, setTypeEnEdition] = useState<TypeEncounter | null>(null);

  const handleEnregistrer = async (
    saisie: NouveauTypeEncounterInput | ModificationTypeEncounterInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifier(id, saisie as ModificationTypeEncounterInput);
    }

    return creer(saisie as NouveauTypeEncounterInput);
  };

  if (mode === "masque") {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-asina-50 text-asina-700 rounded-lg shrink-0">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Référentiel des Types de Prise en Charge
              </h3>

              <p className="text-[11px] text-slate-500">
                Nature des rencontres cliniques (consultation, hospitalisation, vaccination,
                téléconsultation…).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={recharger}
              disabled={chargement}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin text-asina-600" : ""}`} />
            </button>

            {!estLectureSeule && (
              <button
                type="button"
                onClick={() => {
                  setTypeEnEdition(null);
                  setModalOuverte(true);
                }}
                className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau Type</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total</span>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{stats.total}</p>
          </div>

          <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-150">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Actifs</span>
            <p className="text-lg font-extrabold text-emerald-800 leading-tight">{stats.actifs}</p>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">Désactivés</span>
            <p className="text-lg font-extrabold text-slate-600 leading-tight">{stats.inactifs}</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Rechercher par code, libellé ou description..."
          />
        </div>

        <select
          value={filtreActif}
          onChange={(e) => setFiltreActif(e.target.value as "tous" | "actifs" | "inactifs")}
          className="w-full md:w-40 bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
        >
          <option value="tous">Tous statuts</option>
          <option value="actifs">Actifs seuls</option>
          <option value="inactifs">Désactivés</option>
        </select>
      </div>

      {/* Erreur */}
      {erreur && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {erreur}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {chargement ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin text-asina-600 mx-auto mb-2" />
            Chargement des types de prise en charge...
          </div>
        ) : types.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {typesTous.length === 0
              ? "Aucun type de prise en charge enregistré."
              : "Aucun résultat pour les critères sélectionnés."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Libellé</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Types de service</th>
                  <th className="py-3 px-4 text-center">Statut</th>

                  {!estLectureSeule && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {types.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/70 transition ${
                      t.actif ? "" : "opacity-60 bg-slate-50/30"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-asina-700 bg-asina-50 border border-asina-150 px-2 py-0.5 rounded text-[11px]">
                        {t.code}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">{t.libelle}</td>

                    <td className="py-3 px-4 text-slate-600 max-w-md">
                      {t.description || (
                        <span className="italic text-slate-400">Aucune description</span>
                      )}
                    </td>

                    {/* Types de service affectés */}
                    <td className="py-3 px-4">
                      {!(t.typeServiceIds ?? []).length ? (
                        <span className="text-rose-600 text-[10px] font-bold">Non affecté</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(t.typeServiceIds ?? []).map((id) => {
                            const ts = typesServices.find((service) => service.id === id);

                            return (
                              <span
                                key={id}
                                className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono"
                                title={ts?.nom ?? `Type de service #${id}`}
                              >
                                {ts?.code ?? `#${id}`}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="py-3 px-4 text-center">
                      {!estLectureSeule ? (
                        <button
                          type="button"
                          onClick={() => basculerActivation(t)}
                          className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition"
                          title={t.actif ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                        >
                          <BadgeStatut statut={t.actif ? "actif" : "inactif"} />

                          {t.actif ? (
                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        <BadgeStatut statut={t.actif ? "actif" : "inactif"} />
                      )}
                    </td>

                    {/* Actions */}
                    {!estLectureSeule && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setTypeEnEdition(t);
                            setModalOuverte(true);
                          }}
                          title="Modifier"
                          className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale */}
      <FormulaireTypeEncounterModale
        ouvert={modalOuverte}
        typeEnEdition={typeEnEdition}
        typesServicesDisponibles={typesServicesDisponibles}
        onFermer={() => setModalOuverte(false)}
        onEnregistrer={handleEnregistrer}
        onEnregistrerTypesService={definirTypesService}
      />
    </div>
  );
};

export default PanneauTypeEncounters;
