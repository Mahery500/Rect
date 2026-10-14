/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import type { CommandeRequest, CommandeResponse } from "@/core/api-contracts";

class CommandesRepository extends HttpRepository<CommandeResponse, CommandeResponse> {
  constructor() {
    super("/commande_resources");
  }
  create(payload: CommandeRequest) {
    return super.create(payload);
  }
}

export const commandesRepository = new CommandesRepository();
