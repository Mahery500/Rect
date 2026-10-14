/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Modale } from "@/noyau/ui/Modale";
import { ChampTexte } from "@/noyau/ui/ChampTexte";
import { ChampZoneTexte } from "@/noyau/ui/ChampZoneTexte";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  TypeServiceMedical,
  NouveauTypeServiceInput,
  ModificationTypeServiceInput,
} from "../modele/service.types";

export interface FormulaireTypeServiceModaleProps {
  ouvert: boolean;
  typeEnEdition: TypeServiceMedical | null;
  onFermer: () => void;
  onEnregistrer: (
    saisie: NouveauTypeServiceInput | ModificationTypeServiceInput,
    id?: number,
  ) => Promise<boolean>;
}

export const FormulaireTypeServiceModale: React.FC<FormulaireTypeServiceModaleProps> = ({
  ouvert,
  typeEnEdition,
  onFermer,
  onEnregistrer,
}) => {
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [actif, setActif] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [supporteAiguillage, setSupporteAiguillage] = useState(true);

  useEffect(() => {
    if (typeEnEdition) {
      setCode(typeEnEdition.code);
      setNom(typeEnEdition.nom);
      setDescription(typeEnEdition.description || "");
      setActif(typeEnEdition.actif);
      setSupporteAiguillage(typeEnEdition.supporteAiguillage);
    } else {
      setCode("");
      setNom("");
      setDescription("");
      setActif(true);
      setSupporteAiguillage(true);
    }
  }, [typeEnEdition, ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    try {
      const ok = await onEnregistrer(
        {
          code: code.trim(),
          nom: nom.trim(),
          description: description.trim() || undefined,
          actif,
          supporteAiguillage,
        },
        typeEnEdition?.id,
      );
      if (ok) {
        onFermer();
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={typeEnEdition ? `Modifier le type : ${typeEnEdition.nom}` : "Nouveau Type de Service"}
      enfants={
        <form id="form-type-service" onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <ChampTexte
              label="Code technique"
              valeur={code}
              onChange={setCode}
              placeholder="ex: CARDIO"
              obligatoire
              desactive={enCours}
            />
            <ChampTexte
              label="Libellé du type"
              valeur={nom}
              onChange={setNom}
              placeholder="ex: Cardiologie"
              obligatoire
              desactive={enCours}
            />
          </div>

          <ChampZoneTexte
            label="Description du type de prestation"
            valeur={description}
            onChange={setDescription}
            placeholder="Description des soins ou missions assurées par ce service"
            lignes={3}
            desactive={enCours}
          />

          <div className="flex items-start gap-2 pt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              id="type-aiguillage-checkbox"
              checked={supporteAiguillage}
              onChange={(e) => setSupporteAiguillage(e.target.checked)}
              disabled={enCours}
              className="mt-0.5 rounded border-slate-300 text-asina-600 focus:ring-asina-500 cursor-pointer"
            />
            <label
              htmlFor="type-aiguillage-checkbox"
              className="text-xs text-slate-700 cursor-pointer space-y-0.5"
            >
              <span className="font-semibold block">Ce service peut recevoir des aiguillages</span>
              <span className="text-[11px] text-slate-500 block">
                Cochez si ce type de service peut être une destination d'orientation patient (ex.
                Infirmerie, Médecine Générale). Décochez pour les services purement administratifs
                (Secrétariat, Caisse).
              </span>
            </label>
          </div>

          {typeEnEdition && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="type-actif-checkbox"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
                disabled={enCours}
                className="rounded border-slate-300 text-asina-600 focus:ring-asina-500 cursor-pointer"
              />
              <label
                htmlFor="type-actif-checkbox"
                className="text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Spécialité active et sélectionnable
              </label>
            </div>
          )}
        </form>
      }
      pied={
        <ActionsFormulaire
          idFormulaire="form-type-service"
          onAnnuler={onFermer}
          enCours={enCours}
          labelValider={typeEnEdition ? "Sauvegarder" : "Créer le type"}
        />
      }
    />
  );
};

export default FormulaireTypeServiceModale;
