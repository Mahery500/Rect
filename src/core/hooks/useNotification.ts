/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from "react";

export interface NotificationState {
  type: "success" | "error" | "warning" | "info";
  text: string;
}

export function useNotification(defaultDuration = 4000) {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback(
    (type: NotificationState["type"], text: string, duration = defaultDuration) => {
      setNotification({ type, text });
      if (duration > 0) {
        setTimeout(() => {
          setNotification((current) => (current?.text === text ? null : current));
        }, duration);
      }
    },
    [defaultDuration],
  );

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    clearNotification,
  };
}

export default useNotification;
