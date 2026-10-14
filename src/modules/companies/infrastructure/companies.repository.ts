/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository, extractCollectionItems } from "@/core/http";
import type { EntrepriseOutput, CreateEntrepriseInput } from "@/core/api-contracts";
import type { Company } from "../domain/company.model";

/**
 * Endpoints réels :
 *   GET    /api/entreprises            (collection)
 *   GET    /api/entreprises/{id}
 *   POST   /api/entreprises
 *   PUT    /api/entreprises/{id}
 *   DELETE /api/entreprises/{id}
 *
 * Le mapping EntrepriseOutput -> Company (legacy PascalCase, voir
 * @/core/types) est fait UNE SEULE FOIS ici, à partir du contrat réel
 * (@/core/api-contracts/identity.contracts.ts).
 */
class CompaniesRepository extends HttpRepository<Company, EntrepriseOutput> {
  constructor() {
    super("/entreprises");
  }

  protected toDomain(raw: EntrepriseOutput, indexFallback = 1): Company {
    if (!raw) {
      return {
        Id_Entreprise: indexFallback,
        Nom: `Entreprise ${indexFallback}`,
        Adresse: "",
        Contact: "",
      };
    }
    return {
      Id_Entreprise: raw.id ?? indexFallback,
      Nom: raw.nom ?? raw.raisonSociale ?? `Entreprise ${indexFallback}`,
      Adresse: raw.adresse ?? "",
      Contact: raw.contact ?? "",
      RaisonSociale: raw.raisonSociale,
      NumeroCnaps: raw.numeroCnaps,
      MatriculeAsina: raw.matriculeAsina,
      NombreAgents: raw.nombreAgents,
    };
  }

  async findAll(): Promise<Company[]> {
    const raw = await this.request<unknown>(this.resourcePath);
    const items = extractCollectionItems<EntrepriseOutput>(raw);
    return items.map((item, idx) => this.toDomain(item, idx + 1));
  }

  /** POST /api/entreprises avec le contrat réel CreateEntrepriseInput. */
  async create(payload: CreateEntrepriseInput): Promise<Company> {
    const raw = await this.request<EntrepriseOutput>(this.resourcePath, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return this.toDomain(raw);
  }

  /** PUT /api/entreprises/{id} : mise à jour d'une entreprise existante. */
  async save(id: number, company: CreateEntrepriseInput): Promise<Company> {
    const raw = await this.request<EntrepriseOutput>(`${this.resourcePath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(company),
    });
    return this.toDomain(raw, id);
  }

  /**
   * DELETE /api/entreprises/{id}.
   * Le backend renvoie 204 (sans corps) : si `request` appelle response.json()
   * sans gérer le 204, adapter `request` dans HttpRepository.
   */
  async remove(id: number | string): Promise<{ success: boolean }> {
    await this.request<unknown>(`${this.resourcePath}/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  }
}

export const companiesRepository = new CompaniesRepository();
