/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient, extractCollectionItems } from "@/core/http";
import { User_, Site, Service, TypeService, StaffProfile, Affectation } from "@/core/types";
import { isUserAdmin, formatRoleLabel } from "@/core/utils/formatters";
import { ALL_SYMFONY_ROLES, SYMFONY_ROLES } from "@/core/constants/roles";

export interface SiteInput {
  code: string;
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
}

export interface TypeServiceInput {
  code: string;
  name: string;
  description?: string | null;
}

export interface ServiceInput {
  siteId: number;
  typeServiceId: number;
  description?: string | null;
}

export interface UserQueryParams {
  page?: number;
  perPage?: string | number;
  role?: string;
  isActive?: string | boolean;
}

export interface StaffQueryParams {
  page?: number;
  perPage?: string | number;
}

export interface AssignmentQueryParams {
  page?: number;
  perPage?: string | number;
}

/**
 * Normalise un enregistrement utilisateur renvoyé par l'API Symfony / API Platform
 * Schéma attendu : User.UserOutput { id, login, email, roles, isActive, createdAt, updatedAt }
 */
export function normalizeUserFromApi(raw: any, indexFallback = 1): User_ {
  if (!raw || typeof raw !== "object") {
    return {
      Id_User: indexFallback,
      login: `user_${indexFallback}`,
      nom: "",
      prenom: "",
      Id_role: 3,
      userType: "personnel",
    };
  }

  const id = Number(raw.id ?? raw.Id_User ?? indexFallback);
  const email = raw.email ? String(raw.email) : undefined;
  // Le backend doit renvoyer "login". Le fallback ci-dessous n'est qu'un filet de sécurité
  // (il reste unique par utilisateur car App.tsx compare les logins pour fusionner les listes).
  const login = String(raw.login ?? raw.username ?? (email ? email.split("@")[0] : `user_${id}`));
  const roles: string[] = Array.isArray(raw.roles) ? raw.roles : raw.role ? [String(raw.role)] : [];

  const isAdmin =
    raw.userType === "admin" ||
    raw.Id_role === 1 ||
    roles.some((r) => String(r).toUpperCase().includes("ADMIN")) ||
    login.toLowerCase() === "admin" ||
    (raw.role && String(raw.role).toUpperCase().includes("ADMIN"));

  // Extraction nom/prénom si fournis ou déduits du login ou du rôle
  let nom = String(raw.nom ?? raw.lastName ?? raw.name ?? "").toUpperCase();
  let prenom = String(raw.prenom ?? raw.firstName ?? "");
  if (!nom && login) {
    const parts = login.split(".");
    if (parts.length > 1) {
      prenom = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      nom = parts.slice(1).join(" ").toUpperCase();
    } else if (isAdmin) {
      nom = "SYSTÈME";
      prenom = "Admin";
    } else if (roles.includes("ROLE_MEDECIN")) {
      prenom = "Médecin";
      nom = `Réf. #${id}`;
    }
  }

  const defaultRole = isAdmin ? "ROLE_ADMIN" : roles[0] || "ROLE_USER";

  return {
    Id_User: id,
    login: login,
    nom: nom,
    prenom: prenom,
    email: email,
    Id_role: Number(raw.Id_role ?? (isAdmin ? 1 : roles.includes("ROLE_MEDECIN") ? 3 : 2)),
    userType: isAdmin ? "admin" : "personnel",
    roles: roles.length > 0 ? roles : isAdmin ? ["ROLE_ADMIN"] : ["ROLE_USER"],
    role: raw.role ? String(raw.role) : defaultRole,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
  };
}

/**
 * Normalise une ressource Staff renvoyée par GET /api/staffs
 * Schéma attendu : StaffResponse { id, userId, login, email, firstName, lastName, roles, isActive, createdAt }
 *
 * IMPORTANT : staffId = id de la table staff_staff, userId = id de la table users.
 * Ce sont deux espaces d'identifiants différents.
 */
