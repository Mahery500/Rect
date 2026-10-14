/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Edit2,
  Tag,
  BookOpen,
  BookMarked,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import {
  DiagnosticDefinition,
  NouvelleDiagnosticDefinitionInput,
  ModificationDiagnosticDefinitionInput,
} from "../modele/diagnostic-definition.types";
import { useDiagnosticDefinitions } from "../hooks/useDiagnosticDefinitions";
import { FormulaireDiagnosticDefinitionModale } from "./FormulaireDiagnosticDefinitionModale";
import { FormulaireCodificationsDiagnosticModale } from "./FormulaireCodificationsDiagnosticModale";
import { GestionCodeSystemsModale } from "@/briques/observation-definitions/ui/GestionCodeSystemsModale";

export interface PanneauDiagnosticDefinitionsProps {
  mode?: ModeAffichage;
}

export const PanneauDiagnosticDefinitions: React.FC<PanneauDiagnosticDefinitionsProps> = ({
  mode = "edition",
}) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";

  const {
    definitions,
    definitionsToutes,
    chapitres,
    codeSystems,
    chargement,
    erreur,
    recherche,
    setRecherche,
    filtreChapitre,
    setFiltreChapitre,
    filtreActif,
    setFiltreActif,
    recharger,
    creerDefinition,
    modifierDefinition,
    changerActivation,
    definirCodifications,
    creerCodeSystem,
    basculerActivationCodeSystem,
  } = useDiagnosticDefinitions();

  // Modales
  const [modaleFormulaireOuverte, setModaleFormulaireOuverte] = useState(false);
  const [definitionEnEdition, setDefinitionEnEdition] = useState<DiagnosticDefinition | null>(null);

  const [modaleCodificationsOuverte, setModaleCodificationsOuverte] = useState(false);
  const [definitionCodifications, setDefinitionCodifications] =
    useState<DiagnosticDefinition | null>(null);

  const [modaleCodeSystemsOuverte, setModaleCodeSystemsOuverte] = useState(false);

  const handleOuvrirCreation = () => {
    setDefinitionEnEdition(null);
    setModaleFormulaireOuverte(true);
  };

  const handleOuvrirModification = (def: DiagnosticDefinition) => {
    setDefinitionEnEdition(def);
    setModaleFormulaireOuverte(true);
  };

  const handleOuvrirCodifications = (def: DiagnosticDefinition) => {
    setDefinitionCodifications(def);
    setModaleCodificationsOuverte(true);
  };

  const handleEnregistrerFormulaire = async (
    saisie: NouvelleDiagnosticDefinitionInput | ModificationDiagnosticDefinitionInput,
  ) => {
    if (definitionEnEdition) {
      return modifierDefinition(definitionEnEdition.id, saisie);
    }
    return creerDefinition(saisie as NouvelleDiagnosticDefinitionInput);
  };

  const totalActifs = definitionsToutes.filter((d) => d.actif).length;

  return (
    <div className="space-y-6">
      {/* En-tête du panneau */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rose-700" />
            <span>Référentiel des Diagnostics & CIM-10</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Nomenclature des diagnostics médicaux, chapitres nosologiques et codifications
            internationales
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={recharger}
            disabled={chargement}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${chargement ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          {!estModeLectureSeule && (
            <button
              type="button"
              onClick={() => setModaleCodeSystemsOuverte(true)}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Gérer les référentiels de terminologies (CIM-10, CIM-11, SNOMED-CT, etc.)"
            >
              <BookMarked className="w-3.5 h-3.5 text-slate-600" />
              <span>Terminologies ({codeSystems.length})</span>
            </button>
          )}

          {!estModeLectureSeule && (
            <button
              type="button"
              onClick={handleOuvrirCreation}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau diagnostic</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartes d'indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total diagnostics
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {definitionsToutes.length}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Diagnostics actifs
          </span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">{totalActifs}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
            Chapitres recensés
          </span>
          <span className="text-xl font-bold text-blue-700 mt-1 block">{chapitres.length}</span>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <ChampRecherche
              valeur={recherche}
              onChange={setRecherche}
              placeholder="Rechercher par code CIM-10, libellé, chapitre, codification…"
            />
          </div>

          <div>
            <select
              value={filtreChapitre}
              onChange={(e) => setFiltreChapitre(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden"
            >
              <option value="tous">Tous les chapitres</option>
              {chapitres.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filtreActif}
              onChange={(e) => setFiltreActif(e.target.value as "tous" | "actifs" | "inactifs")}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden"
            >
              <option value="tous">Tous les statuts</option>
              <option value="actifs">Actifs uniquement</option>
              <option value="inactifs">Inactifs uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des diagnostics */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Libellé du diagnostic</th>
                <th className="p-3">Chapitre / Catégorie</th>
                <th className="p-3">Codifications</th>
                <th className="p-3 text-center">Statut</th>
                {!estModeLectureSeule && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chargement ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Chargement du référentiel diagnostique…
                  </td>
                </tr>
              ) : definitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Aucun diagnostic ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                definitions.map((def) => (
                  <tr key={def.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono font-bold text-rose-700">{def.code}</td>

                    <td className="p-3 max-w-sm">
                      <div className="font-semibold text-slate-900">{def.libelle}</div>
                      {def.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {def.description}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-slate-600">
                      {def.chapitre ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                          {def.chapitre}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {def.codifications.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">Aucune</span>
                        ) : (
                          def.codifications.slice(0, 2).map((c, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-mono text-[10px]"
                            >
                              {c.codeSystem}: {c.code}
                            </span>
                          ))
                        )}
                        {def.codifications.length > 2 && (
                          <span className="text-[10px] text-slate-500">
                            +{def.codifications.length - 2}
                          </span>
                        )}
                        {!estModeLectureSeule && (
                          <button
                            type="button"
                            onClick={() => handleOuvrirCodifications(def)}
                            className="p-1 text-slate-400 hover:text-rose-700 transition"
                            title="Gérer les codes"
                          >
                            <Tag className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <BadgeStatut
                        statut={def.actif ? "ACTIF" : "INACTIF"}
                        variante={def.actif ? "succes" : "neutre"}
                      />
                    </td>

                    {!estModeLectureSeule && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => changerActivation(def.id, !def.actif)}
                            className={`p-1.5 rounded transition ${
                              def.actif
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={def.actif ? "Désactiver" : "Activer"}
                          >
                            {def.actif ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOuvrirModification(def)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale d'édition */}
      <FormulaireDiagnosticDefinitionModale
        ouvert={modaleFormulaireOuverte}
        onFermer={() => setModaleFormulaireOuverte(false)}
        definitionExistante={definitionEnEdition}
        chapitresConnus={chapitres}
        codeSystems={codeSystems}
        onEnregistrer={handleEnregistrerFormulaire}
      />

      {/* Modale de codifications */}
      <FormulaireCodificationsDiagnosticModale
        ouvert={modaleCodificationsOuverte}
        onFermer={() => setModaleCodificationsOuverte(false)}
        definition={definitionCodifications}
        codeSystems={codeSystems}
        onEnregistrer={definirCodifications}
      />

      {/* Modale de gestion des Terminologies / Code Systems */}
      <GestionCodeSystemsModale
        ouvert={modaleCodeSystemsOuverte}
        onFermer={() => setModaleCodeSystemsOuverte(false)}
        codeSystems={codeSystems}
        onCreerCodeSystem={creerCodeSystem}
        onBasculerActivation={basculerActivationCodeSystem}
      />
    </div>
  );
};
