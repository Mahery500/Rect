// stock-ajustements/PanneauStockAjustements.tsx
import React, { useMemo, useState } from "react";
import {
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  Minus,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  ListChecks,
  Package,
  Calendar,
  Hash,
} from "lucide-react";
import type { ModeAffichage } from "@/cerveau/permissions";
import { stockApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Bouton, Erreur, formatDate } from "../stock-commun/ui";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1";
const CHAMP = `w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition ${FOCUS}`;

/* ------------------------------------------------------------------ *
 * Composants de tableau unifiés (mêmes que les autres panneaux)
 * ------------------------------------------------------------------ */
const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <th
    className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 ${className}`}
  >
    {children}
  </th>
);

const Td: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <td className={`px-4 py-3.5 align-middle text-gray-700 ${className}`}>{children}</td>;

const Tableau: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  </div>
);

const EtatVide: React.FC<{ colSpan: number; message: string; icone: React.ReactNode }> = ({
  colSpan,
  message,
  icone,
}) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="p-4 rounded-full bg-gray-50 ring-1 ring-gray-100 text-gray-400">
          {icone}
        </div>
        <p className="text-sm max-w-sm">{message}</p>
      </div>
    </td>
  </tr>
);

/* ------------------------------------------------------------------ *
 * Pastille d'écart
 * ------------------------------------------------------------------ */
const EcartBadge: React.FC<{ valeur: number; compact?: boolean }> = ({
  valeur,
  compact = false,
}) => {
  const zero = valeur === 0;
  const positif = valeur > 0;
  const couleur = zero
    ? "bg-gray-100 text-gray-700 ring-gray-200"
    : positif
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-red-50 text-red-800 ring-red-200";
  const Icone = zero ? Minus : positif ? TrendingUp : TrendingDown;
  const texte = zero ? "0" : `${positif ? "+" : ""}${valeur.toLocaleString("fr-FR")}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-semibold tabular-nums ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      } ${couleur}`}
    >
      <Icone className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
      {texte}
    </span>
  );
};

export const PanneauStockAjustements: React.FC<{ mode: ModeAffichage; siteActifId?: number }> = ({
  mode,
  siteActifId,
}) => {
  const historique = useListe(() => stockApi.ajustements(siteActifId), [siteActifId]);
  const stocks = useListe(
    () => (siteActifId ? stockApi.niveaux(siteActifId) : Promise.resolve([])),
    [siteActifId],
  );
  const types = useListe(stockApi.ajustementTypes);

  const [stockId, setStockId] = useState<number | "">("");
  const [typeId, setTypeId] = useState<number | "">("");
  const [comptee, setComptee] = useState<number | "">("");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  const editable = mode === "edition";
  const ligne = stocks.items.find((s) => s.id === stockId);
  const ecart = ligne && comptee !== "" ? comptee - ligne.quantite : null;

  /* ---------- KPI ---------- */
  const kpis = useMemo(() => {
    const totaux = historique.items.reduce(
      (acc, a) => {
        acc.total += 1;
        if (a.ecart > 0) acc.positifs += 1;
        else if (a.ecart < 0) acc.negatifs += 1;
        else acc.nuls += 1;
        return acc;
      },
      { total: 0, positifs: 0, negatifs: 0, nuls: 0 },
    );
    const dernier = historique.items[0]?.date ?? null;
    return { ...totaux, dernier };
  }, [historique.items]);

  /* ---------- Historique filtré ---------- */
  const historiqueFiltre = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return historique.items;
    return historique.items.filter((a) =>
      [a.produitNom ?? "", a.lotNumero ?? "", a.typeLibelle ?? "", a.motif ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [historique.items, recherche]);

  /* ---------- Validation ---------- */
  const valider = async () => {
    if (!siteActifId) return setErreur("Sélectionnez un site.");
    if (!ligne?.lotId) return setErreur("Choisissez un lot.");
    if (!typeId) return setErreur("Choisissez un type d'ajustement.");
    if (comptee === "" || comptee < 0) return setErreur("Quantité comptée invalide.");
    if (!motif.trim()) return setErreur("Le motif est obligatoire.");
    if (ecart !== 0 && !window.confirm(`Écart de ${ecart! > 0 ? "+" : ""}${ecart} cp. Confirmer ?`))
      return;
    setOccupe(true);
    setErreur(null);
    try {
      await stockApi.creerAjustement({
        siteId: siteActifId,
        lotId: ligne.lotId,
        typeId: Number(typeId),
        quantiteComptee: comptee,
        motif: motif.trim(),
      });
      setStockId("");
      setComptee("");
      setMotif("");
      setFeedback("Ajustement enregistré.");
      setTimeout(() => setFeedback(null), 3500);
      await Promise.all([historique.recharger(), stocks.recharger()]);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            Inventaires & Ajustements
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Corrigez les écarts entre le stock théorique et le comptage physique.
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <ListChecks className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none tabular-nums text-slate-800">
              {kpis.total}
            </span>
            <span className="mt-1.5 block text-sm font-medium text-gray-800">Ajustements</span>
            <span className="block text-xs text-gray-500">
              {kpis.dernier ? `Dernier le ${formatDate(kpis.dernier)}` : "Aucun pour le moment"}
            </span>
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none tabular-nums text-emerald-700">
              {kpis.positifs}
            </span>
            <span className="mt-1.5 block text-sm font-medium text-gray-800">Entrées</span>
            <span className="block text-xs text-gray-500">Écarts positifs</span>
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <TrendingDown className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none tabular-nums text-red-700">
              {kpis.negatifs}
            </span>
            <span className="mt-1.5 block text-sm font-medium text-gray-800">Sorties</span>
            <span className="block text-xs text-gray-500">Écarts négatifs</span>
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
            <Minus className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none tabular-nums text-gray-700">
              {kpis.nuls}
            </span>
            <span className="mt-1.5 block text-sm font-medium text-gray-800">Conformes</span>
            <span className="block text-xs text-gray-500">Écarts nuls</span>
          </span>
        </div>
      </div>

      {/* Bandeau feedback */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {feedback}
        </div>
      )}

      {/* Formulaire nouvel ajustement */}
      {editable && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="flex items-center gap-2 border-b border-gray-100 bg-gradient-to-r from-teal-50/60 to-white px-5 py-3">
            <Plus className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-gray-900">Nouvel ajustement</h4>
          </header>

          <div className="space-y-4 p-5">
            {!siteActifId && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Sélectionnez un site pour saisir un inventaire.</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="text-sm">
                <label htmlFor="aj-lot" className="mb-1 block font-medium text-gray-700">
                  Lot à ajuster
                </label>
                <select
                  id="aj-lot"
                  value={stockId}
                  onChange={(e) => setStockId(e.target.value ? Number(e.target.value) : "")}
                  disabled={!siteActifId}
                  className={`${CHAMP} disabled:bg-gray-50 disabled:text-gray-400`}
                >
                  <option value="">— Choisir un lot —</option>
                  {stocks.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.produitLibelle} · lot {s.lotNumero} · théorique {s.quantite}
                    </option>
                  ))}
                </select>
                {stocks.items.length === 0 && siteActifId && (
                  <p className="mt-1 text-xs text-gray-500">Aucun lot disponible sur ce site.</p>
                )}
              </div>

              <div className="text-sm">
                <label htmlFor="aj-type" className="mb-1 block font-medium text-gray-700">
                  Type d'ajustement
                </label>
                <select
                  id="aj-type"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : "")}
                  className={CHAMP}
                >
                  <option value="">— Choisir un type —</option>
                  {types.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.libelle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-sm">
                <label htmlFor="aj-qte" className="mb-1 block font-medium text-gray-700">
                  Quantité comptée
                </label>
                <input
                  id="aj-qte"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Ex. 42"
                  value={comptee}
                  onChange={(e) => setComptee(e.target.value === "" ? "" : Number(e.target.value))}
                  className={`${CHAMP} tabular-nums`}
                />
                {ligne && (
                  <p className="mt-1 text-xs text-gray-500">
                    Stock théorique :{" "}
                    <span className="font-medium text-gray-700 tabular-nums">{ligne.quantite}</span>
                  </p>
                )}
              </div>

              <div className="text-sm">
                <label htmlFor="aj-motif" className="mb-1 block font-medium text-gray-700">
                  Motif
                </label>
                <input
                  id="aj-motif"
                  placeholder="Ex. comptage du 12/10, flacons cassés"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className={CHAMP}
                />
              </div>
            </div>

            {/* Aperçu écart */}
            {ecart !== null && (
              <div
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  ecart === 0
                    ? "border-gray-200 bg-gray-50"
                    : ecart < 0
                      ? "border-red-200 bg-red-50"
                      : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    ecart === 0
                      ? "bg-gray-200 text-gray-600"
                      : ecart < 0
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {ecart === 0 ? (
                    <Minus className="h-4 w-4" />
                  ) : ecart < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 text-sm">
                  <div className="font-medium text-gray-900">
                    Écart : <EcartBadge valeur={ecart} />
                  </div>
                  <div className="text-xs text-gray-500">
                    Stock théorique : {ligne?.quantite} · Quantité comptée : {comptee}
                  </div>
                </div>
              </div>
            )}

            <Erreur message={erreur} />

            <div className="flex justify-end">
              <Bouton variante="primaire" disabled={occupe} onClick={valider}>
                {occupe ? "Enregistrement…" : "Enregistrer l'ajustement"}
              </Bouton>
            </div>
          </div>
        </section>
      )}

      {/* Historique */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">Historique des ajustements</h3>
          <div className="relative w-full max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher produit, lot, motif…"
              className={`${CHAMP} pl-9 pr-8`}
            />
            {recherche && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setRecherche("")}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700 ${FOCUS}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <Erreur message={historique.erreur} />

        <Tableau>
          <thead>
            <tr>
              <Th>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </span>
              </Th>
              <Th>Produit</Th>
              <Th>
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> Lot
                </span>
              </Th>
              <Th>Type</Th>
              <Th className="text-right">Écart</Th>
              <Th>Motif</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {historiqueFiltre.map((a) => (
              <tr key={a.id} className="hover:bg-teal-50/40 transition-colors">
                <Td className="whitespace-nowrap text-gray-600">{formatDate(a.date)}</Td>
                <Td className="font-medium text-gray-900">{a.produitNom}</Td>
                <Td>
                  {a.lotNumero ? (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                      {a.lotNumero}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td className="text-gray-700">{a.typeLibelle}</Td>
                <Td className="text-right">
                  <EcartBadge valeur={a.ecart} compact />
                </Td>
              </tr>
            ))}
            {historiqueFiltre.length === 0 && (
              <EtatVide
                colSpan={6}
                message={
                  recherche
                    ? "Aucun ajustement ne correspond à votre recherche."
                    : "Aucun ajustement enregistré pour ce site."
                }
                icone={<ClipboardCheck className="h-6 w-6" />}
              />
            )}
          </tbody>
        </Tableau>
      </section>
    </div>
  );
};

export default PanneauStockAjustements;
