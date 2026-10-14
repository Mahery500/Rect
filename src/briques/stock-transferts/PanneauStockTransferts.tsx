// stock-transferts/PanneauStockTransferts.tsx
import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { ModeAffichage } from "@/cerveau/permissions";
import { stockApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Badge, Bouton, Erreur, Modal, formatDate } from "../stock-commun/ui";
import type { StatutTransfert } from "../stock-commun/types";
import { useStockPermissions } from "@/assemblages/stock/useStockPermissions";
import { GardeAccesStock } from "@/assemblages/stock/GardeAccesStock";

const statuts: Record<StatutTransfert, { t: string; ton: "orange" | "vert" | "rouge" }> = {
  en_attente: { t: "En attente", ton: "orange" },
  valide: { t: "Validé", ton: "vert" },
  annule: { t: "Annulé", ton: "rouge" },
};

const FormulaireTransfert: React.FC<{ origineId: number; onTermine: () => void }> = ({
  origineId,
  onTermine,
}) => {
  const sites = useListe(stockApi.sites);
  const stocks = useListe(() => stockApi.niveaux(origineId), [origineId]);
  const [destId, setDestId] = useState<number | "">("");
  const [stockId, setStockId] = useState<number | "">("");
  const [quantite, setQuantite] = useState(1);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const ligne = stocks.items.find((s) => s.id === stockId);

  const valider = async () => {
    if (!destId) return setErreur("Choisissez le site de destination.");
    if (!ligne?.produitId || !ligne.lotId) return setErreur("Choisissez un lot.");
    if (quantite < 1 || quantite > ligne.quantite)
      return setErreur(`Quantité invalide (max ${ligne.quantite}).`);
    setOccupe(true);
    setErreur(null);
    try {
      await stockApi.creerTransfert({
        siteOrigineId: origineId,
        siteDestinationId: Number(destId),
        produitId: ligne.produitId,
        lotId: ligne.lotId,
        quantite,
      });
      onTermine();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="text-gray-600">Lot à transférer (site actif)</span>
        <select
          value={stockId}
          onChange={(e) => setStockId(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        >
          <option value="">— Choisir —</option>
          {stocks.items
            .filter((s) => s.quantite > 0)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.produitLibelle} · lot {s.lotNumero} · {s.quantite} cp
              </option>
            ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">Site de destination</span>
        <select
          value={destId}
          onChange={(e) => setDestId(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        >
          <option value="">— Choisir —</option>
          {sites.items
            .filter((s) => s.id !== origineId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">Quantité (comprimés)</span>
        <input
          type="number"
          min={1}
          value={quantite}
          onChange={(e) => setQuantite(Number(e.target.value))}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        />
      </label>
      <Erreur message={erreur} />
      <Bouton variante="primaire" disabled={occupe} onClick={valider}>
        Créer le transfert
      </Bouton>
    </div>
  );
};

export const PanneauStockTransferts: React.FC<{ mode: ModeAffichage; siteActifId?: number }> = ({
  mode,
  siteActifId,
}) => {
  const permissions = useStockPermissions();
  const { items, erreur, recharger } = useListe(stockApi.transferts);
  const [creation, setCreation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ← AJOUT : garde après TOUS les hooks, avant le rendu
  if (!permissions.peutGererTransferts) {
    return (
      <GardeAccesStock message="Seul un Gestionnaire de stock est habilité à créer ou valider des transferts inter-sites." />
    );
  }

  const editable = mode === "edition";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Transferts entre sites</h3>
        {editable && (
          <Bouton
            variante="primaire"
            disabled={!siteActifId}
            onClick={() => setCreation(true)}
            title={!siteActifId ? "Sélectionnez le site d’origine" : undefined}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Nouveau transfert
          </Bouton>
        )}
      </div>
      <Erreur message={erreur ?? message} />
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Origine → Destination</th>
              <th className="p-3">Produit</th>
              <th className="p-3">Lot</th>
              <th className="p-3 text-right">Qté</th>
              <th className="p-3">Statut</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{formatDate(t.dateTransfert)}</td>
                <td className="p-3">
                  {t.siteOrigineNom} → {t.siteDestinationNom}
                </td>
                <td className="p-3 font-medium">{t.produitNom}</td>
                <td className="p-3">{t.lotNumero ?? "—"}</td>
                <td className="p-3 text-right tabular-nums">{t.quantite}</td>
                <td className="p-3">
                  <Badge texte={statuts[t.statut]?.t ?? t.statut} ton={statuts[t.statut]?.ton} />
                </td>
                <td className="p-3">
                  {editable && t.statut === "en_attente" && (
                    <div className="flex gap-2 justify-end">
                      <Bouton
                        variante="primaire"
                        onClick={() => action(() => stockApi.validerTransfert(t.id))}
                      >
                        Valider
                      </Bouton>
                      <Bouton
                        variante="danger"
                        onClick={() =>
                          action(() => stockApi.annulerTransfert(t.id), "Annuler ce transfert ?")
                        }
                      >
                        Annuler
                      </Bouton>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Aucun transfert
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {creation && siteActifId && (
        <Modal titre="Nouveau transfert" onFermer={() => setCreation(false)}>
          <FormulaireTransfert
            origineId={siteActifId}
            onTermine={() => {
              setCreation(false);
              recharger();
            }}
          />
        </Modal>
      )}
    </div>
  );
};
export default PanneauStockTransferts;
