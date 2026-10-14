/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Boxes,
  Truck,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { usePharmacieCatalogue } from "../hooks/usePharmacieCatalogue";
import { FormulaireProduitModale } from "./FormulaireProduitModale";
import { ProduitPharmacie } from "../modele/pharmacie-catalogue.types";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";

export interface PanneauPharmacieCatalogueProps {
  mode?: ModeAffichage;
}

export const PanneauPharmacieCatalogue: React.FC<PanneauPharmacieCatalogueProps> = ({
  mode = "edition",
}) => {
  const {
    produits,
    medicaments,
    fournisseurs,
    conditionnements,
    principesActifs,
    chargement,
    erreur,
    creerProduit,
    modifierProduit,
    rafraichir,
  } = usePharmacieCatalogue();

  const { notifierSucces, notifierErreur } = useNotifier();

  const [recherche, setRecherche] = useState("");
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [produitEnEdition, setProduitEnEdition] = useState<ProduitPharmacie | null>(null);

  const estModifiable = mode === "edition";

  const produitsFiltres = produits.filter((p) => {
    const term = recherche.toLowerCase().trim();
    if (!term) return true;
    return (
      p.nomCommercial.toLowerCase().includes(term) ||
      (p.conditionnementLibelle && p.conditionnementLibelle.toLowerCase().includes(term))
    );
  });

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des autorisations requises pour consulter le catalogue pharmaceutique.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre de contrôle et recherche */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Catalogue Médicaments & Produits ({produits.length})
            </h3>
            <p className="text-xs text-slate-500">
              {medicaments.length} formes galéniques référencées · {fournisseurs.length}{" "}
              fournisseurs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un produit..."
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

          {estModifiable && (
            <button
              type="button"
              onClick={() => {
                setProduitEnEdition(null);
                setModaleOuverte(true);
              }}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau produit</span>
            </button>
          )}
        </div>
      </div>

      {erreur && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Tableau du catalogue */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5">Réf ID</th>
                <th className="p-3.5">Nom Commercial</th>
                <th className="p-3.5">Médicament / Forme</th>
                <th className="p-3.5">Conditionnement</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chargement && produits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Chargement du catalogue pharmaceutique…
                  </td>
                </tr>
              ) : produitsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Aucun produit trouvé dans le catalogue.
                  </td>
                </tr>
              ) : (
                produitsFiltres.map((p) => {
                  const med = medicaments.find((m) => m.id === p.medicamentId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5 font-mono text-slate-400 font-bold">#{p.id}</td>
                      <td className="p-3.5 font-bold text-slate-900">{p.nomCommercial}</td>
                      <td className="p-3.5 text-slate-600">
                        {med
                          ? `${med.familleLibelle || "Famille"} · ${med.presentationLibelle || med.presentationCode || ""}`
                          : `Médicament #${p.medicamentId}`}
                      </td>
                      <td className="p-3.5 text-slate-500">{p.conditionnementLibelle || "—"}</td>
                      <td className="p-3.5 text-right">
                        {estModifiable && (
                          <button
                            type="button"
                            onClick={() => {
                              setProduitEnEdition(p);
                              setModaleOuverte(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale d'édition / création */}
      {modaleOuverte && (
        <FormulaireProduitModale
          ouvert={modaleOuverte}
          surFermeture={() => setModaleOuverte(false)}
          produitExistant={produitEnEdition}
          medicaments={medicaments}
          conditionnements={conditionnements}
          principesActifs={principesActifs}
          surSoumettre={async (input) => {
            try {
              if (produitEnEdition) {
                await modifierProduit(produitEnEdition.id, input);
                notifierSucces("Produit modifié avec succès.");
              } else {
                await creerProduit(input);
                notifierSucces("Nouveau produit créé avec succès.");
              }
            } catch (err) {
              notifierErreur(extraireMessageErreur(err));
              throw err;
            }
          }}
        />
      )}
    </div>
  );
};
