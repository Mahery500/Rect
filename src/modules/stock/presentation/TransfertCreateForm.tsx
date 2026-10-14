/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  Check,
  Loader2,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { useStock } from "../application/useStock";
import type { TransfertRequest } from "../infrastructure/transferts.repository";

/* -------------------------------------------------------------------------
 * Types locaux : le parent adapte ses ressources API vers ces formes simples.
 * ---------------------------------------------------------------------- */
export interface SiteOption {
  id: number;
  name: string;
}

export interface ProduitOption {
  id: number;
  nomCommercial: string;
}

/** Une ligne de stock (une quantité d'un lot sur un site), en comprimés. */
export interface StockLine {
  siteId: number;
  produitId: number;
  lotId: number;
  numLot: string;
  datePeremption: string | null; // "2028-12-31"
  qte: number;
}

export interface TransfertCreateFormProps {
  onCreated: () => void;
  sites: SiteOption[];
  produits: ProduitOption[];
  stocks: StockLine[];
}

/* ---------- Dates : comparaison en heure locale, sans décalage UTC ---------- */
const todayStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// "2028-12-31" (ou "2028-12-31T00:00:00+00:00") < aujourd'hui ?
const isExpired = (iso: string | null) => !!iso && iso.slice(0, 10) < todayStr();

const formatDate = (iso: string | null) => {
  if (!iso) return "sans péremption";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
};

// Tri FEFO : péremption la plus proche d'abord, sans péremption en dernier
const byExpiry = (a: StockLine, b: StockLine) =>
  (a.datePeremption ?? "9999").localeCompare(b.datePeremption ?? "9999");

