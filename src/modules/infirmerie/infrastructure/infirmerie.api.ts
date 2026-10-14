/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from "@/core/http";
import { Observation, Actes, Act_Result } from "@/core/types";

export const infirmerieApi = {
  recordObservations: async (observations: Partial<Observation>[]): Promise<{ count: number }> => {
    return apiClient<{ count: number }>("/infirmerie/observations", {
      method: "POST",
      body: JSON.stringify({ observations }),
    });
  },
  recordActeExecution: async (
    acte: Partial<Actes>,
    result: Partial<Act_Result>,
  ): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>("/infirmerie/actes", {
      method: "POST",
      body: JSON.stringify({ acte, result }),
    });
  },
};
