/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CodificationApi {
  codeSystem: string;
  code: string;
  libelle?: string;
  nom?: string;
}

export interface DiagnosticDefinitionApiOutput {
  id: number;
  code: string;
  libelle: string;
  actif: boolean;
  codifications: CodificationApi[];
}

export interface CreateDiagnosticDefinitionApiInput {
  code: string;
  libelle: string;
  codifications: { codeSystem: string; code: string }[];
}

export interface UpdateDiagnosticDefinitionApiInput {
  libelle?: string;
  codifications?: { codeSystem: string; code: string }[];
}

export interface CodeSystemApiOutput {
  id: number;
  code: string;
  libelle: string;
  uri?: string | null;
  actif: boolean;
  isActive?: boolean;
}
