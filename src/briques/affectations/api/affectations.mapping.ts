/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AffectationPersonnel,
  OptionPersonnel,
  OptionServiceSite,
  OptionSite,
  NouvelleAffectationInput,
  ModificationAffectationInput,
} from "../modele/affectation.types";
import { AssignmentInputApi, AssignmentPatchInputApi } from "./affectations.contrats";

const LIBELLES_ROLES: Record<string, string> = {
  ROLE_ADMIN: "Administrateur",
  ROLE_SUPER_ADMIN: "Super Administrateur",
  ADMIN: "Administrateur",
  ROLE_GESTIONNAIRE_STOCK: "Gestionnaire de stock",
  ROLE_RESPONSABLE_STOCK: "Responsable de stock",
  ROLE_DISPENSATEUR: "Dispensateur",
  ROLE_PHARMACIEN: "Pharmacien",
  ROLE_MEDECIN: "Médecin",
  ROLE_INFIRMIER: "Infirmier",
  ROLE_SAGE_FEMME: "Sage-femme",
  ROLE_AIDE_SOIGNANT: "Aide-soignant",
  ROLE_RECEPTION: "Accueil / Réception",
  ROLE_ACCUEIL: "Accueil",
  ROLE_SECRETAIRE: "Secrétaire médicale",
  ROLE_CAISSIER: "Caissier",
  ROLE_AGENT: "Agent hospitalier",
  ROLE_USER: "Personnel hospitalier",
};

export function mapperOptionPersonnel(
  brut: unknown,
  exclureAdmin: boolean = false,
): OptionPersonnel | null {
  if (!brut || typeof brut !== "object") return null;
  const obj = brut as Record<string, unknown>;

  // Extraction prioritaire de l'identifiant propre à l'entité Staff (clé primaire dans staff_staff / staff)
  let id = Number(
    obj.id ?? obj.Id_staff_profile ?? obj.id_staff_profile ?? obj.staffId ?? obj.staff_id,
  );

  // Si id absent ou invalide, extraction depuis l'IRI JSON-LD (ex: /api/staffs/3)
  if (!Number.isFinite(id) || id <= 0) {
    if (typeof obj["@id"] === "string" && obj["@id"].includes("/")) {
      id = Number(obj["@id"].split("/").pop());
    }
  }

  // Ne jamais utiliser user_id en aveugle si un identifiant staff existe,
  // car dans Doctrine staff.id !== user.id
  if (!Number.isFinite(id) || id <= 0) {
    id = Number(obj.Id_User ?? obj.id_user ?? obj.user_id);
  }

  if (!Number.isFinite(id) || id <= 0) return null;

  const userObj =
    typeof obj.user === "object" && obj.user ? (obj.user as Record<string, unknown>) : null;

  const prenom = String(
    obj.firstName ?? obj.prenom ?? userObj?.prenom ?? userObj?.firstName ?? "",
  ).trim();

  const nom = String(
    obj.lastName ??
      obj.nom ??
      userObj?.nom ??
      userObj?.lastName ??
      obj.login ??
      obj.username ??
      `Personnel #${id}`,
  )
    .trim()
    .toUpperCase();

  const rolesBruts = Array.isArray(obj.roles)
    ? obj.roles
    : Array.isArray(userObj?.roles)
      ? userObj.roles
      : [];
  const roles = rolesBruts.filter((r): r is string => typeof r === "string");
  const roleCode =
    roles.length > 0 ? roles[0] : typeof obj.role === "string" ? obj.role : "ROLE_USER";

  // Détection du rôle ADMIN : ROLE_ADMIN, ADMIN, ROLE_SUPER_ADMIN ou tout rôle administratif
  const estAdmin =
    roles.some((r) => {
      const u = r.toUpperCase();
      return (
        u === "ROLE_ADMIN" || u === "ADMIN" || u === "ROLE_SUPER_ADMIN" || u.endsWith("_ADMIN")
      );
    }) ||
    roleCode.toUpperCase() === "ROLE_ADMIN" ||
    roleCode.toUpperCase() === "ADMIN" ||
    roleCode.toUpperCase() === "ROLE_SUPER_ADMIN" ||
    roleCode.toUpperCase().endsWith("_ADMIN") ||
    String(obj.role ?? "").toUpperCase() === "ADMIN" ||
    String(obj.role ?? "").toUpperCase() === "ROLE_ADMIN";

  // Si exclusion demandée (liste déroulante d'affectation : tout personnel avec rôle DIFFÉRENT de ADMIN)
  if (exclureAdmin && estAdmin) {
    return null;
  }

  const role = LIBELLES_ROLES[roleCode] || roleCode.replace(/^ROLE_/, "").replace(/_/g, " ");

  return { id, nom, prenom, role };
}

