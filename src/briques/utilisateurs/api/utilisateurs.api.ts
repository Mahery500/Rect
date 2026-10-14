/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clientHttp } from "@/noyau/http/clientHttp";
import { extraireElementsCollection } from "@/noyau/http/collection";
import { ErreurApi } from "@/noyau/http/erreurApi";
import {
  UtilisateurCompte,
  NouveauCompteAdminInput,
  NouveauComptePersonnelInput,
  ModificationCompteInput,
} from "../modele/utilisateur.types";
import { UserOutputApi, StaffOutputApi } from "./utilisateurs.contrats";
import {
  mapperUtilisateurDepuisApi,
  mapperAdminVersApi,
  mapperPersonnelVersApi,
  mapperModificationVersApi,
} from "./utilisateurs.mapping";

// Au-delà de cette limite, l'API Platform renvoie 30 éléments par défaut.
// On demande explicitement 100 pour rester sous le plafond généralement autorisé.
const PER_PAGE = 100;

export const utilisateursApi = {
  /**
   * Récupère la liste consolidée des comptes utilisateurs.
   *
   * Source de vérité : /api/users (un enregistrement par compte).
   * Enrichissement : /api/staffs (nom, prénom) — apparié par LOGIN.
   *
   * ⚠️ staff.id ≠ user.id (tables différentes). Le login est la seule clé
   * commune fiable dans les réponses API. Apparier par id produit des doublons.
   */
  lister: async (): Promise<UtilisateurCompte[]> => {
    const [reponseUsers, reponseStaffs] = await Promise.allSettled([
      clientHttp<unknown>("/users", { params: { perPage: PER_PAGE } }),
      clientHttp<unknown>("/staffs", { params: { perPage: PER_PAGE } }),
    ]);

    const elementsUsers =
      reponseUsers.status === "fulfilled"
        ? extraireElementsCollection<Record<string, unknown>>(reponseUsers.value)
        : [];

    const elementsStaffs =
      reponseStaffs.status === "fulfilled"
        ? extraireElementsCollection<Record<string, unknown>>(reponseStaffs.value)
        : [];

    // Index du personnel par login : sert uniquement à récupérer prénom/nom.
    const indexStaffParLogin = new Map<string, { prenom: string; nom: string }>();
    for (const st of elementsStaffs) {
      const login = String(st.login ?? "")
        .trim()
        .toLowerCase();
      if (!login) continue;

      const prenom = String(st.firstName ?? st.prenom ?? "").trim();
      const nom = String(st.lastName ?? st.nom ?? "")
        .trim()
        .toUpperCase();
      indexStaffParLogin.set(login, { prenom, nom });
    }

    // Comptes consolidés, dédupliqués par login.
    const comptes: UtilisateurCompte[] = [];
    const loginsDejaVus = new Set<string>();

    for (const u of elementsUsers) {
      const login = String(u.login ?? u.username ?? "")
        .trim()
        .toLowerCase();
      if (!login || loginsDejaVus.has(login)) continue;
      loginsDejaVus.add(login);

      const compte = mapperUtilisateurDepuisApi(u, indexStaffParLogin.get(login));
      if (compte) comptes.push(compte);
    }

    // Cas résiduel : un staff existe en base sans compte /users correspondant
    // (anomalie de données — l'id user est alors inconnu, la ligne reste informative).
    // On la garde pour ne rien masquer silencieusement à l'admin.
    for (const st of elementsStaffs) {
      const login = String(st.login ?? "")
        .trim()
        .toLowerCase();
      if (!login || loginsDejaVus.has(login)) continue;
      loginsDejaVus.add(login);

      const compte = mapperUtilisateurDepuisApi(st);
      if (compte) comptes.push(compte);
    }

    return comptes.sort((a, b) => {
      const nomA = (a.nom || a.login).toLowerCase();
      const nomB = (b.nom || b.login).toLowerCase();
      return nomA.localeCompare(nomB, "fr");
    });
  },

  /**
   * Crée un compte avec rôle Administrateur système via /api/users.
   */
  creerAdmin: async (saisie: NouveauCompteAdminInput): Promise<UtilisateurCompte> => {
    const payload = mapperAdminVersApi(saisie);
    const reponse = await clientHttp<UserOutputApi>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const compte = mapperUtilisateurDepuisApi(reponse);
    if (!compte) {
      throw new ErreurApi(
        500,
        "L'API a répondu sans identifiant valide pour l'administrateur créé.",
      );
    }
    return compte;
  },

  /**
   * Crée un membre du personnel hospitalier avec compte d'accès via /api/staffs.
   */
  creerPersonnel: async (saisie: NouveauComptePersonnelInput): Promise<UtilisateurCompte> => {
    const payload = mapperPersonnelVersApi(saisie);
    const reponse = await clientHttp<StaffOutputApi>("/staffs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    let emailFinal = reponse.email ?? null;

    // Le CreateStaffRequest Symfony ne prend pas d'email : on l'ajoute via PATCH
    // sur le même enregistrement staff.
    if (saisie.email && saisie.email.trim()) {
      try {
        const patchReponse = await clientHttp<StaffOutputApi>(`/staffs/${reponse.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/merge-patch+json" },
          body: JSON.stringify({ email: saisie.email.trim() }),
        });
        emailFinal = patchReponse.email ?? saisie.email.trim();
      } catch (err) {
        console.warn("L'email n'a pas pu être associé immédiatement au profil :", err);
      }
    }

    const compte = mapperUtilisateurDepuisApi(
      { ...reponse, email: emailFinal },
      { prenom: saisie.prenom, nom: saisie.nom, login: saisie.login },
    );
    if (!compte) {
      throw new ErreurApi(
        500,
        "L'API a répondu sans identifiant valide pour le membre du personnel créé.",
      );
    }
    return compte;
  },

  /**
   * Met à jour les informations d'un compte.
   * L'identifiant passé est toujours un user.id (voir le mapper : `id` est priorisé sur `Id_User`).
   */
  modifier: async (
    id: number,
    saisie: ModificationCompteInput,
    typeCompte: "admin" | "personnel" = "admin",
  ): Promise<UtilisateurCompte> => {
    const payload = mapperModificationVersApi(saisie);
    const endpoint = typeCompte === "admin" ? `/users/${id}` : `/staffs/${id}`;
    const reponse = await clientHttp<UserOutputApi>(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    const compte = mapperUtilisateurDepuisApi(reponse);
    if (!compte) {
      throw new ErreurApi(
        500,
        "L'API a répondu sans identifiant valide lors de la mise à jour du compte.",
      );
    }
    return compte;
  },

  /**
   * Active ou désactive un compte via les routes dédiées Symfony.
   * ⚠️ Les routes {activate,deactivate} sont exposées sur /users ET /staffs ;
   * on cible le bon selon le type de compte, avec repli sur l'autre.
   */
  changerStatut: async (
    id: number,
    actif: boolean,
    typeCompte: "admin" | "personnel" = "personnel",
  ): Promise<void> => {
    const action = actif ? "activate" : "deactivate";
    const endpointPrincipal =
      typeCompte === "admin" ? `/users/${id}/${action}` : `/staffs/${id}/${action}`;
    try {
      await clientHttp<void>(endpointPrincipal, { method: "POST" });
    } catch {
      const endpointSecondaire =
        typeCompte === "admin" ? `/staffs/${id}/${action}` : `/users/${id}/${action}`;
      await clientHttp<void>(endpointSecondaire, { method: "POST" });
    }
  },

  /**
   * Supprime un compte. Pour un staff, on désactive plutôt que de supprimer :
   * les actes et diagnostics historiques y sont rattachés (FK RESTRICT).
   */
  supprimer: async (id: number, typeCompte: "admin" | "personnel" = "admin"): Promise<void> => {
    if (typeCompte === "personnel") {
      await clientHttp<void>(`/staffs/${id}/deactivate`, { method: "POST" });
    } else {
      await clientHttp<void>(`/users/${id}`, { method: "DELETE" });
    }
  },
};

export default utilisateursApi;
