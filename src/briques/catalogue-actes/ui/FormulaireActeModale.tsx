/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  ActeMedical,
  CategorieActe,
  TypeServiceOption,
  NouvelActeInput,
  ModificationActeInput,
  CodeSystemeOption,
  CodificationActe,
  PROFILS_ACTES,
} from "../modele/catalogue-actes.types";

export interface FormulaireActeModaleProps {
  ouvert: boolean;
  acteEnEdition: ActeMedical | null;
  categories: CategorieActe[];
  typesServices: TypeServiceOption[];
  codeSystems: CodeSystemeOption[];
  onFermer: () => void;
  onEnregistrer: (saisie: NouvelActeInput | ModificationActeInput, id?: number) => Promise<boolean>;
}

export const FormulaireActeModale: React.FC<FormulaireActeModaleProps> = ({
  ouvert,
  acteEnEdition,
  categories,
  typesServices,
  codeSystems,
  onFermer,
  onEnregistrer,
}) => {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [categorieCode, setCategorieCode] = useState(""); // ← état manquant
  const [rolesAutorises, setRolesAutorises] = useState<string[]>([]);
  const [typeServiceIds, setTypeServiceIds] = useState<number[]>([]);
  const [codifications, setCodifications] = useState<CodificationActe[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreurValidation, setErreurValidation] = useState<string | null>(null);

  // Seules les feuilles peuvent recevoir un acte (assertAccepteElements côté backend).
  // Triées par chemin hiérarchique pour un affichage cohérent dans la liste.
  const categoriesFeuilles = useMemo(
    () =>
      categories
        .filter((c) => c.feuille)
        .sort((a, b) => a.chemin.join("/").localeCompare(b.chemin.join("/"), "fr")),
    [categories],
  );

  const codeSystemsActifs = useMemo(
    () => codeSystems.filter((cs) => cs.actif).sort((a, b) => a.code.localeCompare(b.code, "fr")),
    [codeSystems],
  );

  // Indentation visuelle : `— — — Libellé` pour un niveau 3.
  const libelleHierarchique = (c: CategorieActe): string =>
    c.niveau > 1
      ? `${"\u2014 ".repeat(c.niveau - 1)}${c.libelle} (${c.code})`
      : `${c.libelle} (${c.code})`;

  // Synchronisation avec l'acte en édition et pré-sélection par défaut en création.
  useEffect(() => {
    if (acteEnEdition) {
      setCode(acteEnEdition.code);
      setLibelle(acteEnEdition.libelle);
      setCategorieCode(acteEnEdition.categorie.code);
      setRolesAutorises([...acteEnEdition.rolesAutorises]);
      setTypeServiceIds([...acteEnEdition.typeServiceIds]);
      setCodifications(acteEnEdition.codifications ? [...acteEnEdition.codifications] : []);
    } else {
      setCode("");
      setLibelle("");
      // Pré-sélection : première feuille disponible, jamais une catégorie parente.
      setCategorieCode(categoriesFeuilles.length > 0 ? categoriesFeuilles[0].code : "");
      setRolesAutorises(["ROLE_INFIRMIER"]);
      setTypeServiceIds([]);
      setCodifications([]);
    }
    setErreurValidation(null);
  }, [acteEnEdition, categoriesFeuilles, ouvert]);

  const toggleRole = (role: string) => {
    setRolesAutorises((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const toggleTypeService = (id: number) => {
    setTypeServiceIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleAjouterCodification = () => {
    const systemeDefaut = codeSystemsActifs.length > 0 ? codeSystemsActifs[0].code : "CCAM";
    setCodifications((prev) => [...prev, { codeSystem: systemeDefaut, code: "" }]);
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
      setErreurValidation("Le code technique de l'acte est obligatoire.");
      return;
    }
    if (!libelleNettoye) {
      setErreurValidation("Le libellé de l'acte est obligatoire.");
      return;
    }
    if (!categorieCode) {
      setErreurValidation("Une catégorie doit être sélectionnée.");
      return;
    }
    if (rolesAutorises.length === 0) {
      setErreurValidation("Veuillez cocher au moins un profil professionnel autorisé.");
      return;
    }

    setEnCours(true);
    try {
      const codificationsValides = codifications
        .map((c) => ({
          codeSystem: c.codeSystem.trim().toUpperCase(),
          code: c.code.trim(),
        }))
        .filter((c) => c.code.length > 0);

      let succes = false;
      if (acteEnEdition) {
        const payload: ModificationActeInput = {
          libelle: libelleNettoye,
          categorieCode,
          rolesAutorises,
          typeServiceIds,
          codifications: codificationsValides,
        };
        succes = await onEnregistrer(payload, acteEnEdition.id);
      } else {
        const payload: NouvelActeInput = {
          code: codeNettoye,
          libelle: libelleNettoye,
          categorieCode,
          rolesAutorises,
          typeServiceIds,
          codifications: codificationsValides,
        };
        succes = await onEnregistrer(payload);
      }
      if (succes) onFermer();
    } finally {
      setEnCours(false);
    }
  };

  const optionCouranteAbsente = (codeSystemCourant: string) =>
    Boolean(codeSystemCourant) && !codeSystemsActifs.some((cs) => cs.code === codeSystemCourant);

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={acteEnEdition ? `Modifier l'acte « ${acteEnEdition.code} »` : "Nouvel Acte Médical"}
      largeurMax="md"
      enfants={
        <form id="form-acte-medical" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {erreurValidation && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreurValidation}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Code technique *</label>
              <input
                type="text"
                required
                disabled={Boolean(acteEnEdition) || enCours}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="EX: ECG, PANSEMENT"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase text-xs focus:outline-hidden focus:border-asina-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
              {acteEnEdition && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Identifiant permanent non modifiable.
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Catégorie d'acte *</label>
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
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Aucune catégorie feuille disponible. Créez-en une dans « Catégories ».
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Libellé descriptif *</label>
            <input
              type="text"
              required
              disabled={enCours}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="EX: Électrocardiogramme de repos 12 dérivations"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Profils autorisés à réaliser l'acte *
            </label>
            <div className="flex flex-wrap gap-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              {PROFILS_ACTES.map((p) => (
                <label
                  key={p.role}
                  className="inline-flex items-center gap-2 cursor-pointer text-slate-800 font-medium select-none"
                >
                  <input
                    type="checkbox"
                    checked={rolesAutorises.includes(p.role)}
                    onChange={() => toggleRole(p.role)}
                    disabled={enCours}
                    className="rounded border-slate-300 text-asina-600 focus:ring-asina-500"
                  />
                  <span>{p.libelle}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Types de services applicables
            </label>
            <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {typesServices.length === 0 ? (
                <p className="col-span-2 text-[11px] text-slate-400 italic">
                  Aucun type de service configuré.
                </p>
              ) : (
                typesServices.map((ts) => (
                  <label
                    key={ts.id}
                    className="inline-flex items-center gap-2 cursor-pointer text-slate-700 text-[11px] select-none"
                  >
                    <input
                      type="checkbox"
                      checked={typeServiceIds.includes(ts.id)}
                      onChange={() => toggleTypeService(ts.id)}
                      disabled={enCours}
                      className="rounded border-slate-300 text-asina-600 focus:ring-asina-500"
                    />
                    <span className="truncate">{ts.nom}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {typeServiceIds.length === 0
                ? "Aucune restriction sélectionnée : l'acte est réalisable dans tous les services."
                : `${typeServiceIds.length} type(s) de service sélectionné(s).`}
            </p>
          </div>

          {/* -------- Codifications externes (multi-terminologies) -------- */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-slate-700 font-semibold text-xs">
                  Codifications externes ({codifications.length})
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Associez plusieurs systèmes (CCAM, NGAP, LOINC…).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAjouterCodification}
                disabled={codeSystemsActifs.length === 0}
                className="btn-secondary py-1 px-2 text-xs font-semibold rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>

            {codeSystemsActifs.length === 0 && (
              <p className="text-[11px] text-amber-700 italic">
                Aucune terminologie active. Ajoutez-en dans « Terminologies ».
              </p>
            )}

            {codifications.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1">
                Aucune codification externe associée (optionnel).
              </p>
            ) : (
              <div className="space-y-1.5">
                {codifications.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={item.codeSystem}
                      onChange={(e) => handleChangerCodification(idx, "codeSystem", e.target.value)}
                      className="w-1/3 bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold"
                    >
                      {codeSystemsActifs.map((cs) => (
                        <option key={cs.id} value={cs.code}>
                          {cs.code}
                        </option>
                      ))}
                      {optionCouranteAbsente(item.codeSystem) && (
                        <option value={item.codeSystem}>{item.codeSystem} (désactivé)</option>
                      )}
                    </select>
                    <input
                      type="text"
                      value={item.code}
                      onChange={(e) => handleChangerCodification(idx, "code", e.target.value)}
                      placeholder="Code officiel (ex. JAQK001)"
                      className="flex-1 bg-white border border-slate-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => handleSupprimerCodification(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer transition"
                      aria-label="Retirer cette codification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      }
      pied={
        <div className="w-full">
          <ActionsFormulaire
            idFormulaire="form-acte-medical"
            onAnnuler={onFermer}
            enCours={enCours}
            desactive={enCours || rolesAutorises.length === 0 || categoriesFeuilles.length === 0}
            labelValider={acteEnEdition ? "Mettre à jour" : "Créer l'acte"}
          />
        </div>
      }
    />
  );
};

export default FormulaireActeModale;
