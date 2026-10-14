/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  PackageMinus,
  Ban,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePrescriptions } from "../application/usePrescriptions";
import { useStock } from "../application/useStock";
import type { DetailPrescriptionRequest } from "@/core/api-contracts";

export interface StockPrescriptionsTabProps {
  activeSiteId: number;
}

const statutBadge: Record<string, string> = {
  en_attente: "bg-amber-50 text-amber-800 border border-amber-100",
  dispensee: "bg-emerald-50 text-emerald-800 border border-emerald-100",
  annulee: "bg-gray-100 text-gray-600 border border-gray-200",
};

const detailStatutBadge: Record<string, string> = {
  prescrit: "bg-amber-50 text-amber-800",
  dispense: "bg-emerald-50 text-emerald-800",
  annule: "bg-gray-100 text-gray-500 line-through",
};

interface DraftDetail {
  produitId: number | "";
  quantite: number | "";
  posologie: string;
  dureeJours: number | "";
}

const emptyDetail = (): DraftDetail => ({
  produitId: "",
  quantite: "",
  posologie: "",
  dureeJours: "",
});

export const StockPrescriptionsTab: React.FC<StockPrescriptionsTabProps> = ({ activeSiteId }) => {
  const {
    prescriptions,
    fetchPrescriptions,
    createPrescription,
    dispenserPrescription,
    annulerPrescription,
    loading,
  } = usePrescriptions();
  const { produits, fetchProduits } = useStock();
  const [processingId, setProcessingId] = useState<number | null>(null);

  // --- Création (temporaire, en attendant l'écran de consultation) ---
  const [formOpen, setFormOpen] = useState(false);
  const [encounterId, setEncounterId] = useState<number | "">("");
  const [staffId, setStaffId] = useState<number | "">("");
  const [details, setDetails] = useState<DraftDetail[]>([emptyDetail()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
    fetchProduits();
  }, [fetchPrescriptions, fetchProduits]);

  const updateDetail = (index: number, patch: Partial<DraftDetail>) => {
    setDetails((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };
  const addDetail = () => setDetails((prev) => [...prev, emptyDetail()]);
  const removeDetail = (index: number) => setDetails((prev) => prev.filter((_, i) => i !== index));

  const canSubmitPrescription =
    encounterId !== "" &&
    staffId !== "" &&
    details.length > 0 &&
    details.every((d) => d.produitId !== "" && d.quantite !== "" && Number(d.quantite) > 0);

  const handleCreatePrescription = async () => {
    if (!canSubmitPrescription) return;
    setSubmitting(true);
    const payload: DetailPrescriptionRequest[] = details.map((d) => ({
      produitId: Number(d.produitId),
      quantite: Number(d.quantite),
      posologie: d.posologie || null,
      dureeJours: d.dureeJours === "" ? null : Number(d.dureeJours),
    }));
    const result = await createPrescription({
      encounterId: Number(encounterId),
      staffId: Number(staffId),
      details: payload,
    });
    setSubmitting(false);
    if (result) {
      setEncounterId("");
      setStaffId("");
      setDetails([emptyDetail()]);
      setFormOpen(false);
    }
  };

  // --- Dispensation / annulation ---
  const handleDispenser = async (id: number) => {
    setProcessingId(id);
    await dispenserPrescription(id, { siteId: activeSiteId });
    setProcessingId(null);
  };

  const handleAnnuler = async (id: number) => {
    setProcessingId(id);
    await annulerPrescription(id);
    setProcessingId(null);
  };

  return (
    <div className="space-y-4">
      {/* --- Formulaire de création (temporaire) --- */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="h-5 w-5 text-asina-600" />
            Nouvelle prescription
            <span className="text-[10px] font-normal text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              temporaire — à déplacer sur l'écran de consultation
            </span>
          </h3>
          {formOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {formOpen && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">
                  ID Consultation (encounterId)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1.5"
                  value={encounterId}
                  onChange={(e) => setEncounterId(e.target.value ? Number(e.target.value) : "")}
                  placeholder="ex: 12"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">
                  ID Prescripteur (staffId)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1.5"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : "")}
                  placeholder="ex: 3"
                />
              </div>
            </div>

            <div className="space-y-3">
              {details.map((d, index) => (
                <div
                  key={index}
                  className="flex items-end gap-3 bg-gray-50 border border-gray-100 rounded-lg p-3"
                >
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-600">Produit</label>
                    <select
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1.5"
                      value={d.produitId}
                      onChange={(e) =>
                        updateDetail(index, {
                          produitId: e.target.value ? Number(e.target.value) : "",
                        })
                      }
                    >
                      <option value="">Sélectionner un produit...</option>
                      {produits.map((p) => (
                        <option key={p.id} value={p.id ?? ""}>
                          {p.nomCommercial}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="text-xs font-semibold text-gray-600">Qté (cp)</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1.5"
                      value={d.quantite}
                      onChange={(e) =>
                        updateDetail(index, {
                          quantite: e.target.value ? Number(e.target.value) : "",
                        })
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-600">Posologie</label>
                    <input
                      type="text"
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1.5"
                      value={d.posologie}
                      onChange={(e) => updateDetail(index, { posologie: e.target.value })}
                      placeholder="1 cp matin et soir"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-xs font-semibold text-gray-600">Durée (j)</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full mt-1 text-sm border border-gray-200 rounded-md px-2 py-1.5"
                      value={d.dureeJours}
                      onChange={(e) =>
                        updateDetail(index, {
                          dureeJours: e.target.value ? Number(e.target.value) : "",
                        })
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDetail(index)}
                    disabled={details.length === 1}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={addDetail}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-asina-600 hover:text-asina-700"
              >
                <Plus className="h-4 w-4" />
                Ajouter un médicament
              </button>

              <button
                type="button"
                onClick={handleCreatePrescription}
                disabled={!canSubmitPrescription || submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-asina-600 rounded-lg hover:bg-asina-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Création..." : "Créer la prescription"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Liste des prescriptions --- */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-asina-600" />
          Prescriptions
        </h3>

        <div className="space-y-3">
          {prescriptions.map((p) => (
            <div key={p.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-sans font-semibold text-gray-900">
                    {p.patientNom} {p.patientPrenom}
                    {p.patientMatricule && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        #{p.patientMatricule}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Prescrit le{" "}
                    {p.datePrescription
                      ? new Date(p.datePrescription).toLocaleDateString("fr-FR")
                      : "—"}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${statutBadge[p.statut ?? ""] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {p.statut}
                </span>
              </div>

              <div className="divide-y divide-gray-100 border-t border-gray-100 pt-2">
                {p.details.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 text-sm">
                    <div>
                      <span className="font-sans font-medium text-gray-800">{d.produitNom}</span>
                      <span className="text-gray-400 ml-2">{d.quantite} cp</span>
                      {d.posologie && (
                        <span className="text-gray-400 ml-2 italic">— {d.posologie}</span>
                      )}
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${detailStatutBadge[d.statut ?? ""] ?? ""}`}
                    >
                      {d.statut}
                    </span>
                  </div>
                ))}
              </div>

              {p.statut === "en_attente" && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAnnuler(p.id!)}
                    disabled={processingId === p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDispenser(p.id!)}
                    disabled={processingId === p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-asina-600 rounded-md hover:bg-asina-700 disabled:opacity-50"
                  >
                    <PackageMinus className="h-3.5 w-3.5" />
                    {processingId === p.id ? "Dispensation..." : "Dispenser"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {!loading && prescriptions.length === 0 && (
            <p className="text-center text-gray-400 italic text-xs py-6">
              Aucune prescription enregistrée.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockPrescriptionsTab;
