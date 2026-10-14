/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Schémas de requêtes et réponses brutes de l'API Symfony pour /api/services et /api/type-services.
 */

export interface ServiceInputApi {
  siteId: number;
  typeServiceId: number;
  description?: string | null;
}

export interface ServiceOutputApi {
  id: number;
  siteId: number;
  siteName?: string;
  typeServiceId: number;
  typeServiceName?: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  // Variantes legacy
  Id_Service?: number;
  Id_Site?: number;
  Libelle?: string;
  libelle?: string;
}

export interface TypeServiceInputApi {
  code: string;
  name: string;
  description?: string | null;
  supporteAiguillage?: boolean; // ← ajout
}

export interface TypeServiceOutputApi {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  supporteAiguillage?: boolean; // ← ajout, tolérant si backend ancien
}
