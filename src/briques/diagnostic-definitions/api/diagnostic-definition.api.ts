/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clientHttp } from "@/noyau/http/clientHttp";
import { extraireElementsCollection } from "@/noyau/http/collection";
import {
  DiagnosticDefinition,
  NouvelleDiagnosticDefinitionInput,
  ModificationDiagnosticDefinitionInput,
  CodificationDiagnostic,
  CodeSystemeOption,
  NouveauCodeSystemeInput,
} from "../modele/diagnostic-definition.types";
import {
  DiagnosticDefinitionApiOutput,
  CreateDiagnosticDefinitionApiInput,
  UpdateDiagnosticDefinitionApiInput,
  CodeSystemApiOutput,
} from "./diagnostic-definition.contrats";
import { mapperDiagnosticDefinition, mapperCodeSystem } from "./diagnostic-definition.mapping";

export const diagnosticDefinitionApi = {
  /**
   * Récupère la liste des définitions de diagnostics (GET /diagnostic_definitions).
   * Possibilité de filtrer sur actif=true si demandé.
   */
  async listerDefinitions(actifUniquement = false): Promise<DiagnosticDefinition[]> {
    const reponse = await clientHttp<unknown>("/diagnostic_definitions", {
      params: actifUniquement ? { actif: "true" } : undefined,
    });
    const items = extraireElementsCollection<unknown>(reponse);
    return items.map(mapperDiagnosticDefinition);
  },

  /**
   * Obtient le détail d'une définition de diagnostic (GET /diagnostic_definitions/{id}).
   */
  async obtenirDefinition(id: number): Promise<DiagnosticDefinition> {
    const reponse = await clientHttp<DiagnosticDefinitionApiOutput>(
      `/diagnostic_definitions/${id}`,
    );
    return mapperDiagnosticDefinition(reponse);
  },

  /**
   * Crée une nouvelle définition de diagnostic (POST /diagnostic_definitions).
   * Backend attend : { code: string, libelle: string, codifications: [{ codeSystem: string, code: string }] }
   */
  async creerDefinition(saisie: NouvelleDiagnosticDefinitionInput): Promise<DiagnosticDefinition> {
    const payload: CreateDiagnosticDefinitionApiInput = {
      code: saisie.code.trim().toUpperCase(),
      libelle: saisie.libelle.trim(),
      codifications: (saisie.codifications || []).map((c) => ({
        codeSystem: c.codeSystem.trim().toUpperCase(),
        code: c.code.trim().toUpperCase(),
      })),
    };

    const reponse = await clientHttp<DiagnosticDefinitionApiOutput>("/diagnostic_definitions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapperDiagnosticDefinition(reponse);
  },

  /**
   * Modifie une définition de diagnostic existante (PATCH /diagnostic_definitions/{id}).
   * Backend attend : { libelle?: string, codifications?: [{ codeSystem: string, code: string }] }
   */
  async modifierDefinition(
    id: number,
    saisie: ModificationDiagnosticDefinitionInput,
  ): Promise<DiagnosticDefinition> {
    const payload: UpdateDiagnosticDefinitionApiInput = {};
    if (saisie.libelle !== undefined) {
      payload.libelle = saisie.libelle.trim();
    }
    if (saisie.codifications !== undefined) {
      payload.codifications = saisie.codifications.map((c) => ({
        codeSystem: c.codeSystem.trim().toUpperCase(),
        code: c.code.trim().toUpperCase(),
      }));
    }

    const reponse = await clientHttp<DiagnosticDefinitionApiOutput>(
      `/diagnostic_definitions/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return mapperDiagnosticDefinition(reponse);
  },

  /**
   * Active ou désactive une définition de diagnostic.
   * Endpoint Symfony dédié : POST /diagnostic_definitions/{id}/activation { "actif": boolean }
   */
  async changerActivation(id: number, actif: boolean): Promise<DiagnosticDefinition> {
    const reponse = await clientHttp<DiagnosticDefinitionApiOutput>(
      `/diagnostic_definitions/${id}/activation`,
      {
        method: "POST",
        body: JSON.stringify({ actif }),
      },
    );
    return mapperDiagnosticDefinition(reponse);
  },

  /**
   * Associe ou remplace les codifications externes (CIM-10, SNOMED, etc.) de la définition.
   * Tente en premier PUT /diagnostic_definitions/{id}/codifications puis bascule sur PATCH /diagnostic_definitions/{id}.
   */
  async definirCodifications(
    id: number,
    codifications: CodificationDiagnostic[],
  ): Promise<DiagnosticDefinition> {
    const codifsList = codifications.map((c) => ({
      codeSystem: c.codeSystem.trim().toUpperCase(),
      code: c.code.trim().toUpperCase(),
    }));

    try {
      const reponsePut = await clientHttp<DiagnosticDefinitionApiOutput>(
        `/diagnostic_definitions/${id}/codifications`,
        {
          method: "PUT",
          body: JSON.stringify({ codifications: codifsList }),
        },
      );
      return mapperDiagnosticDefinition(reponsePut);
    } catch {
      // Fallback vers PATCH /diagnostic_definitions/{id}
      const reponsePatch = await clientHttp<DiagnosticDefinitionApiOutput>(
        `/diagnostic_definitions/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ codifications: codifsList }),
        },
      );
      return mapperDiagnosticDefinition(reponsePatch);
    }
  },

  /**
   * Liste les systèmes de codification disponibles (GET /code_systems).
   */
  async listerCodeSystems(actifUniquement = true): Promise<CodeSystemeOption[]> {
    const reponse = await clientHttp<unknown>("/code_systems", {
      params: actifUniquement ? { actif: "true" } : undefined,
    });
    const elements = extraireElementsCollection<CodeSystemApiOutput>(reponse);
    return elements.map(mapperCodeSystem);
  },

  /**
   * Enregistre un nouveau système de codification (POST /code_systems).
   */
  async creerCodeSystem(saisie: NouveauCodeSystemeInput): Promise<CodeSystemeOption> {
    const reponse = await clientHttp<CodeSystemApiOutput>("/code_systems", {
      method: "POST",
      body: JSON.stringify({
        code: saisie.code.trim().toUpperCase(),
        libelle: saisie.libelle.trim(),
        uri: saisie.uri?.trim() || null,
        actif: true,
      }),
    });
    return mapperCodeSystem(reponse);
  },

  /**
   * Active ou désactive un système de codification (POST /code_systems/{id}/activation).
   */
  async changerActivationCodeSystem(id: number, actif: boolean): Promise<CodeSystemeOption> {
    const reponse = await clientHttp<CodeSystemApiOutput>(`/code_systems/${id}/activation`, {
      method: "POST",
      body: JSON.stringify({ actif }),
    });
    return mapperCodeSystem(reponse);
  },
};
