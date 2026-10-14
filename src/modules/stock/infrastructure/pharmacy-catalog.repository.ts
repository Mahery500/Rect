/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import type {
  FamilleResource,
  PrincipeActifResource,
  MedicamentRequest,
  MedicamentResponse,
  ProduitRequest,
  ProduitResponse,
  PresentationResource,
  ConditionnementResource,
} from "@/core/api-contracts";

/**
 * Référentiel pharmaceutique — endpoints réels (routing + OpenAPI), tous en
 * CRUD complet (GET collection/item, POST, PUT, DELETE) :
 *
 *   /api/famille_resources          -> { id, libelle }
 *   /api/principe_actif_resources   -> { id, libelle }
 *   /api/medicament_resources       -> { familleId, presentationId } (+ libellés dérivés en lecture)
 *   /api/produit_resources          -> { nomCommercial, medicamentId, conditionnementId, principeActifIds[] }
 *   /api/presentation_resources     -> { id, libelle, code }
 *   /api/conditionnement_resources  -> { id, libelle }
 *   /api/fournisseur_resources      -> { id, libelle }
 */

class FamillesRepository extends HttpRepository<FamilleResource> {
  constructor() {
    super("/famille_resources");
  }
}

class PrincipesActifsRepository extends HttpRepository<PrincipeActifResource> {
  constructor() {
    super("/principe_actif_resources");
  }
}

class MedicamentsRepository extends HttpRepository<MedicamentResponse, MedicamentResponse> {
  constructor() {
    super("/medicament_resources");
  }
  create(payload: MedicamentRequest) {
    return super.create(payload);
  }
  update(id: number | string, payload: MedicamentRequest) {
    return super.update(id, payload);
  }
}

class ProduitsRepository extends HttpRepository<ProduitResponse, ProduitResponse> {
  constructor() {
    super("/produit_resources");
  }
  create(payload: ProduitRequest) {
    return super.create(payload);
  }
  update(id: number | string, payload: ProduitRequest) {
    return super.update(id, payload);
  }
}

class PresentationsRepository extends HttpRepository<PresentationResource> {
  constructor() {
    super("/presentation_resources");
  }
}

class ConditionnementsRepository extends HttpRepository<ConditionnementResource> {
  constructor() {
    super("/conditionnement_resources");
  }
}

export const famillesRepository = new FamillesRepository();
export const principesActifsRepository = new PrincipesActifsRepository();
export const medicamentsRepository = new MedicamentsRepository();
export const produitsRepository = new ProduitsRepository();
export const presentationsRepository = new PresentationsRepository();
export const conditionnementsRepository = new ConditionnementsRepository();
