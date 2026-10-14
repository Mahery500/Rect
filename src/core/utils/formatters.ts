/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatNumber(num: number | undefined | null, decimals = 0): string {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "0 Ar";
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Mappe et formate un code de rôle technique (ex: ROLE_MEDECIN, ROLE_ADMIN)
 * en un libellé agréable, soigné et lisible pour l'utilisateur.
 */
export function formatRoleLabel(roleCode?: string | null): string {
  if (!roleCode) return "Utilisateur";

  // Nettoyage si le libellé contient un suffixe technique type "(ROLE_...)"
  const cleaned = roleCode.replace(/\s*\(ROLE_[A-Z_]+\)/i, "").trim();

  const roleMap: Record<string, string> = {
    ROLE_USER: "Utilisateur",
    ROLE_ADMIN: "Administrateur",
    ROLE_GESTIONNAIRE_STOCK: "Gestionnaire de stock",
    ROLE_RESPONSABLE_STOCK: "Responsable de stock",
    ROLE_DISPENSATEUR: "Dispensateur",
    ROLE_MEDECIN: "Médecin",
    ROLE_INFIRMIER: "Infirmier",
    ROLE_RECEPTION: "Accueil",
    // Variantes de compatibilité
    ROLE_SUPER_ADMIN: "Super Administrateur",
    ADMIN: "Administrateur",
    ROLE_DOCTOR: "Médecin",
    ROLE_MED_GEN: "Médecin Généraliste",
    MED_GEN: "Médecin Généraliste",
    ROLE_MED_SPEC: "Médecin Spécialiste",
    ROLE_MED_CHEF: "Médecin Chef",
    ROLE_INFIRMIERE: "Infirmière",
    ROLE_NURSE: "Infirmier",
    ROLE_ACCUEIL: "Accueil",
    ROLE_SECRETAIRE: "Secrétaire Médicale",
    ROLE_STOCK: "Gestionnaire de stock",
    ROLE_PHARMACIEN: "Dispensateur / Pharmacien",
  };

  const upper = cleaned.toUpperCase();
  if (roleMap[upper]) return roleMap[upper];

  // Si le code commence par ROLE_
  if (upper.startsWith("ROLE_")) {
    const raw = upper.replace("ROLE_", "");
    if (roleMap[raw]) return roleMap[raw];
    return raw.charAt(0) + raw.slice(1).toLowerCase().replace(/_/g, " ");
  }

  return cleaned || "Utilisateur";
}

/**
 * Formate le nom d'affichage complet d'un utilisateur :
 * - Prise en compte du préfixe honorifique "Dr." pour le corps médical
 * - Rendu élégant pour l'admin sans nom/prénom ("Administrateur Système")
 */
export function formatUserDisplayName(
  user?: {
    nom?: string;
    prenom?: string;
    login?: string;
    roles?: string[];
    role?: string;
  } | null,
): string {
  if (!user) return "Utilisateur";

  const hasPrenom = Boolean(user.prenom && user.prenom.trim());
  const hasNom = Boolean(user.nom && user.nom.trim());

  const roles = [...(user.roles || []), ...(user.role ? [user.role] : [])].map((r) =>
    r.toUpperCase(),
  );

  const isDoctor = roles.some(
    (r) =>
      r.includes("MEDECIN") ||
      r.includes("DOCTOR") ||
      r.includes("MED_GEN") ||
      r.includes("MED_SPEC") ||
      r.includes("MED_CHEF"),
  );

  const isAdmin = roles.some((r) => r.includes("ADMIN")) || user.login === "admin";

  if (hasPrenom && hasNom) {
    const fullName = `${user.prenom!.trim()} ${user.nom!.trim()}`;
    return isDoctor ? `Dr. ${fullName}` : fullName;
  }

  if (hasNom) {
    const name = user.nom!.trim();
    return isDoctor ? `Dr. ${name}` : name;
  }

  if (hasPrenom) {
    const name = user.prenom!.trim();
    return isDoctor ? `Dr. ${name}` : name;
  }

  // Pour l'admin sans nom et prénom renseignés
  if (isAdmin) {
    return "Administrateur Système";
  }

  if (user.login) {
    return isDoctor ? `Dr. ${user.login}` : user.login;
  }

  return "Utilisateur";
}

/**
 * Détermine l'initiale pour l'avatar utilisateur
 */
export function getUserAvatarInitial(
  user?: {
    nom?: string;
    prenom?: string;
    login?: string;
    roles?: string[];
    role?: string;
  } | null,
): string {
  if (!user) return "U";
  if (user.prenom && user.prenom.trim()) return user.prenom.trim()[0].toUpperCase();
  if (user.nom && user.nom.trim()) return user.nom.trim()[0].toUpperCase();
  if (user.login && user.login.trim()) return user.login.trim()[0].toUpperCase();
  if (user.roles?.some((r) => r.includes("ADMIN")) || user.role?.includes("ADMIN")) return "A";
  return "U";
}

/**
 * Vérifie si un utilisateur est un compte administrateur
 */
export function isUserAdmin(
  user?: {
    Id_role?: number;
    userType?: string;
    login?: string;
    role?: string;
    roles?: string[];
  } | null,
): boolean {
  if (!user) return false;
  if (user.userType === "admin") return true;
  if (user.Id_role === 1) return true;
  if (user.login?.toLowerCase() === "admin") return true;
  if (user.role && user.role.toUpperCase().includes("ADMIN")) return true;
  if (Array.isArray(user.roles) && user.roles.some((r) => r.toUpperCase().includes("ADMIN")))
    return true;
  return false;
}

/**
 * Vérifie si un utilisateur appartient au personnel hospitalier / staff soignant
 */
export function isUserStaff(
  user?: {
    Id_role?: number;
    userType?: string;
    login?: string;
    role?: string;
    roles?: string[];
  } | null,
): boolean {
  if (!user) return false;
  return !isUserAdmin(user);
}
