/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository, ApiError } from "@/core/http";
import type { StockSiteRequest, StockSiteResponse, StockLevelResponse } from "@/core/api-contracts";

/**
 * CRUD complet confirmé : /api/site_resources ({ libelle, adresse, contact }).
 * Distinct de /api/sites (Administration) — voir docs/API_CONTRACTS.md.
 */
class StockSitesRepository extends HttpRepository<StockSiteResponse, StockSiteResponse> {
  constructor() {
    super("/site_resources");
  }
  create(payload: StockSiteRequest) {
    return super.create(payload);
  }
  update(id: number | string, payload: StockSiteRequest) {
    return super.update(id, payload);
  }
}

/**
 * `/api/stock_resources` — confirmé GET (collection + item) SEULEMENT.
 * Vue calculée à partir du grand livre `mouvement_resources`.
 */
class StockLevelsRepository extends HttpRepository<StockLevelResponse> {
  constructor() {
    super("/stock_resources");
  }

  async create(): Promise<StockLevelResponse> {
    throw new ApiError(
      501,
      "Le niveau de stock est calculé par le backend — aucune création directe.",
    );
  }
  async update(): Promise<StockLevelResponse> {
    throw new ApiError(
      501,
      "Le niveau de stock est calculé par le backend — aucune mise à jour directe.",
    );
  }
  async remove(): Promise<{ success: boolean }> {
    throw new ApiError(
      501,
      "Le niveau de stock est calculé par le backend — aucune suppression directe.",
    );
  }
}

export const stockSitesRepository = new StockSitesRepository();
export const stockLevelsRepository = new StockLevelsRepository();
