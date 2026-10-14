/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useAgendas } from '../hooks/useAgendas';
import { useCreneauxDisponibles } from '../hooks/useCreneauxDisponibles';
import { useReserverRendezVous } from '../hooks/useRendezVousMutations';
import type { CreneauDisponible } from '../modele/types';

interface Props {
  /** Patient présélectionné (ex. depuis la fiche patient). */
  patientId?: number;
  /** Rendu du sélecteur patient (GET /api/patients). */
  renderSelecteurPatient: (valeur: number | undefined, changer: (id: number) => void) => React.ReactNode;
  onFermer: () => void;
}

const heure = (iso: string) => iso.slice(11, 16);

export function FormulaireRendezVousModale({ patientId: patientInitial, renderSelecteurPatient, onFermer }: Props) {
  const [patientId, setPatientId] = useState<number | undefined>(patientInitial);
  const [agendaId, setAgendaId] = useState<number>();
  const [date, setDate] = useState('');
  const [creneau, setCreneau] = useState<CreneauDisponible>();
  const [commentaire, setCommentaire] = useState('');

  const agendas = useAgendas();
  const creneaux = useCreneauxDisponibles(agendaId, date);
  const reserver = useReserverRendezVous();

  const pret = !!patientId && !!agendaId && !!creneau;

  function soumettre(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!pret) return;
    reserver.mutate(
      {
        patientId: patientId!,
        agendaId: agendaId!,
        dateRdv: creneau!.debut.slice(0, 10),
        heureRdv: heure(creneau!.debut),
        commentaire: commentaire.trim() || undefined,
      },
      {
        onSuccess: onFermer,
        // Créneau pris entre-temps : on le désélectionne, la liste est rechargée par l'invalidation.
        onError: () => setCreneau(undefined),
      },
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-rdv" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <form onSubmit={soumettre} className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <h2 id="titre-rdv" className="text-lg font-semibold">Planifier un rendez-vous</h2>

        <div>{renderSelecteurPatient(patientId, setPatientId)}</div>

        <label className="block text-sm">
          Médecin / agenda
          <select
            className="mt-1 w-full rounded border p-2"
            value={agendaId ?? ''}
            onChange={(e) => { setAgendaId(e.target.value ? Number(e.target.value) : undefined); setCreneau(undefined); }}
            disabled={agendas.isLoading}
          >
            <option value="">Choisir un agenda</option>
            {agendas.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.staffNom}{a.specialite ? ` — ${a.specialite}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Date
          <input
            type="date"
            className="mt-1 w-full rounded border p-2"
            value={date}
            onChange={(e) => { setDate(e.target.value); setCreneau(undefined); }}
          />
        </label>

        {agendaId && date && (
          <fieldset>
            <legend className="mb-1 text-sm">Créneaux disponibles</legend>
            {creneaux.isLoading && <p className="text-sm text-gray-500">Chargement des créneaux…</p>}
            {creneaux.isError && <p className="text-sm text-red-600">Impossible de charger les créneaux. Réessayez.</p>}
            {creneaux.data?.length === 0 && (
              <p className="text-sm text-gray-500">Aucun créneau libre ce jour-là. Essayez une autre date.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {creneaux.data?.map((c) => (
                <button
                  type="button"
                  key={c.debut}
                  aria-pressed={creneau?.debut === c.debut}
                  onClick={() => setCreneau(c)}
                  className={`rounded border px-3 py-1 text-sm ${creneau?.debut === c.debut ? 'bg-blue-600 text-white' : 'bg-white'}`}
                >
                  {heure(c.debut)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className="block text-sm">
          Motif
          <textarea className="mt-1 w-full rounded border p-2" rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </label>

        {reserver.isError && (
          <p role="alert" className="text-sm text-red-600">
            Réservation refusée : le créneau n'est peut-être plus libre. Choisissez-en un autre.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="rounded border px-4 py-2">Annuler</button>
          <button type="submit" disabled={!pret || reserver.isPending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {reserver.isPending ? 'Enregistrement…' : 'Planifier'}
          </button>
        </div>
      </form>
    </div>
  );
}