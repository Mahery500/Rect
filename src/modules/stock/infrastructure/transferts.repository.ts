/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpRepository } from "@/core/http";

export interface TransfertRequest {
  siteOrigineId: number;
  siteDestinationId: number;
  lotId: number;
  qte: number;
  unite: "boite" | "plaquette" | "comprime";
}

export interface TransfertResponse {
  id: number | null;
  siteOrigineId: number | null;
  siteOrigineNom: string | null;
  siteDestinationId: number | null;
  siteDestinationNom: string | null;
  lotId: number | null;
  produitId: number | null;
  quantite: number | null;
  dateTransfert: string | null;
  statut: string | null;
}
class TransfertsRepository extends HttpRepository<TransfertResponse, TransfertResponse> {
  constructor() {
    super("/transfert_resources");
  } // chemin à confirmer
  create(payload: TransfertRequest) {
    return super.create(payload);
  }
}

export const transfertsRepository = new TransfertsRepository();
