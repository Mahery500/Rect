/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlaskConical,
  FolderTree,
  LayoutList,
  Package2,
  Pencil,
  Pill,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useStock } from "../application/useStock";
import { MedicamentCreateForm } from "./MedicamentCreateForm";
import { FamilleCreateForm } from "./FamilleCreateForm";
import { PrincipeActifCreateForm } from "./PrincipeActifCreateForm";
import { ConditionnementCreateForm } from "./ConditionnementCreateForm";
import { PresentationCreateForm } from "./PresentationCreateForm";
import { ProduitCreateForm } from "./ProduitCreateForm";
import type {
  MedicamentResponse,
  FamilleResource,
  PrincipeActifResource,
  ConditionnementResource,
  PresentationResource,
  ProduitResponse,
} from "@/core/api-contracts";

type ReferentielSubTab =
  | "medicaments"
  | "familles"
  | "principesActifs"
  | "conditionnements"
  | "presentations"
  | "produits";

const SUB_TABS: { key: ReferentielSubTab; label: string; icon: React.ElementType }[] = [
  { key: "medicaments", label: "Médicaments", icon: Pill },
  { key: "familles", label: "Familles", icon: FolderTree },
  { key: "principesActifs", label: "Principes actifs", icon: FlaskConical },
  { key: "conditionnements", label: "Conditionnements", icon: Package2 },
  { key: "presentations", label: "Présentations", icon: LayoutList },
  { key: "produits", label: "Produits", icon: ShoppingBag },
];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asina-600 focus-visible:ring-offset-1";

/* ---------- Utilitaires de recherche (sans casse ni accents) ---------- */
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const matches = (q: string, ...texts: Array<string | null | undefined>) =>
  !q || texts.some((t) => normalize(t ?? "").includes(q));

function filterSimple<T extends { libelle?: string | null }>(
  items: T[],
  q: string,
  extra?: (item: T) => string | null | undefined,
): T[] {
  return items
    .filter((i) => matches(q, i.libelle, extra?.(i)))
    .sort((a, b) => (a.libelle ?? "").localeCompare(b.libelle ?? "", "fr"));
}

/* ---------- Utilitaires divers ---------- */
type Identified = { id: number | null };

const plural = (n: number, word: string, pluralWord = `${word}s`) => (n > 1 ? pluralWord : word);

// Nombre d'usages de chaque id (pour bloquer la suppression côté UI avant même d'appeler le serveur).
function countBy<T>(items: T[], ids: (item: T) => Array<number | null | undefined>) {
  const map = new Map<number, number>();
  for (const it of items) {
    for (const id of ids(it)) {
      if (id != null) map.set(id, (map.get(id) ?? 0) + 1);
    }
  }
  return map;
}

const linkedMessage = (n: number, noun: string) =>
  `Impossible : ${n} ${plural(n, noun)} ${plural(n, "lié", "liés")}. Supprimez-${n > 1 ? "les" : "le"} d'abord.`;

/* ---------- Flux de suppression partagé (confirmation, anti double-clic, erreur serveur) ---------- */
function useDeleteFlow(getLastError: () => string | null) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setConfirmId(null);
    setError(null);
  }, []);

  const start = useCallback((id: number) => {
    setError(null);
    setConfirmId(id);
  }, []);

  const confirm = async (id: number, remove: (id: number) => Promise<boolean>) => {
    if (deletingId !== null) return false; // anti double-clic
    setDeletingId(id);
    setError(null);
    const ok = await remove(id);
    setDeletingId(null);
    if (ok) setConfirmId(null);
    else setError(getLastError() ?? "Suppression impossible."); // ex. 409 : on garde la confirmation ouverte
    return ok;
  };

  return { confirmId, deletingId, error, reset, start, confirm };
}

/* ---------- Petits composants de mise en page ---------- */
// Liste à gauche, formulaire à droite. Le formulaire reste visible quand la liste est longue.
const Split: React.FC<{ list: React.ReactNode; form: React.ReactNode }> = ({ list, form }) => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
    <div>{list}</div>
    <div className="lg:sticky lg:top-4">{form}</div>
  </div>
);

const ListCard: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({
  title,
  count,
  children,
}) => (
  <section className="rounded-xl border border-gray-200 bg-white">
    <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600">
        {count}
      </span>
    </header>
    <div className="max-h-[60vh] space-y-2 overflow-auto p-4">{children}</div>
  </section>
);

