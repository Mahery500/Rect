/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useStock } from "../application/useStock";

interface PresentationCreateFormProps {
  onCreated: () => void;
}

export const PresentationCreateForm: React.FC<PresentationCreateFormProps> = ({ onCreated }) => {
  const { createPresentation } = useStock();
  const [libelle, setLibelle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim()) {
      setError("Le libellé est requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createPresentation({ libelle: libelle.trim() });
      setLibelle("");
      onCreated();
    } catch (err) {
      setError("Impossible de créer la présentation. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Nouvelle présentation</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="presentation-libelle"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Libellé
          </label>
          <input
            id="presentation-libelle"
            type="text"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Ex : Comprimé"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer
        </button>
      </form>
    </div>
  );
};

export default PresentationCreateForm;
