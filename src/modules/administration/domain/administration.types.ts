/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User_,
  Site,
  Service,
  role,
  StaffProfile,
  Produit,
  Medicament,
  Principe_Actif,
  Famille,
  Presentation,
  Conditionnement,
  Fournisseur,
  Diagnostique_def,
  CIM10_Chapitre,
} from "@/core/types";

export type AdminTabType =
  "utilisateurs" | "referentiels" | "services" | "catalogue" | "affectations" | "entreprises";

export interface AdminStats {
  totalUsers: number;
  totalSites: number;
  totalServices: number;
  totalProducts: number;
  totalDiagnostics: number;
}
