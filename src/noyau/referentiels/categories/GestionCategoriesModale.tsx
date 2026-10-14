/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  FolderTree,
  MoveRight,
  Plus,
  X,
} from "lucide-react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  ArbreCategorie,
  CategorieHierarchique,
  NouvelleCategorieInput,
  PROFONDEUR_MAX,
} from "./hierarchie.types";

export interface GestionCategoriesModaleProps {
  ouvert: boolean;
  /** Ex. « Catégories d'actes médicaux ». */
  titre: string;
  /** Ex. « catégorie d'acte ». Utilisé dans les messages. */
  libelleSingulier: string;
  arbre: ArbreCategorie<CategorieHierarchique>[];
  categories: CategorieHierarchique[];
  chargement: boolean;
  onFermer: () => void;
  onCreer: (input: NouvelleCategorieInput) => Promise<boolean>;
  onChangerParent: (id: number, parentCode: string | null) => Promise<boolean>;
}

const CHAMP =
  "w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500";

/* ------------------------------- Arbre ------------------------------- */

interface LigneArbreProps {
  node: ArbreCategorie<CategorieHierarchique>;
  niveau: number;
  ouvert: Set<number>;
  onBasculer: (id: number) => void;
  onDeplacer: (c: CategorieHierarchique) => void;
}

