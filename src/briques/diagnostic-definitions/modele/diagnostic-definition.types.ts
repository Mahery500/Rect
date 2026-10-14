/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CodificationDiagnostic {
  codeSystem: string;
  code: string;
  libelle?: string;
}

export interface CodeSystemeOption {
  id: number;
  code: string;
  libelle: string;
  uri: string | null;
  actif: boolean;
}

export interface NouveauCodeSystemeInput {
  code: string;
  libelle: string;
  uri?: string | null;
}

export interface DiagnosticDefinition {
  id: number;
  code: string;
  libelle: string;
  description: string | null;
  chapitre: string | null;
  actif: boolean;
  codifications: CodificationDiagnostic[];
  dateCreation?: string;
}

export interface NouvelleDiagnosticDefinitionInput {
  code: string;
  libelle: string;
  description?: string | null;
  chapitre?: string | null;
  actif?: boolean;
  codifications?: CodificationDiagnostic[];
}

export interface ModificationDiagnosticDefinitionInput {
  code?: string;
  libelle?: string;
  description?: string | null;
  chapitre?: string | null;
  actif?: boolean;
  codifications?: CodificationDiagnostic[];
}
