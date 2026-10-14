/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export interface OngletElement {
  id: string;
  libelle: string;
  icone?: React.ReactNode;
  badge?: number | string;
}

export interface SousOngletsProps {
  onglets: OngletElement[];
  ongletActif: string;
  onChanger: (id: string) => void;
}

export const SousOnglets: React.FC<SousOngletsProps> = ({ onglets, ongletActif, onChanger }) => {
  return (
    <div className="border-b border-slate-200 overflow-x-auto scrollbar-none font-sans">
      <div className="flex gap-1 -mb-px min-w-max pb-0.5">
        {onglets.map((onglet) => {
          const estActif = onglet.id === ongletActif;
          return (
            <button
              key={onglet.id}
              type="button"
              onClick={() => onChanger(onglet.id)}
              className={`px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition hover:cursor-pointer ${
                estActif
                  ? "border-asina-600 text-asina-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {onglet.icone && (
                <span
                  className={`h-4 w-4 shrink-0 flex items-center justify-center ${
                    estActif ? "text-asina-600" : "text-slate-400"
                  }`}
                >
                  {onglet.icone}
                </span>
              )}
              <span>{onglet.libelle}</span>
              {onglet.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    estActif ? "bg-asina-100 text-asina-800" : "bg-slate-150 text-slate-600"
                  }`}
                >
                  {onglet.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SousOnglets;
