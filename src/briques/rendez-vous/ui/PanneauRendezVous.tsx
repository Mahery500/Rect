/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Filter,
  Ticket,
  Trash2,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ModaleConfirmationSuppression } from "@/noyau/ui/ModaleConfirmationSuppression";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import { useRendezVous } from "../hooks/useRendezVous";
import { FormulaireRendezVousModale } from "./FormulaireRendezVousModale";
import { RendezVous, StatutRendezVous } from "../modele/rendez-vous.types";
import { libelleStatut, styleStatut } from "../api/rendez-vous.mapping";

export interface PanneauRendezVousProps {
  mode?: ModeAffichage;
  siteId?: number;
}

export const PanneauRendezVous: React.FC<PanneauRendezVousProps> = ({
  mode = "edition",
  siteId,
}) => {
  const estLectureSeule = mode === "lecture";

  const {
    rendezVousFiltres,
    chargement,
    actionEnCours,
    filtres,
    mettreAJourFiltres,
    patients,
    services,
    statistiques,
    recharger,
    reserverRendezVous,
    annulerRendezVous,
    confirmerArrivee,
  } = useRendezVous(siteId);

  // États des modales
  const [modaleCreationOuverte, setModaleCreationOuverte] = useState(false);
  const [rdvAAnnuler, setRdvAAnnuler] = useState<RendezVous | null>(null);

  // Modale de confirmation d'arrivée avec choix du service
  const [rdvAConfirmer, setRdvAConfirmer] = useState<RendezVous | null>(null);
  const [serviceArriveeId, setServiceArriveeId] = useState<number | "">("");

  const ouvrirConfirmationArrivee = (rdv: RendezVous) => {
    setRdvAConfirmer(rdv);
    if (services.length > 0) {
      setServiceArriveeId(services[0].id);
    }
  };

  const handleConfirmerArriveeSoumission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rdvAConfirmer || !serviceArriveeId) return;

    const succes = await confirmerArrivee(rdvAConfirmer.id, Number(serviceArriveeId));
    if (succes) {
      setRdvAConfirmer(null);
    }
  };

  const handleConfirmerAnnulation = async () => {
    if (!rdvAAnnuler) return;
    const succes = await annulerRendezVous(rdvAAnnuler.id);
    if (succes) {
      setRdvAAnnuler(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-asina-600" />
            <span>Gestion & Planning des Rendez-Vous</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Consultez les créneaux programmés, planifiez de nouvelles consultations et confirmez
            l'arrivée des usagers au guichet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={chargement}
            onClick={recharger}
            className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Actualiser les rendez-vous"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          {!estLectureSeule && (
            <button
              type="button"
              onClick={() => setModaleCreationOuverte(true)}
              className="btn-primary py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Rendez-vous</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartes métriques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
          <div className="text-xl font-black text-slate-800 mt-0.5">{statistiques.total}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-blue-600 block">Aujourd'hui</span>
          <div className="text-xl font-black text-blue-700 mt-0.5">{statistiques.aujourdHui}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-indigo-600 block">Planifiés</span>
          <div className="text-xl font-black text-indigo-700 mt-0.5">{statistiques.planifies}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-600 block">
            Arrivée confirmée
          </span>
          <div className="text-xl font-black text-amber-700 mt-0.5">{statistiques.confirmes}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Honorés</span>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{statistiques.honores}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-600 block">
            Annulés / Absents
          </span>
          <div className="text-xl font-black text-rose-700 mt-0.5">{statistiques.annules}</div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Recherche textuelle */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filtres.recherche}
            onChange={(e) => mettreAJourFiltres({ recherche: e.target.value })}
            placeholder="Rechercher par patient, matricule ou motif..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-asina-500"
          />
        </div>

        {/* Filtres date & statut */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Boutons filtres dates */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => mettreAJourFiltres({ filtreDate: "tous" })}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filtres.filtreDate === "tous"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => mettreAJourFiltres({ filtreDate: "aujourd_hui" })}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filtres.filtreDate === "aujourd_hui"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => mettreAJourFiltres({ filtreDate: "a_venir" })}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filtres.filtreDate === "a_venir"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              À venir
            </button>
            <button
              type="button"
              onClick={() => mettreAJourFiltres({ filtreDate: "passes" })}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filtres.filtreDate === "passes"
                  ? "bg-white text-slate-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Passés
            </button>
          </div>

          {/* Sélecteur statut */}
          <select
            value={filtres.statut}
            onChange={(e) =>
              mettreAJourFiltres({ statut: e.target.value as StatutRendezVous | "TOUS" })
            }
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="PLANIFIE">Planifiés</option>
            <option value="CONFIRME">Arrivée confirmée</option>
            <option value="HONORE">Honorés</option>
            <option value="ANNULE">Annulés</option>
            <option value="ABSENT">Absents</option>
          </select>
        </div>
      </div>

      {/* Tableau des rendez-vous */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {chargement ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-asina-500 mb-2" />
            Chargement des rendez-vous...
          </div>
        ) : rendezVousFiltres.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-1">
            <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">Aucun rendez-vous trouvé</p>
            <p className="text-[11px]">
              Modifiez vos critères de recherche ou planifiez un nouveau rendez-vous.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Patient Adhérent</th>
                  <th className="py-3 px-4">Motif / Commentaire</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rendezVousFiltres.map((rdv) => {
                  const style = styleStatut(rdv.statut);
                  const libelle = libelleStatut(rdv.statut);

                  return (
                    <tr key={rdv.id} className="hover:bg-slate-50/80 transition">
                      {/* Date & Heure */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-bold text-slate-800">
                            {rdv.heureAffichee}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-medium">{rdv.dateAffichee}</span>
                        </div>
                        {rdv.estAujourdHui && (
                          <span className="inline-block mt-0.5 text-[9px] uppercase font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.2">
                            Aujourd'hui
                          </span>
                        )}
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {rdv.patientNom || `Patient #${rdv.patientId}`}
                        </div>
                        {rdv.patientMatricule && (
                          <div className="text-[10px] font-mono text-slate-500">
                            {rdv.patientMatricule}
                          </div>
                        )}
                      </td>

                      {/* Commentaire / Motif */}
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {rdv.commentaire || (
                          <span className="text-slate-300 italic">Aucun commentaire</span>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${style.fond} ${style.texte} ${style.bordure}`}
                        >
                          {libelle}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {rdv.actionnable && !estLectureSeule && (
                            <button
                              type="button"
                              onClick={() => ouvrirConfirmationArrivee(rdv)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer text-[11px] shadow-2xs"
                              title="Confirmer l'arrivée physique et émettre le ticket"
                            >
                              <Ticket className="h-3.5 w-3.5" />
                              <span>Confirmer arrivée</span>
                            </button>
                          )}

                          {rdv.statut === "PLANIFIE" && !estLectureSeule && (
                            <button
                              type="button"
                              onClick={() => setRdvAAnnuler(rdv)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Annuler ce rendez-vous"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale de création d'un rendez-vous */}
      <FormulaireRendezVousModale
        ouvert={modaleCreationOuverte}
        patients={patients}
        onFermer={() => setModaleCreationOuverte(false)}
        onEnregistrer={reserverRendezVous}
      />

      {/* Modale de confirmation d'arrivée avec service */}
      {rdvAConfirmer && (
        <Modale
          ouvert={Boolean(rdvAConfirmer)}
          onFermer={() => setRdvAConfirmer(null)}
          titre="Confirmer l'arrivée physique du patient"
          icone={<Ticket className="h-4 w-4 text-emerald-600" />}
          largeurMax="md"
          enfants={
            <form
              id="form-confirmer-arrivee"
              onSubmit={handleConfirmerArriveeSoumission}
              className="space-y-4 text-xs"
            >
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">
                  {rdvAConfirmer.patientNom || `Patient #${rdvAConfirmer.patientId}`}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Rendez-vous prévu à {rdvAConfirmer.heureAffichee} le {rdvAConfirmer.dateAffichee}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Service médical d'orientation *
                </label>
                <select
                  required
                  value={serviceArriveeId}
                  onChange={(e) => setServiceArriveeId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-asina-500"
                >
                  <option value="" disabled>
                    — Choisir un service —
                  </option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  La validation de l'arrivée physique émettra automatiquement le ticket de file
                  d'attente sur le serveur.
                </p>
              </div>
            </form>
          }
          pied={
            <div className="w-full">
              <ActionsFormulaire
                idFormulaire="form-confirmer-arrivee"
                onAnnuler={() => setRdvAConfirmer(null)}
                enCours={actionEnCours}
                desactive={actionEnCours || !serviceArriveeId}
                labelValider="Valider l'arrivée & Émettre Ticket"
              />
            </div>
          }
        />
      )}

      {/* Modale de confirmation d'annulation */}
      {rdvAAnnuler && (
        <ModaleConfirmationSuppression
          ouvert={Boolean(rdvAAnnuler)}
          titre="Annuler le rendez-vous"
          message={`Êtes-vous sûr de vouloir annuler le rendez-vous prévu le ${rdvAAnnuler.dateAffichee} à ${rdvAAnnuler.heureAffichee} ?`}
          nomElement={rdvAAnnuler.patientNom || `Patient #${rdvAAnnuler.patientId}`}
          enCours={actionEnCours}
          onConfirmer={handleConfirmerAnnulation}
          onFermer={() => setRdvAAnnuler(null)}
        />
      )}
    </div>
  );
};
