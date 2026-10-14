/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AdminTabType } from "../domain/administration.types";

export function useAdministration(initialTab: AdminTabType = "utilisateurs") {
  const [activeTab, setActiveTab] = useState<AdminTabType>(initialTab);

  return {
    activeTab,
    setActiveTab,
  };
}
