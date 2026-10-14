/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User_ } from "@/core/types";
import { SymfonyJwtPayload } from "@/core/http";

export interface LoginCredentials {
  identifier?: string;
  username?: string;
  password: string;
  login?: string;
  email?: string;
}

export interface SymfonyAuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  role?: string;
  roles?: string[];
  nom?: string;
  prenom?: string;
  lastName?: string;
  firstName?: string;
  siteId?: number | null;
  serviceId?: number | null;
  refresh_token?: string;
  expires_in?: number;
  user?: Partial<User_>;
  data?: any;
  "@context"?: any;
  "@type"?: string;
  "@id"?: string;
}

export interface AuthenticatedUser extends User_ {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  role?: string;
  roles?: string[];
  siteId?: number | null;
  serviceId?: number | null;
  symfonyPayload?: SymfonyJwtPayload;
}

export interface AuthState {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
