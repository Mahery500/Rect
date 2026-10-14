/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Activity,
  Plus,
  RefreshCw,
  Edit2,
  Tag,
  Scale,
  BookMarked,
  Binary,
  FileText,
  FolderTree,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import { GestionCategoriesModale } from "@/noyau/referentiels/categories";
import {
  ObservationDefinition,
  NouvelleObservationDefinitionInput,
  ModificationObservationDefinitionInput,
} from "../modele/observation-definition.types";
import { useObservationDefinitions } from "../hooks/useObservationDefinitions";
import { FormulaireObservationDefinitionModale } from "./FormulaireObservationDefinitionModale";
import { FormulaireCodificationsModale } from "./FormulaireCodificationsModale";
import { GestionUnitesModale } from "./GestionUnitesModale";
import { GestionCodeSystemsModale } from "./GestionCodeSystemsModale";

export interface PanneauObservationDefinitionsProps {
  mode?: ModeAffichage;
}

export const PanneauObservationDefinitions: React.FC<PanneauObservationDefinitionsProps> = ({
  mode = "edition",
}) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";

  const {
    definitions,
    definitionsToutes,
    unites,
    codeSystems,
    // Catégories
    categories,
    categoriesArbre,
    categoriesChargement,
    creerCategorie,
    changerParentCategorie,
    // État global
    chargement,
    erreur,
    stats,
    recherche,
    setRecherche,
    filtreType,
    setFiltreType,
    filtreActif,
    setFiltreActif,
    filtreCategorie,
    setFiltreCategorie,
    recharger,
    creerDefinition,
    modifierDefinition,
    definirCodifications,
    creerUnite,
    basculerActivationUnite,
    creerCodeSystem,
    basculerActivationCodeSystem,
  } = useObservationDefinitions();

  const [modalDefOuverte, setModalDefOuverte] = useState(false);
  const [definitionEnEdition, setDefinitionEnEdition] = useState<ObservationDefinition | null>(
    null,
  );

  const [modalCodifOuverte, setModalCodifOuverte] = useState(false);
  const [definitionPourCodif, setDefinitionPourCodif] = useState<ObservationDefinition | null>(
    null,
  );

  const [modalUnitesOuverte, setModalUnitesOuverte] = useState(false);
  const [modalCodeSystemsOuverte, setModalCodeSystemsOuverte] = useState(false);
  const [modalCategoriesOuverte, setModalCategoriesOuverte] = useState(false);

  const handleEnregistrerDef = async (
    saisie: NouvelleObservationDefinitionInput | ModificationObservationDefinitionInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifierDefinition(id, saisie as ModificationObservationDefinitionInput);
    }
    return creerDefinition(saisie as NouvelleObservationDefinitionInput);
  };

  return (
    <div className="space-y-4">
      {/* Barre d'en-tête */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-asina-50 text-asina-700 rounded-lg shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Nomenclature des Définitions d’Observations
              </h3>
              <p className="text-[11px] text-slate-500">
                Référentiel des paramètres cliniques, constantes, mesures numériques et observations
                qualitatives des actes médicaux.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={recharger}
              disabled={chargement}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition disabled:opacity-50 shrink-0"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin text-asina-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setModalCategoriesOuverte(true)}
              className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
              title="Gérer l'arborescence des catégories d'observations"
            >
              <FolderTree className="h-4 w-4 text-slate-600" />
              <span>Catégories ({categories.length})</span>
            </button>

            {!estModeLectureSeule && (
              <>
                <button
                  type="button"
                  onClick={() => setModalUnitesOuverte(true)}
                  className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Scale className="h-4 w-4 text-slate-600" />
                  <span>Unités ({unites.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalCodeSystemsOuverte(true)}
                  className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <BookMarked className="h-4 w-4 text-slate-600" />
                  <span>Terminologies ({codeSystems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDefinitionEnEdition(null);
                    setModalDefOuverte(true);
                  }}
                  disabled={categories.length === 0}
                  className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle Définition</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Total Définitions
            </span>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{stats.total}</p>
          </div>
          <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-150">
            <span className="text-[10px] uppercase font-bold text-emerald-700">
              Définitions Actives
            </span>
            <p className="text-lg font-extrabold text-emerald-800 leading-tight">{stats.actives}</p>
          </div>
          <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-150">
            <span className="text-[10px] uppercase font-bold text-blue-700">
              Paramètres Numériques
            </span>
            <p className="text-lg font-extrabold text-blue-800 leading-tight">{stats.numeriques}</p>
          </div>
          <div className="p-2.5 bg-violet-50/60 rounded-lg border border-violet-150">
            <span className="text-[10px] uppercase font-bold text-violet-700">
              Observations Qualitatives
            </span>
            <p className="text-lg font-extrabold text-violet-800 leading-tight">{stats.textes}</p>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Rechercher par code (TA_SYS), libellé, unité ou code LOINC..."
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          <select
            value={filtreCategorie}
            onChange={(e) => setFiltreCategorie(e.target.value)}
            className="w-full sm:w-52 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="toutes">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.code}>
                {c.niveau > 1 ? `${"— ".repeat(c.niveau - 1)}${c.libelle}` : c.libelle}
              </option>
            ))}
          </select>

          <select
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value as "tous" | "numerique" | "texte")}
            className="w-full sm:w-44 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Tous types de valeur</option>
            <option value="numerique">Numérique (avec unité)</option>
            <option value="texte">Texte qualitatif</option>
          </select>

          <select
            value={filtreActif}
            onChange={(e) => setFiltreActif(e.target.value as "tous" | "actifs" | "inactifs")}
            className="w-full sm:w-36 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Tous statuts</option>
            <option value="actifs">Actives seules</option>
            <option value="inactifs">Désactivées</option>
          </select>
        </div>
      </div>

      {/* État d'erreur */}
      {erreur && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <span>{erreur}</span>
          <button type="button" onClick={recharger} className="font-bold underline cursor-pointer">
            Réessayer
          </button>
        </div>
      )}

      {/* Tableau des observations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {chargement ? (
          <div className="p-12 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
              <span className="text-xs">Chargement de la nomenclature des observations...</span>
            </div>
          </div>
        ) : definitions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {definitionsToutes.length === 0
              ? "Aucune définition d’observation enregistrée dans la nomenclature."
              : "Aucune définition ne correspond aux critères de recherche."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Libellé & Paramètre</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Type de valeur & Unité</th>
                  <th className="py-3 px-4">Codifications externes</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  {!estModeLectureSeule && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {definitions.map((def) => (
                  <tr
                    key={def.id}
                    className={`hover:bg-slate-50/70 transition ${
                      def.actif ? "" : "opacity-60 bg-slate-50/30"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {def.code}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{def.libelle}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] font-medium"
                        title={def.categorie.chemin.join(" › ")}
                      >
                        {def.categorie.chemin.length > 1
                          ? def.categorie.chemin.join(" › ")
                          : def.categorie.libelle}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {def.typeValeur === "numerique" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            <Binary className="w-3 h-3" />
                            <span>Numérique</span>
                            {def.uniteCode && (
                              <span className="ml-1 bg-white px-1 py-0.2 rounded font-mono text-blue-900 border border-blue-150">
                                {def.uniteCode}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold">
                            <FileText className="w-3 h-3" />
                            <span>Texte</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {def.codifications.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Aucune</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {def.codifications.map((c, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-250 font-mono text-[10px]"
                              title={`${c.codeSystem} : ${c.code}`}
                            >
                              <span className="font-bold text-slate-900">{c.codeSystem}:</span>{" "}
                              {c.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <BadgeStatut statut={def.actif ? "actif" : "inactif"} />
                    </td>

                    {!estModeLectureSeule && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDefinitionPourCodif(def);
                              setModalCodifOuverte(true);
                            }}
                            title="Modifier les codes externes (LOINC/SNOMED)"
                            className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDefinitionEnEdition(def);
                              setModalDefOuverte(true);
                            }}
                            title="Modifier la définition"
                            className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale d'ajout / modification de définition */}
      <FormulaireObservationDefinitionModale
        ouvert={modalDefOuverte}
        definitionEnEdition={definitionEnEdition}
        unites={unites}
        codeSystems={codeSystems}
        categories={categories}
        onFermer={() => setModalDefOuverte(false)}
        onEnregistrer={handleEnregistrerDef}
        onOuvrirGestionUnites={() => setModalUnitesOuverte(true)}
      />

      {/* Modale de gestion hiérarchique des catégories d'observations */}
      <GestionCategoriesModale
        ouvert={modalCategoriesOuverte}
        titre="Catégories d'observations"
        libelleSingulier="catégorie d'observation"
        arbre={categoriesArbre}
        categories={categories}
        chargement={categoriesChargement}
        onFermer={() => setModalCategoriesOuverte(false)}
        onCreer={async (saisie) =>
          creerCategorie(saisie.code, saisie.libelle, saisie.parentCode ?? null)
        }
        onChangerParent={changerParentCategorie}
      />

      {/* Modale de gestion des codifications externes */}
      <FormulaireCodificationsModale
        ouvert={modalCodifOuverte}
        definition={definitionPourCodif}
        codeSystems={codeSystems}
        onFermer={() => setModalCodifOuverte(false)}
        onEnregistrer={definirCodifications}
      />

      {/* Modale de gestion des unités */}
      <GestionUnitesModale
        ouvert={modalUnitesOuverte}
        unites={unites}
        onFermer={() => setModalUnitesOuverte(false)}
        onCreerUnite={creerUnite}
        onBasculerActivation={basculerActivationUnite}
      />

      {/* Modale de gestion des terminologies */}
      <GestionCodeSystemsModale
        ouvert={modalCodeSystemsOuverte}
        codeSystems={codeSystems}
        onFermer={() => setModalCodeSystemsOuverte(false)}
        onCreerCodeSystem={creerCodeSystem}
        onBasculerActivation={basculerActivationCodeSystem}
      />
    </div>
  );
};

export default PanneauObservationDefinitions;
