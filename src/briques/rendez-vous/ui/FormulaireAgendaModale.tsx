/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useEnregistrerAgenda } from '../hooks/useAgendas';
import type { Agenda, PlageHebdomadaire } from '../modele/types';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

interface Props {
  /** Agenda existant à modifier ; absent = création. */
  agenda?: Agenda;
  /** Rendu du sélecteur de staff (référentiel du personnel). */
  renderSelecteurStaff: (valeur: number | undefined, changer: (id: number) => void) => React.ReactNode;
  onFermer: () => void;
}

type Ligne = { actif: boolean; heureDebut: string; heureFin: string };

const ligneParDefaut = (i: number): Ligne => ({ actif: i < 5, heureDebut: '08:00', heureFin: '16:00' });

export function FormulaireAgendaModale({ agenda, renderSelecteurStaff, onFermer }: Props) {
  const [staffId, setStaffId] = useState<number | undefined>(agenda?.staffId);
  const [duree, setDuree] = useState(30);
  const [lignes, setLignes] = useState<Ligne[]>(() => JOURS.map((_, i) => ligneParDefaut(i)));
  const enregistrer = useEnregistrerAgenda();

  const maj = (i: number, patch: Partial<Ligne>) =>
    setLignes((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const plages: PlageHebdomadaire[] = lignes
    .map((l, i) => ({ ...l, jour: (i + 1) as PlageHebdomadaire['jour'] }))
    .filter((l) => l.actif)
    .map(({ jour, heureDebut, heureFin }) => ({ jour, heureDebut, heureFin }));

  const horairesValides = lignes.every((l) => !l.actif || l.heureDebut < l.heureFin);
  const pret = !!staffId && plages.length > 0 && duree > 0 && horairesValides;

  function soumettre(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!pret) return;
    enregistrer.mutate(
      { id: agenda?.id, input: { staffId: staffId!, dureeCreneauMinutes: duree, plages } },
      { onSuccess: onFermer },
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titre-agenda" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <form onSubmit={soumettre} className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <h2 id="titre-agenda" className="text-lg font-semibold">
          {agenda ? "Modifier l'agenda" : 'Créer un agenda'}
        </h2>

        <div>{renderSelecteurStaff(staffId, setStaffId)}</div>

        <label className="block text-sm">
          Durée d'un créneau (minutes)
          <input type="number" min={5} step={5} className="mt-1 w-full rounded border p-2" value={duree} onChange={(e) => setDuree(Number(e.target.value))} />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm">Jours et horaires de consultation</legend>
          {JOURS.map((nom, i) => (
            <div key={nom} className="flex items-center gap-2 text-sm">
              <label className="flex w-32 items-center gap-2">
                <input type="checkbox" checked={lignes[i].actif} onChange={(e) => maj(i, { actif: e.target.checked })} />
                {nom}
              </label>
              <input type="time" aria-label={`${nom} début`} disabled={!lignes[i].actif} value={lignes[i].heureDebut} onChange={(e) => maj(i, { heureDebut: e.target.value })} className="rounded border p-1" />
              <span>à</span>
              <input type="time" aria-label={`${nom} fin`} disabled={!lignes[i].actif} value={lignes[i].heureFin} onChange={(e) => maj(i, { heureFin: e.target.value })} className="rounded border p-1" />
            </div>
          ))}
          {!horairesValides && <p className="text-sm text-red-600">L'heure de fin doit être après l'heure de début.</p>}
        </fieldset>

        {enregistrer.isError && <p role="alert" className="text-sm text-red-600">Enregistrement impossible. Vérifiez les horaires et réessayez.</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="rounded border px-4 py-2">Annuler</button>
          <button type="submit" disabled={!pret || enregistrer.isPending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {enregistrer.isPending ? 'Enregistrement…' : "Enregistrer l'agenda"}
          </button>
        </div>
      </form>
    </div>
  );
}