const LigneArbre: React.FC<LigneArbreProps> = ({
  node,
  niveau,
  ouvert,
  onBasculer,
  onDeplacer,
}) => {
  const { categorie, enfants } = node;
  const aDesEnfants = enfants.length > 0;
  const estOuvert = ouvert.has(categorie.id);

  return (
    <>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs"
        style={{ paddingLeft: 8 + (niveau - 1) * 18 }}
      >
        <button
          type="button"
          onClick={() => aDesEnfants && onBasculer(categorie.id)}
          className={`p-0.5 rounded text-slate-400 hover:text-slate-700 ${aDesEnfants ? "cursor-pointer" : "invisible"}`}
          aria-label={estOuvert ? "Replier" : "Déplier"}
        >
          {estOuvert ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {niveau > 1 && <CornerDownRight className="h-3 w-3 text-slate-300 shrink-0" />}

        <span className="font-mono text-[10px] font-bold text-asina-700 bg-asina-50 border border-asina-150 px-1.5 py-0.5 rounded">
          {categorie.code}
        </span>
        <span className="font-semibold text-slate-800 truncate">{categorie.libelle}</span>

        {!categorie.feuille && (
          <span className="text-[9px] uppercase font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
            Catégorie parente
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {niveau > 1 && (
            <button
              type="button"
              onClick={() => onDeplacer(categorie)}
              className="p-1 text-slate-400 hover:text-asina-700 rounded cursor-pointer"
              title="Déplacer vers une autre catégorie parente"
            >
              <MoveRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {estOuvert &&
        enfants.map((enfant) => (
          <LigneArbre
            key={enfant.categorie.id}
            node={enfant}
            niveau={niveau + 1}
            ouvert={ouvert}
            onBasculer={onBasculer}
            onDeplacer={onDeplacer}
          />
        ))}
    </>
  );
};

/* ------------------------------ Modale ------------------------------- */

export const GestionCategoriesModale: React.FC<GestionCategoriesModaleProps> = ({
  ouvert,
  titre,
  libelleSingulier,
  arbre,
  categories,
  chargement,
  onFermer,
  onCreer,
  onChangerParent,
}) => {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [parentCode, setParentCode] = useState<string>("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouverts, setOuverts] = useState<Set<number>>(() => new Set());

  // Déplacement
  const [categorieADeplacer, setCategorieADeplacer] = useState<CategorieHierarchique | null>(null);
  const [nouveauParentCode, setNouveauParentCode] = useState<string>("");

  // Options de parent possibles : uniquement les catégories non-feuilles
  // OU toute catégorie si on est en train de créer une racine plus profonde.
  // On autorise la sélection parmi toutes les catégories dont le niveau < PROFONDEUR_MAX
  // (le backend revérifie la cohérence hauteur + profondeur).
  const optionsParent = useMemo(
    () => categories.filter((c) => c.niveau < PROFONDEUR_MAX),
    [categories],
  );

  const basculer = (id: number) =>
    setOuverts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const resetForm = () => {
    setCode("");
    setLibelle("");
    setParentCode("");
    setErreur(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    const c = code.trim().toUpperCase();
    const l = libelle.trim();
    if (!c) return setErreur("Le code est obligatoire.");
    if (!l) return setErreur("Le libellé est obligatoire.");

    setEnCours(true);
    try {
      const ok = await onCreer({
        code: c,
        libelle: l,
        parentCode: parentCode ? parentCode : null,
      });
      if (ok) resetForm();
    } finally {
      setEnCours(false);
    }
  };

  const handleValiderDeplacement = async () => {
    if (!categorieADeplacer) return;
    const ok = await onChangerParent(
      categorieADeplacer.id,
      nouveauParentCode ? nouveauParentCode : null,
    );
    if (ok) {
      setCategorieADeplacer(null);
      setNouveauParentCode("");
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={titre}
      icone={<FolderTree className="h-4 w-4 text-asina-600" />}
      largeurMax="2xl"
      enfants={
        <div className="space-y-5 text-xs">
          {erreur && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreur}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* --------- Arbre --------- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Hiérarchie ({categories.length})
                </h4>
                <span className="text-[10px] text-slate-400">
                  Profondeur max : {PROFONDEUR_MAX} niveaux
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl bg-white max-h-150 overflow-auto p-2">
                {chargement ? (
                  <p className="p-4 text-slate-400 text-center">Chargement…</p>
                ) : arbre.length === 0 ? (
                  <p className="p-6 text-slate-400 text-center italic">
                    Aucune catégorie enregistrée pour l'instant.
                  </p>
                ) : (
                  arbre.map((node) => (
                    <LigneArbre
                      key={node.categorie.id}
                      node={node}
                      niveau={1}
                      ouvert={ouverts}
                      onBasculer={basculer}
                      onDeplacer={(c) => {
                        setCategorieADeplacer(c);
                        setNouveauParentCode(c.parentCode ?? "");
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* --------- Formulaire de création --------- */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Ajouter une {libelleSingulier}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ex : SOIN_INF"
                    disabled={enCours}
                    className={`${CHAMP} font-mono uppercase`}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Libellé *</label>
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={libelle}
                    onChange={(e) => setLibelle(e.target.value)}
                    placeholder="ex : Soins infirmiers"
                    disabled={enCours}
                    className={CHAMP}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catégorie parente</label>
                <select
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value)}
                  disabled={enCours}
                  className={CHAMP}
                >
                  <option value="">— Aucune (catégorie racine) —</option>
                  {optionsParent.map((c) => (
                    <option key={c.id} value={c.code}>
                      {"— ".repeat(c.niveau - 1)}
                      {c.libelle} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Seules les catégories dont le niveau est &lt; {PROFONDEUR_MAX} peuvent devenir
                  parentes.
                </p>
              </div>

              <button
                type="submit"
                disabled={enCours}
                className="btn-primary py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{enCours ? "Création…" : "Créer la catégorie"}</span>
              </button>
            </form>
          </div>

          {/* --------- Encart déplacement --------- */}
          {categorieADeplacer && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-slide-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-xs">
                  Déplacer « {categorieADeplacer.libelle} » ({categorieADeplacer.code})
                </span>
                <button
                  type="button"
                  onClick={() => setCategorieADeplacer(null)}
                  className="text-amber-700 hover:text-amber-900 cursor-pointer"
                  aria-label="Annuler"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <select
                value={nouveauParentCode}
                onChange={(e) => setNouveauParentCode(e.target.value)}
                className={CHAMP}
              >
                <option value="">— Placer à la racine —</option>
                {optionsParent
                  .filter((c) => c.id !== categorieADeplacer.id)
                  .map((c) => (
                    <option key={c.id} value={c.code}>
                      {"— ".repeat(c.niveau - 1)}
                      {c.libelle} ({c.code})
                    </option>
                  ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategorieADeplacer(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleValiderDeplacement}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md cursor-pointer"
                >
                  Déplacer
                </button>
              </div>
            </div>
          )}
        </div>
      }
      pied={<ActionsFormulaire onAnnuler={onFermer} labelAnnuler="Fermer" />}
    />
  );
};
