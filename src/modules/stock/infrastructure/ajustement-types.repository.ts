/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import type { AjustementTypeResponse } from "@/core/api-contracts";

class AjustementTypesRepository extends HttpRepository<
  AjustementTypeResponse,
  AjustementTypeResponse
> {
  constructor() {
    super("/ajustement_type_resources");
  }
}

export const ajustementTypesRepository = new AjustementTypesRepository();
