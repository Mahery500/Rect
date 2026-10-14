/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UtilisateurCompte,
  NouveauCompteAdminInput,
  NouveauComptePersonnelInput,
  ModificationCompteInput,
  obtenirLibelleRole,
} from "../modele/utilisateur.types";
import {
  CreateUserInputApi,
  UpdateUserInputApi,
  CreateStaffInputApi,
} from "./utilisateurs.contrats";

export function mapperUtilisateurDepuisApi(
  brut: unknown,
  correspondanceStaff?: { prenom?: string; nom?: string; login?: string },
): UtilisateurCompte | null {
  if (!brut || typeof brut !== "object") {
    return null;
  }

  const obj = brut as Record<string, unknown>;
  const idBrut = obj.id ?? obj.Id_User ?? obj.Id_staff_profile ?? obj.staffId;
  const idNum = typeof idBrut === "number" ? idBrut : Number(idBrut);

  if (!Number.isFinite(idNum) || idNum <= 0) {
    return null;
  }

  const email = typeof obj.email === "string" ? obj.email.trim() : "";

  // Login : la clé d'identité de la personne, toujours en minuscules
  // (Symfony accepte n'importe quelle casse à la connexion, mais la valeur
  // stockée côté backend est en minuscules → on aligne systématiquement).
  const loginDirect = typeof obj.login === "string" ? obj.login.trim().toLowerCase() : "";
  const username = typeof obj.username === "string" ? obj.username.trim().toLowerCase() : "";
  const loginStaff = correspondanceStaff?.login?.trim().toLowerCase() ?? "";
  const loginDepuisEmail = email ? email.split("@")[0].trim().toLowerCase() : "";

  const login = loginDirect || username || loginStaff || loginDepuisEmail || `user_${idNum}`;

  // Rôles bruts tels que renvoyés par l'API Symfony
  const rolesBruts = Array.isArray(obj.roles) ? obj.roles : [];
  const roles = rolesBruts
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    .map((r) => r.trim().toUpperCase());

  if (roles.length === 0) {
    roles.push("ROLE_USER");
  }

  // Détection admin : on regarde les rôles ET le login historique 'admin'.
  const estSuperAdmin = roles.includes("ROLE_SUPER_ADMIN");
  const estAdmin = estSuperAdmin || roles.includes("ROLE_ADMIN") || login === "admin";

  // Cohérence : si on classe le compte « admin » mais que le tableau roles
  // ne contient aucun rôle d'administration, on l'aligne pour que les
  // consommateurs en aval (filtres, helpers) voient la même vérité.
  if (estAdmin && !roles.includes("ROLE_ADMIN") && !roles.includes("ROLE_SUPER_ADMIN")) {
    roles.push("ROLE_ADMIN");
  }

  const rolePrincipal = estSuperAdmin ? "ROLE_SUPER_ADMIN" : estAdmin ? "ROLE_ADMIN" : roles[0];
  const libelleRole = obtenirLibelleRole(rolePrincipal);

  // Nom et prénom — on accepte plusieurs variantes (API Platform / legacy)
  let nomBrut = String(obj.nom ?? obj.lastName ?? "").trim();
  let prenomBrut = String(obj.prenom ?? obj.firstName ?? "").trim();

  if (!nomBrut && correspondanceStaff?.nom) {
    nomBrut = correspondanceStaff.nom.trim();
  }
  if (!prenomBrut && correspondanceStaff?.prenom) {
    prenomBrut = correspondanceStaff.prenom.trim();
  }

  // Déduction de secours à partir du login (ex. 'jean.dupont')
  if (!nomBrut && login.includes(".")) {
    const parts = login.split(".");
    prenomBrut = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    nomBrut = parts.slice(1).join(" ").toUpperCase();
  }

  const nom = nomBrut.toUpperCase();
  const prenom = prenomBrut;

  const actif = typeof obj.isActive === "boolean" ? obj.isActive : true;
  const dateCreation = typeof obj.createdAt === "string" ? obj.createdAt : undefined;

  return {
    id: idNum,
    login,
    email,
    nom,
    prenom,
    roles,
    rolePrincipal,
    libelleRole,
    actif,
    typeCompte: estAdmin ? "admin" : "personnel",
    dateCreation,
  };
}

export function mapperAdminVersApi(saisie: NouveauCompteAdminInput): CreateUserInputApi {
  return {
    login: saisie.login.trim().toLowerCase(),
    email: saisie.email.trim(),
    password: saisie.motDePasse.trim(),
    roles: ["ROLE_ADMIN"],
  };
}

export function mapperPersonnelVersApi(saisie: NouveauComptePersonnelInput): CreateStaffInputApi {
  return {
    prenom: saisie.prenom.trim(),
    nom: saisie.nom.trim().toUpperCase(),
    login: saisie.login.trim().toLowerCase(),
    password: saisie.motDePasse.trim(),
    roles: [saisie.role],
  };
}

export function mapperModificationVersApi(saisie: ModificationCompteInput): UpdateUserInputApi {
  const payload: UpdateUserInputApi = {};
  if (saisie.email !== undefined) {
    payload.email = saisie.email.trim() || null;
  }
  if (saisie.roles !== undefined) {
    payload.roles = [...saisie.roles];
  }
  if (saisie.actif !== undefined) {
    payload.isActive = saisie.actif;
  }
  return payload;
}
