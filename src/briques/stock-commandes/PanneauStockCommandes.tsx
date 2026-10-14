// stock-commandes/PanneauStockCommandes.tsx
import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  Plus,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import type { ModeAffichage } from "@/cerveau/permissions";
import { stockApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Badge, Bouton, Erreur, Modal, formatDate } from "../stock-commun/ui";
import type { Commande, StatutCommande } from "../stock-commun/types";
import { FormulaireCommande } from "./FormulaireCommande";
import { FormulaireAppro } from "../stock-appro/FormulaireAppro";
import { PanneauFournisseurs } from "./PanneauFournisseurs";

type Vue = "commandes" | "fournisseurs";
type Ton = "gris" | "bleu" | "orange" | "vert" | "rouge";

const STATUTS: Record<StatutCommande, { t: string; ton: Ton }> = {
  brouillon: { t: "En attente", ton: "bleu" }, // ancienne valeur : traitée comme « en attente »
  envoyee: { t: "En attente", ton: "bleu" },
  partielle: { t: "Reçue partiellement", ton: "orange" },
  recue: { t: "Reçue", ton: "vert" },
  annulee: { t: "Annulée", ton: "rouge" },
};

/**
 * Il n'y a plus de brouillon : une commande enregistrée est « en attente » de livraison.
 * Le serveur peut renvoyer le statut sous plusieurs formes ("Commandée", "Livrée", vide…).
 * On le normalise ici ; un statut ABSENT ou « brouillon » (anciennes commandes) est traité
 * comme « en attente », pour que les actions (Réceptionner, Annuler) restent disponibles.
 */
const sansAccent = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function statutDe(c: Commande): StatutCommande {
  const brut = c as unknown as Record<string, unknown>;
  const s = sansAccent(brut.statut ?? brut.status ?? brut.statutLibelle ?? brut.etat);
  if (!s || s === "brouillon" || s === "draft") return "envoyee";
  if (s.includes("annul")) return "annulee";
  if (s.includes("partiel")) return "partielle";
  if (s.includes("livr") || s.includes("recue") || s === "recu") return "recue";
  return "envoyee"; // « commandée », « envoyée », « en attente », « en cours »…
}

type Filtre = "toutes" | "attente" | "recue" | "annulee";
const FILTRES: { id: Filtre; libelle: string; ok: (s: StatutCommande) => boolean }[] = [
  { id: "toutes", libelle: "Toutes", ok: () => true },
  { id: "attente", libelle: "En attente", ok: (s) => s === "envoyee" || s === "partielle" },
  { id: "recue", libelle: "Reçues", ok: (s) => s === "recue" },
  { id: "annulee", libelle: "Annulées", ok: (s) => s === "annulee" },
];

