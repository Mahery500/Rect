/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { extraireElementsCollection } from '@/noyau/http';
import { http } from '../api/http';
import { useRequete } from '../hooks/useRequete';
import type { PatientOption } from '../modele/types';

interface Props {
  valeur?: number;
  changer: (id: number) => void;
}

export function SelecteurPatient({ valeur, changer }: Props) {
  const patients = useRequete(
    async () => extraireElementsCollection<PatientOption>(await http.get('/api/patients')),
    [],
  );

  return (
    <label className="block text-sm">
      Patient
      <select
        className="mt-1 w-full rounded border p-2"
        value={valeur ?? ''}
        disabled={patients.isLoading}
        onChange={(e) => e.target.value && changer(Number(e.target.value))}
      >
        <option value="">Choisir un patient</option>
        {patients.data?.map((p) => (
          <option key={p.id} value={p.id}>
            {[p.nom, p.prenom].filter(Boolean).join(' ') || `Patient ${p.id}`}
            {p.matricule ? ` (${p.matricule})` : ''}
          </option>
        ))}
      </select>
      {patients.isError && <span className="text-red-600">Impossible de charger les patients.</span>}
    </label>
  );
}

/**
 * Provisoire : aucun endpoint « personnel » n'est connu. À remplacer par un
 * vrai sélecteur dès qu'il existe (GET /api/users ou équivalent).
 */
export function SelecteurStaff({ valeur, changer }: Props) {
  return (
    <label className="block text-sm">
      Identifiant du staff
      <input
        type="number"
        min={1}
        className="mt-1 w-full rounded border p-2"
        value={valeur ?? ''}
        onChange={(e) => e.target.value && changer(Number(e.target.value))}
      />
    </label>
  );
}