/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  TypeEncounter,
  NouveauTypeEncounterInput,
  ModificationTypeEncounterInput,
} from "../modele/type-encounter.types";
import { ServiceMedical } from "@/briques/services";

export interface FormulaireTypeEncounterModaleProps {
  ouvert: boolean;
  typeEnEdition: TypeEncounter | null;
  /** Types de service disponibles (services catalogués). */
  typesServicesDisponibles: { id: number; nom: string; code?: string }[];
  onFermer: () => void;
  onEnregistrer: (
    saisie: NouveauTypeEncounterInput | ModificationTypeEncounterInput,
    id?: number,
  ) => Promise<boolean>;
  /** Appelé après un enregistrement réussi, uniquement en édition, pour sauver typeServiceIds. */
  onEnregistrerTypesService?: (id: number, typeServiceIds: number[]) => Promise<boolean>;
}

export const FormulaireTypeEncounterModale: React.FC<FormulaireTypeEncounterModaleProps> = ({
  ouvert,
  typeEnEdition,
  typesServicesDisponibles,
  onFermer,
  onEnregistrer,
  onEnregistrerTypesService,
}) => {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [description, setDescription] = useState("");
  const [typeServiceIds, setTypeServiceIds] = useState<number[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreurValidation, setErreurValidation] = useState<string | null>(null);

  useEffect(() => {
    if (typeEnEdition) {
      setCode(typeEnEdition.code);
      setLibelle(typeEnEdition.libelle);
      setDescription(typeEnEdition.description ?? "");
      setTypeServiceIds([...typeEnEdition.typeServiceIds]);
    } else {
      setCode("");
      setLibelle("");
      setDescription("");
      setTypeServiceIds([]);
    }
    setErreurValidation(null);
  }, [typeEnEdition, ouvert]);

  const basculerTypeService = (id: number) => {
    setTypeServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurValidation(null);

    const codeNettoye = code.trim().toUpperCase();
    const libelleNettoye = libelle.trim();

    if (!typeEnEdition && !codeNettoye) {
      setErreurValidation("Le code technique est obligatoire.");
      return;
    }
    if (!libelleNettoye) {
      setErreurValidation("Le libellé est obligatoire.");
      return;
    }

    setEnCours(true);
    try {
      const payload = typeEnEdition
        ? ({
            libelle: libelleNettoye,
            description: description.trim() || null,
          } satisfies ModificationTypeEncounterInput)
        : ({
            code: codeNettoye,
            libelle: libelleNettoye,
            description: description.trim() || null,
          } satisfies NouveauTypeEncounterInput);

      const ok = await onEnregistrer(payload, typeEnEdition?.id);
      if (!ok) return;

      // En édition : on sauvegarde aussi l'affectation aux types de service
      if (typeEnEdition && onEnregistrerTypesService) {
        await onEnregistrerTypesService(typeEnEdition.id, typeServiceIds);
      }
      onFermer();
    } finally {
      setEnCours(false);
    }
  };

  const typesTries = useMemo(
    () => [...typesServicesDisponibles].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    [typesServicesDisponibles],
  );

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={
        typeEnEdition
          ? `Modifier le type : ${typeEnEdition.libelle}`
          : "Nouveau type de prise en charge"
      }
      largeurMax="md"
      enfants={
        <form id="form-type-encounter" onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {erreurValidation && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreurValidation}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Code technique *</label>
            <input
              type="text"
              required
              disabled={Boolean(typeEnEdition) || enCours}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EX: CONS_GEN, URGENCE, VACCINATION"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase text-xs focus:outline-hidden focus:border-asina-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {typeEnEdition && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                Identifiant permanent non modifiable.
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Libellé *</label>
            <input
              type="text"
              required
              disabled={enCours}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="EX: Consultation générale"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              disabled={enCours}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="EX: Consultation médicale générale réalisée par un médecin généraliste"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500 resize-y"
            />
          </div>

          {/* Types de service autorisés */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-xs">
                Types de service autorisés ({typeServiceIds.length}/{typesTries.length})
              </span>
              {typeServiceIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTypeServiceIds([])}
                  className="text-[10px] text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  Tout désélectionner
                </button>
              )}
            </div>

            {!typeEnEdition && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                La sélection sera enregistrée après la création du type, sur la fiche de
                modification.
              </p>
            )}

            {typesTries.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                Aucun type de service n'est configuré.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {typesTries.map((ts) => {
                  const coche = typeServiceIds.includes(ts.id);
                  return (
                    <label
                      key={ts.id}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs ${
                        coche
                          ? "bg-asina-50 border border-asina-200"
                          : "hover:bg-white border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={coche}
                        onChange={() => basculerTypeService(ts.id)}
                        disabled={enCours || !typeEnEdition}
                        className="rounded border-slate-300 text-asina-600 focus:ring-asina-500"
                      />
                      <span className="font-medium text-slate-800 truncate">
                        {ts.nom}
                        {ts.code && (
                          <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                            {ts.code}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {typeEnEdition && typeServiceIds.length === 0 && (
              <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                Attention : sans aucun type de service, ce type de prise en charge sera refusé
                partout.
              </p>
            )}
          </div>
        </form>
      }
      pied={
        <div className="w-full">
          <ActionsFormulaire
            idFormulaire="form-type-encounter"
            onAnnuler={onFermer}
            enCours={enCours}
            desactive={enCours}
            labelValider={typeEnEdition ? "Mettre à jour" : "Créer le type"}
          />
        </div>
      }
    />
  );
};

export default FormulaireTypeEncounterModale;
