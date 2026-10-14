/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StockLevelApiOutput {
  id: number | null;
  produitId: number | null;
  produitLibelle: string | null;
  siteId: number | null;
  siteLibelle: string | null;
  quantite: number | null;
}

export interface StockSiteApiOutput {
  id: number | null;
  libelle: string | null;
  adresse: string | null;
  contact: string | null;
}
