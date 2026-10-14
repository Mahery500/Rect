/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import { ChampTexte } from "@/noyau/ui/ChampTexte";
import { ChampZoneTexte } from "@/noyau/ui/ChampZoneTexte";
import {
  DiagnosticDefinition,
  NouvelleDiagnosticDefinitionInput,
  ModificationDiagnosticDefinitionInput,
  CodeSystemeOption,
  CodificationDiagnostic,
} from "../modele/diagnostic-definition.types";

export interface FormulaireDiagnosticDefinitionModaleProps {
  ouvert: boolean;
  onFermer: () => void;
  definitionExistante?: DiagnosticDefinition | null;
  chapitresConnus?: string[];
  codeSystems?: CodeSystemeOption[];
  onEnregistrer: (
    saisie: NouvelleDiagnosticDefinitionInput | ModificationDiagnosticDefinitionInput,
  ) => Promise<boolean>;
}

export const FormulaireDiagnosticDefinitionModale: React.FC<
  FormulaireDiagnosticDefinitionModaleProps
> = ({
  ouvert,
  onFermer,
  definitionExistante,
  chapitresConnus = [],
  codeSystems = [],
  onEnregistrer,
}) => {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [chapitre, setChapitre] = useState("");
  const [description, setDescription] = useState("");
  const [actif, setActif] = useState(true);
  const [codifications, setCodifications] = useState<CodificationDiagnostic[]>([]);
  const [soumissionEnCours, setSoumissionEnCours] = useState(false);

  const codeSystemsActifs = codeSystems.filter((c) => c.actif);

  useEffect(() => {
    if (definitionExistante) {
      setCode(definitionExistante.code);
      setLibelle(definitionExistante.libelle);
      setChapitre(definitionExistante.chapitre || "");
      setDescription(definitionExistante.description || "");
      setActif(definitionExistante.actif);
      setCodifications(definitionExistante.codifications || []);
    } else {
      setCode("");
      setLibelle("");
      setChapitre("");
      setDescription("");
      setActif(true);
      setCodifications([]);
    }
  }, [definitionExistante, ouvert]);

  const handleAjouterCodification = () => {
    const systemeDefaut = codeSystemsActifs.length > 0 ? codeSystemsActifs[0].code : "CIM-10";
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
    if (!code.trim() || !libelle.trim()) return;

    setSoumissionEnCours(true);
    try {
      const codificationsValides = codifications
        .map((c) => ({
          codeSystem: c.codeSystem.trim().toUpperCase(),
          code: c.code.trim().toUpperCase(),
        }))
        .filter((c) => c.code.length > 0);

      const succes = await onEnregistrer({
        code: code.trim().toUpperCase(),
        libelle: libelle.trim(),
        chapitre: chapitre.trim() || null,
        description: description.trim() || null,
        actif,
        codifications: codificationsValides,
      });
      if (succes) onFermer();
    } finally {
      setSoumissionEnCours(false);
    }
  };

  const estEdition = Boolean(definitionExistante);
  const inputCls =
    "w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden";

  return (
    <Modale
      ouvert={ouvert}
      onFermer={onFermer}
      titre={
        estEdition
          ? `Modifier le diagnostic : ${definitionExistante?.code}`
          : "Nouveau diagnostic médical (CIM-10)"
      }
      largeurMax="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ChampTexte
            etiquette="Code CIM-10 / Nomenclature *"
            valeur={code}
            onChange={setCode}
            placeholder="ex: J06.9, I10, E11.9"
            requis
            desactive={estEdition}
            aide={
              estEdition
                ? "Le code nosologique est permanent et ne peut pas être modifié"
                : undefined
            }
          />
          <div className="md:col-span-2">
            <ChampTexte
              etiquette="Libellé complet du diagnostic *"
              valeur={libelle}
              onChange={setLibelle}
              placeholder="ex: Infection aiguë des voies respiratoires supérieures"
              requis
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1 text-xs">
            Chapitre / Catégorie nosologique
          </label>
          <input
            list="chapitres-existants"
            type="text"
            value={chapitre}
            onChange={(e) => setChapitre(e.target.value)}
            placeholder="ex: Maladies de l'appareil respiratoire (Chapitre X)"
            className={inputCls}
          />
          <datalist id="chapitres-existants">
            {chapitresConnus.map((ch) => (
              <option key={ch} value={ch} />
            ))}
          </datalist>
        </div>

        <ChampZoneTexte
          label="Description clinique ou critères d'inclusion"
          valeur={description}
          onChange={setDescription}
          placeholder="Précisions diagnostiques, diagnostics différentiels exclus…"
          lignes={2}
        />

        {/* -------- Codifications externes (multi-terminologies) -------- */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-slate-700 font-semibold text-xs">
                Codifications internationales ({codifications.length})
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Associez plusieurs systèmes (CIM-10, CIM-11, SNOMED CT, CISP-2…).
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
                    {item.codeSystem &&
                      !codeSystemsActifs.some((cs) => cs.code === item.codeSystem) && (
                        <option value={item.codeSystem}>{item.codeSystem}</option>
                      )}
                  </select>
                  <input
                    type="text"
                    value={item.code}
                    onChange={(e) => handleChangerCodification(idx, "code", e.target.value)}
                    placeholder="Code (ex. J18.9)"
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

        <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <input
            id="diag-actif"
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
          />
          <label
            htmlFor="diag-actif"
            className="text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Diagnostic actif et proposable lors des consultations médicales
          </label>
        </div>

        <ActionsFormulaire
          texteValider={estEdition ? "Enregistrer les modifications" : "Créer le diagnostic"}
          chargement={soumissionEnCours}
          onAnnuler={onFermer}
        />
      </form>
    </Modale>
  );
};
