/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Modale } from "@/noyau/ui/Modale";
import { ChampSelection } from "@/noyau/ui/ChampSelection";
import { ChampZoneTexte } from "@/noyau/ui/ChampZoneTexte";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  ServiceMedical,
  TypeServiceMedical,
  NouveauServiceInput,
  ModificationServiceInput,
} from "../modele/service.types";

export interface FormulaireServiceModaleProps {
  ouvert: boolean;
  serviceEnEdition: ServiceMedical | null;
  sitesDisponibles: { id: number; nom: string; code: string }[];
  typesDisponibles: TypeServiceMedical[];
  onFermer: () => void;
  onEnregistrer: (
    saisie: NouveauServiceInput | ModificationServiceInput,
    id?: number,
  ) => Promise<boolean>;
}

export const FormulaireServiceModale: React.FC<FormulaireServiceModaleProps> = ({
  ouvert,
  serviceEnEdition,
  sitesDisponibles,
  typesDisponibles,
  onFermer,
  onEnregistrer,
}) => {
  const [siteId, setSiteId] = useState<string>("");
  const [typeServiceId, setTypeServiceId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [enCours, setEnCours] = useState<boolean>(false);
  const [erreurValidation, setErreurValidation] = useState<string | null>(null);

  useEffect(() => {
    if (serviceEnEdition) {
      setSiteId(String(serviceEnEdition.siteId || ""));
      setTypeServiceId(String(serviceEnEdition.typeServiceId || ""));
      setDescription(serviceEnEdition.description || "");
    } else {
      setSiteId("");
      setTypeServiceId("");
      setDescription("");
    }
    setErreurValidation(null);
  }, [serviceEnEdition, ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurValidation(null);

    const sId = Number(siteId);
    const tId = Number(typeServiceId);

    if (!Number.isFinite(sId) || sId <= 0) {
      setErreurValidation("Veuillez sélectionner le site médical d’affectation.");
      return;
    }

    if (!Number.isFinite(tId) || tId <= 0) {
      setErreurValidation("Veuillez sélectionner le type de service médical.");
      return;
    }

    setEnCours(true);
    try {
      const ok = await onEnregistrer(
        {
          siteId: sId,
          typeServiceId: tId,
          description: description.trim() || undefined,
        },
        serviceEnEdition?.id,
      );
      if (ok) {
        onFermer();
      }
    } finally {
      setEnCours(false);
    }
  };

  const optionsSites = sitesDisponibles.map((s) => ({
    valeur: s.id,
    libelle: s.code ? `${s.nom} (${s.code})` : s.nom,
  }));

  const optionsTypes = typesDisponibles.map((t) => ({
    valeur: t.id,
    libelle: t.code ? `${t.nom} (${t.code})` : t.nom,
  }));

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={
        serviceEnEdition
          ? "Modifier l’affectation du service"
          : "Rattacher un Service à un Établissement"
      }
      enfants={
        <form id="form-service-affectation" onSubmit={handleSubmit} className="space-y-3.5">
          {erreurValidation && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {erreurValidation}
            </div>
          )}

          <ChampSelection
            label="Établissement / Site d’implantation"
            valeur={siteId}
            onChange={setSiteId}
            options={optionsSites}
            placeholderOption="— Sélectionner un site médical —"
            obligatoire
            desactive={enCours}
          />

          <ChampSelection
            label="Spécialité / Type de service"
            valeur={typeServiceId}
            onChange={setTypeServiceId}
            options={optionsTypes}
            placeholderOption="— Sélectionner une spécialité —"
            obligatoire
            desactive={enCours}
          />

          <ChampZoneTexte
            label="Description opérationnelle / Localisation interne"
            valeur={description}
            onChange={setDescription}
            placeholder="ex: Bâtiment B, 1er étage — consultations externes"
            lignes={3}
            desactive={enCours}
          />
        </form>
      }
      pied={
        <ActionsFormulaire
          idFormulaire="form-service-affectation"
          onAnnuler={onFermer}
          enCours={enCours}
          labelValider={serviceEnEdition ? "Mettre à jour" : "Rattacher le service"}
        />
      }
    />
  );
};

export default FormulaireServiceModale;
