// stock-commun/FormulaireAppro.tsx
import React, { useState } from "react";
import { stockApi, messageErreur } from "../stock-commun/api";
import { Bouton, Erreur } from "../stock-commun/ui";
import type { Commande, UniteStock } from "../stock-commun/types";

/**
 * Réception d'une commande (entrée en stock). Une réception est toujours liée à une commande :
 * fournisseur et produits sont ceux de la commande, la quantité préremplie est le RESTE à recevoir
 * (commandé − déjà reçu).
 *
 * Quantités en boîtes, péremption obligatoire, prix facultatif.
 * Valider crée l'appro ; le serveur génère les numéros de lot et met à jour le stock du site.
 */

interface Ligne {
  cle: string;
  produitId: number;
  nom: string;
  unite: UniteStock;
  restant: number;
  dejaRecu: number;
  recu: string;
  peremption: string;
  prix: string;
}

const aujourdhuiIso = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

const champ = "w-full border border-gray-300 rounded-lg px-2 py-1.5 bg-white";

export const FormulaireAppro: React.FC<{
  siteId: number;
  commande: Commande;
  onTermine: () => void;
}> = ({ siteId, commande, onTermine }) => {
  const [numFac, setNumFac] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>(() =>
    commande.details.map((d) => {
      const dejaRecu = d.qteRecue ?? 0;
      const restant = Math.max(0, d.qte - dejaRecu);
      return {
        cle: `d${d.id}`,
        produitId: Number(d.produitId),
        nom: d.produitNom ?? `Produit #${d.produitId}`,
        // Anciennes commandes : unité absente côté serveur → on reçoit en boîtes.
        unite: (d.unite ?? "boite") as UniteStock,
        restant,
        dejaRecu,
        recu: String(restant),
        peremption: "",
        prix: "",
      };
    }),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const maj = (cle: string, c: Partial<Ligne>) =>
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...c } : l)));

  const totalRecu = lignes.reduce(
    (s, l) => (Number.isInteger(Number(l.recu)) && l.recu !== "" ? s + Number(l.recu) : s),
    0,
  );
  const totalRestant = lignes.reduce((s, l) => s + l.restant, 0);

  const valider = async () => {
    setErreur(null);

    const demain = aujourdhuiIso();
    const retenues: Ligne[] = [];

    for (const l of lignes) {
      const q = Number(l.recu);
      if (l.recu.trim() === "" || !Number.isInteger(q) || q < 0) {
        return setErreur(
          `« ${l.nom} » : la quantité reçue doit être un nombre entier de boîtes (0 si rien reçu).`,
        );
      }
      if (q === 0) continue;
      if (!l.peremption) return setErreur(`« ${l.nom} » : la date de péremption est obligatoire.`);
      if (l.peremption <= demain)
        return setErreur(
          `« ${l.nom} » : la date de péremption est déjà dépassée ou égale à aujourd'hui.`,
        );
      if (l.prix.trim() !== "" && !(Number(l.prix.replace(",", ".")) >= 0))
        return setErreur(`« ${l.nom} » : le prix est invalide.`);
      retenues.push(l);
    }

    if (retenues.length === 0) return setErreur("Saisissez au moins une quantité reçue.");

    setOccupe(true);
    try {
      await stockApi.creerAppro({
        numFac: numFac.trim() || null,
        commandeId: commande.id,
        fournisseurId: Number(commande.fournisseurId),
        siteId,
        details: retenues.map((l) => ({
          produitId: l.produitId,
          datePeremption: l.peremption,
          qte: Number(l.recu),
          unite: l.unite,
          prix: l.prix.trim() === "" ? null : Number(l.prix.replace(",", ".")),
        })),
      });
      onTermine();
    } catch (e) {
      setErreur(messageErreur(e, "La réception n'a pas pu être enregistrée."));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <p className="text-gray-600">
        Saisissez ce qui est réellement arrivé. Les numéros de lot sont générés automatiquement et
        le stock du site est mis à jour à la validation.
      </p>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-2">Produit</th>
              <th className="p-2 text-right">Reste à recevoir</th>
              <th className="p-2 w-28">Boîtes reçues</th>
              <th className="p-2 w-40">Péremption *</th>
              <th className="p-2 w-32">Prix / boîte</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const recu = Number(l.recu);
              const ecart = l.recu !== "" && Number.isInteger(recu) ? recu - l.restant : 0;
              return (
                <tr key={l.cle} className="border-t align-top">
                  <td className="p-2">
                    <span className="font-medium">{l.nom}</span>
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    {l.restant} {l.unite}
                    {l.dejaRecu > 0 && (
                      <span className="block text-xs text-gray-500">{l.dejaRecu} déjà reçu(s)</span>
                    )}
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={l.recu}
                      aria-label={`Boîtes reçues ${l.nom}`}
                      onChange={(e) => maj(l.cle, { recu: e.target.value })}
                      className={champ}
                    />
                    {ecart < 0 && (
                      <p className="text-xs text-amber-700 mt-1">{-ecart} manquant(s)</p>
                    )}
                    {ecart > 0 && <p className="text-xs text-amber-700 mt-1">{ecart} en plus</p>}
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      value={l.peremption}
                      aria-label={`Péremption ${l.nom}`}
                      onChange={(e) => maj(l.cle, { peremption: e.target.value })}
                      className={champ}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      inputMode="decimal"
                      value={l.prix}
                      placeholder="facultatif"
                      aria-label={`Prix ${l.nom}`}
                      onChange={(e) => maj(l.cle, { prix: e.target.value })}
                      className={champ}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-gray-50 font-medium">
              <td className="p-2">Total</td>
              <td className="p-2 text-right">{totalRestant}</td>
              <td className="p-2" colSpan={3}>
                {totalRecu} reçu(s)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <label className="block">
        <span className="font-medium text-gray-700">N° de facture (facultatif)</span>
        <input
          value={numFac}
          maxLength={50}
          onChange={(e) => setNumFac(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </label>

      <Erreur message={erreur} />
      <div className="flex justify-end">
        <Bouton variante="primaire" disabled={occupe} onClick={valider}>
          {occupe ? "Enregistrement…" : "Valider la réception"}
        </Bouton>
      </div>
    </div>
  );
};
