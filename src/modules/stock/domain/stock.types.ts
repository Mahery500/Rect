/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StockTabType =
  | "visualiser"
  | "commandes"
  | "ajustements"
  | "dispensation"
  | "mouvements"
  | "referentiels"
  | "dashboard";

export interface CommandBasketItem {
  Id_Produit: number;
  qte: number;
}

export interface StockAdjustmentItem {
  Id_Lot: number;
  systeme_q: number;
  actual_q: number;
}

// Les types StockSiteResource/StockLevelResource vivent désormais dans
// @/core/api-contracts/pharmacy.contracts.ts (StockSiteResponse/StockLevelResponse),
// alignés sur le vrai schéma OpenAPI.