interface Ligne {
  c: Commande;
  statut: StatutCommande;
  commande: number;
  recu: number;
  produits: string[];
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1";

export const PanneauStockCommandes: React.FC<{ mode: ModeAffichage; siteActifId?: number }> = ({
  mode,
  siteActifId,
}) => {
  const [vue, setVue] = useState<Vue>("commandes");
  const { items, chargement, erreur, recharger } = useListe<Commande>(stockApi.commandes);
  const [creation, setCreation] = useState(false);
  const [aRecevoir, setARecevoir] = useState<Commande | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [recherche, setRecherche] = useState("");
  const [ouvertes, setOuvertes] = useState<Set<number>>(new Set());
  const editable = mode === "edition";

  const lignes = useMemo<Ligne[]>(() => {
    const base = siteActifId ? items.filter((c) => c.siteId === siteActifId) : items;
    return base
      .map((c) => {
        const statut = statutDe(c);
        const commande = c.details.reduce((s, d) => s + d.qte, 0);
        const recuBrut = c.details.reduce((s, d) => s + (d.qteRecue ?? 0), 0);
        // Commande « reçue » sans détail de réception : on la considère entièrement reçue.
        const recu = statut === "recue" && recuBrut === 0 ? commande : Math.min(recuBrut, commande);
        return {
          c,
          statut,
          commande,
          recu,
          produits: c.details.map((d) => d.produitNom ?? `Produit #${d.produitId}`),
        };
      })
      .sort((a, b) => (b.c.dateC ?? "").localeCompare(a.c.dateC ?? "") || b.c.id - a.c.id);
  }, [items, siteActifId]);

  const compteurs = useMemo(
    () =>
      Object.fromEntries(
        FILTRES.map((f) => [f.id, lignes.filter((l) => f.ok(l.statut)).length]),
      ) as Record<Filtre, number>,
    [lignes],
  );

  const visibles = useMemo(() => {
    const f = FILTRES.find((x) => x.id === filtre)!;
    const q = sansAccent(recherche);
    return lignes.filter((l) => {
      if (!f.ok(l.statut)) return false;
      if (!q) return true;
      return sansAccent(
        [l.c.num ?? `#${l.c.id}`, l.c.fournisseurNom ?? "", ...l.produits].join(" "),
      ).includes(q);
    });
  }, [lignes, filtre, recherche]);

  const action = async (fn: () => Promise<unknown>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setMessage(null);
    try {
      await fn();
      await recharger();
    } catch (e) {
      setMessage(messageErreur(e));
    }
  };

  const basculer = (id: number) =>
    setOuvertes((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onglets: { id: Vue; libelle: string; icone: React.ReactNode }[] = [
    { id: "commandes", libelle: "Commandes", icone: <ClipboardList className="w-4 h-4" /> },
    { id: "fournisseurs", libelle: "Fournisseurs", icone: <Truck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b" aria-label="Sections des commandes">
        {onglets.map((o) => (
          <button
            key={o.id}
            onClick={() => setVue(o.id)}
            aria-current={vue === o.id ? "page" : undefined}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px ${
              vue === o.id
                ? "border-teal-600 text-teal-800 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {o.icone}
            {o.libelle}
          </button>
        ))}
      </nav>

      {vue === "fournisseurs" && <PanneauFournisseurs editable={editable} />}

      {vue === "commandes" && (
        <>
          {/* En-tête */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Commandes fournisseurs</h3>
              <p className="text-sm text-gray-500">
                {compteurs.attente} en attente · {compteurs.recue} reçue(s) · {compteurs.toutes} au
                total
              </p>
            </div>
            {editable && (
              <div className="flex gap-2">
                <Bouton
                  variante="primaire"
                  onClick={() => setCreation(true)}
                  disabled={!siteActifId}
                  title={!siteActifId ? "Sélectionnez un site" : undefined}
                >
                  <Plus className="w-4 h-4 inline mr-1.5" />
                  Nouvelle commande
                </Bouton>
              </div>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
              {FILTRES.map((f) => {
                const actif = filtre === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setFiltre(f.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${FOCUS} ${
                      actif
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {f.libelle}
                    <span
                      className={`ml-2 tabular-nums ${actif ? "text-white/80" : "text-gray-400"}`}
                    >
                      {compteurs[f.id]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="N°, fournisseur ou produit"
                aria-label="Rechercher une commande"
                className={`w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm ${FOCUS}`}
              />
            </div>
          </div>

          <Erreur message={erreur ?? message} />

          {/* Tableau */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-10 p-3" />
                  <th className="p-3">Commande</th>
                  <th className="p-3">Fournisseur</th>
                  <th className="p-3">Produits</th>
                  <th className="p-3">Avancement</th>
                  <th className="p-3">Statut</th>
                  {editable && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chargement && (
                  <tr>
                    <td colSpan={editable ? 7 : 6} className="p-8 text-center text-gray-500">
                      Chargement des commandes…
                    </td>
                  </tr>
                )}

                {!chargement &&
                  visibles.map(({ c, statut, commande, recu, produits }) => {
                    const meta = STATUTS[statut];
                    const ouvert = ouvertes.has(c.id);
                    const pct = commande > 0 ? Math.round((recu / commande) * 100) : 0;
                    const apercu = produits.slice(0, 2).join(", ");
                    const reste = produits.length - 2;
                    return (
                      <React.Fragment key={c.id}>
                        <tr className="hover:bg-gray-50/60 align-middle">
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => basculer(c.id)}
                              aria-expanded={ouvert}
                              aria-label={ouvert ? "Masquer le détail" : "Voir le détail"}
                              className={`rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 ${FOCUS}`}
                            >
                              {ouvert ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-gray-900">
                              {c.num ?? `Commande #${c.id}`}
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(c.dateC)}</div>
                          </td>
                          <td className="p-3 text-gray-800">
                            {c.fournisseurNom ?? `Fournisseur #${c.fournisseurId}`}
                          </td>
                          <td className="p-3 max-w-[260px]">
                            <div className="truncate text-gray-800" title={produits.join(", ")}>
                              {apercu || "—"}
                            </div>
                            {reste > 0 && (
                              <div className="text-xs text-gray-500">+ {reste} autre(s)</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="w-36">
                              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full ${pct >= 100 ? "bg-emerald-500" : "bg-teal-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="mt-1 text-xs tabular-nums text-gray-500">
                                {recu} / {commande} boîtes
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge texte={meta.t} ton={meta.ton} />
                          </td>
                          {editable && (
                            <td className="p-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                {(statut === "envoyee" || statut === "partielle") && (
                                  <Bouton variante="primaire" onClick={() => setARecevoir(c)}>
                                    <PackageCheck className="mr-1 inline h-3.5 w-3.5" />
                                    Réceptionner
                                  </Bouton>
                                )}
                                {statut === "envoyee" && (
                                  <Bouton
                                    variante="danger"
                                    onClick={() =>
                                      action(
                                        () => stockApi.annulerCommande(c.id),
                                        "Annuler cette commande ?",
                                      )
                                    }
                                  >
                                    <XCircle className="mr-1 inline h-3.5 w-3.5" />
                                    Annuler
                                  </Bouton>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {ouvert && (
                          <tr className="bg-gray-50/70">
                            <td />
                            <td colSpan={editable ? 6 : 5} className="p-3">
                              <table className="w-full max-w-2xl text-sm">
                                <thead className="text-left text-xs text-gray-500">
                                  <tr>
                                    <th className="py-1 pr-4">Produit</th>
                                    <th className="py-1 pr-4 text-right">Commandé</th>
                                    <th className="py-1 pr-4 text-right">Reçu</th>
                                    <th className="py-1 text-right">Reste</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.details.map((d) => {
                                    const recuLigne =
                                      statut === "recue" && !d.qteRecue ? d.qte : (d.qteRecue ?? 0);
                                    return (
                                      <tr key={d.id} className="border-t border-gray-200">
                                        <td className="py-1.5 pr-4 text-gray-800">
                                          {d.produitNom ?? `Produit #${d.produitId}`}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right tabular-nums">
                                          {d.qte} {d.unite}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right tabular-nums">
                                          {recuLigne}
                                        </td>
                                        <td className="py-1.5 text-right tabular-nums">
                                          {Math.max(0, d.qte - recuLigne)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                {!chargement && visibles.length === 0 && (
                  <tr>
                    <td colSpan={editable ? 7 : 6} className="px-4 py-12 text-center">
                      <p className="text-sm font-medium text-gray-700">
                        {lignes.length === 0
                          ? "Aucune commande pour le moment."
                          : "Aucune commande ne correspond à ce filtre."}
                      </p>
                      {lignes.length === 0 && editable && siteActifId && (
                        <Bouton
                          variante="primaire"
                          className="mt-3"
                          onClick={() => setCreation(true)}
                        >
                          <Plus className="w-4 h-4 inline mr-1.5" />
                          Créer la première commande
                        </Bouton>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {creation && siteActifId && (
        <Modal titre="Nouvelle commande" onFermer={() => setCreation(false)} large>
          <FormulaireCommande
            siteId={siteActifId}
            onAllerFournisseurs={() => {
              setCreation(false);
              setVue("fournisseurs");
            }}
            onTermine={() => {
              setCreation(false);
              recharger();
            }}
          />
        </Modal>
      )}
      {aRecevoir && (
        <Modal
          titre={`Réception de la commande ${aRecevoir.num ?? `#${aRecevoir.id}`}`}
          onFermer={() => setARecevoir(null)}
          large
        >
          <FormulaireAppro
            siteId={aRecevoir.siteId}
            commande={aRecevoir}
            onTermine={() => {
              setARecevoir(null);
              recharger();
            }}
          />
        </Modal>
      )}
    </div>
  );
};
export default PanneauStockCommandes;
