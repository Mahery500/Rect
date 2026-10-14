/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Domaine "clinique" : Encounter, Diagnostic, ActeDefinition, ActeRealise,
 * CategorieActe. Voir header de auth.contracts.ts pour le mode d'emploi.
 */

// ---- Encounter (GET/POST /api/encounters + POST .../terminer) -----------

export interface CreateEncounterInput {
  patientId: number;
  serviceId: number;
  dateDebut?: string | null;
}

export interface EncounterOutput {
  id: number;
  patientId: number;
  serviceId: number;
  siteId: number;
  dateDebut: string;
  dateFin: string | null;
  statut: string;
}

// ---- Diagnostic (GET/POST /api/diagnostics + POST .../statut) -----------

export interface CreateDiagnosticInput {
  encounterId: number;
  code?: string | null; // CIM-10, ex. J18.9
  libelle: string;
  type?: "principal" | "secondaire" | null; // défaut: "principal"
  statut?: "provisoire" | "confirme" | "infirme" | null; // défaut: "provisoire"
  dateDiagnostic?: string | null;
  commentaire?: string | null;
}

export interface ChangeDiagnosticStatutInput {
  statut: "provisoire" | "confirme" | "infirme" | null;
}

export interface DiagnosticOutput {
  id: number;
  encounterId: number;
  staffId: number;
  code: string | null;
  libelle: string;
  type: string;
  statut: string;
  dateDiagnostic: string;
  commentaire: string | null;
}

// ---- CategorieActe (GET/POST /api/categorie_actes) -----------------------

export interface CreateCategorieActeInput {
  code: string;
  libelle: string;
}

export interface CategorieActeOutput {
  id: number;
  code: string;
  libelle: string;
}

// ---- ActeDefinition (GET/POST /api/acte_definitions) ---------------------

export interface CreateActeDefinitionInput {
  code: string;
  libelle: string;
  /** consultation, biologie, imagerie, soin. */
  type: string;
  /** CCAM, LOINC, SNOMED, interne. */
  systemCode?: string | null;
  /** Codes de catégories existantes. */
  categorieCodes?: string[];
}

export interface ActeDefinitionOutput {
  id: number;
  code: string;
  libelle: string;
  type: string;
  systemCode: string | null;
  actif: boolean;
  categories: CategorieActeOutput[];
}

// ---- ActeRealise (GET/POST /api/acte_realises + observations/resultats) -

export interface CreateActeRealiseInput {
  encounterId: number;
  acteDefinitionId: number;
  dateRealisation?: string | null; // défaut: instant de création
  statut?: "planifie" | "en_cours" | "realise" | "annule" | "saisi_par_erreur" | null; // défaut: "realise"
  commentaire?: string | null;
}

export interface AddObservationInput {
  code: string;
  valeur: string;
  unite?: string | null;
  interpretation?: string | null;
}

export interface AddResultatActeInput {
  type: string;
  resultat: string;
  interpretation?: string | null;
}

export interface ObservationOutput {
  id: number;
  code: string;
  valeur: string;
  unite: string | null;
  interpretation: string | null;
}

export interface ResultatActeOutput {
  id: number;
  type: string;
  resultat: string;
  interpretation: string | null;
}

export interface ActeRealiseOutput {
  id: number;
  encounterId: number;
  acteDefinitionId: number;
  acteDefinitionCode: string;
  acteDefinitionLibelle: string;
  staffId: number;
  dateRealisation: string;
  statut: string;
  commentaire: string | null;
  observations: ObservationOutput[];
  resultats: ResultatActeOutput[];
}
