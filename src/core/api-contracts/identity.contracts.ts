/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Domaine "identité" : User, Patient, Agent, Entreprise.
 * Voir header de auth.contracts.ts pour le mode d'emploi de ce dossier.
 */

// ---- User (GET/POST/PUT/DELETE /api/users) ------------------------------

export interface CreateUserInput {
  login: string;
  email: string;
  password: string;
  roles?: (string | null)[];
}

export interface UpdateUserInput {
  email?: string | null;
  roles?: (string | null)[] | null;
  isActive?: boolean | null;
}

export interface UserOutput {
  id: number;
  email: string | null;
  roles: (string | null)[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// ---- Patient (GET /api/patients, /api/patients/{id} — LECTURE SEULE) ----
//
// IMPORTANT : id est une STRING (pas un number), contrairement au reste du
// legacy front (Merise) qui utilise `Id_Patient: number` un peu partout.
// Il n'existe PAS de POST/PUT/PATCH/DELETE sur /api/patients — voir
// docs/API_MANQUANTES.md. Le paramètre de requête `idEntreprise` permet de
// filtrer la collection par entreprise.

export interface PatientOutput {
  id: string | null;
  matricule: string | null;
  nom: string | null;
  prenom: string | null;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  sexe: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  groupeSanguin: string | null;
  nir: string | null;
  idEntreprise: number | null;
  nomEntreprise: string | null;
  statut: string | null;
  idAgent: number | null;
  matriculeAgent: string | null;
}

// ---- ImportPatients (POST /api/import-patients — multipart/form-data) --
//
// C'est un UPLOAD DE FICHIER EXCEL, pas un endpoint JSON. Règle métier
// documentée par le backend lui-même (description du schéma) : chaque AGENT
// doit être placé AVANT ses ayants droit dans le fichier ; une colonne
// "Agent/Conjoint/Enfant" indique le rôle de chaque ligne ; tout ou rien
// (la moindre erreur annule tout l'import et liste toutes les erreurs).
// C'est aujourd'hui le SEUL moyen d'introduire un nouveau Patient dans le
// système — voir agents.contracts.ts pour pourquoi.

export interface ImportPatientsFormFields {
  file: File; // .xlsx
  idEntreprise: number;
}

// ---- Agent (GET/POST /api/agents — pas de PUT/DELETE) -------------------
//
// ATTENTION, découverte importante : CreateAgentInput ne prend PAS nom/
// prénom/date de naissance — seulement `idPatient` (un Patient qui existe
// déjà !), `cnaps`, `fonction`, `idEntreprise`. Créer un Agent = donner un
// rôle "salarié" à un Patient déjà présent en base, pas créer une nouvelle
// personne. Comme Patient n'a pas de POST, la seule façon de faire entrer
// une personne totalement nouvelle dans le système aujourd'hui est
// POST /api/import-patients (fichier Excel). Voir docs/API_MANQUANTES.md.

export interface CreateAgentInput {
  cnaps?: string | null;
  fonction?: string | null;
  idPatient?: number | null;
  idEntreprise?: number | null;
}

export interface AgentOutput {
  id: number | null;
  cnaps: string | null;
  matricule: string | null;
  fonction: string | null;
  idPatient: number | null;
  idEntreprise: number | null;
  nomEntreprise: string | null;
}

// ---- Entreprise (GET/POST/PUT/DELETE /api/entreprises) ------------------
//
// PUT et DELETE existent bel et bien (EntrepriseApiResource).
// `smie` est REQUIS en création, INTERDIT en modification (choix figé).

export interface CreateEntrepriseInput {
  nom: string;
  raisonSociale?: string | null;
  adresse?: string | null;
  contact?: string | null;
  numeroCnaps?: string | null;
  matriculeAsina?: string | null;
  smie: "serenite" | "asina";
}

export interface UpdateEntrepriseInput {
  nom: string;
  raisonSociale?: string | null;
  adresse?: string | null;
  contact?: string | null;
  numeroCnaps?: string | null;
  matriculeAsina?: string | null;
  // pas de smie : choix figé côté backend
}

export interface EntrepriseOutput {
  id: number | null;
  nom: string | null;
  raisonSociale: string | null;
  adresse: string | null;
  contact: string | null;
  numeroCnaps: string | null;
  matriculeAsina: string | null;
  smie: "serenite" | "asina" | null;
  nombreAgents: number;
}
