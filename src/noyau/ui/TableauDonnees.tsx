/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { RefreshCw, Inbox } from "lucide-react";

export interface ColonneTableau {
  cle: string;
  entete: string;
  alignement?: "gauche" | "centre" | "droite";
  largeur?: string;
}

export interface TableauDonneesProps {
  colonnes: ColonneTableau[];
  children: React.ReactNode;
  estVide?: boolean;
  messageVide?: string;
  chargement?: boolean;
}

export const TableauDonnees: React.FC<TableauDonneesProps> = ({
  colonnes,
  children,
  estVide = false,
  messageVide = "Aucune donnée disponible.",
  chargement = false,
}) => {
  const alignClasses = {
    gauche: "text-left",
    centre: "text-center",
    droite: "text-right",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
              {colonnes.map((col) => (
                <th
                  key={col.cle}
                  style={col.largeur ? { width: col.largeur } : undefined}
                  className={`py-3 px-3.5 ${alignClasses[col.alignement || "gauche"]}`}
                >
                  {col.entete}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {chargement ? (
              <tr>
                <td colSpan={colonnes.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
                    <span>Chargement des données en cours...</span>
                  </div>
                </td>
              </tr>
            ) : estVide ? (
              <tr>
                <td colSpan={colonnes.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-6 w-6 text-slate-300" />
                    <span>{messageVide}</span>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableauDonnees;
