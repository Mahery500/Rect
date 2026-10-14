/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatutQuantiteStock = "disponible" | "critique" | "rupture";

export interface LigneNiveauStock {
  id: string;
  produitId: number;
  produitLibelle: string;
  siteId: number;
  siteLibelle: string;
  quantite: number;
  statut: StatutQuantiteStock;
}

export interface SiteStock {
  id: number;
  libelle: string;
  adresse: string | null;
  contact: string | null;
}
