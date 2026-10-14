/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Users,
  RefreshCw,
  Eye,
  ClipboardEdit,
  UploadCloud,
  UserPlus,
  Building2,
  Phone,
  Printer,
  Loader2,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { useNotifier } from "@/noyau/notifications";
import { messageErreur } from "@/noyau/utils/erreur";
import { ouvrirPdf } from "@/noyau/http/pdf";
import {
  PatientFiche,
  CompleterFicheInput,
  RattacherAgentInput,
  libelleAffiliationPatient,
} from "../modele/patient.types";
import { usePatients } from "../hooks/usePatients";
import { DetailPatientModale } from "./DetailPatientModale";
import { FormulaireCompleterFicheModale } from "./FormulaireCompleterFicheModale";
import { FormulaireImportModale } from "./FormulaireImportModale";
import { FormulairePromotionAgentModale } from "./FormulairePromotionAgentModale";

export interface PanneauPatientsProps {
  mode?: ModeAffichage;
}

export const PanneauPatients: React.FC<PanneauPatientsProps> = ({ mode = "edition" }) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";
  const notif = useNotifier();

  const {
    patients,
    patientsTous,
    entreprises,
    chargement,
    erreur,
    stats,
    recherche,
    setRecherche,
    filtreEntrepriseId,
    setFiltreEntrepriseId,
    filtreAffiliation,
    setFiltreAffiliation,
    recharger,
    completerFiche,
    importerExcel,
    rattacherAgent,
  } = usePatients();

  const [patientDetail, setPatientDetail] = useState<PatientFiche | null>(null);
  const [patientACompleter, setPatientACompleter] = useState<PatientFiche | null>(null);
  const [modalImportOuverte, setModalImportOuverte] = useState(false);
  const [modalPromotionOuverte, setModalPromotionOuverte] = useState(false);

  // Clé de l'impression en cours ("patient-12" ou "entreprise-3"), pour désactiver les boutons concernés.
  const [impressionEnCours, setImpressionEnCours] = useState<string | null>(null);

  const initiales = (p: PatientFiche) => {
    const i1 = p.nom ? p.nom.charAt(0) : "P";
    const i2 = p.prenom ? p.prenom.charAt(0) : "";
    return `${i1}${i2}`.toUpperCase();
  };

  const handleCompleter = async (id: string, saisie: CompleterFicheInput): Promise<boolean> => {
    return completerFiche(id, saisie);
  };

  const handleImporter = async (fichier: File, idEntreprise: number): Promise<boolean> => {
    return importerExcel(fichier, idEntreprise);
  };

  const handleRattacher = async (saisie: RattacherAgentInput): Promise<boolean> => {
    return rattacherAgent(saisie);
  };

  const imprimer = async (cle: string, chemin: string, nomFichier: string) => {
    if (impressionEnCours) return;
    setImpressionEnCours(cle);
    try {
      await ouvrirPdf(chemin, nomFichier);
    } catch (err) {
      notif.erreur(messageErreur(err, "Impossible de générer la carte d'adhérent."));
    } finally {
      setImpressionEnCours(null);
    }
  };

  const imprimerCarte = (p: PatientFiche) =>
    imprimer(`patient-${p.id}`, `/patients/${p.id}/carte-adherent`, `carte_adherent_${p.id}.pdf`);

  const entrepriseFiltree =
    filtreEntrepriseId !== "tous"
      ? entreprises.find((e) => e.id === filtreEntrepriseId)
      : undefined;

  const imprimerCartesEntreprise = () => {
    if (filtreEntrepriseId === "tous") return;
    return imprimer(
      `entreprise-${filtreEntrepriseId}`,
      `/patients/cartes-adherents/all?idEntreprise=${filtreEntrepriseId}`,
      `cartes_adherents_entreprise_${filtreEntrepriseId}.pdf`,
    );
  };

  return (
    <div className="space-y-4">
      {/* Barre d'en-tête */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-asina-50 text-asina-700 rounded-lg shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Répertoire des Patients & Salariés Conventionnés
              </h3>
              <p className="text-[11px] text-slate-500">
                Identification civile, recherche multicritères, complétion de fiche et import en
                masse.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={recharger}
              disabled={chargement}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition disabled:opacity-50 shrink-0"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin text-asina-600" : ""}`} />
            </button>

            {!estModeLectureSeule && (
              <>
                <button
                  type="button"
                  onClick={() => setModalImportOuverte(true)}
                  disabled={entreprises.length === 0}
                  className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="h-4 w-4 text-emerald-600" />
                  <span>Import Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalPromotionOuverte(true)}
                  disabled={entreprises.length === 0 || patientsTous.length === 0}
                  className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Affilier Salarié</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Patients</span>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{stats.total}</p>
          </div>
          <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-150">
            <span className="text-[10px] uppercase font-bold text-blue-700">Salariés (Agents)</span>
            <p className="text-lg font-extrabold text-blue-800 leading-tight">{stats.agents}</p>
          </div>
          <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-150">
            <span className="text-[10px] uppercase font-bold text-amber-700">Ayants Droit</span>
            <p className="text-lg font-extrabold text-amber-800 leading-tight">
              {stats.ayantsDroit}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50/60 rounded-lg border border-purple-150">
            <span className="text-[10px] uppercase font-bold text-purple-700">Patients Libres</span>
            <p className="text-lg font-extrabold text-purple-800 leading-tight">{stats.simples}</p>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Recherche par nom, prénom, matricule (tolérance aux fautes et accents)..."
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          {/* Filtre entreprise */}
          <select
            value={filtreEntrepriseId === "tous" ? "" : filtreEntrepriseId}
            onChange={(e) => {
              const val = e.target.value;
              setFiltreEntrepriseId(val === "" ? "tous" : Number(val));
            }}
            className="w-full sm:w-52 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="">Toutes les entreprises</option>
            {entreprises.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.nom}
              </option>
            ))}
          </select>

          {/* Filtre statut d'affiliation */}
          <select
            value={filtreAffiliation}
            onChange={(e) => setFiltreAffiliation(e.target.value as any)}
            className="w-full sm:w-44 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Tous les régimes</option>
            <option value="agents">Salariés uniquement</option>
            <option value="ayantsDroit">Ayants droit uniquement</option>
            <option value="simples">Patients libres</option>
          </select>

          {/* Impression en masse : disponible quand une entreprise est sélectionnée */}
          <button
            type="button"
            onClick={imprimerCartesEntreprise}
            disabled={filtreEntrepriseId === "tous" || impressionEnCours !== null}
            title={
              filtreEntrepriseId === "tous"
                ? "Sélectionnez une entreprise pour imprimer toutes ses cartes d'adhérent"
                : `Imprimer les cartes d'adhérent de ${entrepriseFiltree?.nom ?? "l'entreprise"}`
            }
            className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {impressionEnCours?.startsWith("entreprise-") ? (
              <Loader2 className="h-4 w-4 animate-spin text-asina-600" />
            ) : (
              <Printer className="h-4 w-4 text-slate-600" />
            )}
            <span>Imprimer les cartes</span>
          </button>
        </div>
      </div>

      {/* État d'erreur */}
      {erreur && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <span>{erreur}</span>
          <button type="button" onClick={recharger} className="font-bold underline cursor-pointer">
            Réessayer
          </button>
        </div>
      )}

      {/* Tableau des patients */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {chargement ? (
          <div className="p-12 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
              <span className="text-xs">Chargement des dossiers patients...</span>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {patientsTous.length === 0
              ? "Aucun patient enregistré sur le serveur."
              : "Aucun patient ne correspond aux critères de recherche."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Matricule</th>
                  <th className="py-3 px-4">Affiliation & Entreprise</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => {
                  const affiliation = libelleAffiliationPatient(p);
                  const impressionCetteLigne = impressionEnCours === `patient-${p.id}`;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {initiales(p)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {p.nom} {p.prenom}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              {p.dateNaissance && <span>Né(e) le {p.dateNaissance}</span>}
                              {p.sexe && <span>({p.sexe})</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {p.matricule || `ID: ${p.id}`}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${affiliation.classeCouleur}`}
                          >
                            {affiliation.libelle}
                          </span>
                          {p.nomEntreprise && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                              <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-xs">{p.nomEntreprise}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {p.telephone ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{p.telephone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Non renseigné</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPatientDetail(p)}
                            title="Consulter le dossier complet"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => imprimerCarte(p)}
                            disabled={impressionEnCours !== null}
                            title="Imprimer la carte d'adhérent"
                            className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-asina-50 rounded-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {impressionCetteLigne ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Printer className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {!estModeLectureSeule && (
                            <button
                              type="button"
                              onClick={() => setPatientACompleter(p)}
                              title="Compléter les données manquantes de la fiche"
                              className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-asina-50 rounded-md transition cursor-pointer"
                            >
                              <ClipboardEdit className="h-3.5 w-3.5" />
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

      {/* Modale détail de fiche */}
      <DetailPatientModale
        ouvert={patientDetail !== null}
        patient={patientDetail}
        onFermer={() => setPatientDetail(null)}
        onOuvrirCompleter={
          !estModeLectureSeule && patientDetail
            ? () => setPatientACompleter(patientDetail)
            : undefined
        }
      />

      {/* Modale compléter la fiche */}
      <FormulaireCompleterFicheModale
        ouvert={patientACompleter !== null}
        patient={patientACompleter}
        onFermer={() => setPatientACompleter(null)}
        onCompleter={handleCompleter}
      />

      {/* Modale import de salariés Excel */}
      <FormulaireImportModale
        ouvert={modalImportOuverte}
        entreprises={entreprises}
        onFermer={() => setModalImportOuverte(false)}
        onImporter={handleImporter}
      />

      {/* Modale affiliation agent */}
      <FormulairePromotionAgentModale
        ouvert={modalPromotionOuverte}
        patients={patientsTous}
        entreprises={entreprises}
        onFermer={() => setModalPromotionOuverte(false)}
        onRattacher={handleRattacher}
      />
    </div>
  );
};

export default PanneauPatients;
