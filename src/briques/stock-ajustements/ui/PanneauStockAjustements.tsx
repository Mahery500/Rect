/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ClipboardCheck,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions";
import { useNotifier } from "@/noyau/notifications";
import { TableauDonnees, ColonneTableau } from "@/noyau/ui/TableauDonnees";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { Modale } from "@/noyau/ui/Modale";
import { ChampTexte } from "@/noyau/ui/ChampTexte";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import { useStockAjustements } from "../hooks/useStockAjustements";
import { FormulaireAjustementModale } from "./FormulaireAjustementModale";
import { LigneInventaireStock, RegularisationStockInput } from "../modele/stock-ajustements.types";
import { useStockPermissions } from "@/assemblages/stock/useStockPermissions";
import { GardeAccesStock } from "@/assemblages/stock/GardeAccesStock";

export interface PanneauStockAjustementsProps {
  mode?: ModeAffichage;
  siteActifId?: number | null;
  siteIdActif?: number | null;
}

export const PanneauStockAjustements: React.FC<PanneauStockAjustementsProps> = ({
  mode = "edition",
  siteActifId,
  siteIdActif,
}) => {
  const permissions = useStockPermissions();

  const siteFiltre = siteActifId ?? siteIdActif ?? null;
  const {
    lignesInventaire,
    motifs,
    typesMouvement,
    chargement,
    erreur,
    actualiser,
    creerMotif,
    supprimerMotif,
    regulariser,
  } = useStockAjustements();

  const { notifierSucces, notifierErreur } = useNotifier();

  const [recherche, setRecherche] = useState("");
  const [ligneEnAjustement, setLigneEnAjustement] = useState<LigneInventaireStock | null>(null);
  const [modaleMotifOuverte, setModaleMotifOuverte] = useState(false);
  const [nouveauMotifLibelle, setNouveauMotifLibelle] = useState("");
  const [enCoursMotif, setEnCoursMotif] = useState(false);

  const lignesFiltrees = useMemo(() => {
    return lignesInventaire.filter((l) => {
      if (siteFiltre && l.siteId !== siteFiltre) return false;
      if (!recherche) return true;
      const q = recherche.toLowerCase();
      return l.produitNom.toLowerCase().includes(q) || l.siteNom.toLowerCase().includes(q);
    });
  }, [lignesInventaire, siteFiltre, recherche]);

  // ← AJOUT : garde placée APRÈS tous les hooks, fusionnée avec le check mode
  if (mode === "masque") {
    return null;
  }

  if (!permissions.peutGererAjustements) {
    return (
      <GardeAccesStock message="Seul un Gestionnaire ou Responsable de stock peut réaliser des ajustements d'inventaire." />
    );
  }

  const handleCreerMotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauMotifLibelle.trim()) return;
    try {
      setEnCoursMotif(true);
      await creerMotif(nouveauMotifLibelle.trim());
      notifierSucces("Nouveau motif d’ajustement créé");
      setNouveauMotifLibelle("");
      setModaleMotifOuverte(false);
    } catch (err: unknown) {
      notifierErreur(err instanceof Error ? err.message : "Erreur de création");
    } finally {
      setEnCoursMotif(false);
    }
  };

  const handleSupprimerMotif = async (id: number) => {
    try {
      await supprimerMotif(id);
      notifierSucces("Motif supprimé");
    } catch (err: unknown) {
      notifierErreur(err instanceof Error ? err.message : "Erreur de suppression");
    }
  };

  const handleValiderAjustement = async (input: RegularisationStockInput) => {
    try {
      await regulariser(input);
      notifierSucces("Régularisation d’inventaire enregistrée avec succès");
    } catch (err: unknown) {
      notifierErreur(err instanceof Error ? err.message : "Erreur de régularisation");
      throw err;
    }
  };

  const colonnes: ColonneTableau[] = [
    {
      cle: "produit",
      entete: "Médicament / Produit",
    },
    {
      cle: "site",
      entete: "Site de stockage",
    },
    {
      cle: "theorique",
      entete: "Stock théorique",
    },
    {
      cle: "actions",
      entete: "Action",
      alignement: "droite",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-150 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            Inventaires & Ajustements de Stock
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Régularisation des écarts d’inventaire physique et motifs de correction
          </p>
        </div>

        <div className="flex items-center gap-2">
          {mode === "edition" && (
            <button
              type="button"
              onClick={() => setModaleMotifOuverte(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-250 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-600" />
              Nouveau Motif
            </button>
          )}

          <button
            type="button"
            onClick={actualiser}
            disabled={chargement}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-650 hover:text-gray-900 bg-white border border-gray-250 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${chargement ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {erreur && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-72">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Rechercher produit ou site..."
          />
        </div>

        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-800">{lignesFiltrees.length}</span> ligne(s)
          d’inventaire
        </div>
      </div>

      {/* Tableau des lignes d'inventaire */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
        <TableauDonnees
          colonnes={colonnes}
          chargement={chargement}
          estVide={lignesFiltrees.length === 0}
          messageVide="Aucun produit en stock pour ce site."
        >
          {lignesFiltrees.map((row) => (
            <tr key={`${row.siteId}-${row.produitId}`} className="hover:bg-slate-50 transition">
              <td className="py-3 px-3.5">
                <span className="font-semibold text-gray-900 block">{row.produitNom}</span>
                <span className="text-xs text-gray-400 font-mono">ID #{row.produitId}</span>
              </td>
              <td className="py-3 px-3.5">
                <span className="text-gray-700 font-medium">{row.siteNom}</span>
              </td>
              <td className="py-3 px-3.5">
                <span className="font-mono font-bold text-gray-900">
                  {row.quantiteTheorique} unités
                </span>
              </td>
              <td className="py-3 px-3.5 text-right">
                {mode === "edition" ? (
                  <button
                    type="button"
                    onClick={() => setLigneEnAjustement(row)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Régulariser
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 italic">Lecture seule</span>
                )}
              </td>
            </tr>
          ))}
        </TableauDonnees>
      </div>

      {/* Liste des motifs configurés */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          Motifs d’ajustement configurés ({motifs.length})
        </h3>
        {motifs.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucun motif configuré.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {motifs.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
              >
                {m.libelle}
                {mode === "edition" && (
                  <button
                    type="button"
                    onClick={() => handleSupprimerMotif(m.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-1"
                    title="Supprimer ce motif"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Modale d'ajustement */}
      <FormulaireAjustementModale
        ouverte={!!ligneEnAjustement}
        onFermer={() => setLigneEnAjustement(null)}
        ligne={ligneEnAjustement}
        motifs={motifs}
        typesMouvement={typesMouvement}
        onValider={handleValiderAjustement}
      />

      {/* Modale création motif */}
      <Modale
        ouverte={modaleMotifOuverte}
        onFermer={() => setModaleMotifOuverte(false)}
        titre="Nouveau motif d’ajustement"
      >
        <form onSubmit={handleCreerMotif} className="space-y-4">
          <ChampTexte
            label="Libellé du motif"
            valeur={nouveauMotifLibelle}
            onChange={setNouveauMotifLibelle}
            placeholder="Ex : Casse / Périmé / Recomptage"
            requis
          />
          <ActionsFormulaire
            onAnnuler={() => setModaleMotifOuverte(false)}
            chargement={enCoursMotif}
            texteValider="Créer le motif"
          />
        </form>
      </Modale>
    </div>
  );
};
