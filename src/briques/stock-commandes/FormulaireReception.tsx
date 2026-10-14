// stock-commandes/FormulaireReception.tsx
import React, { useState } from "react";
import { stockApi, messageErreur } from "../stock-commun/api";
import { Bouton, Erreur } from "../stock-commun/ui";
import type { Commande, UniteStock } from "../stock-commun/types";

interface Saisie {
  qte: string;
  unite: UniteStock;
  datePeremption: string;
}

const champ = "border border-slate-300 rounded-lg p-2 text-xs w-full bg-white";

export const FormulaireReception: React.FC<{ commande: Commande; onTermine: () => void }> = ({
  commande,
  onTermine,
}) => {
  // Pré-remplit avec le reste à recevoir
  const [saisies, setSaisies] = useState<Record<number, Saisie>>(() =>
    Object.fromEntries(
      commande.details.map((d) => [
        d.id,
        { qte: String(Math.max(d.qte - (d.qteRecue ?? 0), 0)), unite: d.unite, datePeremption: "" },
      ]),
    ),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const maj = (id: number, patch: Partial<Saisie>) =>
    setSaisies((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    const actives = commande.details.filter((d) => Number(saisies[d.id]?.qte) > 0);
    if (actives.length === 0) return setErreur("Saisissez au moins une quantité reçue.");

    setEnvoi(true);
    setErreur(null);
    try {
      await stockApi.recevoirCommande(
        commande.id,
        actives.map((d) => {
          const s = saisies[d.id];
          return {
            detailId: d.id,
            qte: Number(s.qte),
            unite: s.unite,
            datePeremption: s.datePeremption || null,
          };
        }),
      );
      onTermine();
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <Erreur message={erreur} />
      <p className="text-xs text-slate-500">
        Le numéro de lot est généré automatiquement à la validation.
      </p>

      <div className="space-y-3">
        {commande.details.map((d) => {
          const s = saisies[d.id];
          return (
            <div key={d.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-900">
                  {d.produitNom ?? `Produit #${d.produitId}`}
                </span>
                <span className="text-slate-500">
                  Commandé : {d.qte} {d.unite} · Reçu : {d.qteRecue ?? 0}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Qté"
                  className={`${champ} col-span-3`}
                  value={s.qte}
                  onChange={(e) => maj(d.id, { qte: e.target.value })}
                />
                <select
                  className={`${champ} col-span-4`}
                  value={s.unite}
                  onChange={(e) => maj(d.id, { unite: e.target.value as UniteStock })}
                >
                  <option value="boite">Boîte</option>
                  <option value="plaquette">Plaquette</option>
                  <option value="comprime">Comprimé</option>
                </select>
                <input
                  type="date"
                  aria-label="Date de péremption"
                  className={`${champ} col-span-5`}
                  value={s.datePeremption}
                  onChange={(e) => maj(d.id, { datePeremption: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Bouton type="submit" variante="primaire" disabled={envoi}>
          {envoi ? "Enregistrement…" : "Valider la réception"}
        </Bouton>
      </div>
    </form>
  );
};
export default FormulaireReception;
