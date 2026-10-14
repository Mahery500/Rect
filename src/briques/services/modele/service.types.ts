/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TypeServiceMedical {
  id: number;
  code: string;
  nom: string;
  description: string;
  actif: boolean;
  supporteAiguillage: boolean; // ← ajout
}

export interface ServiceMedical {
  id: number;
  siteId: number;
  nomSite: string;
  typeServiceId: number;
  nomTypeService: string;
  description: string;
  actif: boolean;
  dateCreation?: string;
}

export interface NouveauServiceInput {
  siteId: number;
  typeServiceId: number;
  description?: string;
}

export interface ModificationServiceInput {
  siteId?: number;
  typeServiceId?: number;
  description?: string;
  actif?: boolean;
}

export interface NouveauTypeServiceInput {
  code: string;
  nom: string;
  description?: string;
  supporteAiguillage?: boolean; // ← ajout (optionnel, défaut true)
}

export interface ModificationTypeServiceInput {
  code?: string;
  nom?: string;
  description?: string;
  actif?: boolean;
  supporteAiguillage?: boolean; // ← ajout
}
