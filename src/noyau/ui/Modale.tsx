/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModaleProps {
  ouvert?: boolean;
  ouverte?: boolean;
  onFermer?: () => void;
  surFermeture?: () => void;
  titre: React.ReactNode;
  description?: React.ReactNode;
  enfants?: React.ReactNode;
  children?: React.ReactNode;
  icone?: React.ReactNode;
  pied?: React.ReactNode;
  largeurMax?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modale: React.FC<ModaleProps> = ({
  ouvert,
  ouverte,
  onFermer,
  surFermeture,
  titre,
  description,
  enfants,
  children,
  icone,
  pied,
  largeurMax = "md",
}) => {
  const estOuvert = ouvert ?? ouverte ?? false;
  const fermer = onFermer ?? surFermeture ?? (() => {});
  const contenu = enfants ?? children;

  useEffect(() => {
    if (!estOuvert) return;
    const gererTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", gererTouche);
    return () => window.removeEventListener("keydown", gererTouche);
  }, [estOuvert, fermer]);

  if (!estOuvert) return null;

  const classesLargeur: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-xl w-full ${classesLargeur[largeurMax] || "max-w-md"} max-h-[90vh] overflow-y-auto flex flex-col`}
      >
        <div className="p-4 border-b border-slate-150 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              {icone && <span className="text-asina-600 shrink-0">{icone}</span>}
              <h3>{titre}</h3>
            </div>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={fermer}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
            aria-label="Fermer la fenêtre"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs flex-1">{contenu}</div>

        {pied && (
          <div className="border-t border-slate-150 p-4 bg-slate-50/50 rounded-b-xl flex justify-end gap-2 shrink-0">
            {pied}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modale;
