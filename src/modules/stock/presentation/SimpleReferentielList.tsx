/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface SimpleReferentielItem {
  id: string | number;
  libelle: string;
}

interface SimpleReferentielListProps {
  title: string;
  items: SimpleReferentielItem[];
  loading: boolean;
  emptyLabel: string;
}

export const SimpleReferentielList: React.FC<SimpleReferentielListProps> = ({
  title,
  items,
  loading,
  emptyLabel,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
    <ul className="space-y-1 text-sm text-gray-700">
      {items.map((item) => (
        <li key={item.id} className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50/50">
          {item.libelle}
        </li>
      ))}
    </ul>
    {items.length === 0 && !loading && <p className="text-sm text-gray-400 mt-2">{emptyLabel}</p>}
  </div>
);

export default SimpleReferentielList;