export function mapperOptionSite(brut: unknown): OptionSite | null {
  if (!brut || typeof brut !== "object") return null;
  const obj = brut as Record<string, unknown>;
  const id = Number(obj.id ?? obj.Id_Site ?? obj.site_id ?? obj.idSite);
  if (!Number.isFinite(id) || id <= 0) return null;

  const nom = String(obj.name ?? obj.Libelle ?? obj.libelle ?? obj.nom ?? `Site #${id}`).trim();
  const code = String(obj.code ?? `SITE-${id}`).trim();
  return { id, nom, code };
}

export function mapperOptionServiceSite(
  brut: unknown,
  dictSites?: Map<number, OptionSite>,
): OptionServiceSite | null {
  if (!brut || typeof brut !== "object") return null;
  const obj = brut as Record<string, unknown>;
  const serviceId = Number(obj.id ?? obj.Id_Service ?? obj.id_service ?? obj.service_id);
  if (!Number.isFinite(serviceId) || serviceId <= 0) return null;

  let siteId = Number(obj.siteId ?? obj.Id_Site ?? obj.site_id ?? obj.idSite);
  if ((!Number.isFinite(siteId) || siteId <= 0) && obj.site && typeof obj.site === "object") {
    siteId = Number(
      (obj.site as Record<string, unknown>).id ?? (obj.site as Record<string, unknown>).Id_Site,
    );
  }
  if (
    (!Number.isFinite(siteId) || siteId <= 0) &&
    typeof obj.site === "string" &&
    obj.site.includes("/")
  ) {
    siteId = Number(obj.site.split("/").pop());
  }

  const typeServiceObj =
    typeof obj.typeService === "object" && obj.typeService
      ? (obj.typeService as Record<string, unknown>)
      : null;
  const nomService = String(
    obj.typeServiceName ??
      typeServiceObj?.name ??
      typeServiceObj?.nom ??
      typeServiceObj?.libelle ??
      obj.Libelle ??
      obj.libelle ??
      obj.name ??
      obj.nom ??
      obj.description ??
      `Service #${serviceId}`,
  ).trim();

  const siteObj =
    typeof obj.site === "object" && obj.site ? (obj.site as Record<string, unknown>) : null;
  const siteDirectNom = String(
    obj.siteName ?? siteObj?.name ?? siteObj?.nom ?? siteObj?.Libelle ?? "",
  ).trim();

  const siteIdFinal = Number.isFinite(siteId) && siteId > 0 ? siteId : 0;
  const siteInfo = siteIdFinal > 0 && dictSites ? dictSites.get(siteIdFinal) : undefined;
  const nomSite =
    siteDirectNom ||
    siteInfo?.nom ||
    (siteIdFinal > 0 ? `Site #${siteIdFinal}` : "Tous établissements");

  return {
    serviceId,
    nomService,
    siteId: siteIdFinal,
    nomSite,
  };
}