export const TransfertCreateForm: React.FC<TransfertCreateFormProps> = ({
  onCreated,
  sites,
  produits,
  stocks,
}) => {
  const { createTransfert, triggerNotification } = useStock();

  const [origineId, setOrigineId] = useState<number | "">("");
  const [destinationId, setDestinationId] = useState<number | "">("");
  const [produitId, setProduitId] = useState<number | "">("");
  const [lotId, setLotId] = useState<number | "">("");
  const [quantite, setQuantite] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Dérivés ---------- */
  const stockOrigine = useMemo(
    () => (origineId === "" ? [] : stocks.filter((s) => s.siteId === origineId && s.qte > 0)),
    [stocks, origineId],
  );

  const produitsDispos = useMemo(() => {
    const ids = new Set(stockOrigine.map((s) => s.produitId));
    return produits.filter((p) => ids.has(p.id));
  }, [produits, stockOrigine]);

  // Lots du produit choisi, les plus proches de la péremption d'abord (FEFO)
  const lotsDispos = useMemo(
    () =>
      produitId === "" ? [] : stockOrigine.filter((s) => s.produitId === produitId).sort(byExpiry),
    [stockOrigine, produitId],
  );

  const lotChoisi = lotsDispos.find((s) => s.lotId === lotId) ?? null;
  const maxQte = lotChoisi && !isExpired(lotChoisi.datePeremption) ? lotChoisi.qte : 0;

  const nameOf = (id: number | "", list: SiteOption[]) =>
    list.find((s) => s.id === id)?.name ?? null;
  const origineName = nameOf(origineId, sites);
  const destinationName = nameOf(destinationId, sites);
  const produitName = produits.find((p) => p.id === produitId)?.nomCommercial ?? null;
  const qte = Number(quantite);

  /* ---------- Actions ---------- */
  const touch = () => setFormError(null);

  const changeOrigine = (v: number | "") => {
    touch();
    setOrigineId(v);
    setProduitId("");
    setLotId("");
    setQuantite("");
    if (v !== "" && v === destinationId) setDestinationId("");
  };

  const changeProduit = (v: number | "") => {
    touch();
    setProduitId(v);
    setQuantite("");
    // Lot par défaut : le non périmé le plus proche de la péremption (FEFO)
    const premier =
      v === ""
        ? undefined
        : stockOrigine
            .filter((s) => s.produitId === v && !isExpired(s.datePeremption))
            .sort(byExpiry)[0];
    setLotId(premier ? premier.lotId : "");
  };

  const swapSites = () => {
    touch();
    const o = origineId;
    setOrigineId(destinationId);
    setDestinationId(o);
    setProduitId("");
    setLotId("");
    setQuantite("");
  };

  const resetForm = () => {
    setOrigineId("");
    setDestinationId("");
    setProduitId("");
    setLotId("");
    setQuantite("");
    setFormError(null);
  };

  const validate = (): string | null => {
    if (origineId === "") return "Choisissez le site d'origine.";
    if (destinationId === "") return "Choisissez le site de destination.";
    if (origineId === destinationId) return "L'origine et la destination doivent être différentes.";
    if (produitId === "") return "Choisissez un produit.";
    if (lotId === "") return "Choisissez un lot.";
    if (lotChoisi && isExpired(lotChoisi.datePeremption)) return "Ce lot est périmé.";
    if (!Number.isInteger(qte) || qte <= 0) return "La quantité doit être un entier positif.";
    if (qte > maxQte) return `Stock insuffisant : ${maxQte} disponible(s) sur ${origineName}.`;
    return null;
  };

  const isReady = validate() === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      triggerNotification("error", err);
      return;
    }

    const payload: TransfertRequest = {
      siteOrigineId: origineId as number,
      siteDestinationId: destinationId as number,
      lotId: lotId as number,
      qte,
      unite: "comprime", // le formulaire saisit en comprimés
    };

    setSubmitting(true);
    try {
      await createTransfert(payload);
      triggerNotification("success", "Transfert créé avec succès.");
      resetForm();
      onCreated();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "Échec de la création du transfert.";
      setFormError(msg);
      triggerNotification("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Styles ---------- */
  const fieldCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 " +
    "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 " +
    "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  const sectionHeader = (icon: React.ReactNode, title: string, hint: string) => (
    <div className="flex items-start gap-3 mb-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
        {icon}
      </span>
      <div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
    </div>
  );

  const checks = [
    {
      ok: origineId !== "" && destinationId !== "" && origineId !== destinationId,
      label: "Deux sites différents",
    },
    { ok: produitId !== "", label: "Produit choisi" },
    { ok: lotId !== "", label: "Lot choisi" },
    { ok: Number.isInteger(qte) && qte > 0 && qte <= maxQte, label: "Quantité disponible" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50/70 to-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white">
          <ArrowLeftRight className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Nouveau transfert</h3>
          <p className="text-sm text-gray-500">Déplacez du stock d'un site vers un autre.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-7">
          {/* Sites */}
          <section>
            {sectionHeader(
              <MapPin className="h-4 w-4" />,
              "Sites",
              "Le stock est prélevé sur le site d’origine.",
            )}

            <div className="space-y-2">
              <div>
                <label htmlFor="tr-origine" className={labelCls}>
                  Site d'origine
                </label>
                <select
                  id="tr-origine"
                  value={origineId}
                  onChange={(e) => changeOrigine(e.target.value ? Number(e.target.value) : "")}
                  className={fieldCls}
                >
                  <option value="">Sélectionner…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={swapSites}
                  disabled={origineId === "" && destinationId === ""}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-cyan-300 hover:text-cyan-700 hover:bg-cyan-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Inverser
                </button>
              </div>

              <div>
                <label htmlFor="tr-destination" className={labelCls}>
                  Site de destination
                </label>
                <select
                  id="tr-destination"
                  value={destinationId}
                  onChange={(e) => {
                    touch();
                    setDestinationId(e.target.value ? Number(e.target.value) : "");
                  }}
                  className={fieldCls}
                >
                  <option value="">Sélectionner…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === origineId}>
                      {s.name}
                      {s.id === origineId ? " (origine)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* Produit / lot / quantité */}
          <section>
            {sectionHeader(
              <Boxes className="h-4 w-4" />,
              "Produit et quantité",
              "Seuls les produits en stock sur le site d’origine sont proposés.",
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="tr-produit" className={labelCls}>
                  Produit
                </label>
                <select
                  id="tr-produit"
                  value={produitId}
                  disabled={origineId === ""}
                  onChange={(e) => changeProduit(e.target.value ? Number(e.target.value) : "")}
                  className={fieldCls}
                >
                  <option value="">
                    {origineId === ""
                      ? "Choisissez d'abord l'origine"
                      : produitsDispos.length
                        ? "Sélectionner…"
                        : "Aucun stock sur ce site"}
                  </option>
                  {produitsDispos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nomCommercial}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tr-lot" className={labelCls}>
                  Lot
                </label>
                <select
                  id="tr-lot"
                  value={lotId}
                  disabled={produitId === ""}
                  onChange={(e) => {
                    touch();
                    setLotId(e.target.value ? Number(e.target.value) : "");
                    setQuantite("");
                  }}
                  className={fieldCls}
                >
                  <option value="">Sélectionner un lot…</option>
                  {lotsDispos.map((l) => {
                    const expired = isExpired(l.datePeremption);
                    return (
                      <option key={l.lotId} value={l.lotId} disabled={expired}>
                        {l.numLot} · exp. {formatDate(l.datePeremption)} · {l.qte} en stock
                        {expired ? " (périmé)" : ""}
                      </option>
                    );
                  })}
                </select>
                {produitId !== "" &&
                  lotsDispos.length > 0 &&
                  lotsDispos.every((l) => isExpired(l.datePeremption)) && (
                    <p className="mt-1 text-xs text-red-600">
                      Tous les lots de ce produit sont périmés.
                    </p>
                  )}
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="tr-qte" className={labelCls}>
                    Quantité
                  </label>
                  {lotId !== "" && (
                    <span className="text-xs text-gray-500 mb-1">
                      Disponible :{" "}
                      <span className="font-mono tabular-nums text-gray-700">{maxQte}</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    id="tr-qte"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxQte || undefined}
                    step={1}
                    value={quantite}
                    disabled={lotId === "" || maxQte === 0}
                    onChange={(e) => {
                      touch();
                      setQuantite(e.target.value);
                    }}
                    placeholder="Ex : 100"
                    className={`${fieldCls} font-mono tabular-nums text-right`}
                  />
                  <button
                    type="button"
                    disabled={maxQte === 0}
                    onClick={() => {
                      touch();
                      setQuantite(String(maxQte));
                    }}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:border-cyan-300 hover:text-cyan-700 hover:bg-cyan-50 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Tout
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Quantité en unités de stock (comprimés).
                </p>
              </div>
            </div>
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

        {/* Aperçu + actions */}
        <aside className="border-t border-gray-100 bg-gray-50/60 p-5">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Aperçu</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Ce qui sera enregistré, en attente de validation.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`flex-1 truncate rounded-lg px-3 py-2 text-center ${origineName ? "bg-cyan-50 text-cyan-800 font-medium" : "bg-gray-50 text-gray-400"}`}
                >
                  {origineName ?? "Origine"}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                <span
                  className={`flex-1 truncate rounded-lg px-3 py-2 text-center ${destinationName ? "bg-cyan-50 text-cyan-800 font-medium" : "bg-gray-50 text-gray-400"}`}
                >
                  {destinationName ?? "Destination"}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-baseline justify-between gap-3 text-sm">
                <span className={produitName ? "text-gray-800" : "text-gray-400"}>
                  {produitName ?? "Aucun produit"}
                  {lotChoisi && (
                    <span className="block text-xs text-gray-500">
                      {lotChoisi.numLot} · exp. {formatDate(lotChoisi.datePeremption)}
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums text-gray-700 whitespace-nowrap">
                  {qte > 0 ? `${qte} u.` : "—"}
                </span>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs" aria-label="Avancement">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={`flex items-center gap-2 ${c.ok ? "text-cyan-800" : "text-gray-500"}`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full ${c.ok ? "bg-cyan-600 text-white" : "border border-gray-300"}`}
                  >
                    {c.ok && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {c.label}
                </li>
              ))}
            </ul>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
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
                {submitting ? "Création en cours…" : "Créer le transfert"}
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default TransfertCreateForm;