export function normalizeStaffFromApi(
  raw: any,
  indexFallback = 1,
): { profile: StaffProfile; user?: User_ } {
  const staffId = Number(raw.id ?? raw.Id_staff_profile ?? indexFallback);
  // userId fourni par le backend ; à défaut on retombe sur staffId (ancien comportement)
  const userId = Number(raw.userId ?? raw.Id_User ?? staffId);
  const firstName = String(raw.firstName ?? raw.prenom ?? "");
  const lastName = String(raw.lastName ?? raw.nom ?? `STAFF-${staffId}`).toUpperCase();
  const roles = Array.isArray(raw.roles) ? raw.roles : ["ROLE_STAFF"];
  const matricule = raw.Matricule ?? raw.matricule ?? `STF-${String(staffId).padStart(3, "0")}`;

  const login =
    raw.login ||
    (firstName && lastName
      ? `${firstName.toLowerCase().replace(/\s+/g, "")}.${lastName.toLowerCase().replace(/\s+/g, "")}`
      : `staff_${staffId}`);

  const linkedUser: User_ = {
    Id_User: userId,
    login: login,
    nom: lastName,
    prenom: firstName,
    email: raw.email,
    Id_role: roles.some((r: string) => String(r).toUpperCase().includes("ADMIN")) ? 1 : 3,
    userType: "personnel",
    roles: roles,
    role: roles[0] || "ROLE_MEDECIN",
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
  };

  const profile: StaffProfile = {
    Id_staff_profile: staffId,
    Type:
      raw.Type ??
      raw.type ??
      (roles.includes("ROLE_MEDECIN") ? "Médecin Généraliste" : "Personnel Soignant"),
    Id_Specialite: Number(raw.Id_Specialite ?? raw.specialiteId ?? 1),
    Id_User: userId,
    Matricule: matricule,
  };

  return { profile, user: linkedUser };
}

/**
 * Normalise une ressource Affectation renvoyée par GET /api/assignments
 * Conforme au schéma Assignment.AssignmentResponse { id, staffId, serviceId, dateDebut, dateFin, estPrincipal, active, createdAt }
 */
export function normalizeAssignmentFromApi(raw: any, indexFallback = 1): Affectation {
  if (!raw || typeof raw !== "object") {
    return {
      Id_Affectation: indexFallback,
      DateA: new Date().toISOString().split("T")[0],
      Id_staff_profile: 1,
      Id_Site: 1,
      Id_Service: 1,
      staffId: 1,
      serviceId: 1,
      estPrincipal: true,
      active: true,
    };
  }

  const id = Number(raw.id ?? raw.Id_Affectation ?? indexFallback);
  const staffId = Number(raw.staffId ?? raw.Id_staff_profile ?? raw.staff?.id ?? 1);
  const serviceId = Number(raw.serviceId ?? raw.Id_Service ?? raw.service?.id ?? 1);
  const siteId = Number(raw.siteId ?? raw.Id_Site ?? raw.site?.id ?? 1);

  const dateDebut = raw.dateDebut || raw.DateA || raw.dateA || new Date().toISOString();
  const dateA = String(dateDebut).includes("T")
    ? String(dateDebut).split("T")[0]
    : String(dateDebut);

  return {
    Id_Affectation: id,
    DateA: dateA,
    Id_staff_profile: staffId,
    Id_Site: siteId,
    Id_Service: serviceId,
    staffId: staffId,
    serviceId: serviceId,
    dateDebut: String(dateDebut),
    dateFin: raw.dateFin ?? null,
    estPrincipal: raw.estPrincipal !== undefined ? Boolean(raw.estPrincipal) : true,
    active: raw.active !== undefined ? Boolean(raw.active) : true,
    createdAt: raw.createdAt,
  };
}

/**
 * Normalise une ressource Site renvoyée par /api/sites
 * Conforme au schéma Site.SiteOutput { id, code, name, city, address, phone, isActive, createdAt }
 */
