/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { UserRound, MapPin } from "lucide-react";
import type { FournisseurResource } from "../application/useStock";

interface FournisseurListProps {
  fournisseurs: FournisseurResource[];
  loading: boolean;
}

export const FournisseurList: React.FC<FournisseurListProps> = ({ fournisseurs, loading }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h3 className="text-base font-semibold text-gray-900 mb-4">Fournisseurs existants</h3>
    <div className="space-y-2">
      {fournisseurs.map((fournisseur) => (
        <div key={fournisseur.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
          <div className="text-sm font-medium text-gray-900">{fournisseur.nom}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
            {fournisseur.contact && (
              <span className="flex items-center gap-1">
                <UserRound className="h-3 w-3" /> {fournisseur.contact}
              </span>
            )}
            {fournisseur.adresse && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {fournisseur.adresse}
              </span>
            )}
          </div>
        </div>
      ))}
      {fournisseurs.length === 0 && !loading && (
        <p className="text-sm text-gray-400">Aucun fournisseur pour l'instant.</p>
      )}
    </div>
  </div>
);

export default FournisseurList;
