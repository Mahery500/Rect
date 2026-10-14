/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Patient, Encounter, Patient_Company, Patient_Contact } from "@/core/types";

export type ReceptionTabType =
  "enregistrer" | "rechercher" | "rendezvous" | "ticketing" | "cartes" | "importation";

export interface PatientRegistrationForm {
  nom: string;
  prenom: string;
  dateN: string;
  gs: string;
  sexe?: string;
  telephone?: string;
  entreprise?: string;
  serviceId?: number;
}
