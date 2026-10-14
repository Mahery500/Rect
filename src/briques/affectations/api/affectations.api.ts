/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clientHttp } from "@/noyau/http/clientHttp";
import { extraireElementsCollection } from "@/noyau/http/collection";
import { ErreurApi } from "@/noyau/http/erreurApi";
import {
  AffectationPersonnel,
  OptionPersonnel,
  OptionServiceSite,
  OptionSite,
  NouvelleAffectationInput,
  ModificationAffectationInput,
} from "../modele/affectation.types";
import { AssignmentOutputApi } from "./affectations.contrats";
import {
  mapperOptionPersonnel,
  mapperOptionSite,
  mapperOptionServiceSite,
  mapperAffectationDepuisApi,
  mapperNouvelleAffectationVersApi,
  mapperModificationAffectationVersApi,
} from "./affectations.mapping";

export const affectationsApi = {
  /**
   * Récupère la liste des affectations et l'ensemble des référentiels nécessaires (staffs, users, services, sites).
   */
  listerDonnees: async (): Promise<{
    affectations: AffectationPersonnel[];
    optionsPersonnel: OptionPersonnel[];
    optionsServices: OptionServiceSite[];
    optionsSites: OptionSite[];
  }> => {
    const [resAssignments, resStaffs, resServices, resSites] = await Promise.allSettled([
      clientHttp<unknown>("/assignments", { params: { limit: 100 } }),
      clientHttp<unknown>("/staffs", { params: { limit: 100 } }),
      clientHttp<unknown>("/services"),
      clientHttp<unknown>("/sites"),
    ]);

    // Extraction des sites en premier pour enrichir services et affectations
    const elementsSites =
      resSites.status === "fulfilled" ? extraireElementsCollection<unknown>(resSites.value) : [];
    const optionsSites = elementsSites
      .map(mapperOptionSite)
      .filter((s): s is OptionSite => s !== null)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

    const dictSites = new Map<number, OptionSite>();
    optionsSites.forEach((s) => dictSites.set(s.id, s));

    // Extraction des membres du personnel hospitalier depuis /staffs
    // Règle métier : tout membre du personnel (soins, accueil, secrétariat, caisse, pharmacie, stock...)
    // peut être affecté, SAUF les administrateurs (rôle différent de ADMIN).
    const elementsStaffs =
      resStaffs.status === "fulfilled" ? extraireElementsCollection<unknown>(resStaffs.value) : [];

    const dictStaff = new Map<number, OptionPersonnel>();
    const optionsPersonnelEligibles: OptionPersonnel[] = [];

    elementsStaffs.forEach((raw) => {
      // 1. Dictionnaire complet pour la résolution des noms dans le tableau d'historique
      const pTous = mapperOptionPersonnel(raw, false);
      if (pTous) dictStaff.set(pTous.id, pTous);

      // 2. Options pour la liste déroulante d'affectation : rôle DIFFÉRENT DE ADMIN
      const pSansAdmin = mapperOptionPersonnel(raw, true);
      if (pSansAdmin) optionsPersonnelEligibles.push(pSansAdmin);
    });

    const optionsPersonnel = optionsPersonnelEligibles.sort((a, b) =>
      a.nom.localeCompare(b.nom, "fr"),
    );

    // Extraction des services avec enrichissement via dictSites
    const elementsServices =
      resServices.status === "fulfilled"
        ? extraireElementsCollection<unknown>(resServices.value)
        : [];
    const optionsServices = elementsServices
      .map((srv) => mapperOptionServiceSite(srv, dictSites))
      .filter((srv): srv is OptionServiceSite => srv !== null)
      .sort((a, b) => a.nomService.localeCompare(b.nomService, "fr"));

    const dictServices = new Map<number, OptionServiceSite>();
    optionsServices.forEach((s) => dictServices.set(s.serviceId, s));

    // Extraction et enrichissement des affectations
    let elementsAssignments: unknown[] = [];
    if (resAssignments.status === "fulfilled") {
      elementsAssignments = extraireElementsCollection<unknown>(resAssignments.value);
    } else {
      // Fallback sur /affectations si /assignments a renvoyé 404
      try {
        const fallbackAssignments = await clientHttp<unknown>("/affectations");
        elementsAssignments = extraireElementsCollection<unknown>(fallbackAssignments);
      } catch {
        elementsAssignments = [];
      }
    }

    const affectations = elementsAssignments
      .map((item) => mapperAffectationDepuisApi(item, dictStaff, dictServices, dictSites))
      .filter((aff): aff is AffectationPersonnel => aff !== null)
      .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));

    return {
      affectations,
      optionsPersonnel,
      optionsServices,
      optionsSites,
    };
  },

  /**
   * Enregistre une nouvelle affectation de personnel.
   */
  creer: async (saisie: NouvelleAffectationInput): Promise<AssignmentOutputApi> => {
    const payload = mapperNouvelleAffectationVersApi(saisie);
    let reponse: AssignmentOutputApi;

    try {
      reponse = await clientHttp<AssignmentOutputApi>("/assignments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      if (err instanceof ErreurApi && (err.statut === 404 || err.statut === 405)) {
        reponse = await clientHttp<AssignmentOutputApi>("/affectations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (err instanceof ErreurApi && err.statut === 400 && /date/i.test(err.message)) {
        // En cas de rejet du format ISO pour un champ date strict YYYY-MM-DD
        const payloadDateBrute = {
          ...payload,
          dateDebut: saisie.dateDebut.trim(),
          dateFin: saisie.dateFin ? saisie.dateFin.trim() : null,
        };
        reponse = await clientHttp<AssignmentOutputApi>("/assignments", {
          method: "POST",
          body: JSON.stringify(payloadDateBrute),
        });
      } else {
        throw err;
      }
    }

    const reponseObj = reponse as Record<string, unknown> | undefined;
    const atId =
      typeof reponseObj?.["@id"] === "string" ? (reponseObj["@id"] as string) : undefined;
    const idExtrait = Number(
      reponse?.id ?? reponse?.Id_Affectation ?? (atId ? atId.split("/").pop() : undefined),
    );

    return {
      ...reponse,
      id: Number.isFinite(idExtrait) && idExtrait > 0 ? idExtrait : 1,
    };
  },

  /**
   * Met à jour une affectation existante via PATCH /assignments/{id} (ou PUT en secours).
   */
  modifier: async (
    id: number,
    saisie: ModificationAffectationInput,
  ): Promise<AssignmentOutputApi> => {
    const payload = mapperModificationAffectationVersApi(saisie);
    let reponse: AssignmentOutputApi | undefined;

    try {
      reponse = await clientHttp<AssignmentOutputApi>(`/assignments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/merge-patch+json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      // Secours si PATCH n'est pas configuré ou endpoint différent
      if (
        err instanceof ErreurApi &&
        (err.statut === 405 || err.statut === 415 || err.statut === 404)
      ) {
        try {
          reponse = await clientHttp<AssignmentOutputApi>(`/assignments/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } catch {
          reponse = await clientHttp<AssignmentOutputApi>(`/affectations/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/merge-patch+json",
            },
            body: JSON.stringify(payload),
          });
        }
      } else {
        throw err;
      }
    }

    return reponse ?? { id };
  },

  /**
   * Supprime une affectation via DELETE /assignments/{id} (ou /affectations/{id}).
   */
  supprimer: async (id: number): Promise<void> => {
    try {
      await clientHttp<void>(`/assignments/${id}`, { method: "DELETE" });
    } catch (err: unknown) {
      if (err instanceof ErreurApi && err.statut === 404) {
        await clientHttp<void>(`/affectations/${id}`, { method: "DELETE" });
      } else {
        throw err;
      }
    }
  },
};
