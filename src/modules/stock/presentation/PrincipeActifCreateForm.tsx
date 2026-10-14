/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Loader2, Plus, Check, X } from "lucide-react";
import { useStock } from "../application/useStock";
import type { PrincipeActifRequest } from "../application/useStock";
import type { PrincipeActifResource } from "@/core/api-contracts";

interface PrincipeActifCreateFormProps {
  /** Appelé après une création réussie. */
  onCreated: () => void | Promise<void>;
  /** Si fourni, le formulaire passe en mode modification de ce principe actif. */
  editing?: PrincipeActifResource | null;
  /** Fourni par le parent (useStock de l'onglet) : renvoie true si la modification a réussi. */
  onUpdate?: (id: number, payload: PrincipeActifRequest) => Promise<boolean>;
  /** Appelé après une modification réussie. */
  onUpdated?: () => void | Promise<void>;
  /** Appelé quand l'utilisateur annule la modification. */
  onCancelEdit?: () => void;
}

/**
 * Un principe actif est une molécule seule (ex. « Amoxicilline »).
 * La dose n'est pas ici : elle est saisie par médicament, sur chaque ligne de sa composition.
 *
 * En mode modification, le parent doit changer la `key` du composant
 * (key={editing?.id ?? 'new'}) pour réinitialiser la saisie.
 */
export const PrincipeActifCreateForm: React.FC<PrincipeActifCreateFormProps> = ({
  onCreated,
  editing = null,
  onUpdate,
  onUpdated,
  onCancelEdit,
}) => {
  const { createPrincipeActif, getLastError } = useStock();
  const isEdit = editing != null && editing.id != null;

  const [libelle, setLibelle] = useState(editing?.libelle ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const value = libelle.trim();
    if (!value) {
      setError("Le libellé est requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        const ok = (await onUpdate?.(editing!.id as number, { libelle: value })) ?? false;
        if (!ok) {
          setError("Impossible de modifier le principe actif.");
          return;
        }
        await onUpdated?.();
        return;
      }

      const ok = await createPrincipeActif({ libelle: value });
      if (!ok) {
        setError(getLastError() ?? "Impossible de créer le principe actif. Réessayez.");
        return;
      }
      setLibelle("");
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {isEdit ? "Modifier le principe actif" : "Nouveau principe actif"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="pa-libelle" className="block text-xs font-medium text-gray-600 mb-1">
            Libellé
          </label>
          <input
            id="pa-libelle"
            type="text"
            value={libelle}
            onChange={(e) => {
              setLibelle(e.target.value);
              setError(null);
            }}
            placeholder="Ex : Amoxicilline"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
          />
          <p className="mt-1 text-xs text-gray-500">
            La dose se renseigne sur chaque médicament, pas ici.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEdit ? "Enregistrer" : "Créer"}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PrincipeActifCreateForm;
