/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { ASINAState } from "@/core/types";
import type { StockLevelResponse } from "@/core/api-contracts";
import { useStock } from "../application/useStock";
import { TransfertCreateForm } from "./TransfertCreateForm";
import type { StockLine } from "./TransfertCreateForm";

export interface StockVisualizerTabProps {
  state: ASINAState;
  activeSiteId: number;
}

/* ---------- Réglages métier ---------- */
const LOW_STOCK = 20; // en dessous : stock bas
const EXPIRY_SOON_DAYS = 90; // en dessous : péremption proche
const PAGE_SIZE = 15;

type Status = "expired" | "soon" | "low" | "ok" | "empty";
type StatusFilter = "all" | "expired" | "soon" | "low";
type EditorMode = "edit" | "delete";
type SortKey = "produit" | "peremption" | "quantite" | "statut";
type SortDir = "asc" | "desc";
interface EditorTarget {
  mode: EditorMode;
  stock: StockLevelResponse;
}
type Row = StockLevelResponse & {
  qte: number;
  days: number | null;
  status: Status;
  fournisseur: string | null;
};

const STATUS_ORDER: Record<Status, number> = { expired: 0, soon: 1, low: 2, ok: 3, empty: 4 };

const STATUS_META: Record<Status, { label: string; pill: string }> = {
  expired: { label: "Expiré", pill: "bg-red-50 text-red-800 border-red-200" },
  soon: { label: "Expire bientôt", pill: "bg-orange-50 text-orange-800 border-orange-200" },
  low: { label: "Stock bas", pill: "bg-amber-50 text-amber-800 border-amber-200" },
  ok: { label: "Conforme", pill: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  empty: { label: "Épuisé", pill: "bg-gray-100 text-gray-600 border-gray-200" },
};

// Liseré de couleur à gauche de chaque ligne : repérage rapide des lots à risque
const ROW_ACCENT: Record<Status, string> = {
  expired: "border-l-red-500",
  soon: "border-l-orange-400",
  low: "border-l-amber-400",
  ok: "border-l-transparent",
  empty: "border-l-gray-300",
};

const TILE_TONES = {
  red: {
    idle: "border-gray-200 bg-white hover:border-red-300",
    active: "border-red-500 bg-red-50",
    icon: "text-red-600 bg-red-100",
  },
  orange: {
    idle: "border-gray-200 bg-white hover:border-orange-300",
    active: "border-orange-500 bg-orange-50",
    icon: "text-orange-600 bg-orange-100",
  },
  amber: {
    idle: "border-gray-200 bg-white hover:border-amber-300",
    active: "border-amber-500 bg-amber-50",
    icon: "text-amber-600 bg-amber-100",
  },
  gray: {
    idle: "border-gray-200 bg-white hover:border-gray-300",
    active: "border-asina-600 bg-gray-50",
    icon: "text-gray-600 bg-gray-100",
  },
} as const;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asina-600 focus-visible:ring-offset-1";

function getDaysUntil(expDate: string): number | null {
  const target = new Date(expDate).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / 86_400_000);
}

function formatDate(expDate: string | null): string {
  if (!expDate) return "—";
  const d = new Date(expDate);
  return Number.isNaN(d.getTime()) ? expDate : d.toLocaleDateString("fr-FR");
}

function relativeExpiry(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return `Expiré depuis ${Math.abs(days)} j`;
  if (days <= EXPIRY_SOON_DAYS) return `Dans ${days} j`;
  return null;
}

