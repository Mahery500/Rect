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
  ProduitPharmacie,
  MedicamentCatalogue,
  ReferentielSimple,
  NouveauProduitInput,
} from "../modele/pharmacie-catalogue.types";

export interface FormulaireProduitModaleProps {
  ouvert: boolean;
  surFermeture: () => void;
  produitExistant?: ProduitPharmacie | null;
  medicaments: MedicamentCatalogue[];
  conditionnements: ReferentielSimple[];
  principesActifs: ReferentielSimple[];
  surSoumettre: (input: NouveauProduitInput) => Promise<void>;
}

export const FormulaireProduitModale: React.FC<FormulaireProduitModaleProps> = ({
  ouvert,
  surFermeture,
  produitExistant,
  medicaments,
  conditionnements,
  surSoumettre,
}) => {
  const [nomCommercial, setNomCommercial] = useState(produitExistant?.nomCommercial || "");
  const [medicamentId, setMedicamentId] = useState<string>(
    produitExistant?.medicamentId
      ? String(produitExistant.medicamentId)
      : medicaments[0]?.id
        ? String(medicaments[0].id)
        : "",
  );
  const [conditionnementId, setConditionnementId] = useState<string>(
    produitExistant?.conditionnementId ? String(produitExistant.conditionnementId) : "",
  );
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomCommercial.trim() || !medicamentId) {
      setErreur("Le nom commercial et le médicament générique sont requis.");
      return;
    }

    setEnCours(true);
    setErreur(null);
    try {
      await surSoumettre({
        nomCommercial: nomCommercial.trim(),
        medicamentId: Number(medicamentId),
        conditionnementId: conditionnementId ? Number(conditionnementId) : null,
      });
      surFermeture();
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre={
        produitExistant ? "Modifier le Produit Pharmaceutique" : "Nouveau Produit Pharmaceutique"
      }
      description="Référence commerciale destinée au stockage et à la dispensation"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {erreur && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
            {erreur}
          </div>
        )}

        <ChampTexte
          nom="nomCommercial"
          etiquette="Nom commercial du produit"
          valeur={nomCommercial}
          surChangement={setNomCommercial}
          requis
          placeholder="Ex: Paracétamol 500mg Comprimé"
        />

        <ChampSelection
          nom="medicamentId"
          etiquette="Médicament de référence / Forme"
          valeur={medicamentId}
          surChangement={setMedicamentId}
          requis
          options={medicaments.map((m) => ({
            valeur: String(m.id),
            libelle: `${m.familleLibelle || "Médicament"} - ${m.presentationLibelle || m.presentationCode || `#${m.id}`}`,
          }))}
        />

        <ChampSelection
          nom="conditionnementId"
          etiquette="Conditionnement (optionnel)"
          valeur={conditionnementId}
          surChangement={setConditionnementId}
          options={[
            { valeur: "", libelle: "Sélectionner un conditionnement..." },
            ...conditionnements.map((c) => ({
              valeur: String(c.id),
              libelle: c.libelle,
            })),
          ]}
        />

        <ActionsFormulaire
          texteValidation={produitExistant ? "Enregistrer les modifications" : "Créer le produit"}
          enCours={enCours}
          surAnnuler={surFermeture}
        />
      </form>
    </Modale>
  );
};
