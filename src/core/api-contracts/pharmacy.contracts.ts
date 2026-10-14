// ---- AjustementTypeResource (référentiel des motifs, CRUD complet) ------
// `code` est nullable : à renseigner (ex. 'CASSE', 'PERTE') pour les motifs
// sur lesquels une logique métier doit s'appuyer.

export interface AjustementTypeRequest {
  libelle: string;
  code?: string | null;
}

export interface AjustementTypeResponse {
  id: number | null;
  libelle: string | null;
  code: string | null;
}

// ---- PrescriptionResource (ordonnance rattachée à une consultation) -----
// POST /prescriptions : crée la prescription (statut 'en_attente').
// POST /prescriptions/{id}/dispenser : décrémente le stock du site pour
// chaque ligne 'prescrit' (choix du lot en FEFO, côté serveur).
// POST /prescriptions/{id}/annuler : annule la prescription (pas de corps).
// C'est l'unique voie de dispensation : toute décrémentation de stock pour
// un patient doit obligatoirement passer par une prescription.

export interface DetailPrescriptionRequest {
  produitId: number;
  quantite: number;
  posologie?: string | null;
  dureeJours?: number | null;
}

export interface PrescriptionRequest {
  encounterId: number;
  staffId: number;
  datePrescription?: string | null; // ISO 8601
  details: DetailPrescriptionRequest[];
}

export interface DispenserPrescriptionRequest {
  siteId: number;
}

export interface DetailPrescriptionResponse {
  id: number | null;
  produitId: number | null;
  produitNom: string | null;
  quantite: number | null;
  posologie: string | null;
  dureeJours: number | null;
  statut: string | null; // 'prescrit' | 'dispense' | 'annule'
}

export interface PrescriptionResponse {
  id: number | null;
  encounterId: number | null;
  patientId: number | null;
  patientNom: string | null;
  patientPrenom: string | null;
  patientMatricule: string | null;
  staffId: number | null;
  datePrescription: string | null;
  statut: string | null; // 'en_attente' | 'dispensee' | 'annulee'
  createdAt: string | null;
  updatedAt: string | null;
  details: DetailPrescriptionResponse[];
}
