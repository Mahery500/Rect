/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import type { StockAjustementRequest, StockAjustementResponse } from "@/core/api-contracts";

class StockAjustementsRepository extends HttpRepository<
  StockAjustementResponse,
  StockAjustementResponse
> {
  constructor() {
    super("/stock_ajustement_resources");
  }
  create(payload: StockAjustementRequest) {
    return super.create(payload);
  }
}

export const stockAjustementsRepository = new StockAjustementsRepository();
