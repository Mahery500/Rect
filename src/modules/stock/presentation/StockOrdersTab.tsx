/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { ShoppingCart, Truck, Plus, X } from "lucide-react";
import { ASINAState, Commande, Detail_Commande } from "@/core/types";
import { CommandBasketItem } from "../domain/stock.types";
import { useStock } from "../application/useStock";
import { FournisseurCreateForm } from "./FournisseurCreateForm";

export interface StockOrdersTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  activeSiteId: number;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export const StockOrdersTab: React.FC<StockOrdersTabProps> = ({
  state,
  updateState,
  activeSiteId,
  triggerNotification,
}) => {
  const {
    fournisseurs,
    fetchFournisseurs,
    produits,
    fetchProduits,
    commandes,
    fetchCommandes,
    createCommande,
    updateCommande,
    createAppro,
    fetchStock,
  } = useStock();

  useEffect(() => {
    fetchFournisseurs();
    fetchProduits();
    fetchCommandes();
  }, [fetchFournisseurs, fetchProduits, fetchCommandes]);

  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedSupplierId === null && fournisseurs.length > 0) {
      setSelectedSupplierId(fournisseurs[0].id);
    }
  }, [fournisseurs, selectedSupplierId]);

  // Site destinataire de la nouvelle commande (par défaut : site actif).
  const [selectedSiteId, setSelectedSiteId] = useState<number>(activeSiteId);

  const [commandBasket, setCommandBasket] = useState<CommandBasketItem[]>([]);
  const [basketProdId, setBasketProdId] = useState<number | null>(null);
  const [basketQte, setBasketQte] = useState<number>(100);

  useEffect(() => {
    if (basketProdId === null && produits.length > 0) {
      setBasketProdId(produits[0].id);
    }
  }, [produits, basketProdId]);

  const [lotExpiryToSet, setLotExpiryToSet] = useState("2028-12-31");

  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [receivingCommandeId, setReceivingCommandeId] = useState<number | null>(null);

  const handleAddProductToBasket = () => {
    if (basketProdId === null) {
      triggerNotification("error", "Aucun produit sélectionné.");
      return;
    }
    const existing = commandBasket.find((x) => x.Id_Produit === basketProdId);
    if (existing) {
      setCommandBasket(
        commandBasket.map((x) =>
          x.Id_Produit === basketProdId ? { ...x, qte: x.qte + basketQte } : x,
        ),
      );
    } else {
      setCommandBasket([...commandBasket, { Id_Produit: basketProdId, qte: basketQte }]);
    }
    triggerNotification("success", "Médicament ajouté au dossier de commande.");
  };

  const handleSupplierCreated = async () => {
    await fetchFournisseurs();
    setShowNewSupplierForm(false);
  };

  const handlePlaceOrder = async () => {
    if (commandBasket.length === 0) {
      triggerNotification("error", "Le panier de commande est vide.");
      return;
    }
    if (selectedSupplierId === null) {
      triggerNotification("error", "Sélectionne un fournisseur.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const response = await createCommande({
        siteId: selectedSiteId,
        fournisseurId: selectedSupplierId,
        statut: "Commandée",
        details: commandBasket.map((item) => ({
          produitId: item.Id_Produit,
          qte: item.qte,
        })),
      });

      const newCommand: Commande = {
        Id_Commande: response.id,
        DateC: response.dateC,
        Num: response.num,
        Statut: response.statut as Commande["Statut"],
        Id_Fournisseur: response.fournisseurId,
      };

      const newDetails: Detail_Commande[] = response.details.map((d) => ({
        Id_Detail_Commande: d.id,
        Qte: d.qte,
        Id_Produit: d.produitId,
        Id_Commande: response.id,
      }));

      updateState({
        Commande: [...state.Commande, newCommand],
        Detail_Commande: [...state.Detail_Commande, ...newDetails],
      });

      triggerNotification(
        "success",
        `Bon de commande ${response.num} transmis avec succès au fournisseur.`,
      );
      setCommandBasket([]);
    } catch (err) {
      triggerNotification("error", "Échec de la transmission du bon de commande.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Persiste la réception en un seul appel : POST /appro_resources.
  // Le stock entre dans le site de la commande (pas dans le site actif de
  // l'utilisateur). ApproProcessor crée un Lot par ligne avec un numéro généré
  // automatiquement, le DetailAppro correspondant, et incrémente le stock du
  // site (quantité convertie en comprimés). Ensuite la commande passe à 'Livrée'.
  const handleExecuteReceiving = async (cmd: Commande) => {
    const cmdDetails = state.Detail_Commande.filter((dc) => dc.Id_Commande === cmd.Id_Commande);
    if (cmdDetails.length === 0) {
      triggerNotification("error", "Aucune ligne de commande localisée.");
      return;
    }
    if (!lotExpiryToSet) {
      triggerNotification("error", "Merci de renseigner une date d'expiration.");
      return;
    }

    const commandeApi = commandes.find((c) => c.id === cmd.Id_Commande);
    const receivingSiteId = commandeApi?.siteId ?? selectedSiteId;

    setReceivingCommandeId(cmd.Id_Commande);
    try {
      await createAppro({
        commandeId: cmd.Id_Commande,
        fournisseurId: cmd.Id_Fournisseur,
        siteId: receivingSiteId,
        details: cmdDetails.map((dc) => ({
          produitId: dc.Id_Produit,
          datePeremption: lotExpiryToSet,
          qte: dc.Qte,
          unite: "boite" as const, // à adapter si la commande est en plaquettes/comprimés
        })),
      });

      const fournisseurId = cmd.Id_Fournisseur;
      const cmdDetailsPayload = cmdDetails.map((dc) => ({ produitId: dc.Id_Produit, qte: dc.Qte }));
      const updated = await updateCommande(cmd.Id_Commande, {
        num: cmd.Num,
        statut: "Livrée",
        siteId: receivingSiteId,
        fournisseurId,
        details: cmdDetailsPayload,
      });

      updateState({
        Commande: state.Commande.map((c) =>
          c.Id_Commande === cmd.Id_Commande
            ? { ...c, Statut: updated.statut as Commande["Statut"] }
            : c,
        ),
      });

      await fetchStock({ siteId: receivingSiteId });

      triggerNotification(
        "success",
        `Réception de la commande ${cmd.Num} finalisée. Lots créés et stock mis à jour.`,
      );
    } catch (err) {
      triggerNotification("error", "Échec de l'enregistrement de la réception.");
    } finally {
      setReceivingCommandeId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Create command */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingCart className="h-4.5 w-4.5 text-gray-500" />
          Brouillonner un Bon d'Achat
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Site destinataire</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded p-1.5"
            >
              {state.Site.map((s) => (
                <option key={s.Id_Site} value={s.Id_Site}>
                  {s.Libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-gray-700 font-semibold">Fournisseur attitré</label>
              <button
                type="button"
                onClick={() => setShowNewSupplierForm((v) => !v)}
                className="flex items-center gap-1 text-asina-600 hover:text-asina-700 font-semibold"
              >
                {showNewSupplierForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {showNewSupplierForm ? "Annuler" : "Nouveau fournisseur"}
              </button>
            </div>

            {showNewSupplierForm ? (
              <FournisseurCreateForm onCreated={handleSupplierCreated} />
            ) : (
              <select
                value={selectedSupplierId ?? ""}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded p-1.5"
              >
                {fournisseurs.map((f) => (
                  <option key={f.id ?? f.nom} value={f.id ?? ""}>
                    {f.nom}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Produit à réapprovisionner
            </label>
            <select
              value={basketProdId ?? ""}
              onChange={(e) => setBasketProdId(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded p-1.5"
            >
              {produits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomCommercial}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Quantité requise (Conditionnements)
            </label>
            <input
              type="number"
              value={basketQte}
              onChange={(e) => setBasketQte(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded p-1.5 font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleAddProductToBasket}
            className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded cursor-pointer transition"
          >
            Ajouter à la commande locale
          </button>

          {/* Basket list view */}
          {commandBasket.length > 0 && (
            <div className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2 mt-4">
              <span className="font-bold text-stone-700 block">Détails de la demande :</span>
              {commandBasket.map((item, idx) => {
                const pr = produits.find((x) => x.id === item.Id_Produit);
                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white border border-gray-200 p-1.5 rounded"
                  >
                    <span>{pr?.nomCommercial}</span>
                    <span className="font-mono font-bold text-gray-900">{item.qte} unités</span>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full bg-asina-600 hover:bg-asina-700 text-white py-2 text-xs font-bold rounded mt-2 cursor-pointer transition disabled:opacity-50"
              >
                {isPlacingOrder ? "Envoi en cours…" : "Transmettre le bon de commande"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Incoming shipments and receiving */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Truck className="h-4.5 w-4.5 text-asina-600" />
          Réceptions de Commandes en cours
        </h3>

        <div className="bg-gray-50 p-4 rounded-lg my-1 border border-gray-200 text-xs space-y-3">
          <div>
            <label className="block font-semibold text-gray-600 mb-1">Date d'Expiration</label>
            <input
              type="date"
              value={lotExpiryToSet}
              onChange={(e) => setLotExpiryToSet(e.target.value)}
              className="w-full bg-white p-1.5 rounded border border-gray-300"
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Les numéros de lot sont attribués automatiquement à la réception (ex. LOT-202609-00006).
          </p>
        </div>

        <div className="space-y-3">
          {state.Commande.filter((c) => c.Statut === "Commandée").map((cmd) => {
            const items = state.Detail_Commande.filter((dc) => dc.Id_Commande === cmd.Id_Commande);
            const suppFromApi = fournisseurs.find((f) => f.id === cmd.Id_Fournisseur);
            const suppFromState = state.Fournisseur?.find(
              (f) => f.Id_Fournisseur === cmd.Id_Fournisseur,
            );
            const supplierName = suppFromApi?.nom ?? suppFromState?.Nom ?? "—";
            const siteName = commandes.find((c) => c.id === cmd.Id_Commande)?.siteName ?? "—";
            const isReceiving = receivingCommandeId === cmd.Id_Commande;

            return (
              <div
                key={cmd.Id_Commande}
                className="p-4 rounded-xl border border-gray-200 bg-stone-50/50 flex justify-between items-center flex-wrap gap-4 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-gray-400">CMD: {cmd.Num}</span>
                  <h4 className="font-bold text-sm text-gray-900 mt-0.5">
                    Fournisseur : {supplierName}
                  </h4>
                  <p className="text-stone-500 text-[11px] font-medium mt-1">Site : {siteName}</p>
                  <p className="text-stone-500 text-[11px] font-medium">
                    Lignes commandées : {items.length} références
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteReceiving(cmd)}
                  disabled={isReceiving}
                  className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition disabled:opacity-50"
                >
                  {isReceiving ? "Enregistrement…" : "Enregistrer Livré (Faire entrer en stock)"}
                </button>
              </div>
            );
          })}

          {state.Commande.filter((c) => c.Statut === "Commandée").length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aucun ordre de commande fournisseur en cours d'acheminement.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockOrdersTab;
