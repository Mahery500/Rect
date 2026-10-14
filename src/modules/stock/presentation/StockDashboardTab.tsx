/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  PackageX,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import { useStock } from "../application/useStock";
import type { StockTabType } from "../domain/stock.types";

export interface StockDashboardTabProps {
  activeSiteId?: number;
  /** Navigation vers un autre onglet du module stock (facultatif) */
  onGoTo?: (tab: StockTabType) => void;
}

/* ---------- Mêmes réglages métier que StockVisualizerTab ---------- */
const LOW_STOCK = 20; // en dessous : stock bas
const EXPIRY_SOON_DAYS = 90; // en dessous : péremption proche
const LIST_SIZE = 8;

type Status = "expired" | "soon" | "low" | "ok" | "empty";

interface DashRow {
  siteId: number | null;
  siteLibelle: string;
  produitId: number | null;
  produitNom: string;
  lotId: number | null;
  numLot: string;
  datePeremption: string | null;
  fournisseur: string | null;
  qte: number;
  days: number | null;
  status: Status;
}

interface ProductSummary {
  produitId: number;
  nom: string;
  usable: number; // quantité utilisable (lots non expirés)
}

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

function relativeExpiry(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return `Expiré depuis ${Math.abs(days)} j`;
  return `Dans ${days} j`;
}

/* ---------- Tuile d'indicateur ---------- */
const TONES = {
  red: {
    idle: "border-gray-200 bg-white hover:border-red-300",
    icon: "text-red-600 bg-red-100",
    value: "text-red-700",
  },
  amber: {
    idle: "border-gray-200 bg-white hover:border-amber-300",
    icon: "text-amber-600 bg-amber-100",
    value: "text-amber-700",
  },
  orange: {
    idle: "border-gray-200 bg-white hover:border-orange-300",
    icon: "text-orange-600 bg-orange-100",
    value: "text-orange-700",
  },
  blue: {
    idle: "border-gray-200 bg-white hover:border-sky-300",
    icon: "text-sky-600 bg-sky-100",
    value: "text-sky-700",
  },
} as const;

interface TileProps {
  tone: keyof typeof TONES;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  onClick?: () => void;
}

