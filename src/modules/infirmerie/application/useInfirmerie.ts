/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { InfirmerieTabType } from "../domain/infirmerie.types";

export function useInfirmerie(initialTab: InfirmerieTabType = "vitals") {
  const [internalTab, setInternalTab] = useState<InfirmerieTabType>(initialTab);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const triggerNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  return {
    internalTab,
    setInternalTab,
    notification,
    triggerNotification,
  };
}
