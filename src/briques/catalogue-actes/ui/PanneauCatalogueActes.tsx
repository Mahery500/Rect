/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Stethoscope,
  Plus,
  Edit2,
  RefreshCw,
  FolderTree,
  ToggleLeft,
  ToggleRight,
  Activity,
  BookMarked,
  Tag,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import { GestionCategoriesModale } from "@/noyau/referentiels/categories";
import {
  ActeMedical,
  NouvelActeInput,
  ModificationActeInput,
  NouvelleCategorieInput,
  PROFILS_ACTES,
} from "../modele/catalogue-actes.types";
import { useCatalogueActes } from "../hooks/useCatalogueActes";
import { FormulaireActeModale } from "./FormulaireActeModale";
import { ModaleObservationsActe } from "./ModaleObservationsActe";
import { FormulaireCodificationsActeModale } from "./FormulaireCodificationsActeModale";
import { GestionCodeSystemsModale } from "@/briques/observation-definitions/ui/GestionCodeSystemsModale";

export interface PanneauCatalogueActesProps {
  mode?: ModeAffichage;
}

export const PanneauCatalogueActes: React.FC<PanneauCatalogueActesProps> = ({
  mode = "edition",
}) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";

  const {
    actes,
    actesTous,
    // --- Catégories : liste plate + arbre + feuilles ---
    categories,
    categoriesArbre,
    categoriesChargement,
    changerParentCategorie,
    // --- Référentiels ---
    typesServices,
    codeSystems,
    // --- État global ---
    chargement,
    erreur,
    stats,
    // --- Filtres ---
    recherche,
    setRecherche,
    categorieFiltre,
    setCategorieFiltre,
    statutFiltre,
    setStatutFiltre,
    roleFiltre,
    setRoleFiltre,
    // --- Actions ---
    recharger,
    creerActe,
    modifierActe,
    basculerStatutActe,
    creerCategorie,
    definirCodifications,
    creerCodeSystem,
    basculerActivationCodeSystem,
  } = useCatalogueActes();

  // --- États des modales ---
  const [modalActeOuverte, setModalActeOuverte] = useState(false);
  const [acteEnEdition, setActeEnEdition] = useState<ActeMedical | null>(null);

  const [modalCategoriesOuverte, setModalCategoriesOuverte] = useState(false);

  const [modalObservationsOuverte, setModalObservationsOuverte] = useState(false);
  const [actePourObservations, setActePourObservations] = useState<ActeMedical | null>(null);

  const [modalCodifOuverte, setModalCodifOuverte] = useState(false);
  const [actePourCodif, setActePourCodif] = useState<ActeMedical | null>(null);

  const [modalCodeSystemsOuverte, setModalCodeSystemsOuverte] = useState(false);

  const nomTypeService = (id: number) => {
    const t = typesServices.find((item) => item.id === id);
    return t ? t.nom : `#${id}`;
  };

  const profilLibelle = (role: string) => {
    const p = PROFILS_ACTES.find((item) => item.role === role);
    return p ? p.libelle : role;
  };

  const handleEnregistrerActe = async (
    saisie: NouvelActeInput | ModificationActeInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifierActe(id, saisie as ModificationActeInput);
    }
    return creerActe(saisie as NouvelActeInput);
  };

  const handleCreerCategorie = async (saisie: NouvelleCategorieInput): Promise<boolean> => {
    return creerCategorie(saisie);
  };

  return (
    <div className="space-y-4">
      {/* Barre d'en-tête */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-asina-50 text-asina-700 rounded-lg shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Nomenclature &amp; Catalogue d'Actes Médicaux
              </h3>
              <p className="text-[11px] text-slate-500">
                Référentiel des actes cliniques, explorations et soins infirmiers autorisés par
                profession.
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

            {/* Gestion des catégories (arbre hiérarchique) */}
            <button
              type="button"
              onClick={() => setModalCategoriesOuverte(true)}
              className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
              title="Gérer l'arborescence des catégories d'actes"
            >
              <FolderTree className="h-4 w-4 text-slate-500" />
              <span>Catégories ({categories.length})</span>
            </button>

            {!estModeLectureSeule && (
              <button
                type="button"
                onClick={() => setModalCodeSystemsOuverte(true)}
                className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                title="Gérer les référentiels de codification (LOINC, CCAM, CIM-10, SNOMED, etc.)"
              >
                <BookMarked className="h-4 w-4 text-slate-600" />
                <span>Terminologies ({codeSystems.length})</span>
              </button>
            )}

            {!estModeLectureSeule && (
              <button
                type="button"
                onClick={() => {
                  setActeEnEdition(null);
                  setModalActeOuverte(true);
                }}
                disabled={categories.length === 0}
                className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>Nouvel Acte</span>
              </button>
            )}
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Actes</span>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{stats.total}</p>
          </div>
          <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-150">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Actes Actifs</span>
            <p className="text-lg font-extrabold text-emerald-800 leading-tight">{stats.actifs}</p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Désactivés / Archivés
            </span>
            <p className="text-lg font-extrabold text-slate-600 leading-tight">{stats.inactifs}</p>
          </div>
          <div className="p-2.5 bg-asina-50/60 rounded-lg border border-asina-150">
            <span className="text-[10px] uppercase font-bold text-asina-700">
              Catégories Cliniques
            </span>
            <p className="text-lg font-extrabold text-asina-800 leading-tight">
              {stats.totalCat}
              <span className="ml-1 text-[10px] font-medium text-asina-600">
                ({stats.totalFeuilles} feuille{stats.totalFeuilles > 1 ? "s" : ""})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Rechercher par code, libellé ou catégorie..."
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          <select
            value={categorieFiltre}
            onChange={(e) => setCategorieFiltre(e.target.value)}
            className="w-full sm:w-52 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.code}>
                {c.chemin.length > 1
                  ? `${"— ".repeat(c.chemin.length - 1)}${c.libelle}`
                  : c.libelle}
              </option>
            ))}
          </select>

          <select
            value={roleFiltre}
            onChange={(e) => setRoleFiltre(e.target.value)}
            className="w-full sm:w-36 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Tous les profils</option>
            {PROFILS_ACTES.map((p) => (
              <option key={p.role} value={p.role}>
                {p.libelle}
              </option>
            ))}
          </select>

          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value as "tous" | "actifs" | "inactifs")}
            className="w-full sm:w-32 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Tous statuts</option>
            <option value="actifs">Actifs seuls</option>
            <option value="inactifs">Inactifs seuls</option>
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

      {/* Tableau des actes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {chargement ? (
          <div className="p-12 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
              <span className="text-xs">Chargement de la nomenclature...</span>
            </div>
          </div>
        ) : actes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {actesTous.length === 0
              ? "Aucun acte médical enregistré dans le catalogue."
              : "Aucun acte ne correspond aux critères de recherche."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Libellé</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Profils autorisés</th>
                  <th className="py-3 px-4">Services applicables</th>
                  <th className="py-3 px-4">Codifications</th>
                  <th className="py-3 px-4 text-center">Moule d’observations</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  {!estModeLectureSeule && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actes.map((a) => (
                  <tr
                    key={a.id}
                    className={`hover:bg-slate-50/70 transition ${
                      a.actif ? "" : "opacity-60 bg-slate-50/30"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-asina-700 bg-asina-50 border border-asina-150 px-2 py-0.5 rounded text-[11px]">
                        {a.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{a.libelle}</td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-150"
                        title={a.categorie.chemin.join(" › ")}
                      >
                        {a.categorie.chemin.length > 1
                          ? a.categorie.chemin.slice(0, -1).join(" › ") +
                            " › " +
                            a.categorie.libelle
                          : a.categorie.libelle || a.categorie.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {a.rolesAutorises.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-150"
                          >
                            {profilLibelle(r)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {a.typeServiceIds.length === 0 ? (
                        <span className="italic text-slate-400">Tous les services</span>
                      ) : (
                        <span className="text-[11px]">
                          {a.typeServiceIds.map(nomTypeService).join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {!a.codifications || a.codifications.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActePourCodif(a);
                            setModalCodifOuverte(true);
                          }}
                          className="text-slate-400 hover:text-asina-600 italic text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          title="Associer un code système (CCAM, LOINC, CIM-10, etc.)"
                        >
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>+ Codifier</span>
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-1 items-center">
                          {a.codifications.map((c, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-150 font-mono text-[10px]"
                              title={c.libelle}
                            >
                              {c.codeSystem}:{c.code}
                            </span>
                          ))}
                          {!estModeLectureSeule && (
                            <button
                              type="button"
                              onClick={() => {
                                setActePourCodif(a);
                                setModalCodifOuverte(true);
                              }}
                              className="p-0.5 text-slate-400 hover:text-violet-700 cursor-pointer"
                              title="Modifier les codes systèmes associés"
                            >
                              <Tag className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActePourObservations(a);
                          setModalObservationsOuverte(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-asina-50 hover:border-asina-300 text-slate-700 hover:text-asina-800 transition text-[11px] font-medium cursor-pointer shadow-2xs"
                        title={`Configurer le moule d’observations attendues pour ${a.libelle}`}
                      >
                        <Activity className="w-3.5 h-3.5 text-asina-600 shrink-0" />
                        <span>Paramètres &amp; Moule</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!estModeLectureSeule ? (
                        <button
                          type="button"
                          onClick={() => basculerStatutActe(a)}
                          className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition"
                          title={a.actif ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                        >
                          <BadgeStatut statut={a.actif ? "actif" : "inactif"} />
                          {a.actif ? (
                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        <BadgeStatut statut={a.actif ? "actif" : "inactif"} />
                      )}
                    </td>
                    {!estModeLectureSeule && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActePourCodif(a);
                              setModalCodifOuverte(true);
                            }}
                            title="Gérer les codes systèmes et codifications de cet acte"
                            className="p-1.5 text-slate-400 hover:text-violet-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActePourObservations(a);
                              setModalObservationsOuverte(true);
                            }}
                            title="Configurer le moule d’observations attendues"
                            className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Activity className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActeEnEdition(a);
                              setModalActeOuverte(true);
                            }}
                            title="Modifier l'acte"
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

      {/* Modale d'ajout / modification d'acte */}
      <FormulaireActeModale
        ouvert={modalActeOuverte}
        acteEnEdition={acteEnEdition}
        categories={categories}
        typesServices={typesServices}
        codeSystems={codeSystems}
        onFermer={() => setModalActeOuverte(false)}
        onEnregistrer={handleEnregistrerActe}
      />

      {/* Modale de gestion hiérarchique des catégories d'actes */}
      <GestionCategoriesModale
        ouvert={modalCategoriesOuverte}
        titre="Catégories d'actes médicaux"
        libelleSingulier="catégorie d'acte"
        arbre={categoriesArbre}
        categories={categories}
        chargement={categoriesChargement}
        onFermer={() => setModalCategoriesOuverte(false)}
        onCreer={handleCreerCategorie}
        onChangerParent={changerParentCategorie}
      />

      {/* Modale du moule d'observations attendues pour l'acte */}
      <ModaleObservationsActe
        ouvert={modalObservationsOuverte}
        acte={actePourObservations}
        onFermer={() => {
          setModalObservationsOuverte(false);
          setActePourObservations(null);
        }}
      />

      {/* Modale des codifications / codes systèmes pour l'acte */}
      <FormulaireCodificationsActeModale
        ouvert={modalCodifOuverte}
        acte={actePourCodif}
        codeSystems={codeSystems}
        onFermer={() => {
          setModalCodifOuverte(false);
          setActePourCodif(null);
        }}
        onEnregistrer={definirCodifications}
      />

      {/* Modale de gestion des terminologies et codes systèmes */}
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

export default PanneauCatalogueActes;
