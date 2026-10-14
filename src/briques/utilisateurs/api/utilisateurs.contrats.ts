/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Schémas bruts des requêtes et réponses de l'API Symfony pour /api/users et /api/staffs.
 */

export interface UserOutputApi {
  id: number;
  email: string | null;
  roles: (string | null)[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  // Variantes possibles selon sérialisation Symfony
  login?: string;
  username?: string;
  nom?: string;
  prenom?: string;
}

export interface CreateUserInputApi {
  login: string;
  email: string;
  password: string;
  roles?: (string | null)[];
}

export interface UpdateUserInputApi {
  email?: string | null;
  roles?: (string | null)[] | null;
  isActive?: boolean | null;
}

export interface StaffOutputApi {
  id: number;
  prenom: string;
  nom: string;
  email: string | null;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  // Variantes de compatibilité
  login?: string;
  firstName?: string;
  lastName?: string;
}

export interface CreateStaffInputApi {
  prenom: string;
  nom: string;
  login: string;
  password: string;
  roles: string[];
}

export interface UpdateStaffInputApi {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  roles?: string[] | null;
}

export interface UpdateStaffRolesInputApi {
  roles: string[];
}

export interface ResetStaffPasswordInputApi {
  newPassword: string;
}
