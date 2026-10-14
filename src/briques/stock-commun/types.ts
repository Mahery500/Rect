// stock-commun/types.ts
export type UniteStock = "boite" | "plaquette" | "comprime";

export interface Site {
  id: number;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

/* ---- Stocks ---- */
export interface StockLigne {
  id: number;
  produitId?: number;
  produitLibelle?: string;
  lotId?: number;
  lotNumero?: string | null;
  datePeremption?: string | null;
  siteId?: number;
  siteNom?: string;
  quantite: number; // en unités de base (comprimé, flacon, ampoule...)
  seuilAlerte?: number | null;
  nbUnitesParBoite?: number | null;
}

/* ---- Ordonnances / prescriptions ---- */
export type StatutPrescription = "en_attente" | "dispensee" | "annulee";

export interface DetailPrescription {
  id?: number;
  produitId?: number;
  medicamentId?: number;
  produitNom?: string;
  qtePrescrite: number;
  posologie?: string | null;
  dureeJours?: number | null;
}

export interface Prescription {
  id: number;
  encounterId?: number | null;
  patientId?: number | null;
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
<<<<<<< HEAD
  quantite: number; // en comprimés
=======
  quantite: number;              // en unités de base
>>>>>>> koto
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
  presentationId?: number | null;
  titulaire?: string | null;
  statutAmm?: string | null;
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
  quantite: number; // signée, en unités de base
  reference?: string | null;
}

/* ---- Transferts ---- */
export type StatutTransfert = "en_attente" | "valide" | "annule";

export interface Transfert {
  id: number;
  siteOrigineId?: number;
  siteDestinationId?: number;
  siteOrigineNom?: string;
  siteDestinationNom?: string;
  produitId?: number;
  produitNom?: string;
  lotId?: number;
  lotNumero?: string;
  quantite: number; // en unités de base (pas en boîtes)
  dateTransfert: string;
  statut: StatutTransfert;
}

export interface TransfertPayload {
  siteOrigineId: number;
  siteDestinationId: number;
  produitId: number;   // ignoré par le serveur (le produit se déduit du lot)
  lotId: number;
  quantite: number;    // en boîtes
}

/* ---- Ajustements ---- */
<<<<<<< HEAD
export interface AjustementType {
  id: number;
  libelle: string;
}
=======
export interface AjustementType { id: number; libelle: string; code?: string | null }
>>>>>>> koto

export interface Ajustement {
  id: number;
  date: string;
  produitNom?: string | null;
  lotNumero?: string | null;
  siteId?: number | null;
  siteNom?: string | null;
  typeLibelle?: string | null;
  ecart: number;
  motif?: string | null;
}

export interface AjustementPayload {
  siteId: number;
  lotId: number;
  typeId: number;
  quantiteComptee: number; // en unités de base
  motif: string;
}
