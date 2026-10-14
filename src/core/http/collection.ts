/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CollectionMeta {
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
}

function isPaginationOnly(item: unknown): boolean {
  return (
    !!item &&
    typeof item === "object" &&
    "page" in (item as Record<string, unknown>) &&
    "total" in (item as Record<string, unknown>) &&
    !("id" in (item as Record<string, unknown>))
  );
}

/**
 * Extrait la liste d'éléments d'une réponse de collection, quel que soit le
 * format renvoyé par le backend Symfony :
 *  - Collection API Platform avec `member` imbriqué : `{ member: [[Item, ...], { total, page, ... }] }`
 *  - Collection JSON-LD Hydra standard : `{ member: [...] }` / `{ "hydra:member": [...] }`
 *  - Enveloppe personnalisée type `StaffListResponse` : `{ items: [...], total, ... }`
 *  - Tableau direct ou imbriqué : `[...]` ou `[[...], meta]`
 *  - Enveloppe `{ data: [...] }`
 */
export function extractCollectionItems<T = unknown>(rawData: unknown): T[] {
  if (!rawData) return [];

  if (Array.isArray(rawData)) {
    if (rawData.length > 0 && Array.isArray(rawData[0])) {
      return rawData[0] as T[];
    }
    if (
      rawData.length === 1 &&
      rawData[0] &&
      typeof rawData[0] === "object" &&
      Array.isArray((rawData[0] as { items?: unknown }).items)
    ) {
      return (rawData[0] as { items: T[] }).items;
    }
    return (rawData as unknown[]).filter(
      (item) => item && typeof item === "object" && !isPaginationOnly(item),
    ) as T[];
  }

  const body = rawData as Record<string, unknown>;
  const memberList = (body.member ?? body["hydra:member"]) as unknown[] | undefined;
  if (Array.isArray(memberList)) {
    if (memberList.length > 0 && Array.isArray(memberList[0])) {
      return memberList[0] as T[];
    }
    return memberList.filter(
      (item) => item && typeof item === "object" && !isPaginationOnly(item),
    ) as T[];
  }

  if (Array.isArray(body.items)) {
    return body.items as T[];
  }

  if (Array.isArray(body.data)) {
    return body.data as T[];
  }

  return [];
}

/**
 * Extrait les métadonnées de pagination d'une réponse de collection Symfony.
 */
export function extractCollectionMeta(rawData: unknown): CollectionMeta {
  if (!rawData || typeof rawData !== "object") return {};
  const body = rawData as Record<string, unknown>;

  if (body.total !== undefined || body.page !== undefined || body.limit !== undefined) {
    return {
      total: typeof body.total === "number" ? body.total : Number(body.total ?? 0),
      page: typeof body.page === "number" ? body.page : Number(body.page ?? 1),
      perPage:
        typeof body.limit === "number" ? body.limit : Number(body.limit ?? body.perPage ?? 20),
      totalPages:
        typeof body.totalPages === "number" ? body.totalPages : Number(body.totalPages ?? 1),
    };
  }

  const memberList = (body.member ?? body["hydra:member"]) as unknown[] | undefined;
  if (
    Array.isArray(memberList) &&
    memberList.length > 1 &&
    memberList[1] &&
    typeof memberList[1] === "object"
  ) {
    const meta = memberList[1] as Record<string, unknown>;
    return {
      total: (meta.total as number) ?? (meta.totalItems as number) ?? (body.totalItems as number),
      page: meta.page as number,
      perPage: (meta.perPage as number) ?? (meta.limit as number),
      totalPages: meta.totalPages as number,
    };
  }

  if (body.totalItems !== undefined) {
    return { total: Number(body.totalItems) };
  }

  return {};
}
