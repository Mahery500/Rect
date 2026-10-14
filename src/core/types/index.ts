/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Types Transverses et Modèles de Données Partagés ASINA Medical
 */

export interface Medicament {
  Id_Medicament: number;
  Libelle: string;
}

export interface Principe_Actif {
  Id_Principe_Actif: number;
  Libelle: string;
}

export interface Famille {
  Id_Famille: number;
  Libelle: string;
}

export interface Presentation {
  Id_Presentation: number;
  Code: string;
  Libelle: string;
}

export interface Conditionnement {
  Id_Conditionnement: number;
  Code: string;
  Libelle: string;
  taux_conversion?: number; // Coefficient de conversion vers l'unité de base
  Unite_Base?: string; // Libellé unité de base (ex: 'Comprimé', 'Gélule', 'Unité')
}

export interface Site {
  Id_Site: number;
  Libelle: string;
  code?: string;
  name?: string;
  city?: string;
  address?: string | null;
  phone?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface Service {
  Id_Site: number;
  Id_Service: number;
  Libelle: string;
  siteId?: number;
  siteName?: string;
  typeServiceId?: number;
  typeServiceName?: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface TypeService {
  id: number;
  Id_Type_Service?: number;
  code: string;
  name: string;
  Libelle?: string;
  description?: string | null;
  isActive?: boolean;
}
export interface Patient {
  Id_Patient: string; // ex. "pat_65f0c8e1a2b3c.12345678"
  Matricule: string;
  Nom: string;
  Prenom: string;
  DateN: string;
  GS: string;
  Id_Entreprise?: number | null;
  Entreprise?: string | null;
  Statut?: string | null; // "Agent" | "Conjoint" | "Enfant" | null
  MatriculeAgent?: string | null;
  Genre?: string | null; // "M" | "F" | null
  Fonction?: string | null;
  CNAPS?: string | null;
  NIR?: string | null;
  matriculeEmployeur?: string | null;
}

export interface Type_Encounter {
  Id_Type_Encounter: number;
  Code: string;
  Libelle: string;
}

export interface Acte_Domain {
  Id_Acte_Domain: number;
  Code: string;
  Libelle: string;
}

export interface Acte_Purpose {
  Id_Acte_Purpose: number;
  Code: string;
  Libelle: string;
}

export interface Acte_Procedure {
  Id_Acte_Procedure: number;
  Code: string;
  Libelle: string;
}

export interface Diagnostique_def {
  Id_Diagnostique_def: number;
  Code: string;
  Libelle: string;
}

export interface Maladie {
  Id_Diagnostique_def: number;
  Id_Acte_Domain: number;
}

export interface Type_D_Travail {
  Id_Type_D_Travail: number;
  Code: string;
  Libelle: string;
}

export interface Acte_Def {
  Id_Acte_Def: number;
  Code: string;
  Libelle: string;
  Id_Acte_Purpose: number;
  Id_Acte_Procedure: number;
  Id_Acte_Domain: number;
}

export interface Type_detail_encounter {
  Id_Type_detail_encounter: number;
  Code: string;
  Type: string;
}

export interface Specialite {
  Id_Specialite: number;
  Code: string;
  Libelle: string;
}

export interface Entreprise {
  Id_Entreprise: number;
  Nom: string;
  Adresse: string;
  Contact: string;
  /** Champs réels supplémentaires exposés par EntrepriseOutput (voir core/api-contracts). */
  RaisonSociale?: string | null;
  NumeroCnaps?: string | null;
  MatriculeAsina?: string | null;
  NombreAgents?: number;
}

export interface Agent {
  Id_Patient: number;
  Cnaps: string;
  Matricule: string;
  Id_Entreprise: number;
}

export interface Ayant_Droit {
  Id_Patient_1: number;
  Id_Patient: number;
  Relation: string;
}

export interface Role {
  Id_role: number;
  code: string;
  libelle: string;
}

export type role = Role;
export type Role_ = Role;

export interface CIM10_Chapitre {
  Id_Chapitre: number;
  Code: string;
  Libelle: string;
}

export interface Patient_Company {
  Id_Entreprise: number;
  Nom: string;
  Adresse: string;
  Contact: string;
}

export interface Patient_Contact {
  Id_Contact: number;
  Nom: string;
  Telephone: string;
  Relation: string;
}

export interface Fournisseur {
  Id_Fournisseur: number;
  Nom: string;
  Adresse: string;
  Contact: string;
}

export interface Ajustement_Type {
  Id_Ajustement_Type: number;
  Libelle: string;
}

export interface Mouvement_Type {
  Id_Mouvement_Type: number;
  Libelle: string;
}

export interface User_ {
  Id_User: number;
  login: string;
  password?: string;
  nom: string;
  prenom: string;
  Id_role: number;
  email?: string;
  userType?: "admin" | "personnel";
  roles?: string[];
  role?: string;
  isActive?: boolean;
}

export interface Produit {
  Id_Produit: number;
  Nom_Commercial: string;
  Id_Presentation: number;
  Id_Conditionnement: number;
  Id_Medicament: number;
}

export interface Travail {
  Id_Diagnostique_def: number;
  Id_Type_D_Travail: number;
}

export interface StaffProfile {
  Id_staff_profile: number;
  Type: string;
  Id_Specialite: number;
  Id_User: number;
  Matricule?: string;
}

export interface Affectation {
  Id_Affectation: number;
  DateA: string;
  Id_staff_profile: number;
  Id_Site: number;
  Id_Service: number;
  staffId?: number;
  serviceId?: number;
  dateDebut?: string;
  dateFin?: string | null;
  estPrincipal?: boolean;
  active?: boolean;
  createdAt?: string;
}

export interface Lot {
  Id_Lot: number;
  Id_Produit: number;
  NumLot: string;
  DateExpiration: string;
}

export interface Stock_Ajustement {
  Id_Stock_Ajustement: number;
  Date_: string;
  Raison: string;
  Id_Ajustement_Type: number;
}

export interface Stock_Ajustement_Detail {
  Id_Stock_Ajustement_Detail: number;
  systeme_quantity: number;
  actually_quantity: number;
  difference: number;
  Id_Lot: number;
  Id_Stock_Ajustement: number;
  qte?: number;
}

export interface Commande {
  Id_Commande: number;
  DateC: string;
  Num: string;
  Statut: string;
  Id_staff_profile?: number;
  Id_Site?: number;
  Id_Fournisseur: number;
}

export interface Detail_Commande {
  Id_Detail_Commande: number;
  Qte: number;
  Id_Produit: number;
  Id_Commande: number;
}

export interface Prescription {
  Id_Prescription: number;
  DatePrescription: string;
  Id_staff_profile: number;
  Id_Patient: number;
}

export interface Encounter {
  Id_Encounter: number;
  Statut: string;
  Note: string;
  Motif: string;
  DateE: string;
  Id_Specialite?: number;
  Id_Site: number;
  Id_Service: number;
  Id_staff_profile: number;
  Id_Type_Encounter: number;
  Id_Patient: number;
}

export interface Diagnostique {
  Id_Diagnostique: number;
  Certitude: string;
  Id_Diagnostique_def: number;
  Id_staff_profile?: number;
  Id_Patient: number;
  Id_Encounter: number;
  Type_diag?: string;
}

export interface Observation {
  Id_Observation: number;
  Type: string;
  valeur?: string;
  Valeur?: string;
  unite?: string;
  Unite?: string;
  Recorded_at: string;
  Id_staff_profile?: number;
  Id_Acte_Def?: number;
  Id_Patient: number;
  Id_Encounter: number;
}

export interface Detail_encounter {
  Id_Detail_encounter: number;
  key: string;
  valeur: string;
  Id_Type_detail_encounter: number;
  Id_Encounter: number;
}

export interface prescription_medicament {
  Id_prescription_medicament: number;
  posologie: string;
  duree: string;
  frequence: string;
  Id_Prescription: number;
  Id_Produit: number;
}

export interface prescription_referral {
  Id_prescription_referral: number;
  reason: string;
  Id_Specialite: number;
  Id_Prescription: number;
}

export interface prescription_acte {
  Id_prescription_acte: number;
  priority: string;
  instruction: string;
  Id_Acte_Def: number;
  Id_Prescription: number;
}

export interface Stock {
  Id_Stock: number;
  qte: number;
  Id_Site: number;
  Id_Lot: number;
}

export interface Appro {
  Id_Appro: number;
  NumFac: string;
  Date_: string;
  Id_Commande?: number;
  Id_Fournisseur: number;
}

export interface Detail_appro {
  Id_Detail_appro: number;
  qte: number;
  prix: number;
  Id_Lot: number;
  Id_Appro: number;
}

export interface Dipensation {
  Id_Dipensation: number;
  DateD: string;
  Id_Site: number;
  Id_Prescription: number;
  Id_Patient: number;
}

export interface Detail_Dispensation {
  Id_Detail_Dispensation: number;
  qte: number;
  Id_Lot: number;
  Id_Dipensation: number;
}

export interface Mouvement {
  Id_Mouvement: number;
  Type: string;
  qte: number;
  Id_Mouvement_Type: number;
  Id_Lot: number;
  Id_Site: number;
  DateM: string;
}

export interface Rendez_vous {
  Id_Rendez_vous: number;
  Date_Debut: string;
  Date_Fin: string;
  Statut: string;
  Motif: string;
  DateCreation: string;
  Id_Encounter?: number;
  Id_Patient: number;
  Id_staff_profile: number;
  Id_Site: number;
  Id_Service: number;
}

export interface Actes {
  Id_Actes: number;
  note: string;
  Id_Encounter: number;
  Id_Acte_Def: number;
  Id_Patient: number;
}

export interface Act_Result {
  Id_Act_Result: number;
  Type: string;
  result_: string;
  Id_Actes: number;
}

export interface Asso_1 {
  Id_Medicament: number;
  Id_Principe_Actif: number;
  Dose: string;
}

export interface Appartenir {
  Id_Medicament: number;
  Id_Famille: number;
}

export interface Asso_6 {
  Id_Presentation: number;
  Id_Conditionnement: number;
}

export interface ASINAState {
  Medicament: Medicament[];
  Principe_Actif: Principe_Actif[];
  Famille: Famille[];
  Presentation: Presentation[];
  Conditionnement: Conditionnement[];
  Site: Site[];
  Service: Service[];
  TypeService?: TypeService[];
  Patient: Patient[];
  Type_Encounter: Type_Encounter[];
  Acte_Domain: Acte_Domain[];
  Acte_Purpose: Acte_Purpose[];
  Acte_Procedure: Acte_Procedure[];
  Diagnostique_def: Diagnostique_def[];
  Maladie: Maladie[];
  Type_D_Travail: Type_D_Travail[];
  Acte_Def: Acte_Def[];
  Type_detail_encounter: Type_detail_encounter[];
  Specialite: Specialite[];
  Entreprise: Entreprise[];
  Agent: Agent[];
  Ayant_Droit: Ayant_Droit[];
  role: Role[];
  Fournisseur: Fournisseur[];
  Ajustement_Type: Ajustement_Type[];
  Mouvement_Type: Mouvement_Type[];
  User_: User_[];
  Produit: Produit[];
  Travail: Travail[];
  StaffProfile: StaffProfile[];
  Affectation: Affectation[];
  Lot: Lot[];
  Stock: Stock[];
  Stock_Ajustement: Stock_Ajustement[];
  Stock_Ajustement_Detail: Stock_Ajustement_Detail[];
  Commande: Commande[];
  Detail_Commande: Detail_Commande[];
  Prescription: Prescription[];
  Encounter: Encounter[];
  Diagnostique: Diagnostique[];
  Observation: Observation[];
  Detail_encounter: Detail_encounter[];
  prescription_medicament: prescription_medicament[];
  prescription_referral: prescription_referral[];
  prescription_acte: prescription_acte[];
  Appro: Appro[];
  Detail_appro: Detail_appro[];
  Dipensation: Dipensation[];
  Detail_Dispensation: Detail_Dispensation[];
  Mouvement: Mouvement[];
  Rendez_vous: Rendez_vous[];
  Actes: Actes[];
  Act_Result: Act_Result[];
  Asso_1: Asso_1[];
  Appartenir: Appartenir[];
  Asso_6: Asso_6[];
}

export * from "./ticketing.types";
