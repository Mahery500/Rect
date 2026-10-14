/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Miroir exact de la classe Symfony App\Auth\Security\Roles
 *
 * <?php
 * namespace App\Auth\Security;
 * final class Roles {
 *     public const USER = 'ROLE_USER';
 *     public const ADMIN = 'ROLE_ADMIN';
 *     public const GESTIONNAIRE_STOCK = 'ROLE_GESTIONNAIRE_STOCK';
 *     public const RESPONSABLE_STOCK = 'ROLE_RESPONSABLE_STOCK';
 *     public const DISPENSATEUR = 'ROLE_DISPENSATEUR';
 *     public const MEDECIN = 'ROLE_MEDECIN';
 *     public const INFIRMIER = 'ROLE_INFIRMIER';
 *     public const RECEPTION = 'ROLE_RECEPTION';
 *     ...
 * }
 */

export const SYMFONY_ROLES = {
  USER: "ROLE_USER",
  ADMIN: "ROLE_ADMIN",
  GESTIONNAIRE_STOCK: "ROLE_GESTIONNAIRE_STOCK",
  RESPONSABLE_STOCK: "ROLE_RESPONSABLE_STOCK",
  DISPENSATEUR: "ROLE_DISPENSATEUR",
  MEDECIN: "ROLE_MEDECIN",
  INFIRMIER: "ROLE_INFIRMIER",
  RECEPTION: "ROLE_RECEPTION",
} as const;

export type SymfonyRole = (typeof SYMFONY_ROLES)[keyof typeof SYMFONY_ROLES];

export const SYMFONY_ROLE_LIBELLES: Record<string, string> = {
  [SYMFONY_ROLES.USER]: "Utilisateur",
  [SYMFONY_ROLES.ADMIN]: "Administrateur",
  [SYMFONY_ROLES.GESTIONNAIRE_STOCK]: "Gestionnaire de stock",
  [SYMFONY_ROLES.RESPONSABLE_STOCK]: "Responsable de stock",
  [SYMFONY_ROLES.DISPENSATEUR]: "Dispensateur",
  [SYMFONY_ROLES.MEDECIN]: "Médecin",
  [SYMFONY_ROLES.INFIRMIER]: "Infirmier",
  [SYMFONY_ROLES.RECEPTION]: "Accueil",
};

export interface SymfonyRoleItem {
  role: string;
  libelle: string;
  code: string;
  Id_role: number;
}

/**
 * Rôle Administrateur automatique
 */
export const ADMIN_ROLE_ITEM: SymfonyRoleItem = {
  role: SYMFONY_ROLES.ADMIN,
  libelle: "Administrateur",
  code: "ADMIN",
  Id_role: 1,
};

/**
 * Ensemble des rôles retournés par Roles::toList()
 */
export const ALL_SYMFONY_ROLES: SymfonyRoleItem[] = [
  { role: SYMFONY_ROLES.USER, libelle: "Utilisateur", code: "USER", Id_role: 12 },
  ADMIN_ROLE_ITEM,
  {
    role: SYMFONY_ROLES.GESTIONNAIRE_STOCK,
    libelle: "Gestionnaire de stock",
    code: "GESTIONNAIRE_STOCK",
    Id_role: 7,
  },
  {
    role: SYMFONY_ROLES.RESPONSABLE_STOCK,
    libelle: "Responsable de stock",
    code: "RESPONSABLE_STOCK",
    Id_role: 8,
  },
  { role: SYMFONY_ROLES.DISPENSATEUR, libelle: "Dispensateur", code: "DISPENSATEUR", Id_role: 9 },
  { role: SYMFONY_ROLES.MEDECIN, libelle: "Médecin", code: "MEDECIN", Id_role: 3 },
  { role: SYMFONY_ROLES.INFIRMIER, libelle: "Infirmier", code: "INFIRMIER", Id_role: 11 },
  { role: SYMFONY_ROLES.RECEPTION, libelle: "Accueil", code: "RECEPTION", Id_role: 2 },
];

/**
 * Rôles sélectionnables lors de la création d'un membre du personnel (Staff).
 * Règle stricte : "on doit ne pas pouvoir selectionner admin pour la creation de personnel"
 */
export const STAFF_SELECTABLE_ROLES: SymfonyRoleItem[] = [
  { role: SYMFONY_ROLES.MEDECIN, libelle: "Médecin", code: "MEDECIN", Id_role: 3 },
  { role: SYMFONY_ROLES.INFIRMIER, libelle: "Infirmier", code: "INFIRMIER", Id_role: 11 },
  { role: SYMFONY_ROLES.RECEPTION, libelle: "Accueil", code: "RECEPTION", Id_role: 2 },
  {
    role: SYMFONY_ROLES.GESTIONNAIRE_STOCK,
    libelle: "Gestionnaire de stock",
    code: "GESTIONNAIRE_STOCK",
    Id_role: 7,
  },
  {
    role: SYMFONY_ROLES.RESPONSABLE_STOCK,
    libelle: "Responsable de stock",
    code: "RESPONSABLE_STOCK",
    Id_role: 8,
  },
  { role: SYMFONY_ROLES.DISPENSATEUR, libelle: "Dispensateur", code: "DISPENSATEUR", Id_role: 9 },
  { role: SYMFONY_ROLES.USER, libelle: "Utilisateur", code: "USER", Id_role: 12 },
];

/**
 * Helper de libellé avec résolution prioritaire sur les rôles Symfony
 */
export function getSymfonyRoleLibelle(roleStr?: string | null): string {
  if (!roleStr) return "Utilisateur";
  if (SYMFONY_ROLE_LIBELLES[roleStr]) {
    return SYMFONY_ROLE_LIBELLES[roleStr];
  }
  const upper = roleStr.toUpperCase();
  if (SYMFONY_ROLE_LIBELLES[upper]) {
    return SYMFONY_ROLE_LIBELLES[upper];
  }
  return roleStr;
}
