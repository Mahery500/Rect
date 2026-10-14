/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient, setStoredJwtToken, clearStoredAuth, getStoredJwtToken } from "@/core/http";
import {
  decodeJwt,
  isJwtExpired,
  setStoredStaffContext,
  getStoredStaffSiteId,
  getStoredStaffServiceId,
} from "@/core/http";
import { User_ } from "@/core/types";
import { LoginCredentials, SymfonyAuthResponse, AuthenticatedUser } from "../domain/auth.types";

/**
 * Construit un objet utilisateur à partir du payload JWT Symfony et des informations reçues
 * Pour l'administrateur (sans profil staff associé), les informations manquantes restent blanches ("").
 */
function buildUserFromJwtPayload(
  payload: any,
  fallbackUsername: string,
  extra?: {
    role?: string;
    roles?: string[];
    nom?: string;
    prenom?: string;
    siteId?: number | null;
    serviceId?: number | null;
    refreshToken?: string;
    expiresIn?: number;
    rawUser?: Partial<User_>;
  },
): AuthenticatedUser {
  const rolesSet = new Set<string>();

  if (extra?.role) {
    rolesSet.add(extra.role);
  }
  if (Array.isArray(extra?.roles)) {
    extra.roles.forEach((r) => rolesSet.add(r));
  }
  if (Array.isArray(payload?.roles)) {
    payload.roles.forEach((r: string) => rolesSet.add(r));
  }
  if (rolesSet.size === 0) {
    rolesSet.add("ROLE_USER");
  }
  const roles: string[] = Array.from(rolesSet);

  // Attribution du rôle principal
  let roleId = 1;
  const isAdmin =
    roles.includes("ROLE_ADMIN") ||
    roles.includes("ROLE_SUPER_ADMIN") ||
    extra?.role === "ROLE_ADMIN" ||
    fallbackUsername.toLowerCase() === "admin";

  if (isAdmin) {
    roleId = 1;
  } else if (
    roles.includes("ROLE_MEDECIN") ||
    roles.includes("ROLE_DOCTOR") ||
    roles.includes("ROLE_MED_GEN")
  ) {
    roleId = 3;
  } else if (roles.includes("ROLE_MED_SPEC") || roles.includes("ROLE_MED_SPEC_INT")) {
    roleId = 4;
  } else if (roles.includes("ROLE_MED_CHEF")) {
    roleId = 6;
  } else if (
    roles.includes("ROLE_INFIRMIER") ||
    roles.includes("ROLE_INFIRMIERE") ||
    roles.includes("ROLE_NURSE")
  ) {
    roleId = 11;
  } else if (
    roles.includes("ROLE_ACCUEIL") ||
    roles.includes("ROLE_RECEPTION") ||
    roles.includes("ROLE_SECRETAIRE")
  ) {
    roleId = 2;
  } else if (roles.includes("ROLE_RESPONSABLE_STOCK")) {
    roleId = 8;
  } else if (
    roles.includes("ROLE_GESTIONNAIRE_STOCK") ||
    roles.includes("ROLE_STOCK") ||
    roles.includes("ROLE_STOCK_CENTRAL")
  ) {
    roleId = 7;
  } else if (roles.includes("ROLE_PHARMACIEN") || roles.includes("ROLE_DISPENSATEUR")) {
    roleId = 9;
  }

  const username = payload?.username || payload?.identifier || fallbackUsername;
  const finalNom = (
    extra?.nom ??
    extra?.rawUser?.nom ??
    payload?.nom ??
    payload?.lastName ??
    ""
  ).trim();
  const finalPrenom = (
    extra?.prenom ??
    extra?.rawUser?.prenom ??
    payload?.prenom ??
    payload?.firstName ??
    ""
  ).trim();
  const finalEmail = (extra?.rawUser?.email ?? payload?.email ?? "").trim();

  const rawSiteId = extra?.siteId ?? (payload as any)?.siteId ?? (payload as any)?.site_id;
  const rawServiceId =
    extra?.serviceId ?? (payload as any)?.serviceId ?? (payload as any)?.service_id;
  const siteId = rawSiteId !== undefined && rawSiteId !== null ? Number(rawSiteId) : null;
  const serviceId =
    rawServiceId !== undefined && rawServiceId !== null ? Number(rawServiceId) : null;

  // Pour l'admin sans personnel, nom et prénom restent vides ("")
  // Pour le personnel soignant (ex: Dr Mahery RAM), nom et prénom sont extraits de la réponse API
  return {
    Id_User: Number(
      extra?.rawUser?.Id_User || payload?.id || payload?.user_id || (isAdmin ? 1 : 2),
    ),
    login: username,
    nom: finalNom,
    prenom: finalPrenom,
    email: finalEmail,
    Id_role: roleId,
    roles,
    role: extra?.role || roles[0],
    userType: isAdmin ? "admin" : "personnel",
    siteId,
    serviceId,
    refreshToken: extra?.refreshToken,
    expiresIn: extra?.expiresIn,
    symfonyPayload: payload,
  };
}

