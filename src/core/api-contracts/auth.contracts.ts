/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 *  CONTRATS API — généré/vérifié à partir de /api/docs.json (OpenAPI 3.1)
 * ============================================================================
 * Ce dossier (`src/core/api-contracts/`) est LA source de vérité des formes
 * de requête/réponse du backend Symfony. Chaque interface porte le même nom
 * que le schéma OpenAPI correspondant (ex: `Auth.LoginOutput` -> `LoginOutput`)
 * pour qu'on puisse s'y retrouver d'un coup d'œil en comparant avec la doc.
 *
 * QUAND LE BACKEND CHANGE : pas besoin de renvoyer tout le projet — renvoie
 * juste un export à jour de /api/docs.json (ou les schémas concernés) et ce
 * dossier sera mis à jour en conséquence. Voir docs/API_CONTRACTS.md.
 *
 * Domaine : Auth (POST /api/login, /api/refresh, /api/logout)
 */

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginOutput {
  role: string | null;
  token: string;
  refreshToken: string;
  expiresIn: number;
  nom: string | null;
  prenom: string | null;
  siteId?: number | null;
  serviceId?: number | null;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  token: string;
  expiresIn: number;
}

export interface LogoutRequest {
  refreshToken: string;
}
