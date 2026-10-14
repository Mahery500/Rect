/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { ContexteNotificationsValeur, ElementNotification, TypeNotification } from "./types";
import { ToastNotifications } from "./ToastNotifications";

export const ContexteNotifications = createContext<ContexteNotificationsValeur | null>(null);

let compteurInterne = 0;
function genererIdNotification(): string {
  compteurInterne += 1;
  return `notif-${compteurInterne}`;
}

export interface FournisseurNotificationsProps {
  children: React.ReactNode;
}

export const FournisseurNotifications: React.FC<FournisseurNotificationsProps> = ({ children }) => {
  const [notificationActive, setNotificationActive] = useState<ElementNotification | null>(null);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fermer = useCallback(() => {
    if (minuteurRef.current) {
      clearTimeout(minuteurRef.current);
      minuteurRef.current = null;
    }
    setNotificationActive(null);
  }, []);

  const notifier = useCallback(
    (type: TypeNotification, message: string, dureeMs: number = 4000) => {
      if (minuteurRef.current) {
        clearTimeout(minuteurRef.current);
        minuteurRef.current = null;
      }

      const nouvelleNotif: ElementNotification = {
        id: genererIdNotification(),
        type,
        message,
        dureeMs,
      };

      setNotificationActive(nouvelleNotif);

      if (dureeMs > 0) {
        minuteurRef.current = setTimeout(() => {
          setNotificationActive((actuelle) =>
            actuelle?.id === nouvelleNotif.id ? null : actuelle,
          );
        }, dureeMs);
      }
    },
    [],
  );

  const succes = useCallback((msg: string) => notifier("succes", msg), [notifier]);
  const erreur = useCallback((msg: string) => notifier("erreur", msg), [notifier]);
  const avertissement = useCallback((msg: string) => notifier("avertissement", msg), [notifier]);
  const info = useCallback((msg: string) => notifier("info", msg), [notifier]);

  useEffect(() => {
    return () => {
      if (minuteurRef.current) {
        clearTimeout(minuteurRef.current);
      }
    };
  }, []);

  const valeur: ContexteNotificationsValeur = {
    notificationActive,
    notifier,
    succes,
    erreur,
    notifierSucces: succes,
    notifierErreur: erreur,
    avertissement,
    info,
    fermer,
  };

  return (
    <ContexteNotifications.Provider value={valeur}>
      {children}
      <ToastNotifications notification={notificationActive} onFermer={fermer} />
    </ContexteNotifications.Provider>
  );
};
