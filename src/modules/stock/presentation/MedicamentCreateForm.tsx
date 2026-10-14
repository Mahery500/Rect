/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  FlaskConical,
  Layers,
  Loader2,
  Pill,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useStock } from "../application/useStock";
import type {
  MedicamentPrincipeActifRequest,
  MedicamentRequest,
  MedicamentResponse,
  FamilleResource,
  PrincipeActifResource,
} from "@/core/api-contracts";

const DOSE_UNITS = ["mg", "g", "µg", "ml", "UI", "%"];

interface PrincipeActifLine {
  key: number;
  principeActifId: number | "";
  doseValue: string;
  doseUnit: string;
}

let lineKeySeq = 0;
const newLine = (): PrincipeActifLine => ({
  key: lineKeySeq++,
  principeActifId: "",
  doseValue: "",
  doseUnit: "mg",
});

/** "500" + "mg" -> "500 mg" ; vide -> null (dose facultative) */
const formatDose = (l: PrincipeActifLine): string | null => {
  const v = l.doseValue.trim().replace(",", ".");
  return v ? `${v} ${l.doseUnit}` : null;
};

/** "500 mg" -> { value: "500", unit: "mg" } (pour pré-remplir le mode modification) */
const parseDose = (dose: string | null | undefined): { value: string; unit: string } => {
  const m = (dose ?? "").trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { value: "", unit: "mg" };
  return { value: m[1], unit: m[2].trim() || "mg" };
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export interface MedicamentCreateFormProps {
  /** Appelé après une création réussie. */
  onCreated: () => void;
  familles: FamilleResource[];
  principesActifs: PrincipeActifResource[];
  /** Si fourni, le formulaire passe en mode modification de ce médicament. */
  editing?: MedicamentResponse | null;
  /** Appelé après une modification réussie. */
  onUpdated?: () => void;
  /** Appelé quand l'utilisateur annule la modification. */
  onCancelEdit?: () => void;
}

/**
 * Formulaire de création ou de modification d'un médicament : familles (N,N)
 * et principes actifs avec leur dose. Un aperçu en direct résume la saisie et
 * indique ce qu'il reste à compléter.
 *
 * `familles` et `principesActifs` sont reçus en props (chargés par le parent)
 * car useStock() n'est pas un store partagé : chaque appel crée son propre état.
 *
 * Pour passer d'un médicament à un autre en mode modification, le parent doit
 * changer la `key` du composant (par exemple key={editing?.id ?? 'new'}) afin
 * de réinitialiser la saisie.
 */
export const MedicamentCreateForm: React.FC<MedicamentCreateFormProps> = ({
  onCreated,
  familles,
  principesActifs,
  editing = null,
  onUpdated,
  onCancelEdit,
}) => {
  const { createMedicament, updateMedicament, getLastError } = useStock();
  const isEdit = editing != null && editing.id != null;

  const [selectedFamilleIds, setSelectedFamilleIds] = useState<number[]>(() =>
    editing ? editing.familles.map((f) => f.id).filter((id): id is number => id != null) : [],
  );
  const [familleQuery, setFamilleQuery] = useState("");
  const [lines, setLines] = useState<PrincipeActifLine[]>(() => {
    if (!editing || editing.principesActifs.length === 0) return [newLine()];
    return editing.principesActifs.map((pa) => {
      const raw = pa as {
        id?: number | null;
        principeActifId?: number | null;
        libelle?: string | null;
        dose?: string | null;
      };
      // principeActifId d'abord, puis le libellé, puis id en dernier recours
      // (id pourrait être celui de la ligne de liaison et non du principe actif)
      const principeActifId =
        raw.principeActifId ??
        principesActifs.find((p) => p.libelle === raw.libelle)?.id ??
        raw.id ??
        "";
      const { value, unit } = parseDose(raw.dose);
      return {
        ...newLine(),
        principeActifId: principeActifId as number | "",
        doseValue: value,
        doseUnit: unit,
      };
    });
  });
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Dérivés ---------- */
  const familleById = useMemo(() => {
    const m = new Map<number, FamilleResource>();
    familles.forEach((f) => f.id !== null && m.set(f.id as number, f));
    return m;
  }, [familles]);

  const principeById = useMemo(() => {
    const m = new Map<number, PrincipeActifResource>();
    principesActifs.forEach((p) => p.id != null && m.set(p.id as number, p));
    return m;
  }, [principesActifs]);

  const visibleFamilles = useMemo(() => {
    const q = normalize(familleQuery.trim());
    return q ? familles.filter((f) => normalize(f.libelle ?? "").includes(q)) : familles;
  }, [familles, familleQuery]);

  const usedPrincipeIds = lines
    .map((l) => l.principeActifId)
    .filter((id): id is number => id !== "");

  const filledLines = lines.filter((l) => l.principeActifId !== "");

  /* ---------- Actions ---------- */
  const touch = () => setFormError(null);

  const toggleFamille = (id: number) => {
    touch();
    setSelectedFamilleIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const updateLine = (key: number, patch: Partial<PrincipeActifLine>) => {
    touch();
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    touch();
    const line = newLine();
    setFocusKey(line.key);
    setLines((prev) => [...prev, line]);
  };

  const removeLine = (key: number) => {
    touch();
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  const resetForm = () => {
    setSelectedFamilleIds([]);
    setFamilleQuery("");
    setLines([newLine()]);
    setFocusKey(null);
    setFormError(null);
  };

  const validate = (): string | null => {
    if (selectedFamilleIds.length === 0) return "Sélectionnez au moins une famille.";
    if (lines.some((l) => l.principeActifId === "")) {
      return "Chaque ligne doit avoir un principe actif sélectionné.";
    }
    const ids = lines.map((l) => l.principeActifId);
    if (new Set(ids).size !== ids.length) {
      return "Un même principe actif ne peut pas être ajouté deux fois.";
    }
    for (const l of lines) {
      const v = l.doseValue.trim().replace(",", ".");
      if (v && (Number.isNaN(Number(v)) || Number(v) < 0)) {
        return "Une dose doit être un nombre positif (ex. 500).";
      }
    }
    return null;
  };

  const isReady = validate() === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const principesActifsPayload: MedicamentPrincipeActifRequest[] = lines.map((l) => ({
      principeActifId: l.principeActifId as number,
      dose: formatDose(l),
    }));
    const payload: MedicamentRequest = {
      familleIds: selectedFamilleIds,
      principesActifs: principesActifsPayload,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      // createMedicament / updateMedicament attrapent les erreurs eux-mêmes
      // et renvoient undefined en cas d'échec.
      const result = isEdit
        ? await updateMedicament(editing!.id as number, payload)
        : await createMedicament(payload);

      if (!result) {
        setFormError(
          getLastError() ??
            (isEdit
              ? "Échec de la modification du médicament."
              : "Échec de la création du médicament."),
        );
        return;
      }

      if (isEdit) {
        onUpdated?.();
      } else {
        resetForm();
        onCreated();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Échec de l'enregistrement du médicament.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Styles réutilisés ---------- */
  const fieldCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 " +
    "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 " +
    "disabled:bg-gray-50 disabled:text-gray-400";

  const sectionHeader = (
    icon: React.ReactNode,
    title: string,
    hint: string,
    aside?: React.ReactNode,
  ) => (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          {icon}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
        </div>
      </div>
      {aside}
    </div>
  );

  const emptyBox = (text: string) => (
    <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-3">
      {text}
    </p>
  );

  /* ---------- Rendu ---------- */
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50/70 to-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white">
          <Pill className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? "Modifier le médicament" : "Nouveau médicament"}
          </h3>
          <p className="text-sm text-gray-500">
            {isEdit
              ? "Modifiez ses familles, ses principes actifs ou leur dose, puis enregistrez."
              : "Choisissez ses familles, puis ajoutez ses principes actifs avec leur dose."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        {/* ============ Colonne saisie ============ */}
        <div className="p-5 space-y-7">
          {/* Familles */}
          <section aria-labelledby="familles-title">
            {sectionHeader(
              <Layers className="h-4 w-4" />,
              "Familles",
              "Un médicament peut appartenir à plusieurs familles.",
              selectedFamilleIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedFamilleIds([])}
                  className="text-xs text-gray-500 hover:text-red-600 whitespace-nowrap"
                >
                  Tout désélectionner
                </button>
              ) : undefined,
            )}

            {familles.length === 0 ? (
              emptyBox("Aucune famille pour l'instant. Créez-en une dans l'onglet « Familles ».")
            ) : (
              <>
                {familles.length > 8 && (
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={familleQuery}
                      onChange={(e) => setFamilleQuery(e.target.value)}
                      placeholder="Filtrer les familles…"
                      aria-label="Filtrer les familles"
                      className={`${fieldCls} pl-9`}
                    />
                  </div>
                )}

                {visibleFamilles.length === 0 ? (
                  emptyBox(`Aucune famille ne correspond à « ${familleQuery} ».`)
                ) : (
                  <div
                    className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1"
                    role="group"
                    aria-label="Familles"
                  >
                    {visibleFamilles.map((famille) => {
                      if (famille.id === null) return null;
                      const checked = selectedFamilleIds.includes(famille.id);
                      return (
                        <label
                          key={famille.id}
                          className={`group flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full border text-sm cursor-pointer select-none transition-colors focus-within:ring-2 focus-within:ring-cyan-200 ${
                            checked
                              ? "bg-cyan-700 border-cyan-700 text-white font-medium"
                              : "bg-white border-gray-200 text-gray-700 hover:border-cyan-300 hover:bg-cyan-50/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleFamille(famille.id as number)}
                          />
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              checked
                                ? "bg-white border-white"
                                : "border-gray-300 group-hover:border-cyan-400"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3 text-cyan-700" strokeWidth={3} />}
                          </span>
                          {famille.libelle}
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          <div className="border-t border-gray-100" />

          {/* Principes actifs */}
          <section aria-labelledby="pa-title">
            {sectionHeader(
              <FlaskConical className="h-4 w-4" />,
              "Principes actifs",
              "La dose est facultative. Laissez-la vide si elle est inconnue.",
            )}

            {principesActifs.length === 0 ? (
              emptyBox(
                "Aucun principe actif pour l'instant. Créez-en un dans l'onglet « Principes actifs ».",
              )
            ) : (
              <div className="space-y-2.5">
                {lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 focus-within:border-cyan-300 focus-within:bg-white transition-colors"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_170px_36px] gap-3 items-end">
                      <div>
                        <label
                          htmlFor={`pa-${line.key}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Principe actif{" "}
                          {lines.length > 1 && <span className="text-gray-400">#{index + 1}</span>}
                        </label>
                        <select
                          id={`pa-${line.key}`}
                          autoFocus={line.key === focusKey}
                          value={line.principeActifId}
                          onChange={(e) =>
                            updateLine(line.key, {
                              principeActifId: e.target.value ? Number(e.target.value) : "",
                            })
                          }
                          className={fieldCls}
                        >
                          <option value="">Sélectionner…</option>
                          {principesActifs.map((p) => {
                            const takenElsewhere =
                              p.id != null &&
                              usedPrincipeIds.includes(p.id as number) &&
                              p.id !== line.principeActifId;
                            return (
                              <option key={p.id} value={p.id ?? ""} disabled={takenElsewhere}>
                                {p.libelle}
                                {takenElsewhere ? " (déjà ajouté)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`dose-${line.key}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Dose
                        </label>
                        <div className="flex rounded-lg focus-within:ring-2 focus-within:ring-cyan-200">
                          <input
                            id={`dose-${line.key}`}
                            type="text"
                            inputMode="decimal"
                            placeholder="500"
                            value={line.doseValue}
                            onChange={(e) => updateLine(line.key, { doseValue: e.target.value })}
                            className="min-w-0 flex-1 border border-gray-200 border-r-0 rounded-l-lg px-3 py-2 text-sm font-mono tabular-nums text-right bg-white focus:outline-none focus:border-cyan-400"
                          />
                          <select
                            aria-label="Unité de la dose"
                            value={line.doseUnit}
                            onChange={(e) => updateLine(line.key, { doseUnit: e.target.value })}
                            className="border border-gray-200 rounded-r-lg bg-gray-100 px-2 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-400"
                          >
                            {/* Une unité inconnue (ancienne donnée) reste sélectionnable */}
                            {(DOSE_UNITS.includes(line.doseUnit)
                              ? DOSE_UNITS
                              : [...DOSE_UNITS, line.doseUnit]
                            ).map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-0 disabled:pointer-events-none justify-self-end"
                        aria-label={`Retirer le principe actif ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addLine}
                  disabled={usedPrincipeIds.length >= principesActifs.length}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-cyan-300 py-2.5 text-sm font-medium text-cyan-700 hover:bg-cyan-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un principe actif
                </button>
              </div>
            )}
          </section>

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {formError}
            </div>
          )}
        </div>

        {/* ============ Colonne aperçu ============ */}
        <aside className="border-t border-gray-100 bg-gray-50/60 p-5">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Aperçu</h4>
              <p className="text-xs text-gray-500 mt-0.5">Ce qui sera enregistré.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Familles ({selectedFamilleIds.length})
                </p>
                {selectedFamilleIds.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucune sélection</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFamilleIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 pl-2.5 pr-1 py-0.5 text-xs font-medium text-cyan-800"
                      >
                        {familleById.get(id)?.libelle ?? `#${id}`}
                        <button
                          type="button"
                          onClick={() => toggleFamille(id)}
                          className="rounded-full p-0.5 hover:bg-cyan-100"
                          aria-label={`Retirer ${familleById.get(id)?.libelle ?? id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Composition ({filledLines.length})
                </p>
                {filledLines.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun principe actif</p>
                ) : (
                  <ul className="space-y-1.5">
                    {filledLines.map((l) => (
                      <li key={l.key} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gray-800">
                          {principeById.get(l.principeActifId as number)?.libelle ??
                            `#${l.principeActifId}`}
                        </span>
                        <span className="font-mono tabular-nums text-gray-600 whitespace-nowrap">
                          {formatDose(l) ?? <span className="text-gray-300">n. d.</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <ul className="space-y-1.5 text-xs" aria-label="Avancement">
              {[
                { ok: selectedFamilleIds.length > 0, label: "Au moins une famille" },
                {
                  ok: filledLines.length > 0 && filledLines.length === lines.length,
                  label: "Principes actifs renseignés",
                },
              ].map((c) => (
                <li
                  key={c.label}
                  className={`flex items-center gap-2 ${c.ok ? "text-cyan-800" : "text-gray-500"}`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full ${
                      c.ok ? "bg-cyan-600 text-white" : "border border-gray-300"
                    }`}
                  >
                    {c.ok && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {c.label}
                </li>
              ))}
            </ul>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="submit"
                disabled={submitting || !isReady}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {submitting
                  ? "Enregistrement en cours…"
                  : isEdit
                    ? "Enregistrer les modifications"
                    : "Créer le médicament"}
              </button>
              {isEdit ? (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Annuler la modification
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default MedicamentCreateForm;
