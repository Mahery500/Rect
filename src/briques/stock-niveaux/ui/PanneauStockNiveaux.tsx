/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Package,
  Search,
  AlertTriangle,
  RefreshCw,
  Building,
  ShieldAlert,
  Boxes,
  AlertCircle,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useStockNiveaux } from "../hooks/useStockNiveaux";

export interface PanneauStockNiveauxProps {
  mode?: ModeAffichage;
  siteIdActif?: number | null;
  siteActifId?: number | null;
}

export const PanneauStockNiveaux: React.FC<PanneauStockNiveauxProps> = ({
  mode = "lecture",
  siteIdActif,
  siteActifId,
}) => {
  const siteInitial = siteIdActif ?? siteActifId;
  const [siteSelectionne, setSiteSelectionne] = useState<string>(
    siteInitial ? String(siteInitial) : "",
  );
  const [recherche, setRecherche] = useState("");

  const { stocks, sites, nbRuptures, nbCritiques, quantiteTotale, chargement, erreur, rafraichir } =
    useStockNiveaux(siteSelectionne ? Number(siteSelectionne) : undefined);

  const stocksFiltres = stocks.filter((s) => {
    const term = recherche.toLowerCase().trim();
    if (!term) return true;
    return (
      s.produitLibelle.toLowerCase().includes(term) || s.siteLibelle.toLowerCase().includes(term)
    );
  });

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des autorisations nécessaires pour consulter les niveaux de stocks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Compteurs métriques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-600 flex items-center justify-between">
            <Boxes className="h-5 w-5 text-rose-600" />
            <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              Références
            </span>
          </div>
          <span className="block mt-2 font-bold font-mono text-2xl text-slate-900">
            {stocks.length}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
            Articles catalogués
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-emerald-600 flex items-center justify-between">
            <Package className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              Volume
            </span>
          </div>
          <span className="block mt-2 font-bold font-mono text-2xl text-slate-900">
            {quantiteTotale}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
            Unités physiques en stock
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-amber-600 flex items-center justify-between">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              Critiques
            </span>
          </div>
          <span className="block mt-2 font-bold font-mono text-2xl text-amber-600">
            {nbCritiques}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
            Stocks sous le seuil d'alerte
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-red-600 flex items-center justify-between">
            <AlertCircle className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
              Ruptures
            </span>
          </div>
          <span className="block mt-2 font-bold font-mono text-2xl text-red-600">{nbRuptures}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
            Produits épuisés (Qte = 0)
          </span>
        </div>
      </div>

      {/* Barre de filtrage */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-slate-400" />
          <select
            value={siteSelectionne}
            onChange={(e) => setSiteSelectionne(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden font-semibold"
          >
            <option value="">Tous les sites de stockage</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.libelle}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Filtrer produit ou site..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden pl-8 w-56"
            />
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            type="button"
            onClick={rafraichir}
            disabled={chargement}
            className="p-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {erreur && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Tableau des niveaux de stock */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5">Produit Pharmaceutique</th>
                <th className="p-3.5">Dépôt / Site</th>
                <th className="p-3.5 text-center">Quantité Disponible</th>
                <th className="p-3.5 text-right">Statut Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chargement && stocks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    Chargement des stocks en temps réel…
                  </td>
                </tr>
              ) : stocksFiltres.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Aucun niveau de stock trouvé pour les critères sélectionnés.
                  </td>
                </tr>
              ) : (
                stocksFiltres.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5 font-bold text-slate-900">{s.produitLibelle}</td>
                    <td className="p-3.5 text-slate-600">{s.siteLibelle}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-sm">
                      <span
                        className={
                          s.statut === "rupture"
                            ? "text-red-600"
                            : s.statut === "critique"
                              ? "text-amber-600"
                              : "text-slate-900"
                        }
                      >
                        {s.quantite}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                          s.statut === "rupture"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : s.statut === "critique"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {s.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
