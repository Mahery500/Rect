/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";
import type {
  PrescriptionRequest,
  PrescriptionResponse,
  DispenserPrescriptionRequest,
} from "@/core/api-contracts";

class PrescriptionsRepository extends HttpRepository<PrescriptionResponse, PrescriptionResponse> {
  constructor() {
    super("/prescriptions");
  }

  create(payload: PrescriptionRequest) {
    return super.create(payload);
  }

  dispenser(id: number, payload: DispenserPrescriptionRequest): Promise<PrescriptionResponse> {
    return this.request<PrescriptionResponse>(`${this.resourcePath}/${id}/dispenser`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  annuler(id: number): Promise<PrescriptionResponse> {
    return this.request<PrescriptionResponse>(`${this.resourcePath}/${id}/annuler`, {
      method: "POST",
    });
  }
}

export const prescriptionsRepository = new PrescriptionsRepository();