export function normalizeSiteFromApi(raw: any, fallbackId = 1): Site {
  if (!raw || typeof raw !== "object") {
    return {
      Id_Site: fallbackId,
      Libelle: `Site ${fallbackId}`,
      code: `SITE-${fallbackId}`,
      name: `Site ${fallbackId}`,
      city: "",
      address: null,
      phone: null,
      isActive: true,
    };
  }

  const id = Number(raw.id ?? raw.Id_Site ?? fallbackId);
  const name = String(raw.name ?? raw.Libelle ?? raw.libelle ?? `Site ${id}`);

  return {
    Id_Site: id,
    Libelle: name,
    code: raw.code ? String(raw.code) : `SITE-${id}`,
    name: name,
    city: raw.city ? String(raw.city) : "",
    address: raw.address ?? null,
    phone: raw.phone ?? null,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    createdAt: raw.createdAt,
  };
}

/**
 * Normalise une ressource TypeService renvoyée par /api/type-services
 * Conforme au schéma TypeService.TypeServiceOutput { id, code, name, description, isActive }
 */
export function normalizeTypeServiceFromApi(raw: any, fallbackId = 1): TypeService {
  if (!raw || typeof raw !== "object") {
    return {
      id: fallbackId,
      Id_Type_Service: fallbackId,
      code: `TS-${fallbackId}`,
      name: `Type Service ${fallbackId}`,
      Libelle: `Type Service ${fallbackId}`,
      description: null,
      isActive: true,
    };
  }

  const id = Number(raw.id ?? raw.Id_Type_Service ?? fallbackId);
  const name = String(raw.name ?? raw.Libelle ?? raw.libelle ?? `Type Service ${id}`);

  return {
    id: id,
    Id_Type_Service: id,
    code: raw.code ? String(raw.code) : `TS-${id}`,
    name: name,
    Libelle: name,
    description: raw.description ?? null,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
  };
}

/**
 * Normalise une ressource Service renvoyée par /api/services
 * Conforme au schéma ServiceApiResource.ServiceOutput { id, siteId, siteName, typeServiceId, typeServiceName, description, isActive, createdAt }
 */
export function normalizeServiceFromApi(raw: any, fallbackId = 1): Service {
  if (!raw || typeof raw !== "object") {
    return {
      Id_Service: fallbackId,
      Id_Site: 1,
      Libelle: `Service ${fallbackId}`,
      siteId: 1,
      typeServiceId: 1,
      isActive: true,
    };
  }

  const id = Number(raw.id ?? raw.Id_Service ?? fallbackId);
  const siteId = Number(raw.siteId ?? raw.Id_Site ?? 1);
  const typeServiceId = Number(raw.typeServiceId ?? 1);
  const typeServiceName = raw.typeServiceName ?? raw.typeService?.name ?? raw.Libelle;
  const siteName = raw.siteName ?? raw.site?.name ?? "";
  const desc = raw.description ?? null;
  const libelle = String(typeServiceName || desc || `Service ${id}`);

  return {
    Id_Service: id,
    Id_Site: siteId,
    Libelle: libelle,
    siteId: siteId,
    siteName: siteName,
    typeServiceId: typeServiceId,
    typeServiceName: typeServiceName || libelle,
    description: desc,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    createdAt: raw.createdAt,
  };
}

/**
 * Service d'administration synchronisé avec le backend Symfony
 * Exactement calqué sur les routes de php bin/console debug:router
 */