export function mapperAffectationDepuisApi(
  brut: unknown,
  dictionnaireStaff: Map<number, OptionPersonnel>,
  dictionnaireServices: Map<number, OptionServiceSite>,
  dictSites?: Map<number, OptionSite>,
): AffectationPersonnel | null {
  if (!brut || typeof brut !== "object") return null;
  const obj = brut as Record<string, unknown>;

  let id = Number(obj.id ?? obj.Id_Affectation ?? obj.id_affectation);
  if (!Number.isFinite(id) || id <= 0) {
    if (typeof obj["@id"] === "string" && obj["@id"].includes("/")) {
      id = Number(obj["@id"].split("/").pop());
    }
  }
  if (!Number.isFinite(id) || id <= 0) return null;

  // Extraction staffId
  let staffId = Number(obj.staffId ?? obj.Id_staff_profile ?? obj.id_staff_profile ?? obj.staff_id);
  if ((!Number.isFinite(staffId) || staffId <= 0) && obj.staff && typeof obj.staff === "object") {
    staffId = Number(
      (obj.staff as Record<string, unknown>).id ??
        (obj.staff as Record<string, unknown>).Id_staff_profile,
    );
  }
  if (
    (!Number.isFinite(staffId) || staffId <= 0) &&
    typeof obj.staff === "string" &&
    obj.staff.includes("/")
  ) {
    staffId = Number(obj.staff.split("/").pop());
  }
  if ((!Number.isFinite(staffId) || staffId <= 0) && obj.user && typeof obj.user === "object") {
    staffId = Number(
      (obj.user as Record<string, unknown>).id ?? (obj.user as Record<string, unknown>).Id_User,
    );
  }

  // Extraction serviceId
  let serviceId = Number(obj.serviceId ?? obj.Id_Service ?? obj.id_service ?? obj.service_id);
  if (
    (!Number.isFinite(serviceId) || serviceId <= 0) &&
    obj.service &&
    typeof obj.service === "object"
  ) {
    serviceId = Number(
      (obj.service as Record<string, unknown>).id ??
        (obj.service as Record<string, unknown>).Id_Service,
    );
  }
  if (
    (!Number.isFinite(serviceId) || serviceId <= 0) &&
    typeof obj.service === "string" &&
    obj.service.includes("/")
  ) {
    serviceId = Number(obj.service.split("/").pop());
  }

  const staffInfo = dictionnaireStaff.get(staffId);
  const serviceInfo = dictionnaireServices.get(serviceId);

  // Fallbacks directs si absents des dictionnaires
  const staffObj =
    typeof obj.staff === "object" && obj.staff
      ? (obj.staff as Record<string, unknown>)
      : typeof obj.user === "object" && obj.user
        ? (obj.user as Record<string, unknown>)
        : null;
  const nomPersonnel =
    staffInfo?.nom ||
    String(staffObj?.lastName ?? staffObj?.nom ?? obj.nomPersonnel ?? `Personnel #${staffId}`)
      .trim()
      .toUpperCase();
  const prenomPersonnel =
    staffInfo?.prenom ??
    String(staffObj?.firstName ?? staffObj?.prenom ?? obj.prenomPersonnel ?? "").trim();
  const rolePersonnel =
    staffInfo?.role ||
    String(
      (Array.isArray(staffObj?.roles) && staffObj.roles[0]) ||
        staffObj?.role ||
        "Personnel Hospitalier",
    )
      .replace(/^ROLE_/, "")
      .replace(/_/g, " ");

  const srvObj =
    typeof obj.service === "object" && obj.service
      ? (obj.service as Record<string, unknown>)
      : null;
  const nomService =
    serviceInfo?.nomService ||
    String(
      srvObj?.typeServiceName ??
        srvObj?.name ??
        srvObj?.nom ??
        srvObj?.Libelle ??
        obj.nomService ??
        `Service #${serviceId}`,
    ).trim();

  // Extraction siteId et nomSite
  let siteId = serviceInfo?.siteId ?? Number(obj.siteId ?? obj.Id_Site ?? obj.site_id);
  if (
    (!Number.isFinite(siteId) || siteId <= 0) &&
    srvObj?.site &&
    typeof srvObj.site === "object"
  ) {
    siteId = Number(
      (srvObj.site as Record<string, unknown>).id ??
        (srvObj.site as Record<string, unknown>).Id_Site,
    );
  }
  if ((!Number.isFinite(siteId) || siteId <= 0) && obj.site && typeof obj.site === "object") {
    siteId = Number(
      (obj.site as Record<string, unknown>).id ?? (obj.site as Record<string, unknown>).Id_Site,
    );
  }

  const siteObj =
    typeof obj.site === "object" && obj.site
      ? (obj.site as Record<string, unknown>)
      : typeof srvObj?.site === "object" && srvObj?.site
        ? (srvObj.site as Record<string, unknown>)
        : null;
  const siteInfo =
    Number.isFinite(siteId) && siteId > 0 && dictSites ? dictSites.get(siteId) : undefined;
  const nomSite =
    serviceInfo?.nomSite ||
    siteInfo?.nom ||
    String(
      siteObj?.name ??
        siteObj?.nom ??
        siteObj?.Libelle ??
        obj.nomSite ??
        (siteId > 0 ? `Site #${siteId}` : "Établissement non spécifié"),
    ).trim();

  const dateDebutBrute = String(obj.dateDebut ?? obj.DateA ?? obj.dateA ?? "").trim();
  const dateDebut = dateDebutBrute.includes("T")
    ? dateDebutBrute.split("T")[0]
    : dateDebutBrute || new Date().toISOString().split("T")[0];

  const dateFinBrute =
    (obj.dateFin ?? obj.date_fin) ? String(obj.dateFin ?? obj.date_fin).trim() : null;
  const dateFin =
    dateFinBrute && dateFinBrute.includes("T") ? dateFinBrute.split("T")[0] : dateFinBrute;

  const estPrincipal =
    typeof obj.estPrincipal === "boolean"
      ? obj.estPrincipal
      : typeof obj.isPrincipal === "boolean"
        ? obj.isPrincipal
        : true;
  const actif =
    typeof obj.active === "boolean"
      ? obj.active
      : typeof obj.isActive === "boolean"
        ? obj.isActive
        : true;
  const dateCreation = typeof obj.createdAt === "string" ? obj.createdAt : undefined;

  return {
    id,
    staffId: Number.isFinite(staffId) ? staffId : 0,
    nomPersonnel,
    prenomPersonnel,
    rolePersonnel,
    serviceId: Number.isFinite(serviceId) ? serviceId : 0,
    nomService,
    siteId: Number.isFinite(siteId) ? siteId : 0,
    nomSite,
    dateDebut,
    dateFin,
    estPrincipal,
    actif,
    dateCreation,
  };
}

