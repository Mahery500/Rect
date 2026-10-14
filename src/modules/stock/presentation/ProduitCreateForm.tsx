/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { useStock } from "../application/useStock";

interface ProduitCreateFormProps {
  onCreated: () => void;
}

interface FieldErrors {
  nom?: string;
  medicament?: string;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asina-600 focus-visible:ring-offset-1";
const field = (invalid: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500 ${FOCUS} ${
    invalid ? "border-red-300" : "border-gray-300"
  }`;

export const ProduitCreateForm: React.FC<ProduitCreateFormProps> = ({ onCreated }) => {
  const { createProduit, medicaments, fetchMedicaments, conditionnements, fetchConditionnements } =
    useStock();

  const uid = useId();
  const nomRef = useRef<HTMLInputElement>(null);
  const medicamentRef = useRef<HTMLSelectElement>(null);

  const [listsReady, setListsReady] = useState(false);
  const [nomCommercial, setNomCommercial] = useState("");
  const [medicamentId, setMedicamentId] = useState<number | null>(null);
  const [conditionnementId, setConditionnementId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ---------- Chargement des listes ---------- */
  useEffect(() => {
    let alive = true;
    Promise.all([fetchMedicaments(), fetchConditionnements()]).finally(() => {
      if (alive) setListsReady(true);
    });
    return () => {
      alive = false;
    };
  }, [fetchMedicaments, fetchConditionnements]);

  // Le message de succès disparaît seul
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  /* ---------- Options triées (et désambiguïsées si deux libellés sont identiques) ---------- */
  const medicamentOptions = useMemo(() => {
    const base = medicaments.map((m) => {
      const famille = m.familles.map((f) => f.libelle).join(", ");
      const principes = m.principesActifs.map((pa) => pa.libelle).join(", ");
      return {
        id: m.id,
        label: [famille, principes].filter(Boolean).join(" — ") || `Médicament #${m.id}`,
      };
    });
    const counts = new Map<string, number>();
    base.forEach((o) => counts.set(o.label, (counts.get(o.label) ?? 0) + 1));
    return base
      .map((o) => ((counts.get(o.label) ?? 0) > 1 ? { ...o, label: `${o.label} (#${o.id})` } : o))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [medicaments]);

  const conditionnementOptions = useMemo(
    () => [...conditionnements].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr")),
    [conditionnements],
  );

  /* ---------- Envoi ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nom = nomCommercial.trim();
    setSuccess(null);
    setFormError(null);

    if (!nom) {
      setErrors({ nom: "Le nom commercial est requis." });
      nomRef.current?.focus();
      return;
    }
    if (medicamentId === null) {
      setErrors({ medicament: "Sélectionnez un médicament." });
      medicamentRef.current?.focus();
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      // createProduit attrape les erreurs lui-même et renvoie undefined en cas d'échec
      const result = await createProduit({
        nomCommercial: nom,
        medicamentId,
        conditionnementId,
      });
      if (!result) {
        setFormError("Le produit n'a pas pu être créé. Vérifiez les champs puis réessayez.");
        return;
      }

      setSuccess(`Produit « ${nom} » créé.`);
      setNomCommercial("");
      setMedicamentId(null);
      setConditionnementId(null);
      nomRef.current?.focus(); // saisie en série
      onCreated();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Impossible de créer le produit. Réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const nomId = `${uid}-nom`;
  const medicamentIdAttr = `${uid}-medicament`;
  const conditionnementIdAttr = `${uid}-conditionnement`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-gray-900">Nouveau produit</h3>

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div>
          <label htmlFor={nomId} className="mb-1 block text-xs font-medium text-gray-600">
            Nom commercial{" "}
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id={nomId}
            ref={nomRef}
            type="text"
            value={nomCommercial}
            onChange={(e) => setNomCommercial(e.target.value)}
            placeholder="Ex : Doliprane 500mg"
            maxLength={255}
            autoComplete="off"
            required
            aria-invalid={!!errors.nom}
            aria-describedby={errors.nom ? `${nomId}-err` : undefined}
            className={field(!!errors.nom)}
          />
          {errors.nom && (
            <p id={`${nomId}-err`} role="alert" className="mt-1 text-xs font-medium text-red-700">
              {errors.nom}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={medicamentIdAttr}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Médicament{" "}
            <span className="text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <select
            id={medicamentIdAttr}
            ref={medicamentRef}
            value={medicamentId ?? ""}
            onChange={(e) => setMedicamentId(e.target.value ? Number(e.target.value) : null)}
            disabled={!listsReady}
            required
            aria-invalid={!!errors.medicament}
            aria-describedby={errors.medicament ? `${medicamentIdAttr}-err` : undefined}
            className={field(!!errors.medicament)}
          >
            <option value="">{listsReady ? "— Sélectionner —" : "Chargement…"}</option>
            {medicamentOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.medicament && (
            <p
              id={`${medicamentIdAttr}-err`}
              role="alert"
              className="mt-1 text-xs font-medium text-red-700"
            >
              {errors.medicament}
            </p>
          )}
          {listsReady && medicamentOptions.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Aucun médicament enregistré. Créez-en un dans le référentiel avant d'ajouter un
              produit.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={conditionnementIdAttr}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Conditionnement
          </label>
          <select
            id={conditionnementIdAttr}
            value={conditionnementId ?? ""}
            onChange={(e) => setConditionnementId(e.target.value ? Number(e.target.value) : null)}
            disabled={!listsReady}
            className={field(false)}
          >
            <option value="">— Aucun —</option>
            {conditionnementOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </select>
        </div>

        {formError && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {formError}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !listsReady}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-asina-600 px-4 py-2 text-sm font-semibold text-white hover:bg-asina-700 disabled:opacity-60 ${FOCUS}`}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {submitting ? "Création en cours" : "Créer"}
        </button>
      </form>
    </div>
  );
};

export default ProduitCreateForm;
