/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Calendar, User, Clock, MessageSquare } from "lucide-react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import { NouveauRendezVousInput, PatientOption } from "../modele/rendez-vous.types";

export interface FormulaireRendezVousModaleProps {
  ouvert: boolean;
  patients: PatientOption[];
  onFermer: () => void;
  onEnregistrer: (input: NouveauRendezVousInput) => Promise<boolean>;
}

export const FormulaireRendezVousModale: React.FC<FormulaireRendezVousModaleProps> = ({
  ouvert,
  patients,
  onFermer,
  onEnregistrer,
}) => {
  const dateAujourdHui = new Date().toISOString().split("T")[0];

  const [patientId, setPatientId] = useState<number | "">(
    patients.length > 0 ? patients[0].id : "",
  );
  const [dateRdv, setDateRdv] = useState(dateAujourdHui);
  const [heureRdv, setHeureRdv] = useState("09:00");
  const [commentaire, setCommentaire] = useState("");
  const [enCours, setEnCours] = useState(false);

  // Synchroniser le premier patient quand la liste change
  React.useEffect(() => {
    if (patientId === "" && patients.length > 0) {
      setPatientId(patients[0].id);
    }
  }, [patients, patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !dateRdv || !heureRdv) return;

    setEnCours(true);
    try {
      const succes = await onEnregistrer({
        patientId: Number(patientId),
        dateRdv,
        heureRdv,
        commentaire: commentaire.trim() || undefined,
      });

      if (succes) {
        setCommentaire("");
        onFermer();
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre="Planifier un Nouveau Rendez-vous"
      icone={<Calendar className="h-4 w-4 text-asina-600" />}
      largeurMax="md"
      enfants={
        <form id="form-nouveau-rdv" onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Patient adhérent *</span>
            </label>
            <select
              value={patientId}
              disabled={enCours}
              onChange={(e) => setPatientId(Number(e.target.value))}
              required
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-asina-500"
            >
              <option value="" disabled>
                — Sélectionner le patient —
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.matricule}] {p.nomComplet}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Date de la consultation *</span>
              </label>
              <input
                type="date"
                required
                disabled={enCours}
                value={dateRdv}
                onChange={(e) => setDateRdv(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Heure prévue *</span>
              </label>
              <input
                type="time"
                required
                disabled={enCours}
                value={heureRdv}
                onChange={(e) => setHeureRdv(e.target.value)}
                step="900"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              <span>Motif / Commentaire de venue</span>
            </label>
            <textarea
              disabled={enCours}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex: Visite médicale périodique, consultation médecine du travail..."
              rows={3}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-asina-500"
            />
          </div>
        </form>
      }
      pied={
        <div className="w-full">
          <ActionsFormulaire
            idFormulaire="form-nouveau-rdv"
            onAnnuler={onFermer}
            enCours={enCours}
            desactive={enCours || !patientId}
            labelValider="Planifier le rendez-vous"
          />
        </div>
      }
    />
  );
};
