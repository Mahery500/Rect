/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Modale } from "@/noyau/ui/Modale";
import { ChampTexte } from "@/noyau/ui/ChampTexte";
import { ChampSelection } from "@/noyau/ui/ChampSelection";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  LigneInventaireStock,
  MotifAjustement,
  RegularisationStockInput,
} from "../modele/stock-ajustements.types";

export interface FormulaireAjustementModaleProps {
  ouverte: boolean;
  onFermer: () => void;
  ligne: LigneInventaireStock | null;
  motifs: MotifAjustement[];
  typesMouvement: { id: number; libelle: string; sens: number }[];
  onValider: (input: RegularisationStockInput) => Promise<void>;
}

export const FormulaireAjustementModale: React.FC<FormulaireAjustementModaleProps> = ({
  ouverte,
  onFermer,
  ligne,
  motifs,
  typesMouvement,
  onValider,
}) => {
  const [quantiteReelle, setQuantiteReelle] = useState<string>(
    ligne ? String(ligne.quantiteTheorique) : "0",
  );
  const [motifId, setMotifId] = useState<string>(motifs[0] ? String(motifs[0].id) : "");
  const [typeMvtId, setTypeMvtId] = useState<string>(
    typesMouvement[0] ? String(typesMouvement[0].id) : "",
  );
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!ligne) return null;

  const qteTheorique = ligne.quantiteTheorique;
  const qteConstatee = Number(quantiteReelle) || 0;
  const ecart = qteConstatee - qteTheorique;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    const mId = Number(motifId);
    const tmId = Number(typeMvtId);

    if (!mId) {
      setErreur("Veuillez sélectionner un motif d’ajustement");
      return;
    }
    if (!tmId) {
      setErreur("Veuillez sélectionner un type de mouvement");
      return;
    }
    if (ecart === 0) {
      setErreur(
        "La quantité constatée est identique au stock théorique (aucun écart à régulariser).",
      );
      return;
    }

    try {
      setEnCours(true);
      await onValider({
        produitId: ligne.produitId,
        siteId: ligne.siteId,
        motifAjustementId: mId,
        mouvementTypeId: tmId,
        quantite: Math.abs(ecart),
      });
      onFermer();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur de régularisation");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={`Régularisation d’inventaire — ${ligne.produitNom}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {erreur && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {erreur}
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
          <div className="text-slate-500">
            Site : <span className="font-semibold text-slate-700">{ligne.siteNom}</span>
          </div>
          <div className="text-slate-500">
            Stock théorique actuel :{" "}
            <span className="font-semibold text-slate-800">{qteTheorique} unités</span>
          </div>
        </div>

        <ChampTexte
          label="Quantité physique constatée"
          type="number"
          valeur={quantiteReelle}
          onChange={setQuantiteReelle}
          requis
        />

        <div
          className={`p-3 rounded-lg text-sm font-medium border ${
            ecart > 0
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : ecart < 0
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-gray-50 text-gray-600 border-gray-200"
          }`}
        >
          Écart calculé : {ecart > 0 ? `+${ecart}` : ecart} unité(s)
          {ecart > 0 && " (Surplus / Entrée)"}
          {ecart < 0 && " (Déficit / Sortie de perte)"}
        </div>

        <ChampSelection
          label="Motif d’ajustement"
          valeur={motifId}
          onChange={setMotifId}
          options={motifs.map((m) => ({ valeur: String(m.id), libelle: m.libelle }))}
          requis
        />

        <ChampSelection
          label="Type de mouvement comptable"
          valeur={typeMvtId}
          onChange={setTypeMvtId}
          options={typesMouvement.map((t) => ({
            valeur: String(t.id),
            libelle: `${t.libelle} (${t.sens > 0 ? "Entrée" : "Sortie"})`,
          }))}
          requis
        />

        <ActionsFormulaire
          onAnnuler={onFermer}
          chargement={enCours}
          texteValider="Enregistrer la régularisation"
        />
      </form>
    </Modale>
  );
};
