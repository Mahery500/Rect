// stock-niveaux/PanneauStockNiveaux.tsx
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
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import type { ModeAffichage } from "@/cerveau/permissions";
import { stockApi, refApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Bouton, Erreur, Modal, formatDate } from "../stock-commun/ui";
import type { Option, StockLigne } from "../stock-commun/types";
import { FormulaireTransfert } from "./FormulaireTransfert";

/* ---------- Réglages métier ---------- */
const LOW_STOCK = 20;
const EXPIRY_SOON_DAYS = 90;
const PAGE_SIZE = 15;

type Status = "expired" | "soon" | "low" | "ok" | "empty";
type StatusFilter = "all" | "expired" | "soon" | "low";
type SortKey = "produit" | "peremption" | "quantite" | "statut";
type SortDir = "asc" | "desc";
type EditorMode = "edit" | "delete";
interface EditorTarget {
  mode: EditorMode;
  stock: StockLigne;
}
type Row = StockLigne & {
  qte: number;
  days: number | null;
  status: Status;
  seuil: number;
  fournisseur: string | null;
};

const STATUS_ORDER: Record<Status, number> = { expired: 0, soon: 1, low: 2, ok: 3, empty: 4 };

const STATUS_META: Record<Status, { label: string; pill: string; dot: string }> = {
  expired: { label: "Expiré", pill: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  soon: {
    label: "Expire bientôt",
    pill: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
  },
  low: {
    label: "Stock bas",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  ok: {
    label: "Conforme",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  empty: { label: "Épuisé", pill: "bg-gray-100 text-gray-600 ring-gray-200", dot: "bg-gray-400" },
};

const ROW_ACCENT: Record<Status, string> = {
  expired: "border-l-red-500",
  soon: "border-l-orange-400",
  low: "border-l-amber-400",
  ok: "border-l-transparent",
  empty: "border-l-gray-300",
};

/** Cartes KPI : gradient + icône dans pastille. */
const KPI_TONES = {
  red: {
    idle: "bg-white border-gray-200 hover:border-red-300 hover:shadow-md",
    active: "bg-gradient-to-br from-red-50 to-white border-red-400 ring-1 ring-red-400 shadow-sm",
    icon: "bg-red-100 text-red-600",
    value: "text-red-700",
  },
  orange: {
    idle: "bg-white border-gray-200 hover:border-orange-300 hover:shadow-md",
    active:
      "bg-gradient-to-br from-orange-50 to-white border-orange-400 ring-1 ring-orange-400 shadow-sm",
    icon: "bg-orange-100 text-orange-600",
    value: "text-orange-700",
  },
  amber: {
    idle: "bg-white border-gray-200 hover:border-amber-300 hover:shadow-md",
    active:
      "bg-gradient-to-br from-amber-50 to-white border-amber-400 ring-1 ring-amber-400 shadow-sm",
    icon: "bg-amber-100 text-amber-600",
    value: "text-amber-700",
  },
  teal: {
    idle: "bg-white border-gray-200",
    active:
      "bg-gradient-to-br from-teal-50 to-white border-teal-400 ring-1 ring-teal-400 shadow-sm",
    icon: "bg-teal-100 text-teal-700",
    value: "text-teal-800",
  },
} as const;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1";

function joursAvant(date: string): number | null {
  const cible = new Date(date).getTime();
  if (Number.isNaN(cible)) return null;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return Math.ceil((cible - aujourdhui.getTime()) / 86_400_000);
}

function peremptionRelative(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return `Expiré depuis ${Math.abs(days)} j`;
  if (days <= EXPIRY_SOON_DAYS) return `Dans ${days} j`;
  return null;
}

export const PanneauStockNiveaux: React.FC<{ mode: ModeAffichage; siteActifId?: number }> = ({
  mode,
  siteActifId,
}) => {
  const editable = mode === "edition";

  /* ---------- Données ---------- */
  const niveaux = useListe<StockLigne>(() => stockApi.niveaux());
  const sites = useListe(stockApi.sites);
  const types = useListe(stockApi.ajustementTypes);
  const produits = useListe(stockApi.produits);
  const conditionnements = useListe<Option>(() => refApi.conditionnements.liste());
  const lots = useListe<{ id: number; fournisseurNom?: string | null }>(() =>
    stockApi.lots().catch(() => []),
  );

  /* ---------- État ---------- */
  const [vue, setVue] = useState<"liste" | "transfert">("liste");
  const [refreshing, setRefreshing] = useState(false);
  const [siteFilter, setSiteFilter] = useState<number | "all">(siteActifId ?? "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "statut", dir: "asc" });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [showZero, setShowZero] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [newQty, setNewQty] = useState("0");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const ready = !niveaux.chargement;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([niveaux.recharger(), lots.recharger()]);
    setRefreshing(false);
  }, [niveaux, lots]);

  useEffect(() => {
    setPage(1);
  }, [siteFilter, statusFilter, supplierFilter, deferredQuery, showZero, dateFrom, dateTo, sort]);

  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setEditor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, saving]);

  /* ---------- Données dérivées ---------- */
  const conditionnementParId = useMemo(
    () => new Map(conditionnements.items.map((c) => [c.id, c])),
    [conditionnements.items],
  );
  const produitParId = useMemo(
    () => new Map(produits.items.map((p) => [p.id, p])),
    [produits.items],
  );
  const fournisseurParLot = useMemo(() => {
    const m = new Map<number, string>();
    for (const l of lots.items) if (l.id != null && l.fournisseurNom) m.set(l.id, l.fournisseurNom);
    return m;
  }, [lots.items]);

  const rows = useMemo<Row[]>(
    () =>
      niveaux.items.map((s) => {
        const qte = s.quantite ?? 0;
        const seuil = s.seuilAlerte ?? LOW_STOCK;
        const days = s.datePeremption ? joursAvant(s.datePeremption) : null;
        const status: Status =
          qte === 0
            ? "empty"
            : days !== null && days <= 0
              ? "expired"
              : days !== null && days <= EXPIRY_SOON_DAYS
                ? "soon"
                : qte < seuil
                  ? "low"
                  : "ok";
        return {
          ...s,
          qte,
          days,
          status,
          seuil,
          fournisseur: s.lotId != null ? (fournisseurParLot.get(s.lotId) ?? null) : null,
        };
      }),
    [niveaux.items, fournisseurParLot],
  );

  const siteChips = useMemo(
    () =>
      sites.items.map((s) => ({
        id: s.id,
        libelle: s.name,
        total: rows.filter((r) => r.siteId === s.id).reduce((sum, r) => sum + r.qte, 0),
      })),
    [sites.items, rows],
  );

  const siteRows = useMemo(
    () => (siteFilter === "all" ? rows : rows.filter((r) => r.siteId === siteFilter)),
    [rows, siteFilter],
  );

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
          const meule = [
            r.produitLibelle ?? "",
            r.lotNumero ?? "",
            r.fournisseur ?? "",
            formatDate(r.datePeremption),
          ]
            .join(" ")
            .toLowerCase();
          if (!meule.includes(q)) return false;
        }
        if (dateFrom || dateTo) {
          const d = r.datePeremption?.slice(0, 10);
          if (!d) return false;
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

  const openEditor = (m: EditorMode, stock: StockLigne) => {
    setEditor({ mode: m, stock });
    setNewQty(m === "edit" ? String(stock.quantite ?? 0) : "0");
    const parDefaut = types.items.find((t) => /correction/i.test(t.libelle)) ?? types.items[0];
    setTypeId(parDefaut?.id ?? null);
    setMotif("");
    setFormError(null);
  };

  const closeEditor = () => {
    if (!saving) setEditor(null);
  };

  const handleSubmit = async () => {
    if (!editor) return;
    const { stock, mode: m } = editor;
    if (stock.lotId == null || stock.siteId == null)
      return setFormError("Lot ou site introuvable pour cette ligne de stock.");
    const qty = m === "delete" ? 0 : Number(newQty);
    if (newQty.trim() === "" || !Number.isInteger(qty) || qty < 0)
      return setFormError("La quantité doit être un entier positif ou nul.");
    if (typeId == null) return setFormError("Choisissez un type d'ajustement.");
    if (!motif.trim()) return setFormError("Indiquez la raison de cet ajustement.");

    setSaving(true);
    setFormError(null);
    try {
      await stockApi.creerAjustement({
        siteId: stock.siteId,
        lotId: stock.lotId,
        typeId,
        quantiteComptee: qty,
        motif: motif.trim(),
      });
      setEditor(null);
      showFeedback(
        "success",
        m === "delete"
          ? `Stock du lot ${stock.lotNumero || stock.lotId} mis à zéro.`
          : `Stock du lot ${stock.lotNumero || stock.lotId} ajusté à ${qty}.`,
      );
      await niveaux.recharger();
    } catch (e) {
      setFormError(messageErreur(e, "Échec de l'enregistrement de l'ajustement."));
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
    tone: keyof typeof KPI_TONES;
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
      label: `Expirent sous ${EXPIRY_SOON_DAYS} j`,
      hint: "À écouler en priorité",
      value: kpis.soon,
      Icon: Clock,
      tone: "orange",
    },
    {
      key: "low",
      label: "Stock bas",
      hint: "Sous le seuil d'alerte du produit",
      value: kpis.low,
      Icon: TrendingDown,
      tone: "amber",
    },
  ];

  const adjustDiff =
    editor && editor.mode === "edit" && newQty.trim() !== "" && Number.isInteger(Number(newQty))
      ? Number(newQty) - (editor.stock.quantite ?? 0)
      : null;

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

  const sortHeader = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 ${align === "right" ? "text-right" : "text-left"}`}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 rounded font-semibold hover:text-gray-800 ${active ? "text-teal-700" : ""} ${FOCUS}`}
        >
          {label}
          <Icon
            className={`h-3.5 w-3.5 ${active ? "text-teal-600" : "text-gray-300"}`}
            aria-hidden="true"
          />
        </button>
      </th>
    );
  };

  /* ---------- Vue « Nouveau transfert » ---------- */
  if (vue === "transfert") {
    return (
      <div className="space-y-5">
        <div>
          <button
            type="button"
            onClick={() => setVue("liste")}
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
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <FormulaireTransfert
            sites={sites.items}
            stocks={niveaux.items}
            siteOrigineParDefaut={siteFilter === "all" ? siteActifId : siteFilter}
            onTermine={() => {
              setVue("liste");
              showFeedback("success", "Transfert créé.");
              refresh();
            }}
          />
        </div>
      </div>
    );
  }

  /* ---------- Vue principale ---------- */
  const erreurChargement = niveaux.erreur ?? sites.erreur ?? types.erreur ?? produits.erreur;

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Layers className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            État des stocks
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{kpis.lots}</span> lots en stock ·{" "}
            <span className="font-medium text-gray-700">{kpis.total.toLocaleString("fr-FR")}</span>{" "}
            unités
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <Bouton variante="primaire" onClick={() => setVue("transfert")}>
              <ArrowLeftRight className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              Nouveau transfert
            </Bouton>
          )}
          <Bouton onClick={refresh} disabled={refreshing}>
            <RefreshCw
              className={`mr-1.5 inline h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`}
              aria-hidden="true"
            />
            Actualiser
          </Bouton>
        </div>
      </div>

      {/* Bandeau feedback */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${
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

      {/* Bandeau erreur */}
      {erreurChargement && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>Impossible de charger une partie des données : {erreurChargement}</span>
          <Bouton
            onClick={() => {
              niveaux.recharger();
              sites.recharger();
              types.recharger();
              produits.recharger();
            }}
          >
            Réessayer
          </Bouton>
        </div>
      )}

      {/* Chips sites */}
      {siteChips.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par site">
          {[
            {
              id: "all" as const,
              libelle: "Tous les sites",
              total: rows.reduce((s, r) => s + r.qte, 0),
            },
            ...siteChips,
          ].map((s) => {
            const active = siteFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSiteFilter(s.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${FOCUS} ${
                  active
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-teal-300 hover:bg-teal-50/40"
                }`}
              >
                {s.libelle}
                {s.id === siteActifId && (
                  <span className={active ? "ml-1 text-white/80" : "ml-1 text-teal-700"}>
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

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ key, label, hint, value, Icon, tone }) => {
          const active = statusFilter === key;
          const t = KPI_TONES[tone];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleStatus(key)}
              className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${FOCUS} ${
                active ? t.active : t.idle
              } ${value === 0 && !active ? "opacity-60" : ""}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${t.icon}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-2xl font-semibold leading-none tabular-nums ${t.value}`}
                >
                  {value}
                </span>
                <span className="mt-1.5 block text-sm font-medium text-gray-800">{label}</span>
                <span className="block text-xs text-gray-500">{hint}</span>
              </span>
            </button>
          );
        })}

        {/* Carte total */}
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none tabular-nums text-slate-800">
              {kpis.total.toLocaleString("fr-FR")}
            </span>
            <span className="mt-1.5 block text-sm font-medium text-gray-800">Unités en stock</span>
            <span className="block text-xs text-gray-500">{kpis.lots} lots en stock</span>
          </span>
        </div>
      </div>

      {/* Barre d'outils : recherche + filtres */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 p-3">
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
              className={`w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm transition ${FOCUS}`}
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltresOuverts((v) => !v)}
            aria-expanded={filtresOuverts}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${FOCUS} ${
              hasFilters && chips.length > 0
                ? "border-teal-300 bg-teal-50 text-teal-800"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtres
            {chips.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-semibold text-white tabular-nums">
                {chips.length}
              </span>
            )}
          </button>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showZero}
              onChange={(e) => setShowZero(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Lots épuisés
          </label>
        </div>

        {filtresOuverts && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-3">
            <div className="flex flex-wrap items-end gap-3">
              {suppliers.length > 0 && (
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
                    className={`max-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition ${FOCUS}`}
                  >
                    <option value="all">Tous les fournisseurs</option>
                    {suppliers.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition ${FOCUS}`}
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
                  className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition ${FOCUS}`}
                />
              </div>

              {chips.length > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className={`ml-auto rounded-lg px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 ${FOCUS}`}
                >
                  Tout réinitialiser
                </button>
              )}
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-3 py-2.5"
            aria-label="Filtres actifs"
          >
            {chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 py-1 pl-3 pr-1.5 text-xs font-medium text-teal-800"
              >
                {c.label}
                <button
                  type="button"
                  onClick={c.clear}
                  aria-label={`Retirer le filtre : ${c.label}`}
                  className={`rounded-full p-0.5 text-teal-500 hover:bg-teal-100 hover:text-teal-800 ${FOCUS}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur shadow-[0_1px_0_0_#e5e7eb]">
              <tr>
                {sortHeader("produit", "Médicament")}
                <th
                  scope="col"
                  className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                >
                  Lot
                </th>
                {sortHeader("peremption", "Péremption")}
                <th
                  scope="col"
                  className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                >
                  Fournisseur
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                >
                  Site
                </th>
                {sortHeader("statut", "Statut")}
                {sortHeader("quantite", "Quantité", "right")}
                {editable && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!ready &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: editable ? 8 : 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded bg-gray-100 motion-safe:animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}

              {ready &&
                pageRows.map((s) => {
                  const prod = s.produitId != null ? produitParId.get(s.produitId) : undefined;
                  const cond =
                    prod?.conditionnementId != null
                      ? conditionnementParId.get(prod.conditionnementId)
                      : undefined;
                  const meta = STATUS_META[s.status];
                  const rel = peremptionRelative(s.days);
                  const canAct = s.lotId != null && s.siteId != null;
                  const lotName = s.lotNumero || `#${s.lotId ?? "?"}`;
                  return (
                    <tr
                      key={s.id}
                      className={`border-l-4 transition-colors ${ROW_ACCENT[s.status]} hover:bg-gray-50/70`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900">
                          {s.produitLibelle || "Produit inconnu"}
                        </div>
                        {cond && (
                          <div className="mt-0.5 text-xs text-gray-500">
                            Format : {cond.libelle}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                          {lotName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
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
                        {rel && <div className="mt-0.5 text-xs text-gray-500">{rel}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.fournisseur ? (
                          <span className="text-gray-700">{s.fournisseur}</span>
                        ) : (
                          <span className="text-xs italic text-gray-500">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{s.siteNom ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.pill}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                            aria-hidden="true"
                          />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={`text-base font-semibold tabular-nums ${
                            s.status === "expired"
                              ? "text-red-700"
                              : s.status === "low"
                                ? "text-amber-700"
                                : s.status === "empty"
                                  ? "text-gray-400"
                                  : "text-gray-900"
                          }`}
                        >
                          {s.qte.toLocaleString("fr-FR")}
                        </span>
                      </td>
                      {editable && (
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <button
                            type="button"
                            disabled={!canAct}
                            onClick={() => openEditor("edit", s)}
                            aria-label={`Modifier la quantité du lot ${lotName}`}
                            title="Modifier la quantité"
                            className={`mr-1 inline-flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-40 ${FOCUS}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={!canAct || s.qte === 0}
                            onClick={() => openEditor("delete", s)}
                            aria-label={`Mettre à zéro le stock du lot ${lotName}`}
                            title="Mettre le stock de ce lot à zéro"
                            className={`inline-flex items-center rounded-lg border border-red-200 p-1.5 text-red-700 transition hover:bg-red-50 disabled:opacity-40 ${FOCUS}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}

              {ready && pageRows.length === 0 && (
                <tr>
                  <td colSpan={editable ? 8 : 7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                        <Search className="h-6 w-6 text-gray-400" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {hasFilters
                          ? "Aucun lot ne correspond à votre recherche."
                          : "Aucun stock enregistré."}
                      </p>
                      <p className="max-w-md text-sm text-gray-500">
                        {hasFilters
                          ? "Modifiez les filtres pour élargir les résultats."
                          : "Les lots apparaissent ici après une réception de commande."}
                      </p>
                      {hasFilters && (
                        <Bouton className="mt-2" onClick={resetFilters}>
                          Réinitialiser les filtres
                        </Bouton>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {ready && visible.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600">
            <span>
              <span className="font-medium text-gray-800">{(safePage - 1) * PAGE_SIZE + 1}</span> à{" "}
              <span className="font-medium text-gray-800">
                {Math.min(safePage * PAGE_SIZE, visible.length)}
              </span>{" "}
              sur <span className="font-medium text-gray-800">{visible.length}</span> lots
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                aria-label="Page précédente"
                className={`rounded-lg border border-gray-200 bg-white p-1.5 transition hover:bg-gray-50 disabled:opacity-40 ${FOCUS}`}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="tabular-nums">
                Page <span className="font-medium text-gray-800">{safePage}</span> sur{" "}
                <span className="font-medium text-gray-800">{pageCount}</span>
              </span>
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount}
                aria-label="Page suivante"
                className={`rounded-lg border border-gray-200 bg-white p-1.5 transition hover:bg-gray-50 disabled:opacity-40 ${FOCUS}`}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal ajustement */}
      {editor && (
        <Modal
          titre={
            editor.mode === "edit" ? "Modifier la quantité en stock" : "Mettre le stock à zéro"
          }
          onFermer={closeEditor}
        >
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
              <dt className="text-gray-500">Médicament</dt>
              <dd className="font-semibold text-gray-900">
                {editor.stock.produitLibelle ?? "Inconnu"}
              </dd>
              <dt className="text-gray-500">Lot</dt>
              <dd>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                  {editor.stock.lotNumero || `#${editor.stock.lotId}`}
                </span>
              </dd>
              <dt className="text-gray-500">Fournisseur</dt>
              <dd className="text-gray-800">
                {fournisseurParLot.get(editor.stock.lotId ?? -1) ?? "—"}
              </dd>
              <dt className="text-gray-500">Site</dt>
              <dd className="text-gray-800">{editor.stock.siteNom ?? "—"}</dd>
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
                  className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 tabular-nums transition ${FOCUS}`}
                />
                {adjustDiff !== null && adjustDiff !== 0 && (
                  <p
                    className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${adjustDiff < 0 ? "text-red-700" : "text-emerald-700"}`}
                  >
                    {adjustDiff < 0 ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUp className="h-3.5 w-3.5" />
                    )}
                    Écart : {adjustDiff > 0 ? "+" : ""}
                    {adjustDiff.toLocaleString("fr-FR")} par rapport au stock actuel
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
                La quantité de ce lot passera à 0 et la ligne disparaîtra de la liste. L'opération
                est enregistrée comme un ajustement d'inventaire : l'historique est conservé.
              </p>
            )}

            <div>
              <label htmlFor="ajustement-type" className="mb-1 block font-medium text-gray-700">
                Type d'ajustement
              </label>
              {types.items.length === 0 ? (
                <p className="text-amber-700">
                  Aucun type d'ajustement défini. Ajoutez-en dans le référentiel.
                </p>
              ) : (
                <select
                  id="ajustement-type"
                  value={typeId ?? ""}
                  onChange={(e) => setTypeId(Number(e.target.value))}
                  className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 transition ${FOCUS}`}
                >
                  {types.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.libelle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="ajustement-motif" className="mb-1 block font-medium text-gray-700">
                Raison
              </label>
              <textarea
                id="ajustement-motif"
                rows={2}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Exemple : comptage physique du 28/09, flacons cassés"
                className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 transition ${FOCUS}`}
              />
            </div>

            <Erreur message={formError} />

            <div className="flex justify-end gap-2 pt-1">
              <Bouton onClick={closeEditor} disabled={saving}>
                Annuler
              </Bouton>
              <Bouton
                variante={editor.mode === "delete" ? "danger" : "primaire"}
                onClick={handleSubmit}
                disabled={saving || types.items.length === 0}
              >
                {saving
                  ? "Enregistrement…"
                  : editor.mode === "delete"
                    ? "Mettre à zéro"
                    : "Enregistrer"}
              </Bouton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PanneauStockNiveaux;