const SkeletonRows: React.FC = () => (
  <div aria-hidden="true" className="space-y-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
        <div className="h-4 w-2/3 rounded bg-gray-100 motion-safe:animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-gray-100 motion-safe:animate-pulse" />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ query: string; emptyLabel: string; onClear: () => void }> = ({
  query,
  emptyLabel,
  onClear,
}) => (
  <div className="py-8 text-center">
    <p className="text-sm font-medium text-gray-700">
      {query ? `Aucun résultat pour « ${query} »` : emptyLabel}
    </p>
    {query ? (
      <button
        type="button"
        onClick={onClear}
        className={`mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 ${FOCUS}`}
      >
        Effacer la recherche
      </button>
    ) : (
      <p className="mt-1 text-sm text-gray-500">Utilisez le formulaire pour en ajouter.</p>
    )}
  </div>
);

/* ---------- Boutons Modifier / Supprimer + confirmation ---------- */
interface RowActionsProps {
  confirming: boolean;
  deleting: boolean;
  blockedReason?: string | null;
  error: string | null;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const RowActions: React.FC<RowActionsProps> = ({
  confirming,
  deleting,
  blockedReason,
  error,
  onEdit,
  onAskDelete,
  onCancel,
  onConfirm,
}) => (
  <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-2">
    {confirming ? (
      <div className="w-full space-y-2">
        <p role="alert" className="text-xs text-red-700">
          {error ?? blockedReason ?? "Confirmer la suppression ?"}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className={`rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 ${FOCUS}`}
          >
            {blockedReason || error ? "Fermer" : "Annuler"}
          </button>
          {!blockedReason && !error && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className={`rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 ${FOCUS}`}
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          )}
        </div>
      </div>
    ) : (
      <>
        <button
          type="button"
          onClick={onEdit}
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 ${FOCUS}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Modifier
        </button>
        <button
          type="button"
          onClick={onAskDelete}
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 ${FOCUS}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Supprimer
        </button>
      </>
    )}
  </div>
);

// StockPage transmet ces props ; cet onglet n'en a pas besoin.
interface StockReferentielsTabProps {
  state?: unknown;
  activeSiteId?: number;
}

