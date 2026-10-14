/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Observation, Actes, Act_Result, prescription_acte } from "@/core/types";

export type InfirmerieTabType = "vitals" | "actes" | "history";

export interface VitalsFormState {
  ta: string;
  temp: string;
  poids: string;
  fc: string;
  spo2: string;
  customType: string;
  customValue: string;
  customUnit: string;
}

export interface ActeExecutionFormState {
  executionNotes: string;
  execResultType: string;
  execResultVal: string;
}
