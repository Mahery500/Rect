/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository, ApiError } from "@/core/http";
import { apiClientBlob } from "@/core/http/ApiClient";
import type { PatientOutput } from "@/core/api-contracts";

/**
 * Endpoints réels (confirmés par `php bin/console debug:router`) :
 *   GET /api/patients                                      (collection, filtrable par ?idEntreprise=)
 *   GET /api/patients/{id}
 *   GET /api/patients/{id}/carte-adherent                  (PDF, 1 carte)
 *   GET /api/patients/cartes-adherents/all?idEntreprise=   (PDF, toutes les cartes d'UNE entreprise ;
 *                                                           idEntreprise est obligatoire côté backend)
 *
 * Le modèle de carte (La Sérénité / ASINA) n'est plus un paramètre : le backend
 * le déduit de la SMIE de l'entreprise du patient (choix figé à la création).
 *
 * Il n'existe PAS de POST/PUT/PATCH/DELETE sur /api/patients — voir
 * docs/API_MANQUANTES.md. `create`/`update`/`patch`/`remove` sont donc
 * surchargées pour échouer clairement plutôt que d'appeler un endpoint
 * inexistant en silence.
 *
 * Les PDF passent par `apiClientBlob` : même base URL, même JWT et mêmes
 * erreurs (401/403/réseau) que le reste de l'API.
 *
 * NB : `PatientOutput.id` est une STRING (ex: "pat_xxx"), pas un number —
 * contrairement au reste du store legacy (`@/core/types`, `Id_Patient:
 * number`). Voir docs/API_CONTRACTS.md.
 */
class PatientsRepository extends HttpRepository<PatientOutput> {
  constructor() {
    super("/patients");
  }

  /** GET /api/patients?idEntreprise=... */
  async findByEntreprise(idEntreprise: number): Promise<PatientOutput[]> {
    return this.findAll({ idEntreprise });
  }

  /** GET /api/patients/{id}/carte-adherent → PDF (modèle déduit de l'entreprise) */
  async downloadCard(id: string | number): Promise<Blob> {
    if (id === undefined || id === null || String(id).trim() === "") {
      throw new ApiError(400, "Identifiant du patient manquant : impossible de générer la carte.");
    }
    return apiClientBlob(`/patients/${encodeURIComponent(String(id))}/carte-adherent`);
  }

  /** GET /api/patients/cartes-adherents/all?idEntreprise=... → PDF des cartes d'une seule entreprise */
  async downloadCompanyCards(idEntreprise: number): Promise<Blob> {
    if (!Number.isInteger(idEntreprise) || idEntreprise <= 0) {
      throw new ApiError(
        400,
        "Identifiant d'entreprise invalide : impossible de générer les cartes.",
      );
    }
    return apiClientBlob("/patients/cartes-adherents/all", { params: { idEntreprise } });
  }

  async create(): Promise<PatientOutput> {
    throw new ApiError(
      501,
      "POST /api/patients n'existe pas côté backend. Utilisez POST /api/agents (rattacher un rôle salarié à un patient existant) ou POST /api/import-patients (import Excel) — voir docs/API_MANQUANTES.md.",
    );
  }

  async update(): Promise<PatientOutput> {
    throw new ApiError(
      501,
      "PUT /api/patients/{id} n'existe pas côté backend — voir docs/API_MANQUANTES.md.",
    );
  }

  async patch(): Promise<PatientOutput> {
    throw new ApiError(
      501,
      "PATCH /api/patients/{id} n'existe pas côté backend — voir docs/API_MANQUANTES.md.",
    );
  }

  async remove(_id?: number | string): Promise<{ success: boolean }> {
    throw new ApiError(
      501,
      "DELETE /api/patients/{id} n'existe pas côté backend — voir docs/API_MANQUANTES.md.",
    );
  }
}

export const patientsRepository = new PatientsRepository();