export const StockReferentielsTab: React.FC<StockReferentielsTabProps> = () => {
  const [activeSubTab, setActiveSubTab] = useState<ReferentielSubTab>("medicaments");
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  // Élément en cours de modification dans le sous-onglet actif (null = formulaire en mode création).
  // Remis à null à chaque changement de sous-onglet, donc le cast vers le bon type dans chaque panneau est sûr.
  const [editing, setEditing] = useState<Identified | null>(null);

  const {
    medicaments,
    familles,
    principesActifs,
    conditionnements,
    presentations,
    produits,
    error,
    notification,
    getLastError,
    fetchMedicaments,
    fetchFamilles,
    fetchPrincipesActifs,
    fetchConditionnements,
    fetchPresentations,
    fetchProduits,
    removeMedicament,
    removeFamille,
    removePrincipeActif,
    removeConditionnement,
    removePresentation,
    removeProduit,
    updateFamille,
    updatePrincipeActif,
    updateConditionnement,
    updatePresentation,
    updateProduit,
  } = useStock();

  const del = useDeleteFlow(getLastError);
  const resetDelete = del.reset;

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchMedicaments(),
      fetchFamilles(),
      fetchPrincipesActifs(),
      fetchConditionnements(),
      fetchPresentations(),
      fetchProduits(),
    ]);
    setReady(true);
  }, [
    fetchMedicaments,
    fetchFamilles,
    fetchPrincipesActifs,
    fetchConditionnements,
    fetchPresentations,
    fetchProduits,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Changer de sous-onglet efface la recherche, annule une édition et une confirmation en cours
  useEffect(() => {
    setQuery("");
    setEditing(null);
    resetDelete();
  }, [activeSubTab, resetDelete]);

  const q = normalize(query.trim());
  const clearQuery = () => setQuery("");

  /* ---------- Données dérivées ---------- */
  // Libellé d'un médicament : « Famille, Famille — Principe, Principe »
  const medicamentLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of medicaments) {
      const famille = m.familles.map((f) => f.libelle).join(", ");
      const principes = m.principesActifs.map((pa) => pa.libelle).join(", ");
      map.set(
        m.id as number,
        [famille, principes].filter(Boolean).join(" — ") || `Médicament #${m.id}`,
      );
    }
    return map;
  }, [medicaments]);

  const conditionnementLabelById = useMemo(
    () => new Map(conditionnements.map((c) => [c.id, c.libelle])),
    [conditionnements],
  );

  const produitCountByMedicament = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of produits) map.set(p.medicamentId, (map.get(p.medicamentId) ?? 0) + 1);
    return map;
  }, [produits]);

  // Nombre de médicaments / produits qui utilisent chaque famille, principe actif, conditionnement.
  // Sert à bloquer la suppression côté UI (le serveur reste l'autorité : un 409 s'affiche aussi).
  const usage = useMemo(
    () => ({
      familles: countBy(medicaments, (m) => m.familles.map((f) => f.id)),
      principesActifs: countBy(medicaments, (m) => m.principesActifs.map((pa) => pa.id)),
      conditionnements: countBy(produits, (p) => [p.conditionnementId]),
    }),
    [medicaments, produits],
  );

  const USAGE_NOUN = {
    familles: "médicament",
    principesActifs: "médicament",
    conditionnements: "produit",
  } as const;

  const blockedReason = (tab: keyof typeof USAGE_NOUN, id: number | null) => {
    const n = id != null ? (usage[tab].get(id) ?? 0) : 0;
    return n > 0 ? linkedMessage(n, USAGE_NOUN[tab]) : null;
  };

  const medicamentRows = useMemo(
    () =>
      medicaments
        .map((m) => ({
          m,
          title:
            m.principesActifs
              .map((pa) => (pa.dose ? `${pa.libelle} (${pa.dose})` : pa.libelle))
              .join(" + ") || "Sans principe actif",
          produitCount: produitCountByMedicament.get(m.id as number) ?? 0,
        }))
        .filter((r) => matches(q, r.title, ...r.m.familles.map((f) => f.libelle)))
        .sort((a, b) => a.title.localeCompare(b.title, "fr")),
    [medicaments, produitCountByMedicament, q],
  );

  const produitRows = useMemo(
    () =>
      produits
        .map((p) => ({
          p,
          medicament: medicamentLabelById.get(p.medicamentId) ?? `Médicament #${p.medicamentId}`,
          format:
            p.conditionnementId != null
              ? (conditionnementLabelById.get(p.conditionnementId) ?? null)
              : null,
        }))
        .filter((r) => matches(q, r.p.nomCommercial, r.medicament, r.format))
        .sort((a, b) => (a.p.nomCommercial ?? "").localeCompare(b.p.nomCommercial ?? "", "fr")),
    [produits, medicamentLabelById, conditionnementLabelById, q],
  );

  const familleItems = useMemo(() => filterSimple(familles, q), [familles, q]);
  const principeItems = useMemo(
    () => filterSimple(principesActifs, q, (i) => (i as { dose?: string | null }).dose),
    [principesActifs, q],
  );
  const conditionnementItems = useMemo(
    () => filterSimple(conditionnements, q),
    [conditionnements, q],
  );
  const presentationItems = useMemo(() => filterSimple(presentations, q), [presentations, q]);

  const totals: Record<ReferentielSubTab, number> = {
    medicaments: medicaments.length,
    familles: familles.length,
    principesActifs: principesActifs.length,
    conditionnements: conditionnements.length,
    presentations: presentations.length,
    produits: produits.length,
  };
  const shown: Record<ReferentielSubTab, number> = {
    medicaments: medicamentRows.length,
    familles: familleItems.length,
    principesActifs: principeItems.length,
    conditionnements: conditionnementItems.length,
    presentations: presentationItems.length,
    produits: produitRows.length,
  };

  const activeLabel = SUB_TABS.find((t) => t.key === activeSubTab)?.label ?? "";
  const emptyMessage = (singular: string) => `Aucun ${singular} pour l'instant.`;

  /* ---------- Navigation clavier entre onglets (flèches, Début, Fin) ---------- */
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = SUB_TABS.findIndex((t) => t.key === activeSubTab);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % SUB_TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + SUB_TABS.length) % SUB_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SUB_TABS.length - 1;
    else return;
    e.preventDefault();
    const key = SUB_TABS[next].key;
    setActiveSubTab(key);
    document.getElementById(`ref-tab-${key}`)?.focus();
  };

  /* ---------- Actions communes : édition / suppression ---------- */
  const removers: Record<ReferentielSubTab, (id: number) => Promise<boolean>> = {
    medicaments: removeMedicament,
    familles: removeFamille,
    principesActifs: removePrincipeActif,
    conditionnements: removeConditionnement,
    presentations: removePresentation,
    produits: removeProduit,
  };

  const startEdit = (item: Identified) => {
    resetDelete();
    setEditing(item);
  };
  const cancelEdit = () => setEditing(null);

  // Après une modification réussie : on ferme le formulaire d'édition et on resynchronise tout
  // (un renommage de famille ou de principe actif change aussi le libellé des médicaments).
  const handleUpdated = async () => {
    setEditing(null);
    await loadAll();
  };

  const handleDelete = async (id: number) => {
    const ok = await del.confirm(id, removers[activeSubTab]);
    if (ok) {
      if (editing?.id === id) setEditing(null);
      return;
    }
    // Échec (ex. 409) : on garde la confirmation ouverte avec le message du serveur
    // et on resynchronise, car les compteurs locaux étaient sans doute périmés.
    await loadAll();
  };

  const rowActions = (item: Identified, blocked?: string | null) => (
    <RowActions
      confirming={del.confirmId === item.id}
      deleting={del.deletingId === item.id}
      blockedReason={blocked}
      error={del.confirmId === item.id ? del.error : null}
      onEdit={() => startEdit(item)}
      onAskDelete={() => del.start(item.id as number)}
      onCancel={del.reset}
      onConfirm={() => handleDelete(item.id as number)}
    />
  );

  const rowClass = (id: number | null) =>
    `rounded-lg border p-3 transition-colors ${
      editing?.id === id ? "border-asina-300 bg-asina-50/60" : "border-gray-100 bg-gray-50/50"
    }`;

  /* ---------- Liste simple (familles, principes actifs, conditionnements, présentations) ---------- */
  const renderSimple = <T extends { id: number | null; libelle?: string | null }>(
    title: string,
    items: T[],
    emptyLabel: string,
    opts: { tab?: keyof typeof USAGE_NOUN; subtitle?: (i: T) => string | null | undefined } = {},
  ) => (
    <ListCard title={title} count={items.length}>
      {!ready && <SkeletonRows />}
      {ready &&
        items.map((item) => {
          const subtitle = opts.subtitle?.(item);
          return (
            <article key={item.id} className={rowClass(item.id)}>
              <div className="text-sm font-semibold text-gray-900">{item.libelle}</div>
              {subtitle && <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>}
              {rowActions(item, opts.tab ? blockedReason(opts.tab, item.id) : null)}
            </article>
          );
        })}
      {ready && items.length === 0 && (
        <EmptyState query={query.trim()} emptyLabel={emptyLabel} onClear={clearQuery} />
      )}
    </ListCard>
  );

  return (
    <div className="space-y-4">
      {/* Notification de succès / d'erreur des écritures de cet onglet */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            notification.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* Sous-onglets */}
      <div
        role="tablist"
        aria-label="Référentiels"
        onKeyDown={onTabKeyDown}
        className="flex flex-wrap gap-2 border-b border-gray-200 pb-3"
      >
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`ref-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`ref-panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveSubTab(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${FOCUS} ${
                isActive
                  ? "border-asina-600 bg-asina-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              {ready && (
                <span className={`tabular-nums ${isActive ? "text-white/80" : "text-gray-400"}`}>
                  {totals[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Erreur de chargement */}
      {ready && error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>Impossible de charger une partie des données : {error}</span>
          <button
            type="button"
            onClick={loadAll}
            className={`rounded-md border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100 ${FOCUS}`}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Recherche dans la liste affichée */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Rechercher dans « ${activeLabel} »`}
            aria-label={`Rechercher dans ${activeLabel}`}
            className={`w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm ${FOCUS}`}
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Effacer la recherche"
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 ${FOCUS}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {ready && (
          <p className="text-sm text-gray-500" aria-live="polite">
            {query.trim()
              ? `${shown[activeSubTab]} résultat${shown[activeSubTab] > 1 ? "s" : ""} sur ${totals[activeSubTab]}`
              : `${totals[activeSubTab]} élément${totals[activeSubTab] > 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* Panneau actif */}
      <div
        role="tabpanel"
        id={`ref-panel-${activeSubTab}`}
        aria-labelledby={`ref-tab-${activeSubTab}`}
      >
        {activeSubTab === "medicaments" && (
          <Split
            list={
              <ListCard title="Médicaments existants" count={shown.medicaments}>
                {!ready && <SkeletonRows />}
                {ready &&
                  medicamentRows.map(({ m, title, produitCount }) => (
                    <article key={m.id} className={rowClass(m.id as number)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{title}</div>
                          {m.familles.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {m.familles.map((f) => (
                                <span
                                  key={f.id}
                                  className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-700"
                                >
                                  {f.libelle}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-gray-500 tabular-nums">
                          {produitCount} produit{produitCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      {rowActions(
                        m,
                        produitCount > 0 ? linkedMessage(produitCount, "produit") : null,
                      )}
                    </article>
                  ))}
                {ready && medicamentRows.length === 0 && (
                  <EmptyState
                    query={query.trim()}
                    emptyLabel={emptyMessage("médicament")}
                    onClear={clearQuery}
                  />
                )}
              </ListCard>
            }
            form={
              <MedicamentCreateForm
                key={editing?.id ?? "new"}
                onCreated={fetchMedicaments}
                familles={familles}
                principesActifs={principesActifs}
                editing={editing as MedicamentResponse | null}
                onUpdated={handleUpdated}
                onCancelEdit={cancelEdit}
              />
            }
          />
        )}

        {activeSubTab === "familles" && (
          <Split
            list={renderSimple("Familles existantes", familleItems, emptyMessage("famille"), {
              tab: "familles",
            })}
            form={
              <FamilleCreateForm
                key={editing?.id ?? "new"}
                onCreated={fetchFamilles}
                editing={editing as FamilleResource | null}
                onUpdate={updateFamille}
                onUpdated={handleUpdated}
                onCancelEdit={cancelEdit}
              />
            }
          />
        )}

        {activeSubTab === "principesActifs" && (
          <Split
            list={renderSimple(
              "Principes actifs existants",
              principeItems,
              emptyMessage("principe actif"),
              {
                tab: "principesActifs",
                subtitle: (i) => (i as { dose?: string | null }).dose,
              },
            )}
            form={
              <PrincipeActifCreateForm
                key={editing?.id ?? "new"}
                onCreated={fetchPrincipesActifs}
                editing={editing as PrincipeActifResource | null}
                onUpdate={updatePrincipeActif}
                onUpdated={handleUpdated}
                onCancelEdit={cancelEdit}
              />
            }
          />
        )}

        {activeSubTab === "conditionnements" && (
          <Split
            list={renderSimple(
              "Conditionnements existants",
              conditionnementItems,
              emptyMessage("conditionnement"),
              {
                tab: "conditionnements",
              },
            )}
            form={
              <ConditionnementCreateForm
                key={editing?.id ?? "new"}
                onCreated={fetchConditionnements}
                editing={editing as ConditionnementResource | null}
                onUpdate={updateConditionnement}
                onUpdated={handleUpdated}
                onCancelEdit={cancelEdit}
              />
            }
          />
        )}

        {activeSubTab === "presentations" && (
          <Split
            list={renderSimple(
              "Présentations existantes",
              presentationItems,
              emptyMessage("présentation"),
            )}
            form={
              <PresentationCreateForm
                key={editing?.id ?? "new"}
                onCreated={fetchPresentations}
                editing={editing as PresentationResource | null}
                onUpdate={updatePresentation}
                onUpdated={handleUpdated}
                onCancelEdit={cancelEdit}
              />
            }
          />
        )}

        {activeSubTab === "produits" && (
          <Split
            list={
              <ListCard title="Produits existants" count={shown.produits}>
                {!ready && <SkeletonRows />}
                {ready &&
                  produitRows.map(({ p, medicament, format }) => (
                    <article key={p.id} className={rowClass(p.id as number)}>
                      <div className="text-sm font-semibold text-gray-900">{p.nomCommercial}</div>
                      <div className="mt-0.5 text-xs text-gray-600">{medicament}</div>
                      {format && <div className="text-xs text-gray-500">Format : {format}</div>}
                      {rowActions(p)}
                    </article>
                  ))}
                {ready && produitRows.length === 0 && (
                  <EmptyState
                    query={query.trim()}
                    emptyLabel={emptyMessage("produit")}
                    onClear={clearQuery}
                  />
                )}
              </ListCard>
            }
            form={
              <ProduitCreateForm
                key={editing?.id ?? "new"}
                onCreated={fetchProduits}
                editing={editing as ProduitResponse | null}
                onUpdate={updateProduit}
                onUpdated={handleUpdated}
                onCancelEdit={cancelEdit}
              />
            }
          />
        )}
      </div>
    </div>
  );
};

export default StockReferentielsTab;
