/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export type VarianteBadge = "succes" | "danger" | "avertissement" | "info" | "neutre" | "primaire";

export interface BadgeStatutProps {
  statut?: string;
  libelle?: string;
  variante?: VarianteBadge;
  taille?: "sm" | "md";
}

export const BadgeStatut: React.FC<BadgeStatutProps> = ({
  statut,
  libelle,
  variante,
  taille = "sm",
}) => {
  // Déduction automatique de la variante si non fournie
  const deduireVariante = (st?: string): VarianteBadge => {
    if (!st) return "neutre";
    const s = st.toLowerCase();
    if (
      s.includes("actif") ||
      s.includes("valide") ||
      s.includes("termine") ||
      s.includes("succes") ||
      s.includes("ok")
    ) {
      return "succes";
    }
    if (
      s.includes("inactif") ||
      s.includes("bloque") ||
      s.includes("annule") ||
      s.includes("danger") ||
      s.includes("perime")
    ) {
      return "danger";
    }
    if (
      s.includes("attente") ||
      s.includes("alerte") ||
      s.includes("suspendu") ||
      s.includes("warn")
    ) {
      return "avertissement";
    }
    if (s.includes("cours") || s.includes("soins") || s.includes("info")) {
      return "info";
    }
    return "neutre";
  };

  const varianteFinale = variante || deduireVariante(statut);

  const stylesVariante: Record<VarianteBadge, string> = {
    succes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    avertissement: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    primaire: "bg-asina-50 text-asina-700 border-asina-200",
    neutre: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const tailleClasses = taille === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";

  const texteAffiche = libelle || statut || "—";

  return (
    <span
      className={`inline-flex items-center font-bold font-mono rounded-md border ${tailleClasses} ${stylesVariante[varianteFinale]}`}
    >
      {texteAffiche}
    </span>
  );
};

export default BadgeStatut;
