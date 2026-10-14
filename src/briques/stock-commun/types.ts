// stock-commun/types.ts
export type UniteStock = "boite" | "plaquette" | "comprime";

export interface Site {
  id: number;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

export interface StockLigne {
  id: number;
  produitId?: number;
  produitLibelle?: string;
  lotId?: number;
  lotNumero?: string;
  datePeremption?: string | null;
  siteId?: number;
  siteNom?: string;
  quantite: number; // en comprimés
  seuilAlerte?: number | null;
}

/* ---- Ordonnances / prescriptions ---- */
export type StatutPrescription = "en_attente" | "dispensee" | "annulee";

export interface DetailPrescription {
  id?: number;
  produitId?: number;
  produitNom?: string;
  qtePrescrite: number;
  posologie?: string | null;
  dureeJours?: number | null;
}

export interface Prescription {
  id: number;
  patientNom?: string | null;
  patientPrenom?: string | null;
  patientMatricule?: string | null;
  datePrescription?: string | null;
  statut: StatutPrescription;
  details: DetailPrescription[];
}

/* ---- Dispensations ---- */
export interface DispensationDetail {
  lotId: number;
  numLot: string | null;
  produitNom: string | null;
  datePeremption: string | null; // Y-m-d
  quantite: number; // en comprimés
}

export interface Dispensation {
  id: number;
  ordonnanceId: number;
  siteId: number;
  date: string; // ISO 8601
  details: DispensationDetail[];
}

/* ---- Commandes ---- */
export type StatutCommande = "brouillon" | "envoyee" | "partielle" | "recue" | "annulee";

export interface DetailCommande {
  id: number;
  produitId: number;
  produitNom?: string;
  qte: number;
  unite: UniteStock;
  qteRecue?: number;
}

export interface Commande {
  id: number;
  num: string | null;
  dateC: string | null;
  statut: StatutCommande;
  fournisseurId: number;
  fournisseurNom?: string;
  siteId: number;
  details: DetailCommande[];
}

export interface CommandePayload {
  fournisseurId: number;
  siteId: number;
  details: { produitId: number; qte: number; unite: UniteStock }[];
}

/* ---- Fournisseurs ---- */
export interface Fournisseur {
  id: number;
  nom: string;
}

export interface FournisseurPayload {
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
}

/* ---- Produits ---- */
export interface Produit {
  id: number;
  nomCommercial: string;
  medicamentId?: number | null;
  conditionnementId?: number | null;
  presentationId?: number | null;
  titulaire?: string | null;
  statutAmm?: string | null;
}

export interface ProduitPayload {
  nomCommercial: string;
  medicamentId: number | null;
  conditionnementId: number | null;
}

export interface Option {
  id: number;
  libelle: string;
}

/* ---- Mouvements ---- */
export type TypeMouvement = "entree" | "sortie" | "transfert" | "ajustement";

export interface Mouvement {
  id: number | string;
  date: string;
  type: TypeMouvement;
  produitNom?: string;
  lotNumero?: string;
  siteNom?: string;
  quantite: number; // signée, en comprimés
  reference?: string | null;
}

/* ---- Transferts ---- */
export type StatutTransfert = "en_attente" | "valide" | "annule";

export interface Transfert {
  id: number;
  siteOrigineNom?: string;
  siteDestinationNom?: string;
  produitNom?: string;
  lotNumero?: string;
  quantite: number;
  dateTransfert: string;
  statut: StatutTransfert;
}

export interface TransfertPayload {
  siteOrigineId: number;
  siteDestinationId: number;
  produitId: number;
  lotId: number;
  quantite: number;
}

/* ---- Ajustements ---- */
export interface AjustementType {
  id: number;
  libelle: string;
}

export interface Ajustement {
  id: number;
  date: string;
  produitNom?: string;
  lotNumero?: string;
  siteNom?: string;
  typeLibelle?: string;
  ecart: number;
  motif?: string | null;
}

export interface AjustementPayload {
  siteId: number;
  lotId: number;
  typeId: number;
  quantiteComptee: number;
  motif: string;
}
