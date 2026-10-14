/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import { consultationActiveApi } from "../api/consultation-active.api";
import {
  DiagnosticMedical,
  DiagnosticDefinitionItem,
  ActePrescritItem,
  NouveauDiagnosticInput,
  PrescriptionActeInput,
  EnregistrerActeEncounterInput,
  DemandeActeInput,
  DemandeActeItem,
} from "../modele/consultation-active.types";
import { ActeDefinitionApiOutput } from "../api/consultation-active.contrats";
import { diagnosticDefinitionApi } from "@/briques/diagnostic-definitions/api/diagnostic-definition.api";
import { CodeSystemeOption } from "@/briques/diagnostic-definitions/modele/diagnostic-definition.types";
import { extraireMessageErreur } from "@/noyau/utils/erreur";

export function useConsultationActive(encounterId?: number | null, patientId?: number | null) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticMedical[]>([]);
  const [catalogueDiagnostics, setCatalogueDiagnostics] = useState<DiagnosticDefinitionItem[]>([]);
  const [codeSystems, setCodeSystems] = useState<CodeSystemeOption[]>([]);
  const [actesPrescrits, setActesPrescrits] = useState<ActePrescritItem[]>([]);
  const [demandesActes, setDemandesActes] = useState<DemandeActeItem[]>([]);
  const [catalogueActes, setCatalogueActes] = useState<ActeDefinitionApiOutput[]>([]);
  const [chargement, setChargement] = useState(false);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const chargerDonnees = useCallback(async () => {
    if (!encounterId) {
      setDiagnostics([]);
      setActesPrescrits([]);
      setDemandesActes([]);
      setCatalogueActes([]);
      return;
    }

    setChargement(true);
    setErreur(null);
    try {
      const [diags, diagsDefs, csList, actes, demandes, catalogue] = await Promise.all([
        consultationActiveApi.listerDiagnostics(encounterId),
        consultationActiveApi.listerDiagnosticDefinitions(),
        diagnosticDefinitionApi.listerCodeSystems(true).catch(() => []),
        consultationActiveApi.listerActes(encounterId),
        consultationActiveApi.listerDemandesActes(encounterId, patientId || undefined),
        // ⚠️ Le catalogue dépend de l'encounter : il applique la règle
        //    rôle + type de service. Sans encounter, pas de catalogue.
        consultationActiveApi.listerCatalogueActes(encounterId),
      ]);

      const diagsEnrichis = diags.map((d) => {
        if (d.codifications && d.codifications.length > 0) return d;
        const definitionAssociee = diagsDefs.find(
          (def) => def.id === d.diagnosticDefinitionId || (d.code && def.code === d.code),
        );
        if (
          definitionAssociee &&
          definitionAssociee.codifications &&
          definitionAssociee.codifications.length > 0
        ) {
          return { ...d, codifications: definitionAssociee.codifications };
        }
        return d;
      });

      setDiagnostics(diagsEnrichis);
      setCatalogueDiagnostics(diagsDefs);
      setCodeSystems(csList);
      setActesPrescrits(actes);
      setDemandesActes(demandes);
      setCatalogueActes(catalogue);
    } catch (err) {
      setErreur(extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [encounterId, patientId]);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  /* --------------------------------------------------------------------- */
  /*  Diagnostics                                                           */
  /* --------------------------------------------------------------------- */

  const poserDiagnostic = async (input: Omit<NouveauDiagnosticInput, "encounterId">) => {
    if (!encounterId) throw new Error("Aucun dossier de consultation actif.");
    setSauvegardeEnCours(true);
    try {
      const nouveau = await consultationActiveApi.creerDiagnostic({
        ...input,
        encounterId,
      });
      await chargerDonnees();
      return nouveau;
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const modifierStatutDiagnostic = async (
    diagId: number,
    statut: "provisoire" | "confirme" | "infirme",
  ) => {
    setSauvegardeEnCours(true);
    try {
      const res = await consultationActiveApi.changerStatutDiagnostic(diagId, statut);
      await chargerDonnees();
      return res;
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  /* --------------------------------------------------------------------- */
  /*  Actes                                                                 */
  /* --------------------------------------------------------------------- */

  /**
   * Conservé pour compatibilité : création d'un acte avec observations
   * déjà connues (cas rare). La voie normale est désormais
   * `ModaleRealisationActe` qui orchestre création + saisie du moule.
   */
  const prescrireActe = async (input: Omit<PrescriptionActeInput, "encounterId">) => {
    if (!encounterId) throw new Error("Aucun dossier de consultation actif.");
    setSauvegardeEnCours(true);
    try {
      const res = await consultationActiveApi.prescrireActe({
        ...input,
        encounterId,
      });
      await chargerDonnees();
      return res;
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  /**
   * Conservé pour compatibilité (utilisé par le catalogue d'actes).
   * La voie principale est `ModaleRealisationActe`.
   */
  const enregistrerActeEncounter = async (
    input: Omit<EnregistrerActeEncounterInput, "encounterId">,
  ) => {
    if (!encounterId) throw new Error("Aucun dossier de consultation actif.");
    setSauvegardeEnCours(true);
    try {
      const res = await consultationActiveApi.enregistrerActeEncounter({
        ...input,
        encounterId,
      });
      await chargerDonnees();
      return res;
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const changerStatutActe = async (
    acteId: number,
    statut: "realise" | "saisi_par_erreur" | "en_cours" | "annule",
  ) => {
    setSauvegardeEnCours(true);
    try {
      await consultationActiveApi.changerStatutActe(acteId, statut);
      await chargerDonnees();
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const recupererObservationsAttendues = async (acteDefinitionId: number) => {
    return consultationActiveApi.recupererObservationsAttendues(acteDefinitionId);
  };

  /* --------------------------------------------------------------------- */
  /*  Demandes d'actes                                                      */
  /* --------------------------------------------------------------------- */

  const creerDemandeActe = async (input: Omit<DemandeActeInput, "encounterId">) => {
    if (!encounterId) throw new Error("Aucun dossier de consultation actif.");
    setSauvegardeEnCours(true);
    try {
      const res = await consultationActiveApi.creerDemandeActe({
        ...input,
        encounterId,
        patientId: input.patientId ?? patientId ?? undefined,
      });
      await chargerDonnees();
      return res;
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  /* --------------------------------------------------------------------- */
  /*  Clôture                                                               */
  /* --------------------------------------------------------------------- */

  const cloturerConsultation = async (forcer = false) => {
    if (!encounterId) throw new Error("Aucun dossier actif.");
    setSauvegardeEnCours(true);
    try {
      return await consultationActiveApi.terminerConsultation(encounterId, forcer);
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  return {
    diagnostics,
    catalogueDiagnostics,
    codeSystems,
    actesPrescrits,
    demandesActes,
    catalogueActes,
    chargement,
    sauvegardeEnCours,
    erreur,
    poserDiagnostic,
    modifierStatutDiagnostic,
    prescrireActe,
    enregistrerActeEncounter,
    changerStatutActe,
    recupererObservationsAttendues,
    creerDemandeActe,
    cloturerConsultation,
    rafraichir: chargerDonnees,
  };
}
