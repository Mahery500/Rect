/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertCircle, Check, Layers, Loader2, RotateCcw } from "lucide-react";
import { useStock } from "../application/useStock";

const MAX_LENGTH = 60;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

interface FamilleCreateFormProps {
  onCreated: () => void;
  /** Optionnel : libellés déjà existants, pour signaler un doublon avant l'envoi. */
  existingLibelles?: string[];
}

export const FamilleCreateForm: React.FC<FamilleCreateFormProps> = ({
  onCreated,
  existingLibelles = [],
}) => {
  const { createFamille } = useStock();
  const [libelle, setLibelle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = libelle.trim();
  const isDuplicate =
    trimmed !== "" && existingLibelles.some((l) => normalize(l) === normalize(trimmed));

  const resetForm = () => {
    setLibelle("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      setError("Le libellé est requis.");
      return;
    }
    if (isDuplicate) {
      setError("Cette famille existe déjà.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createFamille({ libelle: trimmed });
      setLibelle("");
      onCreated();
    } catch (err) {
      setError("Impossible de créer la famille. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50/70 to-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white">
          <Layers className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Nouvelle famille</h3>
          <p className="text-sm text-gray-500">
            Une famille regroupe des médicaments de même usage (ex. antalgiques).
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor="famille-libelle" className="text-xs font-medium text-gray-600">
                Libellé
              </label>
              <span className="text-xs text-gray-400 tabular-nums">
                {libelle.length}/{MAX_LENGTH}
              </span>
            </div>
            <input
              id="famille-libelle"
              type="text"
              value={libelle}
              maxLength={MAX_LENGTH}
              autoComplete="off"
              onChange={(e) => {
                setLibelle(e.target.value);
                setError(null);
              }}
              placeholder="Ex : Antibiotiques"
              aria-invalid={isDuplicate || !!error}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 aria-[invalid=true]:border-red-300 aria-[invalid=true]:focus:ring-red-100"
            />
            {isDuplicate && !error && (
              <p className="mt-1.5 text-xs text-amber-700">
                Une famille portant ce nom existe déjà.
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <aside className="border-t border-gray-100 bg-gray-50/60 p-5">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Aperçu</h4>
              <p className="text-xs text-gray-500 mt-0.5">Ce qui sera enregistré.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Famille</p>
              {trimmed ? (
                <span className="inline-flex items-center rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-xs font-medium text-cyan-800">
                  {trimmed}
                </span>
              ) : (
                <p className="text-sm text-gray-400">Aucun libellé</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting || (!libelle && !error)}
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
              <button
                type="submit"
                disabled={submitting || !trimmed || isDuplicate}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {submitting ? "Création en cours…" : "Créer la famille"}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default FamilleCreateForm;
