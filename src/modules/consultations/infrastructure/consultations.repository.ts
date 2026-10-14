/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import { Encounter, Diagnostique, Actes, Act_Result, Observation } from "@/core/types";

/**
 * Endpoints réels confirmés (`php bin/console debug:router`) — domaine
 * "consultation" éclaté en plusieurs ressources RESTful. Il n'existe PAS
 * de endpoint combiné `/api/consultations` : une consultation se construit
 * en enchaînant plusieurs appels (encounter -> diagnostic -> actes), c'est
 * au frontend de les orchestrer (voir `useConsultations`).
 */
class EncountersRepository extends HttpRepository<Encounter> {
  constructor() {
    super("/encounters");
  }

  /** POST /api/encounters/{id}/terminer */
  async terminer(id: number, payload: Record<string, unknown> = {}): Promise<Encounter> {
    return this.request<Encounter>(`${this.resourcePath}/${id}/terminer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Pas de PUT/DELETE exposés sur /api/encounters pour le moment.
}

class DiagnosticsRepository extends HttpRepository<Diagnostique> {
  constructor() {
    super("/diagnostics");
  }

  /** POST /api/diagnostics/{id}/statut */
  async changerStatut(id: number, statut: string): Promise<Diagnostique> {
    return this.request<Diagnostique>(`${this.resourcePath}/${id}/statut`, {
      method: "POST",
      body: JSON.stringify({ statut }),
    });
  }
}

/** Actes réellement effectués sur un patient (POST /api/acte_realises). */
class ActeRealisesRepository extends HttpRepository<Actes> {
  constructor() {
    super("/acte_realises");
  }

  /** POST /api/acte_realises/{id}/observations */
  async addObservation(
    acteRealiseId: number,
    observation: Partial<Observation>,
  ): Promise<Observation> {
    return this.request<Observation>(`${this.resourcePath}/${acteRealiseId}/observations`, {
      method: "POST",
      body: JSON.stringify(observation),
    });
  }

  /** POST /api/acte_realises/{id}/resultats */
  async addResultat(acteRealiseId: number, resultat: Partial<Act_Result>): Promise<Act_Result> {
    return this.request<Act_Result>(`${this.resourcePath}/${acteRealiseId}/resultats`, {
      method: "POST",
      body: JSON.stringify(resultat),
    });
  }
}

/** Référentiel des actes possibles (catalogue), lecture + création seulement. */
class ActeDefinitionsRepository extends HttpRepository<{ id: number; libelle: string }> {
  constructor() {
    super("/acte_definitions");
  }
}

/** Référentiel des catégories d'actes (CCAM...), lecture + création seulement. */
class CategorieActesRepository extends HttpRepository<{ id: number; libelle: string }> {
  constructor() {
    super("/categorie_actes");
  }
}

export const encountersRepository = new EncountersRepository();
export const diagnosticsRepository = new DiagnosticsRepository();
export const acteRealisesRepository = new ActeRealisesRepository();
export const acteDefinitionsRepository = new ActeDefinitionsRepository();
export const categorieActesRepository = new CategorieActesRepository();
