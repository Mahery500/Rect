/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from "@/core/http";

export const dashboardApi = {
  getStats: async (siteId?: number): Promise<any> => {
    const query = siteId ? `?siteId=${siteId}` : "";
    return apiClient<any>(`/dashboard/stats${query}`);
  },
};
