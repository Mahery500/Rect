/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { agendaApi } from '../api/Agendaapi';
import type { AgendaInput } from '../modele/types';
import { invalider, useMutation, useRequete } from './useRequete';

export function useAgendas() {
  return useRequete(() => agendaApi.lister(), [], { tag: 'agendas' });
}

export function useEnregistrerAgenda() {
  return useMutation(
    ({ id, input }: { id?: number; input: AgendaInput }) =>
      id ? agendaApi.modifier(id, input) : agendaApi.creer(input),
    () => invalider('agendas', 'creneaux'),
  );
}