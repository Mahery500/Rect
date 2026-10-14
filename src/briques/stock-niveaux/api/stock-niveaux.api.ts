/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clientHttp } from "@/noyau/http/clientHttp";
import { extraireElementsCollection } from "@/noyau/http/collection";
import { StockLevelApiOutput, StockSiteApiOutput } from "./stock-niveaux.contrats";
import { mapperLigneStock, mapperSiteStock } from "./stock-niveaux.mapping";
import { LigneNiveauStock, SiteStock } from "../modele/stock-niveaux.types";

export const stockNiveauxApi = {
  async listerNiveauxStock(): Promise<LigneNiveauStock[]> {
    const raw = await clientHttp<unknown>("/stock_resources");
    const items = extraireElementsCollection<StockLevelApiOutput>(raw);
    return items.map(mapperLigneStock);
  },

  async listerSitesStock(): Promise<SiteStock[]> {
    const raw = await clientHttp<unknown>("/site_resources");
    const items = extraireElementsCollection<StockSiteApiOutput>(raw);
    return items.map(mapperSiteStock);
  },
};
