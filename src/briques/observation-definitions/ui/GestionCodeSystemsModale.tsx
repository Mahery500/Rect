/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Modale } from "@/noyau/ui/Modale";
import { CodeSysteme, NouveauCodeSystemeInput } from "../modele/observation-definition.types";
import { Plus, Power, BookMarked, Globe } from "lucide-react";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";

export interface GestionCodeSystemsModaleProps {
  ouvert: boolean;
  codeSystems: CodeSysteme[];
  onFermer: () => void;
  onCreerCodeSystem: (saisie: NouveauCodeSystemeInput) => Promise<boolean>;
  onBasculerActivation: (id: number, statutActuel: boolean) => Promise<boolean>;
}

export const GestionCodeSystemsModale: React.FC<GestionCodeSystemsModaleProps> = ({
  ouvert,
  codeSystems,
  onFermer,
  onCreerCodeSystem,
  onBasculerActivation,
}) => {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [uri, setUri] = useState("");
  const [enCoursAjout, setEnCoursAjout] = useState(false);
  const [actionEnCoursId, setActionEnCoursId] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    const c = code.trim().toUpperCase();
    const l = libelle.trim();

    if (!c || !l) {
      setErreur("Le code et le libellé de la terminologie sont obligatoires.");
      return;
    }

    setEnCoursAjout(true);
    try {
      const succes = await onCreerCodeSystem({ code: c, libelle: l, uri: uri.trim() || null });
      if (succes) {
        setCode("");
        setLibelle("");
        setUri("");
      }
    } finally {
      setEnCoursAjout(false);
    }
  };

  const handleBasculer = async (cs: CodeSysteme) => {
    setActionEnCoursId(cs.id);
    try {
      await onBasculerActivation(cs.id, cs.actif);
    } finally {
      setActionEnCoursId(null);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Systèmes de Codification & Terminologies Médicales"
      largeurMax="md"
      enfants={
        <div className="space-y-4 text-xs">
          {erreur && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreur}
            </div>
          )}

          {/* Formulaire d'ajout rapide */}
          <form
            onSubmit={handleAjouter}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
          >
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <BookMarked className="w-4 h-4 text-asina-600" />
              <span>Ajouter une terminologie (LOINC, SNOMED, etc.)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Code (ex. LOINC)"
                  disabled={enCoursAjout}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase focus:border-asina-500"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="Libellé (ex. Logical Observation Identifiers Names and Codes)"
                  disabled={enCoursAjout}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:border-asina-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="URI FHIR / URL canonique (ex. http://loinc.org) - optionnel"
                disabled={enCoursAjout}
                className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs focus:border-asina-500"
              />
              <button
                type="submit"
                disabled={enCoursAjout}
                className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </form>

          {/* Tableau des terminologies */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Libellé & URI</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codeSystems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Aucun système de codification enregistré.
                    </td>
                  </tr>
                ) : (
                  codeSystems.map((cs) => (
                    <tr
                      key={cs.id}
                      className={`hover:bg-slate-50 transition ${cs.actif ? "" : "opacity-60 bg-slate-50/50"}`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{cs.code}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium">{cs.libelle}</div>
                        {cs.uri && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{cs.uri}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <BadgeStatut statut={cs.actif ? "actif" : "inactif"} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleBasculer(cs)}
                          disabled={actionEnCoursId === cs.id}
                          className={`p-1.5 rounded transition cursor-pointer disabled:opacity-50 ${
                            cs.actif
                              ? "text-amber-600 hover:bg-amber-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={
                            cs.actif ? "Désactiver la terminologie" : "Activer la terminologie"
                          }
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
      pied={
        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={onFermer}
            className="btn-secondary py-1.5 px-4 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Fermer
          </button>
        </div>
      }
    />
  );
};
