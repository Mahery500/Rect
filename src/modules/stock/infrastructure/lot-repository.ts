/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import type { LotRequest, LotResponse } from "@/core/api-contracts";

/**
 * `/api/lot_resources` — CRUD complet (voir LotResource/LotProcessor côté backend).
 * Note : jusqu'ici absent, référencé comme manquant dans docs/API_MANQUANTES.md
 * via lotId sur CreateMouvementRequest — à retirer de ce doc maintenant qu'il existe.
 */
class LotsRepository extends HttpRepository<LotResponse, LotResponse> {
  constructor() {
    super("/lot_resources");
  }
  create(payload: LotRequest) {
    return super.create(payload);
  }
}

export const lotsRepository = new LotsRepository();
