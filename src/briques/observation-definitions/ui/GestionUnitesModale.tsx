/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Modale } from "@/noyau/ui/Modale";
import { UniteMesure, NouvelleUniteInput } from "../modele/observation-definition.types";
import { Plus, Power, Scale } from "lucide-react";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";

export interface GestionUnitesModaleProps {
  ouvert: boolean;
  unites: UniteMesure[];
  onFermer: () => void;
  onCreerUnite: (saisie: NouvelleUniteInput) => Promise<boolean>;
  onBasculerActivation: (id: number, statutActuel: boolean) => Promise<boolean>;
}

export const GestionUnitesModale: React.FC<GestionUnitesModaleProps> = ({
  ouvert,
  unites,
  onFermer,
  onCreerUnite,
  onBasculerActivation,
}) => {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [enCoursAjout, setEnCoursAjout] = useState(false);
  const [actionEnCoursId, setActionEnCoursId] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    const c = code.trim();
    const l = libelle.trim();

    if (!c || !l) {
      setErreur("Le code et le libellé de l’unité sont obligatoires.");
      return;
    }

    setEnCoursAjout(true);
    try {
      const succes = await onCreerUnite({ code: c, libelle: l });
      if (succes) {
        setCode("");
        setLibelle("");
      }
    } finally {
      setEnCoursAjout(false);
    }
  };

  const handleBasculer = async (u: UniteMesure) => {
    setActionEnCoursId(u.id);
    try {
      await onBasculerActivation(u.id, u.actif);
    } finally {
      setActionEnCoursId(null);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Unités de mesure cliniques"
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
              <Scale className="w-4 h-4 text-asina-600" />
              <span>Créer une nouvelle unité</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code (ex. mmHg, °C, g/L)"
                  disabled={enCoursAjout}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono focus:border-asina-500"
                />
              </div>

              <div className="sm:col-span-2 flex gap-2">
                <input
                  type="text"
                  required
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="Libellé (ex. Millimètre de mercure)"
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
            </div>
          </form>

          {/* Tableau des unités */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Libellé</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unites.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Aucune unité enregistrée.
                    </td>
                  </tr>
                ) : (
                  unites.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50 transition ${u.actif ? "" : "opacity-60 bg-slate-50/50"}`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{u.code}</td>
                      <td className="py-2.5 px-3 text-slate-700">{u.libelle}</td>
                      <td className="py-2.5 px-3 text-center">
                        <BadgeStatut statut={u.actif ? "actif" : "inactif"} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleBasculer(u)}
                          disabled={actionEnCoursId === u.id}
                          className={`p-1.5 rounded transition cursor-pointer disabled:opacity-50 ${
                            u.actif
                              ? "text-amber-600 hover:bg-amber-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={u.actif ? "Désactiver l’unité" : "Activer l’unité"}
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