export const StockVisualizerTab: React.FC<StockVisualizerTabProps> = ({ activeSiteId }) => {
  const {
    produits,
    fetchProduits,
    conditionnements,
    fetchConditionnements,
    stockLevels,
    fetchStockLevels: fetchStock,
    ajustementTypes,
    fetchAjustementTypes,
    lots,
    fetchLots,
    createStockAjustement: createAjustement,
    error: loadError,
  } = useStock();

  /* ---------- État ---------- */
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [siteFilter, setSiteFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "statut", dir: "asc" });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [showZero, setShowZero] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [newQty, setNewQty] = useState("0");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [raison, setRaison] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  // Le transfert s'affiche en pleine page, à la place de la liste.
  const [showTransfer, setShowTransfer] = useState(false);

  /* ---------- Chargement ---------- */
  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchProduits(),
      fetchConditionnements(),
      fetchStock(),
      fetchAjustementTypes(),
      fetchLots(),
    ]);
    setReady(true);
  }, [fetchProduits, fetchConditionnements, fetchStock, fetchAjustementTypes, fetchLots]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStock(), fetchLots()]);
    setRefreshing(false);
  };

  useEffect(() => {
    setPage(1);
  }, [siteFilter, statusFilter, supplierFilter, deferredQuery, showZero, dateFrom, dateTo, sort]);

  // Échap ferme la fenêtre d'ajustement (le transfert n'est plus une fenêtre).
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      setEditor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, saving]);

  /* ---------- Données dérivées ---------- */
  const conditionnementById = useMemo(
    () => new Map(conditionnements.map((c) => [c.id, c])),
    [conditionnements],
  );
  const produitById = useMemo(() => new Map(produits.map((p) => [p.id, p])), [produits]);

  // id lot -> nom du fournisseur (fourni par l'API avec chaque lot)
  const fournisseurByLotId = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of lots) {
      if (l.id != null && l.fournisseurNom) map.set(l.id, l.fournisseurNom);
    }
    return map;
  }, [lots]);

  const rows = useMemo<Row[]>(
    () =>
      stockLevels.map((s) => {
        const qte = s.quantite ?? 0;
        const days = s.datePeremption ? getDaysUntil(s.datePeremption) : null;
        const status: Status =
          qte === 0
            ? "empty"
            : days !== null && days <= 0
              ? "expired"
              : days !== null && days <= EXPIRY_SOON_DAYS
                ? "soon"
                : qte < LOW_STOCK
                  ? "low"
                  : "ok";
        const fournisseur = s.lotId != null ? (fournisseurByLotId.get(s.lotId) ?? null) : null;
        return { ...s, qte, days, status, fournisseur };
      }),
    [stockLevels, fournisseurByLotId],
  );

  const sites = useMemo(() => {
    const map = new Map<number, { libelle: string; total: number }>();
    for (const r of rows) {
      if (r.siteId == null) continue;
      const entry = map.get(r.siteId) ?? { libelle: r.siteLibelle ?? `Site ${r.siteId}`, total: 0 };
      entry.total += r.qte;
      map.set(r.siteId, entry);
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [rows]);

  /* ---------- Données pour le formulaire de transfert ---------- */
  // Tous sites confondus : le formulaire filtre lui-même sur le site d'origine.
  const transferStocks = useMemo<StockLine[]>(
    () =>
      rows.flatMap((r) =>
        r.siteId != null && r.lotId != null && r.produitId != null
          ? [
              {
                siteId: r.siteId,
                produitId: r.produitId,
                lotId: r.lotId,
                numLot: r.numLot ?? "",
                datePeremption: r.datePeremption ?? null,
                qte: r.qte,
              },
            ]
          : [],
      ),
    [rows],
  );

  const transferProduits = useMemo(
    () => produits.map((p) => ({ id: p.id, nomCommercial: p.nomCommercial ?? p.libelle })), // ajuster au vrai nom du champ
    [produits],
  );

  // Limite : seuls les sites ayant du stock apparaissent. Pour proposer aussi
  // des sites vides comme destination, remplacer par une vraie liste de sites.
  const transferSites = useMemo(() => sites.map((s) => ({ id: s.id, name: s.libelle })), [sites]);

  const siteRows = useMemo(
    () => (siteFilter === "all" ? rows : rows.filter((r) => r.siteId === siteFilter)),
    [rows, siteFilter],
  );

  // Fournisseurs présents dans les lots du site sélectionné
  const suppliers = useMemo(
    () =>
      Array.from(new Set(siteRows.map((r) => r.fournisseur).filter((f): f is string => !!f))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [siteRows],
  );

  const kpis = useMemo(
    () => ({
      expired: siteRows.filter((r) => r.status === "expired").length,
      soon: siteRows.filter((r) => r.status === "soon").length,
      low: siteRows.filter((r) => r.status === "low").length,
      total: siteRows.reduce((sum, r) => sum + r.qte, 0),
      lots: siteRows.filter((r) => r.qte > 0).length,
    }),
    [siteRows],
  );

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return siteRows
      .filter((r) => {
        if (!showZero && r.qte === 0) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (supplierFilter !== "all" && r.fournisseur !== supplierFilter) return false;

        if (q) {
          const haystack = [
            r.produitLibelle ?? "",
            r.numLot ?? "",
            r.fournisseur ?? "",
            formatDate(r.datePeremption), // ex. 03/03/2027
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        if (dateFrom || dateTo) {
          const d = r.datePeremption?.slice(0, 10); // AAAA-MM-JJ
          if (!d) return false; // lot sans date : exclu quand une plage est demandée
          if (dateFrom && d < dateFrom) return false;
          if (dateTo && d > dateTo) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sort.key) {
          case "produit":
            cmp = (a.produitLibelle ?? "").localeCompare(b.produitLibelle ?? "");
            break;
          case "peremption":
            // les lots sans date passent en dernier
            cmp = (a.datePeremption ?? "9999-12-31").localeCompare(
              b.datePeremption ?? "9999-12-31",
            );
            break;
          case "quantite":
            cmp = a.qte - b.qte;
            break;
          default:
            cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        }
        return (
          (sort.dir === "asc" ? cmp : -cmp) ||
          (a.produitLibelle ?? "").localeCompare(b.produitLibelle ?? "")
        );
      });
  }, [siteRows, showZero, statusFilter, supplierFilter, deferredQuery, dateFrom, dateTo, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters =
    statusFilter !== "all" ||
    supplierFilter !== "all" ||
    query.trim() !== "" ||
    showZero ||
    dateFrom !== "" ||
    dateTo !== "";

  const resetFilters = () => {
    setStatusFilter("all");
    setSupplierFilter("all");
    setQuery("");
    setShowZero(false);
    setDateFrom("");
    setDateTo("");
  };
  const toggleStatus = (s: StatusFilter) => setStatusFilter((cur) => (cur === s ? "all" : s));
  const toggleSort = (key: SortKey) =>
    setSort((cur) =>
      cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  /* ---------- Ajustement ---------- */
  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const openEditor = (mode: EditorMode, stock: StockLevelResponse) => {
    setEditor({ mode, stock });
    setNewQty(mode === "edit" ? String(stock.quantite ?? 0) : "0");
    setTypeId(
      ajustementTypes.find((t) => t.code === "CORRECTION")?.id ?? ajustementTypes[0]?.id ?? null,
    );
    setRaison("");
    setFormError(null);
  };

  const closeEditor = () => {
    if (!saving) setEditor(null);
  };

  const handleSubmit = async () => {
    if (!editor) return;
    const { stock, mode } = editor;

    if (stock.lotId == null || stock.siteId == null) {
      setFormError("Lot ou site introuvable pour cette ligne de stock.");
      return;
    }
    const qty = mode === "delete" ? 0 : Number(newQty);
    if (newQty.trim() === "" || !Number.isInteger(qty) || qty < 0) {
      setFormError("La quantité doit être un entier positif ou nul.");
      return;
    }
    if (typeId == null) {
      setFormError("Choisissez un type d'ajustement.");
      return;
    }
    if (!raison.trim()) {
      setFormError("Indiquez la raison de cet ajustement.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      // createStockAjustement attrape les erreurs et renvoie undefined en cas d'échec ;
      // il rafraîchit déjà les niveaux de stock en cas de succès.
      const result = await createAjustement({
        siteId: stock.siteId,
        ajustementTypeId: typeId,
        raison: raison.trim(),
        details: [{ lotId: stock.lotId, actuallyQuantity: qty }],
      });
      if (!result) {
        setFormError("Échec de l'enregistrement de l'ajustement.");
        return;
      }
      setEditor(null);
      showFeedback(
        "success",
        mode === "delete"
          ? `Stock du lot ${stock.numLot || stock.lotId} mis à zéro.`
          : `Stock du lot ${stock.numLot || stock.lotId} ajusté à ${qty}.`,
      );
    } catch {
      setFormError("Échec de l'enregistrement de l'ajustement.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Rendu ---------- */
  const tiles: Array<{
    key: StatusFilter;
    label: string;
    hint: string;
    value: number;
    Icon: typeof Clock;
    tone: keyof typeof TILE_TONES;
  }> = [
    {
      key: "expired",
      label: "Lots expirés",
      hint: "À retirer du stock",
      value: kpis.expired,
      Icon: AlertTriangle,
      tone: "red",
    },
    {
      key: "soon",
      label: "Expirent sous 90 jours",
      hint: "À écouler en priorité",
      value: kpis.soon,
      Icon: Clock,
      tone: "orange",
    },
    {
      key: "low",
      label: "Stock bas",
      hint: `Moins de ${LOW_STOCK} unités`,
      value: kpis.low,
      Icon: TrendingDown,
      tone: "amber",
    },
  ];

  const adjustDiff =
    editor && editor.mode === "edit" && newQty.trim() !== "" && Number.isInteger(Number(newQty))
      ? Number(newQty) - (editor.stock.quantite ?? 0)
      : null;

  // Pastilles des filtres actifs (chacune se retire d'un clic)
  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (statusFilter !== "all")
    chips.push({
      key: "status",
      label: `Statut : ${STATUS_META[statusFilter].label}`,
      clear: () => setStatusFilter("all"),
    });
  if (supplierFilter !== "all")
    chips.push({
      key: "supplier",
      label: `Fournisseur : ${supplierFilter}`,
      clear: () => setSupplierFilter("all"),
    });
  if (query.trim())
    chips.push({ key: "query", label: `Recherche : ${query.trim()}`, clear: () => setQuery("") });
  if (dateFrom)
    chips.push({
      key: "from",
      label: `Péremption dès le ${formatDate(dateFrom)}`,
      clear: () => setDateFrom(""),
    });
  if (dateTo)
    chips.push({
      key: "to",
      label: `Péremption jusqu'au ${formatDate(dateTo)}`,
      clear: () => setDateTo(""),
    });
  if (showZero)
    chips.push({ key: "zero", label: "Lots épuisés inclus", clear: () => setShowZero(false) });

  // En-tête de colonne triable
  const sortHeader = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 rounded font-semibold hover:text-gray-800 ${active ? "text-gray-800" : ""} ${FOCUS}`}
        >
          {label}
          <Icon
            className={`h-3.5 w-3.5 ${active ? "text-asina-600" : "text-gray-300"}`}
            aria-hidden="true"
          />
        </button>
      </th>
    );
  };

  /* ---------- Vue « Nouveau transfert » (pleine page) ---------- */
  // Aucun hook n'est déclaré après ce point : le return anticipé est sans risque.
  if (showTransfer) {
    return (
      <div className="space-y-5">
        <div>
          <button
            type="button"
            onClick={() => setShowTransfer(false)}
            className={`-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 ${FOCUS}`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Retour à l'état des stocks
          </button>
          <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ArrowLeftRight className="h-5 w-5 text-gray-500" aria-hidden="true" />
            Nouveau transfert
          </h3>
        </div>

        <div className="max-w-2xl">
          <TransfertCreateForm
            sites={transferSites}
            produits={transferProduits}
            stocks={transferStocks}
            onCreated={() => {
              setShowTransfer(false);
              showFeedback("success", "Transfert créé.");
              refresh();
            }}
          />
        </div>
      </div>
    );
  }

  /* ---------- Vue « État des stocks » ---------- */
  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Layers className="h-5 w-5 text-gray-500" aria-hidden="true" />
            État des stocks
          </h3>
          <p className="text-sm text-gray-500">
            {kpis.lots} lots en stock, {kpis.total.toLocaleString("fr-FR")} unités au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTransfer(true)}
            className={`inline-flex items-center gap-2 rounded-lg bg-asina-600 px-3 py-2 text-sm font-semibold text-white hover:bg-asina-700 ${FOCUS}`}
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            Nouveau transfert
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 ${FOCUS}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`}
              aria-hidden="true"
            />
            Actualiser
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {feedback.text}
        </div>
      )}

      {ready && loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>Impossible de charger une partie des données : {loadError}</span>
          <button
            type="button"
            onClick={loadAll}
            className={`rounded-md border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100 ${FOCUS}`}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Choix du site */}
      {sites.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par site">
          {[
            {
              id: "all" as const,
              libelle: "Tous les sites",
              total: rows.reduce((s, r) => s + r.qte, 0),
            },
            ...sites,
          ].map((s) => {
            const active = siteFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSiteFilter(s.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${FOCUS} ${
                  active
                    ? "border-asina-600 bg-asina-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s.libelle}
                {s.id === activeSiteId && (
                  <span className={active ? "ml-1 text-white/80" : "ml-1 text-asina-700"}>
                    (votre site)
                  </span>
                )}
                <span className={`ml-2 tabular-nums ${active ? "text-white/80" : "text-gray-400"}`}>
                  {s.total.toLocaleString("fr-FR")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Alertes : cliquer pour filtrer le tableau */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ key, label, hint, value, Icon, tone }) => {
          const active = statusFilter === key;
          const t = TILE_TONES[tone];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleStatus(key)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left ${FOCUS} ${active ? t.active : t.idle} ${value === 0 && !active ? "opacity-60" : ""}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.icon}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-semibold leading-none text-gray-900 tabular-nums">
                  {value}
                </span>
                <span className="mt-1 block text-sm font-medium text-gray-800">{label}</span>
                <span className="block text-xs text-gray-500">{hint}</span>
              </span>
            </button>
          );
        })}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TILE_TONES.gray.icon}`}
          >
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none text-gray-900 tabular-nums">
              {kpis.total.toLocaleString("fr-FR")}
            </span>
            <span className="mt-1 block text-sm font-medium text-gray-800">Unités en stock</span>
            <span className="block text-xs text-gray-500">{kpis.lots} lots en stock</span>
          </span>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Médicament, lot, fournisseur ou date (ex. 03/2027)"
              aria-label="Rechercher un médicament, un numéro de lot, un fournisseur ou une date"
              className={`w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm ${FOCUS}`}
            />
          </div>

          <div>
            <label
              htmlFor="supplier-filter"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Fournisseur
            </label>
            <select
              id="supplier-filter"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className={`max-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ${FOCUS}`}
            >
              <option value="all">Tous</option>
              {suppliers.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date-from" className="mb-1 block text-xs font-medium text-gray-600">
              Péremption du
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ${FOCUS}`}
            />
          </div>
          <div>
            <label htmlFor="date-to" className="mb-1 block text-xs font-medium text-gray-600">
              au
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ${FOCUS}`}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showZero}
              onChange={(e) => setShowZero(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Afficher les lots épuisés
          </label>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
            {chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1.5 text-xs font-medium text-gray-700"
              >
                {c.label}
                <button
                  type="button"
                  onClick={c.clear}
                  aria-label={`Retirer le filtre : ${c.label}`}
                  className={`rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 ${FOCUS}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className={`rounded-md px-2 py-1 text-xs font-medium text-asina-700 hover:underline ${FOCUS}`}
            >
              Tout réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_0_#e5e7eb]">
              <tr className="text-xs font-semibold text-gray-500">
                {sortHeader("produit", "Médicament")}
                <th scope="col" className="px-4 py-3">
                  Lot
                </th>
                {sortHeader("peremption", "Péremption")}
                <th scope="col" className="px-4 py-3">
                  Fournisseur
                </th>
                <th scope="col" className="px-4 py-3">
                  Site
                </th>
                {sortHeader("statut", "Statut")}
                {sortHeader("quantite", "Quantité", "right")}
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!ready &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded bg-gray-100 motion-safe:animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}

              {ready &&
                pageRows.map((s) => {
                  const prod = produitById.get(s.produitId);
                  const cond =
                    prod?.conditionnementId != null
                      ? conditionnementById.get(prod.conditionnementId)
                      : null;
                  const meta = STATUS_META[s.status];
                  const rel = relativeExpiry(s.days);
                  const canAct = s.lotId != null && s.siteId != null;
                  const lotName = s.numLot || `#${s.lotId ?? "?"}`;
                  return (
                    <tr
                      key={s.id}
                      className={`border-l-4 ${ROW_ACCENT[s.status]} hover:bg-gray-50/60`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {s.produitLibelle || "Produit inconnu"}
                        </div>
                        {cond && (
                          <div className="text-xs text-gray-500">Format : {cond.libelle}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">{lotName}</td>
                      <td className="px-4 py-3">
                        <div
                          className={`text-sm font-medium tabular-nums ${
                            s.status === "expired"
                              ? "text-red-700"
                              : s.status === "soon"
                                ? "text-orange-700"
                                : "text-gray-800"
                          }`}
                        >
                          {formatDate(s.datePeremption)}
                        </div>
                        {rel && <div className="text-xs text-gray-500">{rel}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {s.fournisseur ? (
                          <span className="text-gray-700">{s.fournisseur}</span>
                        ) : (
                          <span className="text-xs italic text-gray-500">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.siteLibelle ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.pill}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-base font-semibold tabular-nums ${s.status === "low" ? "text-amber-700" : "text-gray-900"}`}
                        >
                          {s.qte.toLocaleString("fr-FR")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!canAct}
                          onClick={() => openEditor("edit", s)}
                          aria-label={`Modifier la quantité du lot ${lotName}`}
                          title="Modifier la quantité"
                          className={`mr-1 inline-flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 ${FOCUS}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={!canAct || s.qte === 0}
                          onClick={() => openEditor("delete", s)}
                          aria-label={`Mettre à zéro le stock du lot ${lotName}`}
                          title="Mettre le stock de ce lot à zéro"
                          className={`inline-flex items-center rounded-lg border border-red-200 p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-40 ${FOCUS}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {ready && pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {hasFilters
                        ? "Aucun lot ne correspond à votre recherche."
                        : "Aucun stock enregistré."}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {hasFilters
                        ? "Modifiez les filtres pour élargir les résultats."
                        : "Les lots apparaissent ici après un approvisionnement."}
                    </p>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className={`mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 ${FOCUS}`}
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {ready && visible.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span>
              {(safePage - 1) * PAGE_SIZE + 1} à {Math.min(safePage * PAGE_SIZE, visible.length)}{" "}
              sur {visible.length} lots
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                aria-label="Page précédente"
                className={`rounded-lg border border-gray-200 bg-white p-1.5 hover:bg-gray-50 disabled:opacity-40 ${FOCUS}`}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="tabular-nums">
                Page {safePage} sur {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount}
                aria-label="Page suivante"
                className={`rounded-lg border border-gray-200 bg-white p-1.5 hover:bg-gray-50 disabled:opacity-40 ${FOCUS}`}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fenêtre d'ajustement */}
      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ajustement-title"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 text-sm shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 id="ajustement-title" className="text-base font-semibold text-gray-900">
                {editor.mode === "edit"
                  ? "Modifier la quantité en stock"
                  : "Mettre le stock à zéro"}
              </h4>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Fermer"
                className={`rounded-md p-1 text-gray-400 hover:text-gray-700 ${FOCUS}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <dt className="text-gray-500">Médicament</dt>
              <dd className="font-semibold text-gray-900">
                {editor.stock.produitLibelle ?? "Inconnu"}
              </dd>
              <dt className="text-gray-500">Lot</dt>
              <dd className="font-mono text-xs leading-5 text-gray-800">
                {editor.stock.numLot || `#${editor.stock.lotId}`}
              </dd>
              <dt className="text-gray-500">Fournisseur</dt>
              <dd className="text-gray-800">
                {fournisseurByLotId.get(editor.stock.lotId ?? -1) ?? "—"}
              </dd>
              <dt className="text-gray-500">Site</dt>
              <dd className="text-gray-800">{editor.stock.siteLibelle ?? "—"}</dd>
              <dt className="text-gray-500">Quantité actuelle</dt>
              <dd className="font-semibold tabular-nums text-gray-900">
                {(editor.stock.quantite ?? 0).toLocaleString("fr-FR")}
              </dd>
            </dl>

            {editor.mode === "edit" ? (
              <div>
                <label htmlFor="ajustement-qty" className="mb-1 block font-medium text-gray-700">
                  Nouvelle quantité comptée
                </label>
                <input
                  id="ajustement-qty"
                  type="number"
                  min={0}
                  step={1}
                  autoFocus
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 tabular-nums ${FOCUS}`}
                />
                {adjustDiff !== null && adjustDiff !== 0 && (
                  <p
                    className={`mt-1 text-xs font-medium ${adjustDiff < 0 ? "text-red-700" : "text-emerald-700"}`}
                  >
                    Écart : {adjustDiff > 0 ? "+" : ""}
                    {adjustDiff.toLocaleString("fr-FR")} par rapport au stock actuel
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                La quantité de ce lot passera à 0 et la ligne disparaîtra de la liste. L'opération
                est enregistrée comme un ajustement d'inventaire : l'historique est conservé.
              </p>
            )}

            <div>
              <label htmlFor="ajustement-type" className="mb-1 block font-medium text-gray-700">
                Type d'ajustement
              </label>
              {ajustementTypes.length === 0 ? (
                <p className="text-amber-700">
                  Aucun type d'ajustement défini. Ajoutez-en dans le référentiel.
                </p>
              ) : (
                <select
                  id="ajustement-type"
                  value={typeId ?? ""}
                  onChange={(e) => setTypeId(Number(e.target.value))}
                  className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 ${FOCUS}`}
                >
                  {ajustementTypes.map((t) => (
                    <option key={t.id ?? t.libelle} value={t.id ?? ""}>
                      {t.libelle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="ajustement-raison" className="mb-1 block font-medium text-gray-700">
                Raison
              </label>
              <textarea
                id="ajustement-raison"
                rows={2}
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                placeholder="Exemple : comptage physique du 28/09, flacons cassés"
                className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 ${FOCUS}`}
              />
            </div>

            {formError && (
              <p role="alert" className="font-medium text-red-700">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className={`rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 ${FOCUS}`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || ajustementTypes.length === 0}
                className={`rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50 ${FOCUS} ${
                  editor.mode === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-asina-600 hover:bg-asina-700"
                }`}
              >
                {saving
                  ? "Enregistrement en cours"
                  : editor.mode === "delete"
                    ? "Mettre à zéro"
                    : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockVisualizerTab;
