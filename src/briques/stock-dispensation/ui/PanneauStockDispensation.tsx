/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ShoppingBag,
  User,
  Package,
  Plus,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Boxes,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useStockDispensation } from "../hooks/useStockDispensation";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import { useStockPermissions } from "@/assemblages/stock/useStockPermissions";
import { GardeAccesStock } from "@/assemblages/stock/GardeAccesStock";

export interface PanneauStockDispensationProps {
  mode?: ModeAffichage;
  siteIdActif?: number | null;
  siteActifId?: number | null;
}

export const PanneauStockDispensation: React.FC<PanneauStockDispensationProps> = ({
  mode = "edition",
  siteIdActif,
  siteActifId,
}) => {
  const permissions = useStockPermissions(); // ← AJOUT
  const siteActifEffectif = siteIdActif ?? siteActifId ?? null;
  const { patients, produits, chargement, dispensationEnCours, erreur, dispenser } =
    useStockDispensation(siteActifEffectif);

  const { notifierSucces, notifierErreur } = useNotifier();

  const [patientId, setPatientId] = useState("");
  const [produitId, setProduitId] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [commentaire, setCommentaire] = useState("");

  // ← AJOUT : garde APRÈS tous les hooks, AVANT la logique de rendu
  if (!permissions.peutDispenser) {
    return (
      <GardeAccesStock message="Seul un Dispensateur (ou un Administrateur) peut délivrer des médicaments au comptoir." />
    );
  }

  const estModifiable = mode === "edition";

  const produitSelectionne = produits.find((p) => String(p.id) === produitId);

  const handleDispenser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estModifiable || !patientId || !produitId) return;

    const qteNum = Number(quantite);
    if (isNaN(qteNum) || qteNum <= 0) {
      notifierErreur("La quantité délivrée doit être supérieure à 0.");
      return;
    }

    try {
      await dispenser({
        patientId: Number(patientId),
        produitId: Number(produitId),
        quantite: qteNum,
        commentaire: commentaire.trim() || undefined,
      });

      notifierSucces("Dispensation enregistrée et déstockage effectué.");
      setProduitId("");
      setQuantite("1");
      setCommentaire("");
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des autorisations nécessaires pour accéder à la dispensation.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête guichet */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Comptoir de Dispensation & Délivrance
          </h3>
          <p className="text-xs text-slate-500">
            Délivrance de produits avec déstockage immédiat tracé
          </p>
        </div>
      </div>

      {erreur && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Formulaire de dispensation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-sm font-bold text-slate-900">Nouvelle délivrance au patient</h4>
          <p className="text-xs text-slate-500">
            Sélectionnez le bénéficiaire et le médicament à dispenser
          </p>
        </div>

        <form onSubmit={handleDispenser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Patient bénéficiaire
              </label>
              <select
                required
                disabled={!estModifiable || dispensationEnCours}
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden"
              >
                <option value="">Sélectionner un patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomComplet} ({p.matricule})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Médicament / Dispositif
              </label>
              <select
                required
                disabled={!estModifiable || dispensationEnCours}
                value={produitId}
                onChange={(e) => setProduitId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden"
              >
                <option value="">Sélectionner un produit en stock...</option>
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomCommercial} — Stock disponible : {p.quantiteEnStock}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Quantité délivrée
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={!estModifiable || dispensationEnCours}
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold focus:outline-hidden"
              />
              {produitSelectionne && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Stock actuel : <strong>{produitSelectionne.quantiteEnStock}</strong>
                </span>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Commentaire / Posologie (optionnel)
              </label>
              <input
                type="text"
                disabled={!estModifiable || dispensationEnCours}
                placeholder="Ex: 1 comprimé matin et soir pendant 5 jours..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {estModifiable && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={!patientId || !produitId || dispensationEnCours}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {dispensationEnCours
                    ? "Délivrance en cours…"
                    : "Valider la délivrance et déstocker"}
                </span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
