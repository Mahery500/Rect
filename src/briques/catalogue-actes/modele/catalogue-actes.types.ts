/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CategorieHierarchique } from "@/noyau/referentiels/categories";

/**
 * La catégorie d'acte est désormais hiérarchique côté backend :
 * la forme est strictement identique à celle des catégories d'observations.
 */
export type CategorieActe = CategorieHierarchique;

/**
 * Ré-export du contrat partagé pour éviter aux consommateurs du catalogue
 * d'avoir à importer depuis deux modules. La définition vit dans
 * `@/noyau/referentiels/categories` car elle est commune aux catégories
 * d'actes ET d'observations.
 */
export type { NouvelleCategorieInput } from "@/noyau/referentiels/categories";

/**
 * La catégorie d'acte est désormais hiérarchique côté backend :
 * la forme est strictement identique à celle des catégories d'observations.
 */

export interface ProfilAutorise {
  role: string;
  libelle: string;
}

export const PROFILS_ACTES: readonly ProfilAutorise[] = [
  { role: "ROLE_INFIRMIER", libelle: "Infirmier" },
  { role: "ROLE_MEDECIN", libelle: "Médecin" },
] as const;

export interface TypeServiceOption {
  id: number;
  code: string;
  nom: string;
}

export interface CodificationActe {
  codeSystem: string;
  code: string;
  libelle?: string;
}

export interface CodeSystemeOption {
  id: number;
  code: string;
  libelle: string;
  uri: string | null;
  actif: boolean;
}

export interface NouveauCodeSystemeInput {
  code: string;
  libelle: string;
  uri?: string | null;
}

export interface ActeMedical {
  id: number;
  code: string;
  libelle: string;
  actif: boolean;
  /** Objet complet renvoyé par ActeDefinitionOutput::fromEntity(). */
  categorie: CategorieActe;
  rolesAutorises: string[];
  typeServiceIds: number[];
  description?: string | null;
  tarif?: number | null;
  dureeMinutes?: number | null;
  necessitePrescription?: boolean;
  codifications?: CodificationActe[];
}

export interface NouvelActeInput {
  code: string;
  libelle: string;
  /** Le backend exige le CODE de la catégorie (feuille). */
  categorieCode: string;
  rolesAutorises: string[];
  typeServiceIds?: number[];
  description?: string | null;
  tarif?: number | null;
  dureeMinutes?: number | null;
  necessitePrescription?: boolean;
  codifications?: CodificationActe[];
}

export interface ModificationActeInput {
  libelle?: string;
  categorieCode?: string;
  rolesAutorises?: string[];
  typeServiceIds?: number[];
  actif?: boolean;
  description?: string | null;
  tarif?: number | null;
  dureeMinutes?: number | null;
  necessitePrescription?: boolean;
  codifications?: CodificationActe[];
}