export const authApi = {
  /**
   * Authentification Symfony JWT / API Platform
   * Contrat reçu : { "identifier": "admin", "password": "..." }
   * Réponse type : LoginOutput { token, refreshToken, expiresIn, role: "ROLE_ADMIN" }
   */
  login: async (
    credentials: LoginCredentials,
  ): Promise<{ token: string; user: AuthenticatedUser }> => {
    const identifierValue = (
      credentials.identifier ||
      credentials.username ||
      credentials.login ||
      ""
    ).trim();

    // Contrat strict Symfony API Platform : {"identifier": "...", "password": "..."}
    const payload = {
      identifier: identifierValue,
      password: credentials.password,
    };

    let response: SymfonyAuthResponse;
    try {
      response = await apiClient<SymfonyAuthResponse>("/login", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    } catch (err: any) {
      // Si l'API utilise l'ancien format { username, password }
      if (err?.status === 400 && err?.message && /username/i.test(err.message)) {
        response = await apiClient<SymfonyAuthResponse>("/login", {
          method: "POST",
          body: JSON.stringify({
            username: identifierValue,
            password: credentials.password,
          }),
          skipAuth: true,
        });
      } else {
        throw err;
      }
    }

    const token =
      response?.token ||
      (response as any)?.jwt ||
      (response as any)?.access_token ||
      (response as any)?.accessToken;

    if (!token) {
      throw new Error(
        "Réponse de l'API Symfony invalide : aucun jeton JWT renvoyé (clé 'token' manquante).",
      );
    }

    setStoredJwtToken(token);

    const refreshToken = response?.refreshToken || response?.refresh_token;
    if (refreshToken) {
      localStorage.setItem("asina_refresh_token", refreshToken);
    }

    // Décodage du jeton pour extraire rôles et identifiant
    const decoded = decodeJwt(token);

    // Extraction et normalisation des rôles
    const rolesSet = new Set<string>();
    if (response?.role) {
      rolesSet.add(response.role);
    }
    if (Array.isArray(response?.roles)) {
      response.roles.forEach((r) => rolesSet.add(r));
    }
    if (Array.isArray(decoded?.roles)) {
      decoded.roles.forEach((r: string) => rolesSet.add(r));
    }
    if (rolesSet.size === 0) {
      rolesSet.add("ROLE_USER");
    }
    const roles = Array.from(rolesSet);

    // Extraction du siteId et serviceId pour les profils staff
    const rawSiteId =
      response?.siteId ??
      (response as any)?.site_id ??
      (decoded as any)?.siteId ??
      (decoded as any)?.site_id;
    const rawServiceId =
      response?.serviceId ??
      (response as any)?.service_id ??
      (decoded as any)?.serviceId ??
      (decoded as any)?.service_id;
    const siteId = rawSiteId !== undefined && rawSiteId !== null ? Number(rawSiteId) : null;
    const serviceId =
      rawServiceId !== undefined && rawServiceId !== null ? Number(rawServiceId) : null;

    if (siteId !== null || serviceId !== null) {
      setStoredStaffContext(siteId, serviceId);
    }

    // Construction de l'utilisateur avec extraction de nom/prénom ou laissés blancs si absent
    const user = buildUserFromJwtPayload(decoded, identifierValue, {
      role: response?.role,
      roles,
      nom: response?.nom || response?.lastName || response?.user?.nom,
      prenom: response?.prenom || response?.firstName || response?.user?.prenom,
      siteId,
      serviceId,
      refreshToken,
      expiresIn: response?.expiresIn || response?.expires_in,
      rawUser: response?.user,
    });
    user.token = token;
    user.siteId = siteId;
    user.serviceId = serviceId;

    // Sauvegarde de l'utilisateur authentifié
    localStorage.setItem("asina_logged_in_user", JSON.stringify(user));

    return { token, user };
  },

  /**
   * Récupère l'utilisateur actuellement authentifié via le token JWT ou le cache local
   */
  getCurrentUser: async (): Promise<AuthenticatedUser | null> => {
    const token = getStoredJwtToken();
    if (!token || isJwtExpired(token)) {
      clearStoredAuth();
      return null;
    }

    // Récupération depuis le cache local (préserve les métadonnées et rôles)
    const cached = localStorage.getItem("asina_logged_in_user");
    let cachedUser: AuthenticatedUser | null = null;
    if (cached) {
      try {
        cachedUser = JSON.parse(cached);
        if (cachedUser) {
          if (cachedUser.siteId === undefined) {
            cachedUser.siteId = getStoredStaffSiteId();
          }
          if (cachedUser.serviceId === undefined) {
            cachedUser.serviceId = getStoredStaffServiceId();
          }
        }
      } catch {
        // Continue
      }
    }

    // Tentative de récupération optionnelle depuis le backend (/me)
    try {
      const remoteUser = await apiClient<User_>("/me");
      if (remoteUser && remoteUser.Id_User) {
        const decoded = decodeJwt(token);
        const authUser: AuthenticatedUser = {
          ...remoteUser,
          roles: (remoteUser as any).roles || decoded?.roles || cachedUser?.roles || ["ROLE_USER"],
          role: (remoteUser as any).role || cachedUser?.role,
          token,
          siteId: (remoteUser as any).siteId ?? cachedUser?.siteId ?? getStoredStaffSiteId(),
          serviceId:
            (remoteUser as any).serviceId ?? cachedUser?.serviceId ?? getStoredStaffServiceId(),
          refreshToken: cachedUser?.refreshToken,
          expiresIn: cachedUser?.expiresIn,
          symfonyPayload: decoded,
        };
        localStorage.setItem("asina_logged_in_user", JSON.stringify(authUser));
        return authUser;
      }
    } catch {
      // Pour l'administrateur sans profil staff ou si /me n'existe pas, on utilise les données de session
    }

    if (cachedUser) {
      cachedUser.token = token;
      return cachedUser;
    }

    const decoded = decodeJwt(token);
    if (!decoded) return null;

    const fallbackUser = buildUserFromJwtPayload(decoded, decoded.username || "admin");
    fallbackUser.token = token;
    return fallbackUser;
  },

  /**
   * POST /api/refresh
   * Rafraîchit le jeton JWT expiré via le refresh token
   * Schéma API Platform : Auth.RefreshTokenRequest { "refreshToken": string }
   */
  refreshToken: async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("asina_refresh_token");
    if (!refreshToken) return null;

    try {
      const response = await apiClient<any>("/refresh", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
      });

      const newToken = response?.token || response?.jwt || response?.access_token;
      if (newToken) {
        setStoredJwtToken(newToken);
        const newRefresh = response?.refreshToken || response?.refresh_token;
        if (newRefresh) {
          localStorage.setItem("asina_refresh_token", newRefresh);
        }
        return newToken;
      }
    } catch {
      // Échec du rafraîchissement
    }
    return null;
  },

  /**
   * Déconnexion complète
   * POST /api/logout : Auth.LogoutRequest { "refreshToken": string } puis nettoyage local
   */
  logout: async (): Promise<{ success: boolean }> => {
    const refreshToken = localStorage.getItem("asina_refresh_token");
    try {
      if (refreshToken) {
        await apiClient<any>("/logout", {
          method: "POST",
          body: JSON.stringify({
            refreshToken: refreshToken,
          }),
        });
      }
    } catch {
      // Ignorer si la session est déjà invalidée ou expirée
    } finally {
      clearStoredAuth();
    }
    return { success: true };
  },
};
