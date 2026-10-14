/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { PackageMinus, ClipboardList } from "lucide-react";
import { usePrescriptions } from "../application/usePrescriptions";

export interface StockDispensationTabProps {
  activeSiteId: number;
}

export const StockDispensationTab: React.FC<StockDispensationTabProps> = ({ activeSiteId }) => {
  const { prescriptions, fetchPrescriptions, dispenserPrescription, loading } = usePrescriptions();

  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<number | "">("");
  const [dispensing, setDispensing] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const pendingPrescriptions = useMemo(
    () => prescriptions.filter((p) => p.statut === "en_attente"),
    [prescriptions],
  );

  const selectedPrescription = useMemo(
    () => pendingPrescriptions.find((p) => p.id === selectedPrescriptionId) ?? null,
    [pendingPrescriptions, selectedPrescriptionId],
  );

  const handleDispenser = async () => {
    if (!selectedPrescription?.id) return;
    setDispensing(true);
    const result = await dispenserPrescription(selectedPrescription.id, { siteId: activeSiteId });
    setDispensing(false);
    if (result) setSelectedPrescriptionId("");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-asina-600" />
        Dispenser une prescription
      </h3>

      <div>
        <label className="text-xs font-semibold text-gray-600">Prescription en attente</label>
        <select
          className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1.5"
          value={selectedPrescriptionId}
          onChange={(e) => setSelectedPrescriptionId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Sélectionner une prescription...</option>
          {pendingPrescriptions.map((p) => (
            <option key={p.id} value={p.id ?? ""}>
              {p.patientNom} {p.patientPrenom} —{" "}
              {p.datePrescription ? new Date(p.datePrescription).toLocaleDateString("fr-FR") : ""} (
              {p.details.length} ligne{p.details.length > 1 ? "s" : ""})
            </option>
          ))}
        </select>
        {!loading && pendingPrescriptions.length === 0 && (
          <p className="text-xs text-gray-400 italic mt-1">Aucune prescription en attente.</p>
        )}
      </div>

      {selectedPrescription && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Patient :{" "}
            <strong className="text-gray-900">
              {selectedPrescription.patientNom} {selectedPrescription.patientPrenom}
            </strong>
            {selectedPrescription.patientMatricule && (
              <span className="ml-2 text-xs text-gray-400">
                #{selectedPrescription.patientMatricule}
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {selectedPrescription.details
              .filter((d) => d.statut === "prescrit")
              .map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-800">{d.produitNom}</span>
                    {d.posologie && (
                      <span className="text-gray-400 ml-2 italic">— {d.posologie}</span>
                    )}
                  </div>
                  <span className="text-gray-500">{d.quantite} cp</span>
                </div>
              ))}
          </div>

          <p className="text-xs text-gray-400">
            Le lot est choisi automatiquement par le serveur (péremption la plus proche d'abord),
            sur le site actif.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDispenser}
              disabled={dispensing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-asina-600 rounded-lg hover:bg-asina-700 disabled:opacity-50"
            >
              <PackageMinus className="h-4 w-4" />
              {dispensing ? "Dispensation..." : "Dispenser"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDispensationTab;
