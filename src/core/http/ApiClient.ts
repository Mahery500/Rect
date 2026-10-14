/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiError } from "./ApiError";
import { getApiBaseUrl, getStoredJwtToken, notifyUnauthorized } from "./session";

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Ne pas injecter le jeton JWT ni déclencher la déconnexion automatique sur 401 */
  skipAuth?: boolean;
}

function buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let url = `${baseUrl}${cleanEndpoint}`;

  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val === undefined || val === null) return;
      const strVal = String(val).trim();
      if (strVal !== "") queryParams.append(key, strVal);
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  return url;
}

async function parseErrorBody(response: Response): Promise<{ message: string; data: unknown }> {
  let data: unknown = null;
  let message = `Erreur HTTP ${response.status}: ${response.statusText}`;

  try {
    data = await response.json();
    const body = data as Record<string, unknown>;
    if (typeof body?.message === "string") {
      message = body.message;
    } else if (typeof body?.detail === "string") {
      message = body.detail; // Format Hydra / API Platform
    } else if (body?.error) {
      message = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    }
  } catch {
    const text = await response.text().catch(() => "");
    if (text) message = text;
  }

  return { message, data };
}

function networkErrorMessage(): string {
  return `Impossible de joindre le backend Symfony sur ${getApiBaseUrl()}. Vérifiez que votre serveur tourne (ex: symfony server:start) et que le CORS est activé (NelmioCorsBundle).`;
}

/**
 * Client HTTP pour la consommation de l'API backend Symfony.
 * Gère automatiquement le JWT Bearer Token, les erreurs 401/403 et le format
 * de réponse API Platform / REST. C'est la seule couche du frontend qui parle
 * directement `fetch` — tous les modules passent par un `HttpRepository`
 * (voir HttpRepository.ts) qui s'appuie dessus.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, skipAuth, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json, application/ld+json",
    ...customHeaders,
  });

  if (!skipAuth) {
    const token = getStoredJwtToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOptions, headers });
  } catch (networkError) {
    throw new ApiError(0, networkErrorMessage(), networkError, cleanEndpoint);
  }

  if (!response.ok) {
    const { message, data } = await parseErrorBody(response);

    if (response.status === 401) {
      if (!skipAuth) notifyUnauthorized();
      throw new ApiError(
        401,
        message || "Session expirée ou identifiants invalides (401)",
        data,
        cleanEndpoint,
      );
    }
    if (response.status === 403) {
      throw new ApiError(
        403,
        message || "Accès refusé par le backend Symfony (rôle requis manquant)",
        data,
        cleanEndpoint,
      );
    }
    throw new ApiError(response.status, message, data, cleanEndpoint);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

/**
 * Variante d'apiClient pour les réponses binaires (PDF, etc.).
 * Même base URL, même JWT, mêmes erreurs que apiClient.
 */
export async function apiClientBlob(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
  const { params, headers: customHeaders, skipAuth, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const headers = new Headers({
    Accept: "application/pdf",
    ...customHeaders,
  });

  if (!skipAuth) {
    const token = getStoredJwtToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOptions, headers });
  } catch (networkError) {
    throw new ApiError(0, networkErrorMessage(), networkError, cleanEndpoint);
  }

  if (!response.ok) {
    const { message, data } = await parseErrorBody(response);

    if (response.status === 401) {
      if (!skipAuth) notifyUnauthorized();
      throw new ApiError(
        401,
        message || "Session expirée ou identifiants invalides (401)",
        data,
        cleanEndpoint,
      );
    }
    if (response.status === 403) {
      throw new ApiError(
        403,
        message || "Accès refusé par le backend Symfony (rôle requis manquant)",
        data,
        cleanEndpoint,
      );
    }
    throw new ApiError(response.status, message, data, cleanEndpoint);
  }

  return response.blob();
}

export default apiClient;
