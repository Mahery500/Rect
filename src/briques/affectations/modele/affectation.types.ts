/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OptionPersonnel {
  id: number;
  nom: string;
  prenom: string;
  role: string;
}

export interface OptionSite {
  id: number;
  nom: string;
  code: string;
}

export interface OptionServiceSite {
  serviceId: number;
  nomService: string;
  siteId: number;
  nomSite: string;
}

export interface AffectationPersonnel {
  id: number;
  staffId: number;
  nomPersonnel: string;
  prenomPersonnel: string;
  rolePersonnel: string;
  serviceId: number;
  nomService: string;
  siteId: number;
  nomSite: string;
  dateDebut: string;
  dateFin?: string | null;
  estPrincipal: boolean;
  actif: boolean;
  dateCreation?: string;
}

export interface NouvelleAffectationInput {
  staffId: number;
  serviceId: number;
  dateDebut: string;
  dateFin?: string | null;
  estPrincipal?: boolean;
}

export interface ModificationAffectationInput {
  staffId: number;
  serviceId: number;
  dateDebut: string;
  dateFin?: string | null;
  estPrincipal: boolean;
  actif?: boolean;
}
