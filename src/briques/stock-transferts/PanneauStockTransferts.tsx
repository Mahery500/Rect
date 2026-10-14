// stock-transferts/PanneauStockTransferts.tsx
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ModeAffichage } from '@/cerveau/permissions';
import { stockApi, refApi, messageErreur } from '../stock-commun/api';
import { useListe } from '../stock-commun/useListe';
import { Badge, Bouton, Erreur, Modal, formatDate } from '../stock-commun/ui';
import type { StatutTransfert } from '../stock-commun/types';
import { useStockPermissions } from '@/assemblages/stock/useStockPermissions';
import { GardeAccesStock } from '@/assemblages/stock/GardeAccesStock';

const statuts: Record<StatutTransfert, { t: string; ton: "orange" | "vert" | "rouge" }> = {
  en_attente: { t: "En attente", ton: "orange" },
  valide: { t: "Validé", ton: "vert" },
  annule: { t: "Annulé", ton: "rouge" },
};

/** « 33 boîtes + 10 u. » */
const enBoites = (unites: number, parBoite: number) => {
  const boites = Math.floor(unites / parBoite);
  const reste = unites % parBoite;
  return `${boites} boîte${boites > 1 ? 's' : ''}${reste ? ` + ${reste} u.` : ''}`;
};

const FormulaireTransfert: React.FC<{ origineId: number; onTermine: () => void }> = ({ origineId, onTermine }) => {
  const sites = useListe(stockApi.sites);
  const stocks = useListe(() => stockApi.niveaux(origineId), [origineId]);
  const produits = useListe(stockApi.produits);
  const conds = useListe(refApi.conditionnements.liste);
  const [destId, setDestId] = useState<number | ''>('');
  const [stockId, setStockId] = useState<number | ''>('');
  const [boites, setBoites] = useState('1');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  // Unités par boîte : valeur de l'API stocks si présente, sinon produit -> conditionnement
  const parBoiteDe = (produitId?: number, direct?: number | null): number => {
    if (Number(direct) > 0) return Number(direct);
    const p = produits.items.find((x) => x.id === produitId);
    const c = conds.items.find((x: any) => x.id === p?.conditionnementId);
    return Number((c as any)?.nbUnitesParBoite) || 0;
  };

  const ligne = stocks.items.find((s) => s.id === stockId);
  const parBoite = parBoiteDe(ligne?.produitId, ligne?.nbUnitesParBoite);
  const maxBoites = parBoite > 0 && ligne ? Math.floor(ligne.quantite / parBoite) : 0;
  const nb = Number(boites);

  const valider = async () => {
    if (!destId) return setErreur('Choisissez le site de destination.');
    if (!ligne?.produitId || !ligne.lotId) return setErreur('Choisissez un lot.');
    if (!(parBoite > 0)) return setErreur('Conditionnement inconnu pour ce produit : transfert en boîtes impossible.');
    if (!Number.isInteger(nb) || nb < 1) return setErreur('Indiquez un nombre entier de boîtes.');
    if (nb > maxBoites) return setErreur(`Stock insuffisant : ${maxBoites} boîte(s) complète(s) disponible(s).`);
    setOccupe(true);
    setErreur(null);
    try {
      await stockApi.creerTransfert({
        siteOrigineId: origineId, siteDestinationId: Number(destId),
        produitId: ligne.produitId, lotId: ligne.lotId, quantite: nb,
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
        <select value={stockId}
          onChange={(e) => { setStockId(e.target.value ? Number(e.target.value) : ''); setBoites('1'); }}
          className="mt-1 w-full border rounded-lg px-3 py-2">
          <option value="">— Choisir —</option>
          {stocks.items.filter((s) => s.quantite > 0).map((s) => {
            const pb = parBoiteDe(s.produitId, s.nbUnitesParBoite);
            return (
              <option key={s.id} value={s.id}>
                {s.produitLibelle} · lot {s.lotNumero ?? '—'} · {pb > 0 ? enBoites(s.quantite, pb) : `${s.quantite} u.`}
              </option>
            );
          })}
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
        <span className="text-gray-600">Quantité (boîtes)</span>
        <input type="number" min={1} step={1} max={maxBoites || undefined} value={boites}
          onChange={(e) => setBoites(e.target.value)} disabled={!ligne || !(parBoite > 0)}
          className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
        {ligne && parBoite > 0 && (
          <span className="mt-1 block text-xs text-gray-500">
            {parBoite} u. par boîte · disponible : {enBoites(ligne.quantite, parBoite)}
            {nb >= 1 && ` · transfert de ${nb * parBoite} u.`}
          </span>
        )}
        {ligne && !(parBoite > 0) && (
          <span className="mt-1 block text-xs text-amber-700">
            {produits.items.length === 0 || conds.items.length === 0
              ? 'Chargement du conditionnement…'
              : 'Ce produit n\'a pas de conditionnement : transfert en boîtes impossible.'}
          </span>
        )}
      </label>

      <Erreur message={erreur} />
      <Bouton variante="primaire" disabled={occupe} onClick={valider}>
        {occupe ? 'Transfert…' : 'Créer le transfert'}
      </Bouton>
    </div>
  );
};

export const PanneauStockTransferts: React.FC<{ mode: ModeAffichage; siteActifId?: number }> = ({ mode, siteActifId }) => {
  const permissions = useStockPermissions();
  const { items, erreur, recharger } = useListe(stockApi.transferts);
  const [creation, setCreation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
              <th className="p-3">Date</th><th className="p-3">Origine → Destination</th><th className="p-3">Produit</th>
              <th className="p-3">Lot</th><th className="p-3 text-right">Qté (unités)</th><th className="p-3">Statut</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{formatDate(t.dateTransfert)}</td>
                <td className="p-3">{t.siteOrigineNom} → {t.siteDestinationNom}</td>
                <td className="p-3 font-medium">{t.produitNom ?? '—'}</td>
                <td className="p-3">{t.lotNumero ?? '—'}</td>
                <td className="p-3 text-right tabular-nums">{t.quantite}</td>
                <td className="p-3"><Badge texte={statuts[t.statut]?.t ?? t.statut} ton={statuts[t.statut]?.ton} /></td>
                <td className="p-3">
                  {editable && t.statut === 'valide' && (
                    <div className="flex justify-end">
                      <Bouton variante="danger"
                        onClick={() => action(() => stockApi.annulerTransfert(t.id),
                          'Annuler ce transfert ? Le stock sera remis au site d’origine.')}>
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
