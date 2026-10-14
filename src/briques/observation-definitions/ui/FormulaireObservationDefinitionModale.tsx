/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import type { CategorieHierarchique } from "@/noyau/referentiels/categories";
import {
  ObservationDefinition,
  UniteMesure,
  CodeSysteme,
  NouvelleObservationDefinitionInput,
  ModificationObservationDefinitionInput,
  TypeValeurObservation,
  CodificationItem,
} from "../modele/observation-definition.types";

export interface FormulaireObservationDefinitionModaleProps {
  ouvert: boolean;
  definitionEnEdition: ObservationDefinition | null;
  unites: UniteMesure[];
  codeSystems: CodeSysteme[];
  /** Catégories d'observations disponibles (hiérarchiques). */
  categories: CategorieHierarchique[];
  onFermer: () => void;
  onEnregistrer: (
    saisie: NouvelleObservationDefinitionInput | ModificationObservationDefinitionInput,
    id?: number,
  ) => Promise<boolean>;
  onOuvrirGestionUnites?: () => void;
}

export const FormulaireObservationDefinitionModale: React.FC<
  FormulaireObservationDefinitionModaleProps
> = ({
  ouvert,
  definitionEnEdition,
  unites,
  codeSystems,
  categories,
  onFermer,
  onEnregistrer,
  onOuvrirGestionUnites,
}) => {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [typeValeur, setTypeValeur] = useState<TypeValeurObservation>("numerique");
  const [categorieCode, setCategorieCode] = useState("");
  const [uniteId, setUniteId] = useState<string>("");
  const [codifications, setCodifications] = useState<CodificationItem[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreurValidation, setErreurValidation] = useState<string | null>(null);

  const unitesActives = useMemo(() => unites.filter((u) => u.actif), [unites]);
  const codeSystemsActifs = useMemo(
    () => codeSystems.filter((c) => c.actif).sort((a, b) => a.code.localeCompare(b.code, "fr")),
    [codeSystems],
  );

  // Seules les feuilles peuvent recevoir une observation.
  const categoriesFeuilles = useMemo(
    () =>
      categories
        .filter((c) => c.feuille)
        .sort((a, b) => a.chemin.join("/").localeCompare(b.chemin.join("/"), "fr")),
    [categories],
  );

  const libelleHierarchique = (c: CategorieHierarchique): string =>
    c.niveau > 1
      ? `${"\u2014 ".repeat(c.niveau - 1)}${c.libelle} (${c.code})`
      : `${c.libelle} (${c.code})`;

  useEffect(() => {
    if (definitionEnEdition) {
      setCode(definitionEnEdition.code);
      setLibelle(definitionEnEdition.libelle);
      setTypeValeur(definitionEnEdition.typeValeur);
      setCategorieCode(definitionEnEdition.categorie.code);
      setUniteId(definitionEnEdition.uniteId ? String(definitionEnEdition.uniteId) : "");
      setCodifications(definitionEnEdition.codifications || []);
    } else {
      setCode("");
      setLibelle("");
      setTypeValeur("numerique");
      setCategorieCode(categoriesFeuilles.length > 0 ? categoriesFeuilles[0].code : "");
      setUniteId(unitesActives.length > 0 ? String(unitesActives[0].id) : "");
      setCodifications([]);
    }
    setErreurValidation(null);
  }, [definitionEnEdition, categoriesFeuilles, unitesActives, ouvert]);

  const handleAjouterCodification = () => {
    const premierSysteme = codeSystemsActifs.length > 0 ? codeSystemsActifs[0].code : "LOINC";
    setCodifications((prev) => [...prev, { codeSystem: premierSysteme, code: "" }]);
  };

  const handleSupprimerCodification = (index: number) => {
    setCodifications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangerCodification = (
    index: number,
    champ: "codeSystem" | "code",
    valeur: string,
  ) => {
    setCodifications((prev) => prev.map((c, i) => (i === index ? { ...c, [champ]: valeur } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurValidation(null);

    const codeNettoye = code.trim().toUpperCase();
    const libelleNettoye = libelle.trim();

    if (!codeNettoye) {
      setErreurValidation("Le code mnémonique de l’observation est obligatoire.");
      return;
    }
    if (!libelleNettoye) {
      setErreurValidation("Le libellé de l’observation est obligatoire.");
      return;
    }
    if (!categorieCode) {
      setErreurValidation("Une catégorie d’observation doit être sélectionnée.");
      return;
    }
    if (typeValeur === "numerique" && (!uniteId || Number(uniteId) <= 0)) {
      setErreurValidation(
        "Une observation de type numérique exige obligatoirement une unité de mesure.",
      );
      return;
    }

    const codificationsValides = codifications
      .map((c) => ({
        codeSystem: c.codeSystem.trim().toUpperCase(),
        code: c.code.trim(),
      }))
      .filter((c) => c.code.length > 0);

    setEnCours(true);
    try {
      let succes = false;
      if (definitionEnEdition) {
        const payload: ModificationObservationDefinitionInput = {
          libelle: libelleNettoye,
          code: codeNettoye,
          typeValeur,
          categorieCode,
          uniteId: typeValeur === "numerique" ? Number(uniteId) : null,
        };
        succes = await onEnregistrer(payload, definitionEnEdition.id);
      } else {
        const payload: NouvelleObservationDefinitionInput = {
          code: codeNettoye,
          libelle: libelleNettoye,
          typeValeur,
          categorieCode,
          uniteId: typeValeur === "numerique" ? Number(uniteId) : null,
          codifications: codificationsValides,
        };
        succes = await onEnregistrer(payload);
      }

      if (succes) onFermer();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={
        definitionEnEdition
          ? "Modifier la définition d’observation"
          : "Nouvelle définition d’observation clinique"
      }
      largeurMax="md"
      enfants={
        <form id="form-observation-def" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {erreurValidation && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreurValidation}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Code mnémonique *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex. TA_SYS, POIDS..."
                disabled={enCours}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase focus:outline-hidden focus:border-asina-500 disabled:bg-slate-100"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Identifiant unique</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                Libellé descriptif *
              </label>
              <input
                type="text"
                required
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                placeholder="Ex. Tension artérielle systolique"
                disabled={enCours}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
              />
            </div>
          </div>

          {/* Catégorie hiérarchique : seules les feuilles sont proposées */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Catégorie d’observation *
            </label>
            <select
              value={categorieCode}
              onChange={(e) => setCategorieCode(e.target.value)}
              required
              disabled={enCours || categoriesFeuilles.length === 0}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="" disabled>
                — Sélectionner une catégorie (feuille) —
              </option>
              {categoriesFeuilles.map((c) => (
                <option key={c.id} value={c.code}>
                  {libelleHierarchique(c)}
                </option>
              ))}
            </select>
            {categoriesFeuilles.length === 0 && (
              <p className="text-[10px] text-amber-700 mt-1">
                Aucune catégorie feuille disponible. Créez-en une dans « Catégories ».
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Type de valeur attendue *
              </label>
              <select
                value={typeValeur}
                onChange={(e) => {
                  const val = e.target.value as TypeValeurObservation;
                  setTypeValeur(val);
                  if (val === "texte") {
                    setUniteId("");
                  } else if (!uniteId && unitesActives.length > 0) {
                    setUniteId(String(unitesActives[0].id));
                  }
                }}
                disabled={enCours}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500 font-medium"
              >
                <option value="numerique">Numérique (mesure chiffrée avec unité)</option>
                <option value="texte">Texte libre (qualitatif / commentaire)</option>
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                {typeValeur === "numerique"
                  ? "Exige une unité de mesure clinique (ex. mmHg, kg, °C)."
                  : "Aucune unité requise (ex. aspect, résultat qualitatif)."}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">
                  Unité de mesure {typeValeur === "numerique" ? "*" : "(désactivée)"}
                </label>
                {onOuvrirGestionUnites && (
                  <button
                    type="button"
                    onClick={onOuvrirGestionUnites}
                    className="text-[10px] text-asina-600 hover:underline cursor-pointer"
                  >
                    + Gérer les unités
                  </button>
                )}
              </div>
              <select
                value={uniteId}
                onChange={(e) => setUniteId(e.target.value)}
                required={typeValeur === "numerique"}
                disabled={enCours || typeValeur === "texte"}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">— Choisir l’unité —</option>
                {unitesActives.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} ({u.libelle})
                  </option>
                ))}
              </select>
              {typeValeur === "numerique" && unitesActives.length === 0 && (
                <span className="text-[10px] text-amber-700 block mt-1">
                  Aucune unité active disponible. Utilisez « Gérer les unités » pour en créer.
                </span>
              )}
            </div>
          </div>

          {!definitionEnEdition && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-semibold block">
                  Codifications externes (LOINC, SNOMED, etc.)
                </label>
                <button
                  type="button"
                  onClick={handleAjouterCodification}
                  disabled={codeSystemsActifs.length === 0}
                  className="text-xs text-asina-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un code</span>
                </button>
              </div>

              {codifications.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  Aucune codification externe associée (optionnel).
                </p>
              ) : (
                <div className="space-y-2">
                  {codifications.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.codeSystem}
                        onChange={(e) =>
                          handleChangerCodification(idx, "codeSystem", e.target.value)
                        }
                        className="w-1/3 bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold"
                      >
                        {codeSystemsActifs.map((cs) => (
                          <option key={cs.id} value={cs.code}>
                            {cs.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.code}
                        onChange={(e) => handleChangerCodification(idx, "code", e.target.value)}
                        placeholder="Code externe (ex. 8480-6)"
                        className="flex-1 bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleSupprimerCodification(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {definitionEnEdition && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-[11px]">
              ℹ️ Pour modifier les codes externes LOINC/SNOMED d’une observation existante, utilisez
              le bouton « Codifications » dans le tableau.
            </div>
          )}
        </form>
      }
      pied={
        <div className="w-full">
          <ActionsFormulaire
            idFormulaire="form-observation-def"
            onAnnuler={onFermer}
            enCours={enCours}
            desactive={enCours || categoriesFeuilles.length === 0}
            labelValider={definitionEnEdition ? "Mettre à jour" : "Enregistrer la définition"}
          />
        </div>
      }
    />
  );
};

export default FormulaireObservationDefinitionModale;
