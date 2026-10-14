/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DefinitionRole {
  code: string;
  libelle: string;
}

export const ROLES_SYMFONY_DISPONIBLES: readonly DefinitionRole[] = [
  { code: "ROLE_ADMIN", libelle: "Administrateur" },
  { code: "ROLE_MEDECIN", libelle: "Médecin" },
  { code: "ROLE_INFIRMIER", libelle: "Infirmier" },
  { code: "ROLE_RECEPTION", libelle: "Accueil" },
  { code: "ROLE_SECRETAIRE", libelle: "Secrétaire" },
  { code: "ROLE_GESTIONNAIRE_STOCK", libelle: "Gestionnaire de stock" },
  { code: "ROLE_RESPONSABLE_STOCK", libelle: "Responsable de stock" },
  { code: "ROLE_DISPENSATEUR", libelle: "Dispensateur" },
] as const;

export const ROLES_PERSONNEL: readonly DefinitionRole[] = ROLES_SYMFONY_DISPONIBLES.filter(
  (r) => r.code !== "ROLE_ADMIN",
);

export function obtenirLibelleRole(codeRole?: string | null): string {
  if (!codeRole) return "Utilisateur";
  const trouve = ROLES_SYMFONY_DISPONIBLES.find((r) => r.code === codeRole);
  return trouve ? trouve.libelle : codeRole;
}

export interface UtilisateurCompte {
  id: number;
  login: string;
  email: string;
  nom: string;
  prenom: string;
  roles: string[];
  rolePrincipal: string;
  libelleRole: string;
  actif: boolean;
  typeCompte: "admin" | "personnel";
  dateCreation?: string;
}

export interface NouveauCompteAdminInput {
  type: "admin";
  login: string;
  email: string;
  motDePasse: string;
}

export interface NouveauComptePersonnelInput {
  type: "personnel";
  prenom: string;
  nom: string;
  login: string;
  motDePasse: string;
  role: string;
  email?: string;
  telephone?: string;
}

export type NouveauCompteInput = NouveauCompteAdminInput | NouveauComptePersonnelInput;

export interface ModificationCompteInput {
  email?: string;
  roles?: string[];
  actif?: boolean;
}