export const administrationApi = {
  // ---------------------------------------------------------------------------
  // 1. USERS : /api/users
  // ---------------------------------------------------------------------------
  getUsers: async (params?: UserQueryParams): Promise<User_[]> => {
    // Query parameters supportés : page (integer), perPage (string), isActive (string)
    // Aucun paramètre 'role' n'est envoyé au backend ; le filtrage ROLE_ADMIN est fait côté front.
    const queryParams: Record<string, any> = {};

    if (params) {
      if (params.page !== undefined && params.page !== null && Number(params.page) > 0) {
        queryParams.page = Number(params.page);
      }
      if (
        params.perPage !== undefined &&
        params.perPage !== null &&
        String(params.perPage).trim() !== ""
      ) {
        queryParams.perPage = String(params.perPage).trim();
      }
      if (
        params.isActive !== undefined &&
        params.isActive !== null &&
        String(params.isActive).trim() !== ""
      ) {
        queryParams.isActive = String(params.isActive).trim();
      }
    }

    const rawData = await apiClient<any>("/users", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    const items = extractCollectionItems(rawData);
    let users = items.map((item, idx) => normalizeUserFromApi(item, idx + 1));

    // Filtrage côté front (client-side) sur le rôle demandé (ex: ROLE_ADMIN)
    if (params?.role && typeof params.role === "string" && params.role.trim() !== "") {
      const targetRole = params.role.trim().toUpperCase();
      users = users.filter((u) => {
        const uRoles = (u.roles || []).map((r) => String(r).toUpperCase());
        if (targetRole === "ROLE_ADMIN") {
          return (
            isUserAdmin(u) ||
            uRoles.includes("ROLE_ADMIN") ||
            (u.role && String(u.role).toUpperCase().includes("ADMIN"))
          );
        }
        return (
          uRoles.includes(targetRole) || (u.role && String(u.role).toUpperCase() === targetRole)
        );
      });
    }

    return users;
  },

  getUserById: async (id: number): Promise<User_> => {
    const raw = await apiClient<any>(`/users/${id}`);
    return normalizeUserFromApi(raw, id);
  },

  getAdminUsers: async (
    params?: Omit<UserQueryParams, "role"> & { role?: string },
  ): Promise<User_[]> => {
    return administrationApi.getUsers({
      role: params?.role || "ROLE_ADMIN",
      page: params?.page ?? 1,
      perPage: params?.perPage,
      isActive: params?.isActive,
    });
  },

  createUser: async (userData: Partial<User_>): Promise<User_> => {
    const login = (userData.login || "").trim();
    if (!login) {
      throw new Error("L'identifiant de connexion est obligatoire.");
    }
    if (!userData.password) {
      throw new Error("Le mot de passe est obligatoire.");
    }

    const payload = {
      login,
      email: userData.email || `${login}@asina.mg`,
      password: userData.password,
      roles: userData.roles || (userData.Id_role === 1 ? ["ROLE_ADMIN"] : ["ROLE_USER"]),
    };

    const response = await apiClient<any>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeUserFromApi(response, userData.Id_User || Date.now());
  },

  updateUser: async (id: number, userData: Partial<User_>): Promise<User_> => {
    const payload: any = {};
    if (userData.email) payload.email = userData.email;
    if (userData.roles) payload.roles = userData.roles;
    if (userData.isActive !== undefined) payload.isActive = userData.isActive;

    const response = await apiClient<any>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return normalizeUserFromApi(response, id);
  },

  deleteUser: async (id: number): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/users/${id}`, {
      method: "DELETE",
    });
  },

  // ---------------------------------------------------------------------------
  // 2. STAFFS : /api/staffs
  // ---------------------------------------------------------------------------
  getStaffs: async (
    params?: StaffQueryParams,
  ): Promise<{ profiles: StaffProfile[]; users: User_[] }> => {
    // Le seul query param supporté est 'page' (integer)
    const queryParams: Record<string, any> = {};
    if (params?.page !== undefined && Number(params.page) > 0) {
      queryParams.page = Number(params.page);
    }

    const rawData = await apiClient<any>("/staffs", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    const items = extractCollectionItems(rawData);
    const profiles: StaffProfile[] = [];
    const users: User_[] = [];

    items.forEach((item, idx) => {
      const normalized = normalizeStaffFromApi(item, idx + 1);
      profiles.push(normalized.profile);
      if (normalized.user) {
        users.push(normalized.user);
      }
    });

    return { profiles, users };
  },

  getStaffById: async (id: number): Promise<{ profile: StaffProfile; user?: User_ }> => {
    const raw = await apiClient<any>(`/staffs/${id}`);
    return normalizeStaffFromApi(raw, id);
  },

  createStaff: async (staffData: any): Promise<StaffProfile> => {
    const prenom = (staffData.prenom || staffData.firstName || "").trim();
    const nom = (staffData.nom || staffData.lastName || "").trim();
    const login = (staffData.login || "").trim();
    const password = staffData.password;

    if (!prenom || !nom) {
      throw new Error("Le prénom et le nom sont obligatoires.");
    }
    if (!login) {
      throw new Error("L'identifiant de connexion est obligatoire.");
    }
    if (!password) {
      throw new Error("Le mot de passe est obligatoire.");
    }

    const roles =
      Array.isArray(staffData.roles) && staffData.roles.length > 0
        ? staffData.roles
        : staffData.role
          ? [staffData.role]
          : [SYMFONY_ROLES.MEDECIN];

    const payload = {
      prenom,
      nom,
      login,
      password,
      roles,
    };

    const response = await apiClient<any>("/staffs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeStaffFromApi(response).profile;
  },

  getRoles: async (): Promise<Array<{ role: string; libelle: string }>> => {
    try {
      const response = await apiClient<any>("/roles");
      const items = Array.isArray(response) ? response : response?.items || [];
      if (items.length > 0) {
        return items.map((item: any) => ({
          role: String(item.role || item.code || item),
          libelle: String(
            item.libelle || item.name || formatRoleLabel(item.role || item.code || item),
          ),
        }));
      }
    } catch {
      // Fallback local conforme à App\Auth\Security\Roles::toList()
    }
    return ALL_SYMFONY_ROLES.map((r) => ({ role: r.role, libelle: r.libelle }));
  },

  patchStaff: async (id: number, staffData: any): Promise<StaffProfile> => {
    const payload: any = {};
    if (staffData.firstName !== undefined || staffData.prenom !== undefined) {
      payload.firstName = staffData.firstName ?? staffData.prenom;
    }
    if (staffData.lastName !== undefined || staffData.nom !== undefined) {
      payload.lastName = staffData.lastName ?? staffData.nom;
    }
    if (staffData.phone !== undefined) payload.phone = staffData.phone;
    if (staffData.email !== undefined) payload.email = staffData.email;
    if (staffData.roles !== undefined) payload.roles = staffData.roles;

    const response = await apiClient<any>(`/staffs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    return normalizeStaffFromApi(response, id).profile;
  },

  deleteStaff: async (id: number): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/staffs/${id}`, {
      method: "DELETE",
    });
  },

  // ---------------------------------------------------------------------------
  // 3. ASSIGNMENTS (AFFECTATIONS) : /api/assignments
  // ---------------------------------------------------------------------------
  getAssignments: async (params?: AssignmentQueryParams): Promise<Affectation[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.page !== undefined && Number(params.page) > 0) {
      queryParams.page = Number(params.page);
    }
    const rawList = await apiClient<any>("/assignments", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    const items = extractCollectionItems(rawList);
    return items.map((item, idx) => normalizeAssignmentFromApi(item, idx + 1));
  },

  getAssignmentById: async (id: number): Promise<Affectation> => {
    const raw = await apiClient<any>(`/assignments/${id}`);
    return normalizeAssignmentFromApi(raw, id);
  },

  createAssignment: async (assignmentData: Partial<Affectation>): Promise<Affectation> => {
    const rawDate = assignmentData.dateDebut || assignmentData.DateA || new Date().toISOString();
    const dateDebut = String(rawDate).includes("T") ? String(rawDate) : `${rawDate}T08:00:00Z`;

    const payload = {
      staffId: Number(assignmentData.staffId ?? assignmentData.Id_staff_profile ?? 1),
      serviceId: Number(assignmentData.serviceId ?? assignmentData.Id_Service ?? 1),
      dateDebut: dateDebut,
      dateFin: assignmentData.dateFin ?? null,
      estPrincipal: assignmentData.estPrincipal ?? true,
    };

    const response = await apiClient<any>("/assignments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeAssignmentFromApi(response, assignmentData.Id_Affectation || Date.now());
  },

  patchAssignment: async (
    id: number,
    assignmentData: Partial<Affectation>,
  ): Promise<Affectation> => {
    const payload: any = {};
    if (assignmentData.staffId || assignmentData.Id_staff_profile) {
      payload.staffId = Number(assignmentData.staffId ?? assignmentData.Id_staff_profile);
    }
    if (assignmentData.serviceId || assignmentData.Id_Service) {
      payload.serviceId = Number(assignmentData.serviceId ?? assignmentData.Id_Service);
    }
    if (assignmentData.dateDebut || assignmentData.DateA) {
      const rawDate = assignmentData.dateDebut || assignmentData.DateA;
      payload.dateDebut = String(rawDate).includes("T") ? String(rawDate) : `${rawDate}T08:00:00Z`;
    }
    if (assignmentData.dateFin !== undefined) payload.dateFin = assignmentData.dateFin;
    if (assignmentData.estPrincipal !== undefined)
      payload.estPrincipal = assignmentData.estPrincipal;

    const response = await apiClient<any>(`/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(payload),
    });
    return normalizeAssignmentFromApi(response, id);
  },

  deleteAssignment: async (id: number): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/assignments/${id}`, {
      method: "DELETE",
    });
  },

  // ---------------------------------------------------------------------------
  // 4. SITES : /api/sites
  // ---------------------------------------------------------------------------
  getSites: async (params?: { page?: number }): Promise<Site[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.page !== undefined && Number(params.page) > 0) {
      queryParams.page = Number(params.page);
    }
    const rawList = await apiClient<any>("/sites", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    const items = extractCollectionItems(rawList);
    return items.map((item, idx) => normalizeSiteFromApi(item, idx + 1));
  },

  getSiteById: async (id: number): Promise<Site> => {
    const raw = await apiClient<any>(`/sites/${id}`);
    return normalizeSiteFromApi(raw, id);
  },

  createSite: async (siteData: Partial<Site> | SiteInput): Promise<Site> => {
    const name = String(siteData.name || (siteData as any).Libelle || "Nouveau Site Médical")
      .trim()
      .slice(0, 100);
    const code = String(siteData.code || `SITE-${Date.now().toString().slice(-4)}`)
      .trim()
      .slice(0, 20);
    const city = String(siteData.city || "Antananarivo")
      .trim()
      .slice(0, 100);

    const payload = {
      code,
      name,
      city,
      address: siteData.address ? String(siteData.address).trim().slice(0, 255) : null,
      phone: siteData.phone ? String(siteData.phone).trim().slice(0, 20) : null,
    };

    const response = await apiClient<any>("/sites", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return normalizeSiteFromApi(response, (siteData as any).Id_Site);
  },

  updateSite: async (id: number, siteData: Partial<Site> | SiteInput): Promise<Site> => {
    const name = String(siteData.name || (siteData as any).Libelle || `Site ${id}`)
      .trim()
      .slice(0, 100);
    const code = String(siteData.code || `SITE-${id}`)
      .trim()
      .slice(0, 20);
    const city = String(siteData.city || "Antananarivo")
      .trim()
      .slice(0, 100);

    const payload = {
      code,
      name,
      city,
      address: siteData.address ? String(siteData.address).trim().slice(0, 255) : null,
      phone: siteData.phone ? String(siteData.phone).trim().slice(0, 20) : null,
    };

    const response = await apiClient<any>(`/sites/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return normalizeSiteFromApi(response, id);
  },

  deleteSite: async (id: number): Promise<{ success: boolean }> => {
    await apiClient<void>(`/sites/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // 5. SERVICES : /api/services
  // ---------------------------------------------------------------------------
  getServices: async (params?: { page?: number }): Promise<Service[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.page !== undefined && Number(params.page) > 0) {
      queryParams.page = Number(params.page);
    }
    const rawList = await apiClient<any>("/services", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    const items = extractCollectionItems(rawList);
    return items.map((item, idx) => normalizeServiceFromApi(item, idx + 1));
  },

  getServiceById: async (id: number): Promise<Service> => {
    const raw = await apiClient<any>(`/services/${id}`);
    return normalizeServiceFromApi(raw, id);
  },

  createService: async (serviceData: Partial<Service> | ServiceInput): Promise<Service> => {
    const siteId = Number(serviceData.siteId ?? (serviceData as any).Id_Site ?? 1);
    const typeServiceId = Number(serviceData.typeServiceId ?? 1);
    const description = serviceData.description ? String(serviceData.description).trim() : null;

    const payload = {
      siteId,
      typeServiceId,
      description,
    };

    const response = await apiClient<any>("/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return normalizeServiceFromApi(response, (serviceData as any).Id_Service);
  },

  updateService: async (
    id: number,
    serviceData: Partial<Service> | ServiceInput,
  ): Promise<Service> => {
    const siteId = Number(serviceData.siteId ?? (serviceData as any).Id_Site ?? 1);
    const typeServiceId = Number(serviceData.typeServiceId ?? 1);
    const description = serviceData.description ? String(serviceData.description).trim() : null;

    const payload = {
      siteId,
      typeServiceId,
      description,
    };

    const response = await apiClient<any>(`/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return normalizeServiceFromApi(response, id);
  },

  deleteService: async (id: number): Promise<{ success: boolean }> => {
    await apiClient<void>(`/services/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // 6. TYPE-SERVICES : /api/type-services
  // ---------------------------------------------------------------------------
  getTypeServices: async (params?: { page?: number }): Promise<TypeService[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.page !== undefined && Number(params.page) > 0) {
      queryParams.page = Number(params.page);
    }
    const rawList = await apiClient<any>("/type-services", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    const items = extractCollectionItems(rawList);
    return items.map((item, idx) => normalizeTypeServiceFromApi(item, idx + 1));
  },

  getTypeServiceById: async (id: number): Promise<TypeService> => {
    const raw = await apiClient<any>(`/type-services/${id}`);
    return normalizeTypeServiceFromApi(raw, id);
  },

  createTypeService: async (
    data: Partial<TypeService> | TypeServiceInput,
  ): Promise<TypeService> => {
    const code = String(data.code || `TS-${Date.now().toString().slice(-4)}`)
      .trim()
      .slice(0, 20);
    const name = String(data.name || (data as any).Libelle || "Nouveau Type de Service")
      .trim()
      .slice(0, 100);
    const description = data.description ? String(data.description).trim() : null;

    const payload = {
      code,
      name,
      description,
    };

    const response = await apiClient<any>("/type-services", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return normalizeTypeServiceFromApi(response, (data as any).id);
  },

  updateTypeService: async (
    id: number,
    data: Partial<TypeService> | TypeServiceInput,
  ): Promise<TypeService> => {
    const code = String(data.code || `TS-${id}`)
      .trim()
      .slice(0, 20);
    const name = String(data.name || (data as any).Libelle || `Type Service ${id}`)
      .trim()
      .slice(0, 100);
    const description = data.description ? String(data.description).trim() : null;

    const payload = {
      code,
      name,
      description,
    };

    const response = await apiClient<any>(`/type-services/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return normalizeTypeServiceFromApi(response, id);
  },

  deleteTypeService: async (id: number): Promise<{ success: boolean }> => {
    await apiClient<void>(`/type-services/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // 7. TYPE_ACTES : /api/type_actes
  // ---------------------------------------------------------------------------
  getTypeActes: async (params?: { page?: number }): Promise<any[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.page !== undefined && Number(params.page) > 0) {
      queryParams.page = Number(params.page);
    }
    const rawList = await apiClient<any>("/type_actes", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return extractCollectionItems(rawList);
  },

  getTypeActeById: async (id: number): Promise<any> => {
    return apiClient<any>(`/type_actes/${id}`);
  },

  createTypeActe: async (data: any): Promise<any> => {
    return apiClient<any>("/type_actes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  patchTypeActe: async (id: number, data: any): Promise<any> => {
    return apiClient<any>(`/type_actes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(data),
    });
  },

  deleteTypeActe: async (id: number): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/type_actes/${id}`, {
      method: "DELETE",
    });
  },
};
