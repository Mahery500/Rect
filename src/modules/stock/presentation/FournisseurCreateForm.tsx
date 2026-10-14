/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useStock } from "../application/useStock";

interface FournisseurCreateFormProps {
  onCreated: () => void;
}

export const FournisseurCreateForm: React.FC<FournisseurCreateFormProps> = ({ onCreated }) => {
  const { createFournisseur, triggerNotification } = useStock();

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNom("");
    setTelephone("");
    setEmail("");
    setAdresse("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createFournisseur({
        nom: nom.trim(),
        telephone: telephone.trim() || null,
        email: email.trim() || null,
        adresse: adresse.trim() || null,
      });
      triggerNotification("success", "Fournisseur créé avec succès.");
      resetForm();
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de créer le fournisseur. Réessaie.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Nouveau fournisseur</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="fournisseur-nom" className="block text-xs font-medium text-gray-600 mb-1">
            Nom
          </label>
          <input
            id="fournisseur-nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Pharma Distribution SARL"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="fournisseur-telephone"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Téléphone
            </label>
            <input
              id="fournisseur-telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex : 034 12 345 67"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
            />
          </div>
          <div>
            <label
              htmlFor="fournisseur-email"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Email
            </label>
            <input
              id="fournisseur-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@fournisseur.mg"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="fournisseur-adresse"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Adresse
          </label>
          <input
            id="fournisseur-adresse"
            type="text"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Ex : Lot II M 45, Antananarivo"
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

export default FournisseurCreateForm;