const Tile: React.FC<TileProps> = ({ tone, icon: Icon, label, value, hint, onClick }) => {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition cursor-pointer ${t.idle} ${FOCUS}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${value > 0 ? t.value : "text-slate-400"}`}
          >
            {value}
          </p>
        </div>
        <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </button>
  );
};

export const StockDashboardTab: React.FC<StockDashboardTabProps> = ({ activeSiteId, onGoTo }) => {
  const {
    produits,
    fetchProduits,
    stockLevels,
    fetchStockLevels,
    lots,
    fetchLots,
    commandes,
    fetchCommandes,
    error: loadError,
  } = useStock();

  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [siteFilter, setSiteFilter] = useState<number | "all">("all");

  const loadAll = useCallback(async () => {
    await Promise.all([fetchProduits(), fetchStockLevels(), fetchLots(), fetchCommandes()]);
    setReady(true);
  }, [fetchProduits, fetchStockLevels, fetchLots, fetchCommandes]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  /* ---------- Données dérivées ---------- */
  const produitById = useMemo(() => new Map(produits.map((p) => [p.id, p])), [produits]);

  const fournisseurByLotId = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of lots) {
      if (l.id != null && l.fournisseurNom) map.set(l.id, l.fournisseurNom);
    }
    return map;
  }, [lots]);

  const rows = useMemo<DashRow[]>(
    () =>
      stockLevels.map((s) => {
        const anyS = s as any;
        const qte: number = s.quantite ?? 0;
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

        const p: any = s.produitId != null ? produitById.get(s.produitId) : undefined;
        const produitNom: string =
          anyS.produitNom ??
          anyS.produitLibelle ??
          p?.nomCommercial ??
          p?.libelle ??
          p?.nom ??
          (s.produitId != null ? `Produit ${s.produitId}` : "Produit inconnu");

        return {
          siteId: s.siteId ?? null,
          siteLibelle: s.siteLibelle ?? (s.siteId != null ? `Site ${s.siteId}` : "Site inconnu"),
          produitId: s.produitId ?? null,
          produitNom,
          lotId: s.lotId ?? null,
          numLot: s.numLot ?? "",
          datePeremption: s.datePeremption ?? null,
          fournisseur: s.lotId != null ? (fournisseurByLotId.get(s.lotId) ?? null) : null,
          qte,
          days,
          status,
        };
      }),
    [stockLevels, produitById, fournisseurByLotId],
  );

  const sites = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) {
      if (r.siteId != null) map.set(r.siteId, r.siteLibelle);
    }
    return Array.from(map.entries()).map(([id, libelle]) => ({ id, libelle }));
  }, [rows]);

  const siteRows = useMemo(
    () => (siteFilter === "all" ? rows : rows.filter((r) => r.siteId === siteFilter)),
    [rows, siteFilter],
  );

  // Totaux par produit : on ne compte que les lots non expirés
  const productSummaries = useMemo<ProductSummary[]>(() => {
    const map = new Map<number, ProductSummary>();
    for (const r of siteRows) {
      if (r.produitId == null) continue;
      const entry = map.get(r.produitId) ?? {
        produitId: r.produitId,
        nom: r.produitNom,
        usable: 0,
      };
      if (r.status !== "expired") entry.usable += r.qte;
      map.set(r.produitId, entry);
    }
    return Array.from(map.values());
  }, [siteRows]);

  const ruptures = useMemo(
    () => productSummaries.filter((p) => p.usable === 0),
    [productSummaries],
  );
  const lowStock = useMemo(
    () => productSummaries.filter((p) => p.usable > 0 && p.usable < LOW_STOCK),
    [productSummaries],
  );

  const toRestock = useMemo(
    () =>
      [...ruptures, ...lowStock].sort((a, b) => a.usable - b.usable || a.nom.localeCompare(b.nom)),
    [ruptures, lowStock],
  );

  const expiringLots = useMemo(
    () =>
      siteRows
        .filter((r) => r.qte > 0 && (r.status === "expired" || r.status === "soon"))
        .sort((a, b) => (a.days ?? 0) - (b.days ?? 0)),
    [siteRows],
  );
  const expiredCount = useMemo(
    () => expiringLots.filter((r) => r.status === "expired").length,
    [expiringLots],
  );

  // Commandes à réceptionner : le champ s'appelle statut (API) ; on tolère aussi Statut
  const pendingOrders = useMemo(
    () =>
      commandes.filter((c) => {
        const s = String((c as any).statut ?? (c as any).Statut ?? "").toLowerCase();
        return s.startsWith("command");
      }),
    [commandes],
  );

  // Répartition des lots en stock par statut
  const distribution = useMemo(() => {
    const counts = { expired: 0, soon: 0, low: 0, ok: 0 };
    for (const r of siteRows) {
      if (r.qte <= 0) continue;
      if (r.status === "expired") counts.expired++;
      else if (r.status === "soon") counts.soon++;
      else if (r.status === "low") counts.low++;
      else counts.ok++;
    }
    const total = counts.expired + counts.soon + counts.low + counts.ok;
    return { counts, total };
  }, [siteRows]);

  const go = (tab: StockTabType) => () => onGoTo?.(tab);

  /* ---------- Rendu ---------- */
  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Chargement du tableau de bord…
      </div>
    );
  }

  const allClear =
    ruptures.length === 0 &&
    lowStock.length === 0 &&
    expiringLots.length === 0 &&
    pendingOrders.length === 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Tableau de bord du stock</h2>
          <p className="text-xs text-slate-500">
            Seuils : stock bas sous {LOW_STOCK} unités, péremption proche sous {EXPIRY_SOON_DAYS}{" "}
            jours.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={siteFilter === "all" ? "all" : String(siteFilter)}
            onChange={(e) =>
              setSiteFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 ${FOCUS}`}
            aria-label="Filtrer par site"
          >
            <option value="all">Tous les sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.libelle}
                {s.id === activeSiteId ? " (mon site)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer ${FOCUS}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Impossible de charger certaines données : {loadError}</span>
        </div>
      )}

      {/* Indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Tile
          tone="red"
          icon={PackageX}
          label="Ruptures"
          value={ruptures.length}
          hint="Produits sans stock utilisable"
          onClick={go("visualiser")}
        />
        <Tile
          tone="amber"
          icon={TrendingDown}
          label="Stock bas"
          value={lowStock.length}
          hint={`Produits sous ${LOW_STOCK} unités`}
          onClick={go("visualiser")}
        />
        <Tile
          tone="orange"
          icon={Clock}
          label="Lots à surveiller"
          value={expiringLots.length}
          hint={
            expiredCount > 0
              ? `dont ${expiredCount} déjà périmé${expiredCount > 1 ? "s" : ""}`
              : `Expirent sous ${EXPIRY_SOON_DAYS} jours`
          }
          onClick={go("visualiser")}
        />
        <Tile
          tone="blue"
          icon={ShoppingCart}
          label="Commandes à réceptionner"
          value={pendingOrders.length}
          hint="Commandées, pas encore reçues"
          onClick={go("commandes")}
        />
      </div>

      {allClear && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Rien d'urgent : aucun produit en rupture ou sous le seuil, aucun lot à surveiller, aucune
          commande en attente.
        </div>
      )}

      {/* Listes d'action */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* À réapprovisionner */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-800">À réapprovisionner</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {toRestock.length}
              </span>
            </div>
            <button
              type="button"
              onClick={go("commandes")}
              className={`inline-flex items-center gap-1 text-xs font-semibold text-asina-700 hover:underline cursor-pointer ${FOCUS}`}
            >
              Commander <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </header>
          {toRestock.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Aucun produit à réapprovisionner.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {toRestock.slice(0, LIST_SIZE).map((p) => (
                <li
                  key={p.produitId}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="truncate text-sm text-slate-800" title={p.nom}>
                    {p.nom}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                      p.usable === 0
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {p.usable === 0 ? "Rupture" : `${p.usable} restant${p.usable > 1 ? "s" : ""}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {toRestock.length > LIST_SIZE && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              + {toRestock.length - LIST_SIZE} autre{toRestock.length - LIST_SIZE > 1 ? "s" : ""}{" "}
              dans « Niveaux de Stocks ».
            </p>
          )}
        </section>

        {/* À écouler en priorité */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-bold text-slate-800">À écouler en priorité</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {expiringLots.length}
              </span>
            </div>
            <button
              type="button"
              onClick={go("visualiser")}
              className={`inline-flex items-center gap-1 text-xs font-semibold text-asina-700 hover:underline cursor-pointer ${FOCUS}`}
            >
              Voir les lots <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </header>
          {expiringLots.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Aucun lot proche de la péremption.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expiringLots.slice(0, LIST_SIZE).map((r, i) => (
                <li
                  key={`${r.siteId}-${r.lotId}-${i}`}
                  className={`flex items-center justify-between gap-3 border-l-4 px-4 py-2.5 ${
                    r.status === "expired" ? "border-l-red-500" : "border-l-orange-400"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800" title={r.produitNom}>
                      {r.produitNom}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      Lot {r.numLot || "—"} · {r.qte} u. · {r.siteLibelle}
                      {r.fournisseur ? ` · ${r.fournisseur}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-xs font-semibold ${r.status === "expired" ? "text-red-700" : "text-orange-700"}`}
                    >
                      {relativeExpiry(r.days)}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDate(r.datePeremption)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {expiringLots.length > LIST_SIZE && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              + {expiringLots.length - LIST_SIZE} autre
              {expiringLots.length - LIST_SIZE > 1 ? "s" : ""} lot
              {expiringLots.length - LIST_SIZE > 1 ? "s" : ""}.
            </p>
          )}
        </section>
      </div>

      {/* Répartition des lots par statut */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">État des lots en stock</h3>
          <span className="text-xs text-slate-500">
            ({distribution.total} lot{distribution.total > 1 ? "s" : ""})
          </span>
        </div>

        {distribution.total === 0 ? (
          <p className="text-sm text-slate-500">Aucun lot en stock.</p>
        ) : (
          <>
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label="Répartition des lots par statut"
            >
              {(
                [
                  ["expired", "bg-red-500"],
                  ["soon", "bg-orange-400"],
                  ["low", "bg-amber-400"],
                  ["ok", "bg-emerald-500"],
                ] as const
              ).map(([key, color]) => {
                const n = distribution.counts[key];
                return n > 0 ? (
                  <div
                    key={key}
                    className={color}
                    style={{ width: `${(n / distribution.total) * 100}%` }}
                  />
                ) : null;
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Expirés : <b>{distribution.counts.expired}</b>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                Expirent bientôt : <b>{distribution.counts.soon}</b>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Stock bas : <b>{distribution.counts.low}</b>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Conformes : <b>{distribution.counts.ok}</b>
              </li>
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default StockDashboardTab;
