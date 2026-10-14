/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StockLevelApiOutput, StockSiteApiOutput } from "./stock-niveaux.contrats";
import { LigneNiveauStock, SiteStock, StatutQuantiteStock } from "../modele/stock-niveaux.types";

export function mapperLigneStock(api: StockLevelApiOutput): LigneNiveauStock {
  const quantite = api.quantite ?? 0;
  let statut: StatutQuantiteStock = "disponible";
  if (quantite <= 0) {
    statut = "rupture";
  } else if (quantite < 10) {
    statut = "critique";
  }

  const pId = api.produitId ?? 0;
  const sId = api.siteId ?? 0;

  return {
    id: `${pId}-${sId}`,
    produitId: pId,
    produitLibelle: api.produitLibelle ?? `Produit #${pId}`,
    siteId: sId,
    siteLibelle: api.siteLibelle ?? `Site #${sId}`,
    quantite,
    statut,
  };
}

export function mapperSiteStock(api: StockSiteApiOutput): SiteStock {
  return {
    id: api.id ?? 0,
    libelle: api.libelle ?? "Site",
    adresse: api.adresse ?? null,
    contact: api.contact ?? null,
  };
}
