/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from "react";
import { prescriptionsRepository } from "../infrastructure/prescriptions.repository";
import type {
  PrescriptionRequest,
  PrescriptionResponse,
  DispenserPrescriptionRequest,
} from "@/core/api-contracts";

export function usePrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const triggerNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPrescriptions(await prescriptionsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des prescriptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  const mutate = async <T>(
    action: () => Promise<T>,
    successText: string,
    errorFallback: string,
  ): Promise<T | undefined> => {
    try {
      const result = await action();
      triggerNotification("success", successText);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : errorFallback;
      setError(message);
      triggerNotification("error", message);
      return undefined;
    }
  };

  const createPrescription = async (payload: PrescriptionRequest) => {
    const result = await mutate(
      () => prescriptionsRepository.create(payload),
      "Prescription créée.",
      "Erreur lors de la création de la prescription.",
    );
    if (result) await fetchPrescriptions();
    return result;
  };

  const dispenserPrescription = async (id: number, payload: DispenserPrescriptionRequest) => {
    const result = await mutate(
      () => prescriptionsRepository.dispenser(id, payload),
      "Prescription dispensée.",
      "Erreur lors de la dispensation. Stock probablement insuffisant.",
    );
    if (result) await fetchPrescriptions();
    return result;
  };

  const annulerPrescription = async (id: number) => {
    const result = await mutate(
      () => prescriptionsRepository.annuler(id),
      "Prescription annulée.",
      "Erreur lors de l'annulation de la prescription.",
    );
    if (result) await fetchPrescriptions();
    return result;
  };

  return {
    prescriptions,
    loading,
    error,
    notification,
    fetchPrescriptions,
    createPrescription,
    dispenserPrescription,
    annulerPrescription,
  };
}
