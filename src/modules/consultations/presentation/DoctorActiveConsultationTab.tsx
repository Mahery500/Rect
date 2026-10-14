/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Heart, Activity, Plus, Trash2, Map, Clipboard, Save } from "lucide-react";
import {
  ASINAState,
  Encounter,
  Patient,
  Diagnostique,
  Observation,
  Detail_encounter,
  prescription_medicament,
  prescription_acte,
  prescription_referral,
} from "@/core/types";
import { PrescribedMedicationDraft, PrescribedActeDraft } from "../domain/consultation.types";
import { encountersRepository } from "@/modules/consultations/infrastructure/consultations.repository";

export interface DoctorActiveConsultationTabProps {
  state: ASINAState;
  selectedPatient: Patient;
  activeEncounter: Encounter;
  activeDrProfile: any;
  activeSiteId: number;
  onSaveConsultation: (updatedState: Partial<ASINAState>, successMessage: string) => void;
  onCancel: () => void;
}

export const DoctorActiveConsultationTab: React.FC<DoctorActiveConsultationTabProps> = ({
  state,
  selectedPatient,
  activeEncounter,
  activeDrProfile,
  activeSiteId,
  onSaveConsultation,
  onCancel,
}) => {
  const currentDoctorUser = state.User_.find((u) => u.Id_User === activeDrProfile?.Id_User);
  const doctorSpeciality = state.Specialite.find(
    (s) => s.Id_Specialite === activeDrProfile?.Id_Specialite,
  );

  // Form states
  const [motif, setMotif] = useState(activeEncounter.Motif || "");
  const [noteClinique, setNoteClinique] = useState(activeEncounter.Note || "");

  // Diagnostique
  const [diagDefId, setDiagDefId] = useState<number>(
    state.Diagnostique_def[0]?.Id_Diagnostique_def || 1,
  );
  const [diagCertitude, setDiagCertitude] = useState("Confirmé");
  const [diagCategory, setDiagCategory] = useState<"standard" | "travail">("standard");

  // Observations / Constantes
  const [ta, setTa] = useState("120/80");
  const [temp, setTemp] = useState("37.0");
  const [poids, setPoids] = useState("70");
  const [fc, setFc] = useState("75");
  const [spo2, setSpo2] = useState("98");

  // Specialized Fields
  const [ecgReport, setEcgReport] = useState("");
  const [teethDiagnosis, setTeethDiagnosis] = useState("");
  const [occupationalHazard, setOccupationalHazard] = useState<number>(
    state.Type_D_Travail[0]?.Id_Type_D_Travail || 1,
  );
  const [aptitudeConclusion, setAptitudeConclusion] = useState(
    "Apte au poste de travail sans restriction",
  );

  // Prescription items draft
  const [prescribedMedications, setPrescribedMedications] = useState<PrescribedMedicationDraft[]>(
    [],
  );
  const [medId, setMedId] = useState<number>(state.Produit[0]?.Id_Produit || 1);
  const [medPoso, setMedPoso] = useState("1 comp");
  const [medDuree, setMedDuree] = useState("7 jours");
  const [medFreq, setMedFreq] = useState("3x par jour");

  // Prescription Actes Draft
  const [prescribedActes, setPrescribedActes] = useState<PrescribedActeDraft[]>([]);
  const [actDefId, setActDefId] = useState<number>(state.Acte_Def[0]?.Id_Acte_Def || 1);
  const [actPriority, setActPriority] = useState("Normal");
  const [actInstruction, setActInstruction] = useState("");

  // Referral draft
  const [referralSpecId, setReferralSpecId] = useState<number>(
    state.Specialite[0]?.Id_Specialite || 1,
  );
  const [referralServiceId, setReferralServiceId] = useState<number>(
    state.Service[0]?.Id_Service || 1,
  );
  const [referralType, setReferralType] = useState<"specialite" | "service">("specialite");
  const [referralReason, setReferralReason] = useState("");
  const [isReferralChecked, setIsReferralChecked] = useState(false);

  const addMedicationToDraft = () => {
    if (!medId) return;
    setPrescribedMedications([
      ...prescribedMedications,
      {
        Id_Produit: medId,
        posologie: medPoso,
        duree: medDuree,
        frequence: medFreq,
      },
    ]);
  };

  const removeMedicationFromDraft = (index: number) => {
    setPrescribedMedications(prescribedMedications.filter((_, i) => i !== index));
  };

  const addActeToDraft = () => {
    if (!actDefId) return;
    setPrescribedActes([
      ...prescribedActes,
      {
        Id_Acte_Def: actDefId,
        priority: actPriority,
        instruction: actInstruction,
      },
    ]);
    setActInstruction("");
  };

  const removeActeFromDraft = (index: number) => {
    setPrescribedActes(prescribedActes.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const encId = activeEncounter.Id_Encounter;

    // 1. Update encounter
    const updatedEncounters = state.Encounter.map((enc) => {
      if (enc.Id_Encounter === encId) {
        return {
          ...enc,
          Motif: motif,
          Note: noteClinique,
          Statut: "Terminé" as const,
          Id_staff_profile: activeDrProfile.Id_staff_profile,
        };
      }
      return enc;
    });

    // 2. Insert Diagnostic
    const nextDiagId =
      state.Diagnostique.length > 0
        ? Math.max(...state.Diagnostique.map((d) => d.Id_Diagnostique)) + 1
        : 1;

    const newDiagnostique: Diagnostique = {
      Id_Diagnostique: nextDiagId,
      Certitude: diagCertitude,
      Type_diag: diagCategory,
      Id_Patient: selectedPatient.Id_Patient,
      Id_Encounter: encId,
      Id_Diagnostique_def: diagDefId,
    };

    // 3. Insert vital signs observations
    const nextObsId =
      state.Observation.length > 0
        ? Math.max(...state.Observation.map((o) => o.Id_Observation)) + 1
        : 1;

    const dateObs = "2026-05-20 16:41:52";
    const observationsToInsert: Observation[] = [
      {
        Id_Observation: nextObsId,
        Type: "TA",
        Valeur: ta,
        Unite: "mmHg",
        Recorded_at: dateObs,
        Id_Patient: selectedPatient.Id_Patient,
        Id_Encounter: encId,
      },
      {
        Id_Observation: nextObsId + 1,
        Type: "TEMP",
        Valeur: temp,
        Unite: "°C",
        Recorded_at: dateObs,
        Id_Patient: selectedPatient.Id_Patient,
        Id_Encounter: encId,
      },
      {
        Id_Observation: nextObsId + 2,
        Type: "POIDS",
        Valeur: poids,
        Unite: "kg",
        Recorded_at: dateObs,
        Id_Patient: selectedPatient.Id_Patient,
        Id_Encounter: encId,
      },
      {
        Id_Observation: nextObsId + 3,
        Type: "FC",
        Valeur: fc,
        Unite: "bpm",
        Recorded_at: dateObs,
        Id_Patient: selectedPatient.Id_Patient,
        Id_Encounter: encId,
      },
      {
        Id_Observation: nextObsId + 4,
        Type: "SPO2",
        Valeur: spo2,
        Unite: "%",
        Recorded_at: dateObs,
        Id_Patient: selectedPatient.Id_Patient,
        Id_Encounter: encId,
      },
    ];

    // Detail encounters for specialty notes
    const detailEncountersToInsert: Detail_encounter[] = [];
    const nextDetailEncId =
      state.Detail_encounter.length > 0
        ? Math.max(...state.Detail_encounter.map((de) => de.Id_Detail_encounter)) + 1
        : 1;

    if (doctorSpeciality?.Code === "CARD" && ecgReport) {
      detailEncountersToInsert.push({
        Id_Detail_encounter: nextDetailEncId + 3,
        key: "ECG_REPORT",
        valeur: ecgReport,
        Id_Type_detail_encounter: 4,
        Id_Encounter: encId,
      });
    }

    if (doctorSpeciality?.Code === "DENT" && teethDiagnosis) {
      detailEncountersToInsert.push({
        Id_Detail_encounter: nextDetailEncId + 4,
        key: "TEETH_DENTISTRY",
        valeur: teethDiagnosis,
        Id_Type_detail_encounter: 7,
        Id_Encounter: encId,
      });
    }

    if (doctorSpeciality?.Code === "MED_TRAV") {
      detailEncountersToInsert.push(
        {
          Id_Detail_encounter: nextDetailEncId + 5,
          key: "OCCUPATIONAL_HAZARD_ID",
          valeur: String(occupationalHazard),
          Id_Type_detail_encounter: 6,
          Id_Encounter: encId,
        },
        {
          Id_Detail_encounter: nextDetailEncId + 6,
          key: "APTITUDE_CONCLUSION",
          valeur: aptitudeConclusion,
          Id_Type_detail_encounter: 6,
          Id_Encounter: encId,
        },
      );
    }

    // 4. Save Prescriptions if any
    let updatedPrescriptions = [...state.Prescription];
    let updatedPrescriptionMeds = [...state.prescription_medicament];
    let updatedPrescriptionActes = [...state.prescription_acte];
    let updatedPrescriptionReferrals = [...state.prescription_referral];

    if (prescribedMedications.length > 0 || prescribedActes.length > 0 || isReferralChecked) {
      const nextPrescriptionId =
        state.Prescription.length > 0
          ? Math.max(...state.Prescription.map((p) => p.Id_Prescription)) + 1
          : 1;

      updatedPrescriptions.push({
        Id_Prescription: nextPrescriptionId,
        DatePrescription: "2026-05-20",
        Id_staff_profile: activeDrProfile.Id_staff_profile,
        Id_Patient: selectedPatient.Id_Patient,
      });

      if (prescribedMedications.length > 0) {
        let nextMedPresId =
          state.prescription_medicament.length > 0
            ? Math.max(
                ...state.prescription_medicament.map((pm) => pm.Id_prescription_medicament),
              ) + 1
            : 1;
        prescribedMedications.forEach((pm) => {
          updatedPrescriptionMeds.push({
            Id_prescription_medicament: nextMedPresId++,
            posologie: pm.posologie,
            duree: pm.duree,
            frequence: pm.frequence,
            Id_Prescription: nextPrescriptionId,
            Id_Produit: pm.Id_Produit,
          });
        });
      }

      if (prescribedActes.length > 0) {
        let nextActPresId =
          state.prescription_acte.length > 0
            ? Math.max(...state.prescription_acte.map((pa) => pa.Id_prescription_acte)) + 1
            : 1;
        prescribedActes.forEach((pa) => {
          updatedPrescriptionActes.push({
            Id_prescription_acte: nextActPresId++,
            priority: pa.priority,
            instruction: pa.instruction,
            Id_Acte_Def: pa.Id_Acte_Def,
            Id_Prescription: nextPrescriptionId,
          });
        });
      }

      if (isReferralChecked) {
        const nextRefId =
          state.prescription_referral.length > 0
            ? Math.max(...state.prescription_referral.map((pr) => pr.Id_prescription_referral)) + 1
            : 1;
        updatedPrescriptionReferrals.push({
          Id_prescription_referral: nextRefId,
          Id_Prescription: nextPrescriptionId,
          Id_Specialite: referralType === "specialite" ? referralSpecId : undefined,
          Id_Service: referralType === "service" ? referralServiceId : undefined,
          reason: referralReason,
        });
      }
    }

    // 5. If referral was created, automatically open a queue slot in that destination service
    let finalEncounters = [...updatedEncounters];
    if (isReferralChecked && referralType === "service") {
      const nextQueueEncId = Math.max(...state.Encounter.map((e) => e.Id_Encounter)) + 1;
      finalEncounters.push({
        Id_Encounter: nextQueueEncId,
        Statut: "En attente",
        Note: `Référé depuis Médecine Générale par Dr ${currentDoctorUser?.nom || ""}. Motif : ${referralReason}`,
        Motif: `Orientation : ${referralReason}`,
        DateE: "2026-05-20 16:41:52",
        Id_Site: activeSiteId,
        Id_Service: Number(referralServiceId),
        Id_staff_profile:
          state.StaffProfile.find(
            (sp) =>
              sp.Id_User ===
              state.Affectation.find(
                (aff) =>
                  aff.Id_Site === activeSiteId && aff.Id_Service === Number(referralServiceId),
              )?.Id_staff_profile,
          )?.Id_staff_profile || 3,
        Id_Type_Encounter: activeEncounter.Id_Type_Encounter,
        Id_Patient: selectedPatient.Id_Patient,
      });
    }

    // POST /api/encounters/{id}/terminer — endpoint réel confirmé.
    // (Il n'existe pas de PATCH /api/patients/{id}/checkup côté backend.)
    encountersRepository
      .terminer(activeEncounter.Id_Encounter, {
        ta,
        temp,
        poids,
        fc,
        spo2,
        motif,
        note: noteClinique,
        conclusion: aptitudeConclusion,
        diagnostiqueId: diagDefId,
        date: new Date().toISOString(),
      })
      .catch((err) => {
        console.info("[Symfony API] terminer encounter:", err?.message || err);
      });

    onSaveConsultation(
      {
        Encounter: finalEncounters,
        Diagnostique: [...state.Diagnostique, newDiagnostique],
        Observation: [...state.Observation, ...observationsToInsert],
        Detail_encounter: [...state.Detail_encounter, ...detailEncountersToInsert],
        Prescription: updatedPrescriptions,
        prescription_medicament: updatedPrescriptionMeds,
        prescription_acte: updatedPrescriptionActes,
        prescription_referral: updatedPrescriptionReferrals,
      },
      `Consultation de ${selectedPatient.Nom} enregistrée avec succès.`,
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
    >
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div>
          <span className="text-xs text-rose-600 font-bold uppercase flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-500 animate-pulse" />
            Dossier actif à l'examen
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-0.5">
            {selectedPatient.Nom} {selectedPatient.Prenom}
            <span className="ml-2 font-mono text-xs font-normal text-gray-500">
              ({selectedPatient.Matricule})
            </span>
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400 font-medium">Examen réalisé par :</span>
          <span className="block font-bold text-stone-800 text-xs">
            Dr {currentDoctorUser?.nom} ({doctorSpeciality?.Libelle})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical observations notes */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Motif principal d'admission
            </label>
            <input
              type="text"
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Anamnèse & Constatations cliniques détaillées
            </label>
            <textarea
              rows={3}
              required
              value={noteClinique}
              onChange={(e) => setNoteClinique(e.target.value)}
              placeholder="Signes fonctionnels, auscultation, examen par appareil..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {/* Diagnostics posés */}
          <div className="bg-stone-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-gray-750 uppercase tracking-wider">
                Classification Diagnostique (CIM-10)
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <label className="inline-flex items-center text-[10px] text-gray-600 font-bold">
                  <input
                    type="radio"
                    name="diagCat"
                    checked={diagCategory === "standard"}
                    onChange={() => setDiagCategory("standard")}
                    className="mr-1"
                  />
                  Maladie Ordinaire
                </label>
                <label className="inline-flex items-center text-[10px] text-amber-700 font-bold">
                  <input
                    type="radio"
                    name="diagCat"
                    checked={diagCategory === "travail"}
                    onChange={() => setDiagCategory("travail")}
                    className="mr-1"
                  />
                  Liée au Travail (AT / MP)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-gray-500 font-medium mb-1">
                  Pathologie codifiée
                </label>
                <select
                  value={diagDefId}
                  onChange={(e) => setDiagDefId(Number(e.target.value))}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                >
                  {state.Diagnostique_def.map((df) => (
                    <option key={df.Id_Diagnostique_def} value={df.Id_Diagnostique_def}>
                      [{df.Code}] {df.Libelle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-medium mb-1">
                  Degré de certitude
                </label>
                <select
                  value={diagCertitude}
                  onChange={(e) => setDiagCertitude(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                >
                  <option value="Confirmé">Confirmé cliniquement</option>
                  <option value="Suspecté">Suspecté (En cours de bilan)</option>
                  <option value="Exclu">Exclu médicalement</option>
                </select>
              </div>
            </div>
          </div>

          {/* Specialty Specific Additions */}
          {doctorSpeciality?.Code === "CARD" && (
            <div className="bg-red-50/40 p-4 rounded-xl border border-red-200 space-y-2 animate-fade-in">
              <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-red-600" />
                Interprétation Électrocardiogramme (ECG Spécialité Cardio)
              </h4>
              <textarea
                rows={2}
                value={ecgReport}
                onChange={(e) => setEcgReport(e.target.value)}
                placeholder="Rythme sinusal régulier, segment ST, axe QRS, intervalles PR/QT..."
                className="w-full bg-white border border-red-200 rounded p-2 text-xs"
              />
            </div>
          )}

          {doctorSpeciality?.Code === "DENT" && (
            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200 space-y-2 animate-fade-in">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Map className="h-4 w-4 text-blue-600" />
                Schéma Dentaire & Soins Odonto-Stomatologiques
              </h4>
              <textarea
                rows={2}
                value={teethDiagnosis}
                onChange={(e) => setTeethDiagnosis(e.target.value)}
                placeholder="Dents concernées (ex: 16 carie, 24 détartrage, extraction 38)..."
                className="w-full bg-white border border-blue-200 rounded p-2 text-xs"
              />
            </div>
          )}

          {doctorSpeciality?.Code === "MED_TRAV" && (
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3 animate-fade-in">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clipboard className="h-4 w-4 text-amber-600" />
                Module Médecine du Travail (Visite Médicale Périodique & d'Embauche)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-600 font-bold mb-1">
                    Poste à risques / Exposition :
                  </label>
                  <select
                    value={occupationalHazard}
                    onChange={(e) => setOccupationalHazard(Number(e.target.value))}
                    className="w-full bg-white border border-amber-300 rounded p-1.5 text-xs"
                  >
                    {state.Type_D_Travail.map((td) => (
                      <option key={td.Id_Type_D_Travail} value={td.Id_Type_D_Travail}>
                        {td.Libelle}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 font-bold mb-1">
                    Conclusion d'Aptitude Médicale :
                  </label>
                  <select
                    value={aptitudeConclusion}
                    onChange={(e) => setAptitudeConclusion(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded p-1.5 text-xs font-bold text-gray-800"
                  >
                    <option value="Apte au poste de travail sans restriction">
                      Apte sans restriction
                    </option>
                    <option value="Apte avec aménagement de poste">Apte avec aménagement</option>
                    <option value="Inapte temporaire">Inapte temporaire</option>
                    <option value="Inapte définitif">Inapte définitif</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Prescription de Médicaments */}
          <div className="bg-stone-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Prescription Thérapeutique (Ordonnance)
            </h4>

            <div className="space-y-2">
              <select
                value={medId}
                onChange={(e) => setMedId(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
              >
                {state.Produit.map((prod) => (
                  <option key={prod.Id_Produit} value={prod.Id_Produit}>
                    {prod.Nom_Commercial}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1 grid-flow-row">
                <input
                  type="text"
                  placeholder="Posologie"
                  value={medPoso}
                  onChange={(e) => setMedPoso(e.target.value)}
                  className="bg-white border text-[10px] p-1.5 rounded text-center"
                />
                <input
                  type="text"
                  placeholder="Durée"
                  value={medDuree}
                  onChange={(e) => setMedDuree(e.target.value)}
                  className="bg-white border text-[10px] p-1.5 rounded text-center"
                />
                <input
                  type="text"
                  placeholder="Fréquence"
                  value={medFreq}
                  onChange={(e) => setMedFreq(e.target.value)}
                  className="bg-white border text-[10px] p-1.5 rounded text-center"
                />
              </div>
              <button
                type="button"
                onClick={addMedicationToDraft}
                className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-[10px] tracking-wide py-1.5 rounded inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Ajouter Médicament
              </button>
            </div>

            {/* Draft list in view */}
            {prescribedMedications.length > 0 && (
              <div className="border border-gray-200 rounded p-2 bg-white space-y-1 max-h-36 overflow-y-auto">
                {prescribedMedications.map((pm, idx) => {
                  const prodDesc = state.Produit.find((p) => p.Id_Produit === pm.Id_Produit);
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-[10px] border-b pb-1 last:border-0 last:pb-0"
                    >
                      <div>
                        <span className="font-bold">{prodDesc?.Nom_Commercial}</span>
                        <span className="block text-gray-500 italic">
                          {pm.posologie} — {pm.frequence} ({pm.duree})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedicationFromDraft(idx)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prescription Actes & Examens complémentaires */}
          <div className="bg-stone-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Actes & Examens prescrits
            </h4>

            <div className="space-y-2">
              <select
                value={actDefId}
                onChange={(e) => setActDefId(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
              >
                {state.Acte_Def.map((actDef) => (
                  <option key={actDef.Id_Acte_Def} value={actDef.Id_Acte_Def}>
                    {actDef.Libelle}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={actPriority}
                  onChange={(e) => setActPriority(e.target.value)}
                  className="bg-white border text-[10px] p-1.5 rounded"
                >
                  <option value="Normal">Priorité Normale</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <input
                  type="text"
                  placeholder="Instructions..."
                  value={actInstruction}
                  onChange={(e) => setActInstruction(e.target.value)}
                  className="bg-white border text-[10px] p-1.5 rounded"
                />
              </div>
              <button
                type="button"
                onClick={addActeToDraft}
                className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-[10px] py-1.5 rounded inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Ajouter Acte
              </button>
            </div>

            {prescribedActes.length > 0 && (
              <div className="border border-gray-200 rounded p-2 bg-white space-y-1">
                {prescribedActes.map((pa, i) => {
                  const definition = state.Acte_Def.find((df) => df.Id_Acte_Def === pa.Id_Acte_Def);
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center text-[10px] border-b pb-1 last:border-0"
                    >
                      <div>
                        <span className="font-bold">{definition?.Libelle}</span>
                        <span className="block text-rose-600 font-semibold">
                          {pa.priority} : {pa.instruction}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActeFromDraft(i)}
                        className="text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Référer/Orienter le patient */}
          <div className="bg-stone-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer pb-1 border-b border-gray-200">
              <input
                type="checkbox"
                checked={isReferralChecked}
                onChange={(e) => setIsReferralChecked(e.target.checked)}
                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
              />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Aiguiller / Référer le Patient
              </span>
            </label>

            {isReferralChecked && (
              <div className="space-y-3 animate-fade-in pt-1">
                <div className="flex rounded-md bg-gray-200 p-0.5 text-center text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setReferralType("specialite")}
                    className={`flex-1 py-1 rounded transition cursor-pointer ${referralType === "specialite" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    Vers Spécialité médicale
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferralType("service")}
                    className={`flex-1 py-1 rounded transition cursor-pointer ${referralType === "service" ? "bg-white text-cyan-800 shadow-xs" : "text-gray-500 hover:text-cyan-700"}`}
                  >
                    Vers un autre Service
                  </button>
                </div>

                {referralType === "specialite" ? (
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium mb-1">
                      Spécialité visée
                    </label>
                    <select
                      value={referralSpecId}
                      onChange={(e) => setReferralSpecId(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                    >
                      {state.Specialite.map((spec) => (
                        <option key={spec.Id_Specialite} value={spec.Id_Specialite}>
                          {spec.Libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium mb-1">
                      Service de destination sur le site
                    </label>
                    <select
                      value={referralServiceId}
                      onChange={(e) => setReferralServiceId(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs font-bold text-cyan-800"
                    >
                      {state.Service.map((serv) => (
                        <option key={serv.Id_Service} value={serv.Id_Service}>
                          {serv.Libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    placeholder="Motif de l'orientation (ex: Avis spécialisé cardiologique pour HTA réfractaire)..."
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Observations & Constantes vitales panel (Right column) */}
        <div className="space-y-4">
          <div className="bg-stone-50 p-4 rounded-xl border border-gray-200 space-y-4">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-cyan-700" />
              Constantes de la Séance
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Tension Artérielle (mmHg)
                </label>
                <input
                  type="text"
                  value={ta}
                  onChange={(e) => setTa(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs font-mono font-bold text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">
                    Température (°C)
                  </label>
                  <input
                    type="text"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs font-mono font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">
                    Poids (kg)
                  </label>
                  <input
                    type="text"
                    value={poids}
                    onChange={(e) => setPoids(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs font-mono font-bold text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">
                    Fréquence Cardiaque
                  </label>
                  <input
                    type="text"
                    value={fc}
                    onChange={(e) => setFc(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs font-mono font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">
                    SpO2 (%)
                  </label>
                  <input
                    type="text"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs font-mono font-bold text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>Valider & Terminer Consultation</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-lg text-xs transition cursor-pointer"
            >
              Retour à la file d'attente
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default DoctorActiveConsultationTab;
