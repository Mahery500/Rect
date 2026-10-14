/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utilitaires pour le décodage et la gestion des jetons JWT Symfony (LexikJWTAuthenticationBundle / API Platform).
 */

export interface SymfonyJwtPayload {
  username?: string;
  user_id?: number | string;
  id?: number | string;
  email?: string;
  roles?: string[];
  nom?: string;
  prenom?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Décode un token JWT en format JSON sans dépendance externe
 */
export function decodeJwt(token: string): SymfonyJwtPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn("[JWT] Échec du décodage du token:", err);
    return null;
  }
}

/**
 * Vérifie si un token JWT est expiré
 */
export function isJwtExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return false;
  // Marge de sécurité de 5 secondes
  return payload.exp * 1000 <= Date.now() + 5000;
}

/**
 * Mappe les rôles standards Symfony (ex: ROLE_ADMIN, ROLE_MEDECIN)
 * vers les autorisations fonctionnelles de l'application ASINA
 */
export function checkSymfonyPermission(
  roles: string[] = [],
  view:
    | "admin"
    | "accueil"
    | "doctor"
    | "infirmerie"
    | "stock"
    | "analysis"
    | "api_config"
    | "ticketing",
): boolean {
  if (!roles || roles.length === 0) return false;

  // Super Admin Symfony : accès total
  if (
    roles.includes("ROLE_ADMIN") ||
    roles.includes("ROLE_SUPER_ADMIN") ||
    roles.includes("ADMIN")
  ) {
    return true;
  }

  // La page de config API et de Ticketing/Support restent accessibles
  if (view === "api_config" || view === "ticketing") return true;

  switch (view) {
    case "admin":
      return (
        roles.includes("ROLE_ADMIN") ||
        roles.includes("ROLE_SUPER_ADMIN") ||
        roles.includes("ADMIN")
      );

    case "doctor":
      return (
        roles.includes("ROLE_MEDECIN") ||
        roles.includes("ROLE_DOCTOR") ||
        roles.includes("ROLE_MED_GEN") ||
        roles.includes("ROLE_MED_SPEC") ||
        roles.includes("ROLE_MED_SPEC_INT") ||
        roles.includes("ROLE_MED_SPEC_EXT") ||
        roles.includes("ROLE_MED_CHEF") ||
        roles.includes("MED_GEN") ||
        roles.includes("MED_CHEF")
      );

    case "infirmerie":
      return (
        roles.includes("ROLE_INFIRMIER") ||
        roles.includes("ROLE_INFIRMIERE") ||
        roles.includes("ROLE_NURSE") ||
        roles.includes("ROLE_PARAMED") ||
        roles.includes("ROLE_MEDECIN") ||
        roles.includes("ROLE_DOCTOR") ||
        roles.includes("INFIRMIER")
      );

    case "accueil":
      return (
        roles.includes("ROLE_ACCUEIL") ||
        roles.includes("ROLE_RECEPTION") ||
        roles.includes("ROLE_SECRETAIRE") ||
        roles.includes("ROLE_SECRETARIAT") ||
        roles.includes("ACCUEIL") ||
        roles.includes("SECRETAIRE")
      );

    case "stock":
      return (
        roles.includes("ROLE_GESTIONNAIRE_STOCK") ||
        roles.includes("ROLE_RESPONSABLE_STOCK") ||
        roles.includes("ROLE_STOCK") ||
        roles.includes("ROLE_PHARMACIEN") ||
        roles.includes("ROLE_PHARMACIE") ||
        roles.includes("ROLE_DISPENSATEUR") ||
        roles.includes("ROLE_MAGASINIER") ||
        roles.includes("STOCK_CENTRAL") ||
        roles.includes("STOCK_SITE") ||
        roles.includes("DISPENSATEUR")
      );

    case "analysis":
      return (
        roles.includes("ROLE_MED_CHEF") ||
        roles.includes("ROLE_DIRECTEUR") ||
        roles.includes("ROLE_STATISTIQUES") ||
        roles.includes("MED_CHEF")
      );

    default:
      return false;
  }
}
