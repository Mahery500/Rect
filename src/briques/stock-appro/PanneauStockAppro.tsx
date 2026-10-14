// stock-appro/PanneauStockAppro.tsx
import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, PackageCheck, Search, Trash2 } from "lucide-react";
import type { ModeAffichage } from "@/cerveau/permissions";
import { stockApi, messageErreur } from "../stock-commun/api";
import type { Appro } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Erreur, formatDate } from "../stock-commun/ui";
import { sansAccent } from "../stock-commun/commandes";
import { useStockPermissions } from "@/assemblages/stock/useStockPermissions";
import { GardeAccesStock } from "@/assemblages/stock/GardeAccesStock";

/**
 * Historique des réceptions (lecture seule).
 * Une réception se crée uniquement depuis l'onglet Commandes (« Réceptionner »).
 * Ici on consulte les réceptions passées et leurs lots ; la suppression reste possible en mode édition.
 */
export const PanneauStockAppro: React.FC<{ mode: ModeAffichage; siteActifId?: number }> = ({
  mode,
}) => {
  const permissions = useStockPermissions(); // ← AJOUT
  const { items, chargement, erreur, recharger } = useListe<Appro>(stockApi.appros);
  const [ouverts, setOuverts] = useState<number[]>([]);
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // ← AJOUT : garde
  if (!permissions.peutGererAppro) {
    return (
      <GardeAccesStock message="Seul un Gestionnaire de stock peut consulter et enregistrer les approvisionnements." />
    );
  }

  const editable = mode === "edition";

  const visibles = useMemo(() => {
    const q = sansAccent(recherche);
    return items
      .filter(
        (a) =>
          !q ||
          sansAccent(
            [
              a.numFac,
              a.fournisseurNom,
              a.commandeNum,
              ...a.details.map((d) => d.numLot ?? d.produitNom),
            ].join(" "),
          ).includes(q),
      )
      .sort((a, b) => (b.dateAppro ?? "").localeCompare(a.dateAppro ?? "") || b.id - a.id);
  }, [items, recherche]);

  const basculer = (id: number) =>
    setOuverts((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const supprimer = async (a: Appro) => {
    if (
      !window.confirm(
        `Supprimer la réception ${a.numFac ?? `#${a.id}`} ? Cette action peut modifier les niveaux de stock.`,
      )
    )
      return;
    setMessage(null);
    try {
      await stockApi.supprimerAppro(a.id);
      await recharger();
    } catch (e) {
      setMessage(messageErreur(e, "Suppression impossible (lots déjà utilisés ?)."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Historique des réceptions</h3>
          <p className="text-sm text-gray-500">
            {items.length} réception(s) · Pour en enregistrer une, utilisez « Réceptionner » dans
            l'onglet Commandes.
          </p>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Facture, fournisseur, lot, produit…"
            aria-label="Rechercher une réception"
            className="w-72 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          />
        </div>
      </div>

      <Erreur message={erreur ?? message} />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-10 p-3" />
              <th className="p-3">Réception</th>
              <th className="p-3">Fournisseur</th>
              <th className="p-3">Commande</th>
              <th className="p-3">Lots créés</th>
              {editable && <th className="p-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {chargement && (
              <tr>
                <td colSpan={editable ? 6 : 5} className="p-8 text-center text-gray-500">
                  Chargement des réceptions…
                </td>
              </tr>
            )}

            {!chargement &&
              visibles.map((a) => {
                const ouvert = ouverts.includes(a.id);
                return (
                  <React.Fragment key={a.id}>
                    <tr className="hover:bg-gray-50/60">
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => basculer(a.id)}
                          aria-expanded={ouvert}
                          aria-label={ouvert ? "Masquer le détail" : "Voir le détail"}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
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
                          {a.numFac ? `Facture ${a.numFac}` : `Réception #${a.id}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {a.dateAppro ? formatDate(a.dateAppro) : "—"}
                        </div>
                      </td>
                      <td className="p-3 text-gray-800">
                        {a.fournisseurNom ??
                          (a.fournisseurId ? `Fournisseur #${a.fournisseurId}` : "—")}
                      </td>
                      <td className="p-3">
                        {/* « Sans commande » : anciennes réceptions uniquement */}
                        {a.commandeNum ??
                          (a.commandeId ? (
                            `#${a.commandeId}`
                          ) : (
                            <span className="text-gray-400">Sans commande</span>
                          ))}
                      </td>
                      <td className="p-3 tabular-nums">{a.details.length}</td>
                      {editable && (
                        <td className="p-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => supprimer(a)}
                              aria-label="Supprimer"
                              className="rounded p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {ouvert && (
                      <tr className="bg-gray-50/70">
                        <td />
                        <td colSpan={editable ? 5 : 4} className="p-3">
                          {a.details.length === 0 ? (
                            <span className="text-gray-500">Aucun lot enregistré.</span>
                          ) : (
                            <table className="w-full max-w-3xl text-sm">
                              <thead className="text-left text-xs text-gray-500">
                                <tr>
                                  <th className="py-1 pr-4">Lot</th>
                                  <th className="py-1 pr-4">Produit</th>
                                  <th className="py-1 pr-4">Péremption</th>
                                  <th className="py-1 pr-4 text-right">Quantité</th>
                                  <th className="py-1 text-right">Prix</th>
                                </tr>
                              </thead>
                              <tbody>
                                {a.details.map((d) => (
                                  <tr key={d.id} className="border-t border-gray-200">
                                    <td className="py-1.5 pr-4 font-mono text-xs">
                                      {d.numLot ?? `Lot #${d.lotId}`}
                                    </td>
                                    <td className="py-1.5 pr-4 text-gray-800">
                                      {d.produitNom ?? "—"}
                                    </td>
                                    <td className="py-1.5 pr-4 tabular-nums">
                                      {d.datePeremption ? formatDate(d.datePeremption) : "—"}
                                    </td>
                                    <td className="py-1.5 pr-4 text-right tabular-nums">{d.qte}</td>
                                    <td className="py-1.5 text-right tabular-nums">
                                      {d.prix !== null && d.prix !== undefined ? (
                                        d.prix
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

            {!chargement && visibles.length === 0 && (
              <tr>
                <td colSpan={editable ? 6 : 5} className="px-4 py-12 text-center">
                  <PackageCheck className="mx-auto mb-2 h-6 w-6 text-gray-300" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-700">
                    {recherche
                      ? "Aucune réception ne correspond à cette recherche."
                      : "Aucune réception enregistrée."}
                  </p>
                  {!recherche && (
                    <p className="mt-1 text-sm text-gray-500">
                      Les réceptions apparaissent ici une fois une commande réceptionnée.
                    </p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default PanneauStockAppro;
