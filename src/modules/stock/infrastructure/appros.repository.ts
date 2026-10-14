/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import type { ApproRequest, ApproResponse } from "@/core/api-contracts";

class ApprosRepository extends HttpRepository<ApproResponse, ApproResponse> {
  constructor() {
    super("/appro_resources");
  }
  create(payload: ApproRequest) {
    return super.create(payload);
  }
}

export const approsRepository = new ApprosRepository();