export function mapperNouvelleAffectationVersApi(
  saisie: NouvelleAffectationInput,
): AssignmentInputApi {
  const dateDebut = saisie.dateDebut.includes("T")
    ? saisie.dateDebut.split("T")[0]
    : saisie.dateDebut.trim();
  const dateFin = saisie.dateFin
    ? saisie.dateFin.includes("T")
      ? saisie.dateFin.split("T")[0]
      : saisie.dateFin.trim()
    : null;

  return {
    staffId: Number(saisie.staffId),
    serviceId: Number(saisie.serviceId),
    dateDebut,
    dateFin: dateFin && dateFin.length > 0 ? dateFin : null,
    estPrincipal: Boolean(saisie.estPrincipal),
  };
}

export function mapperModificationAffectationVersApi(
  saisie: ModificationAffectationInput,
): AssignmentPatchInputApi {
  const dateDebut = saisie.dateDebut.includes("T")
    ? saisie.dateDebut.split("T")[0]
    : saisie.dateDebut.trim();
  let dateFin = saisie.dateFin
    ? saisie.dateFin.includes("T")
      ? saisie.dateFin.split("T")[0]
      : saisie.dateFin.trim()
    : null;

  // Règle métier Symfony : isActive() vérifie dateFin === null || dateFin >= today.
  // Si l'utilisateur désactive l'affectation mais n'a pas renseigné de date de fin,
  // on affecte la date d'hier pour que l'affectation soit clôturée immédiatement.
  if (saisie.actif === false && !dateFin) {
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    dateFin = hier.toISOString().split("T")[0];
  } else if (saisie.actif === true && dateFin) {
    // Si l'utilisateur réactive l'affectation sans date de fin explicite, on retire la date de fin
    dateFin = null;
  }

  return {
    staffId: Number(saisie.staffId),
    serviceId: Number(saisie.serviceId),
    dateDebut,
    dateFin: dateFin && dateFin.length > 0 ? dateFin : null,
    estPrincipal: Boolean(saisie.estPrincipal),
  };
}
