/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { extraireElementsCollection, extraireMessageErreur } from '@/noyau/http';
import { http } from '../api/http';
import { useRequete } from '../hooks/useRequete';
import { useAnnulerRendezVous } from '../hooks/useRendezVousMutations';
import type { RendezVous } from '../modele/types';
import { FormulaireAgendaModale } from './FormulaireAgendaModale';
import { FormulaireRendezVousModale } from './FormulaireRendezVousModale';
import { SelecteurPatient, SelecteurStaff } from './SelecteursRendezVous';

export function PageRendezVous() {
  const [modale, setModale] = useState<'rdv' | 'agenda' | null>(null);

  const liste = useRequete(
    async () => extraireElementsCollection<RendezVous>(await http.get('/api/rendez-vous')),
    [],
    { tag: 'rendez-vous' },
  );
  const annuler = useAnnulerRendezVous();

  function demanderAnnulation(rdv: RendezVous) {
    if (window.confirm(`Annuler le rendez-vous de ${rdv.patientNom ?? 'ce patient'} ?`)) {
      annuler.mutate(rdv.id);
    }
  }

  return (
    <section className="space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Rendez-vous</h1>
        <div className="flex gap-2">
          <button className="rounded border px-4 py-2" onClick={() => setModale('agenda')}>
            Agenda du staff
          </button>
          <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setModale('rdv')}>
            Planifier un rendez-vous
          </button>
        </div>
      </header>

      {liste.isLoading && <p className="text-sm text-gray-500">Chargement des rendez-vous…</p>}
      {liste.isError && (
        <p role="alert" className="text-sm text-red-600">{extraireMessageErreur(liste.error)}</p>
      )}
      {annuler.isError && (
        <p role="alert" className="text-sm text-red-600">{extraireMessageErreur(annuler.error)}</p>
      )}
      {liste.data?.length === 0 && (
        <p className="text-sm text-gray-500">Aucun rendez-vous. Cliquez sur « Planifier un rendez-vous » pour en créer un.</p>
      )}

      {!!liste.data?.length && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Date</th>
                <th className="p-2">Heure</th>
                <th className="p-2">Patient</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Motif</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {liste.data.map((rdv) => (
                <tr key={rdv.id} className="border-b">
                  <td className="p-2">{rdv.dateAffichee}</td>
                  <td className="p-2">{rdv.heureAffichee}</td>
                  <td className="p-2">{rdv.patientNom ?? `Patient ${rdv.patientId}`}</td>
                  <td className="p-2">{rdv.statut}</td>
                  <td className="p-2">{rdv.commentaire}</td>
                  <td className="p-2 text-right">
                    {(rdv.statut === 'PLANIFIE' || rdv.statut === 'CONFIRME') && (
                      <button
                        className="rounded border px-3 py-1"
                        disabled={annuler.isPending}
                        onClick={() => demanderAnnulation(rdv)}
                      >
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modale === 'rdv' && (
        <FormulaireRendezVousModale
          renderSelecteurPatient={(valeur, changer) => <SelecteurPatient valeur={valeur} changer={changer} />}
          onFermer={() => setModale(null)}
        />
      )}
      {modale === 'agenda' && (
        <FormulaireAgendaModale
          renderSelecteurStaff={(valeur, changer) => <SelecteurStaff valeur={valeur} changer={changer} />}
          onFermer={() => setModale(null)}
        />
      )}
    </section>
  );
}