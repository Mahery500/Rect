/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Encounter,
  Patient,
  Diagnostique,
  Observation,
  Detail_encounter,
  prescription_medicament,
  prescription_acte,
  prescription_referral,
} from "@/core/types";

export type DoctorTabType = "attente" | "dossiers" | "consultation";

export interface PrescribedMedicationDraft {
  Id_Produit: number;
  posologie: string;
  duree: string;
  frequence: string;
}

export interface PrescribedActeDraft {
  Id_Acte_Def: number;
  priority: string;
  instruction: string;
}

export interface ReferralDraft {
  referralSpecId: number;
  referralServiceId: number;
  referralType: "specialite" | "service";
  referralReason: string;
  isReferralChecked: boolean;
}

export interface ConsultationFormData {
  motif: string;
  noteClinique: string;
  diagDefId: number;
  diagCertitude: string;
  diagCategory: "standard" | "travail";
  ta: string;
  temp: string;
  poids: string;
  fc: string;
  spo2: string;
  ecgReport: string;
  teethDiagnosis: string;
  occupationalHazard: number;
  aptitudeConclusion: string;
}
