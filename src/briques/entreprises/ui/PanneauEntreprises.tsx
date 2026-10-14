/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  RefreshCw,
  Users,
  Printer,
  Loader2,
  FileDown,
  UploadCloud,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { ModaleConfirmationSuppression } from "@/noyau/ui/ModaleConfirmationSuppression";
import { useNotifier } from "@/noyau/notifications";
import { messageErreur } from "@/noyau/utils/erreur";
import { ouvrirPdf } from "@/noyau/http/pdf";
import {
  EntreprisePartenaire,
  NouvelleEntrepriseInput,
  ModificationEntrepriseInput,
} from "../modele/entreprise.types";
import { useEntreprises } from "../hooks/useEntreprises";
import { entreprisesApi } from "../api/entreprises.api";
import { FormulaireEntrepriseModale, libelleSmie } from "./FormulaireEntrepriseModale";
import { FormulaireImportModale, patientsApi } from "@/briques/patients";

export interface PanneauEntreprisesProps {
  mode?: ModeAffichage;
}

export const PanneauEntreprises: React.FC<PanneauEntreprisesProps> = ({ mode = "edition" }) => {
  // ⚠️ Tous les hooks AVANT tout return
  const notif = useNotifier();
  const estModeLectureSeule = mode === "lecture";

  const {
    entreprises,
    totalEntreprises,
    chargement,
    erreur,
    recherche,
    setRecherche,
    recharger,
    creerEntreprise,
    modifierEntreprise,
    supprimerEntreprise,
  } = useEntreprises();

  const [modalFormulaireOuverte, setModalFormulaireOuverte] = useState(false);
  const [entrepriseEnEdition, setEntrepriseEnEdition] = useState<EntreprisePartenaire | null>(null);

  const [entrepriseASupprimer, setEntrepriseASupprimer] = useState<EntreprisePartenaire | null>(
    null,
  );
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const [telechargementId, setTelechargementId] = useState<number | null>(null);
  const [modalImportOuverte, setModalImportOuverte] = useState(false);
  const [entreprisePourImport, setEntreprisePourImport] = useState<EntreprisePartenaire | null>(
    null,
  );

  const [impressionEntrepriseId, setImpressionEntrepriseId] = useState<number | null>(null);

  // Early return APRÈS les hooks
  if (mode === "masque") {
    return null;
  }

  const ouvrirCreation = () => {
    setEntrepriseEnEdition(null);
    setModalFormulaireOuverte(true);
  };

  const ouvrirEdition = (entreprise: EntreprisePartenaire) => {
    setEntrepriseEnEdition(entreprise);
    setModalFormulaireOuverte(true);
  };

  const ouvrirImport = (entreprise: EntreprisePartenaire) => {
    setEntreprisePourImport(entreprise);
    setModalImportOuverte(true);
  };

  const handleEnregistrer = async (
    saisie: NouvelleEntrepriseInput | ModificationEntrepriseInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifierEntreprise(id, saisie);
    }
    return creerEntreprise(saisie as NouvelleEntrepriseInput);
  };

  const handleTelechargerCartes = async (entreprise: EntreprisePartenaire) => {
    setTelechargementId(entreprise.id);
    try {
      await entreprisesApi.telechargerCartesAdherentsPdf(entreprise.id, entreprise.nom);
      notif.succes(`Carnet de cartes d'adhérents généré pour « ${entreprise.nom} ».`);
    } catch (err) {
      notif.erreur(
        messageErreur(err, `Impossible de générer les cartes d'adhérents de l'entreprise.`),
      );
    } finally {
      setTelechargementId(null);
    }
  };

  const handleImporterExcel = async (fichier: File, idEntreprise: number): Promise<boolean> => {
    try {
      const res = await patientsApi.importerExcel(fichier, idEntreprise);
      notif.succes(res.message);
      recharger();
      return true;
    } catch (err) {
      notif.erreur(messageErreur(err, "Échec de l'importation des salariés."));
      return false;
    }
  };

  const confirmerSuppression = async () => {
    if (!entrepriseASupprimer) return;
    setSuppressionEnCours(true);
    try {
      const ok = await supprimerEntreprise(entrepriseASupprimer.id, entrepriseASupprimer.nom);
      if (ok) {
        setEntrepriseASupprimer(null);
      }
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const imprimerCartes = async (entreprise: EntreprisePartenaire) => {
    if (impressionEntrepriseId !== null) return;
    setImpressionEntrepriseId(entreprise.id);
    try {
      await ouvrirPdf(
        `/patients/cartes-adherents/all?idEntreprise=${entreprise.id}`,
        `cartes_adherents_entreprise_${entreprise.id}.pdf`,
      );
    } catch (err) {
      notif.erreur(messageErreur(err, `Impossible de générer les cartes de ${entreprise.nom}.`));
    } finally {
      setImpressionEntrepriseId(null);
    }
  };

  const optionsEntreprises = entreprises.map((e) => ({ id: e.id, nom: e.nom }));

  return (
    <div className="space-y-4">
      {/* Barre d'en-tête et filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Entreprises adhérentes</h3>
            <p className="text-[11px] text-slate-500">
              {totalEntreprises} entreprise(s) partenaire(s) • Gestion des affiliations, matricules
              et cartes d'adhérents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Filtrer par nom, sigle ASINA, CNAPS, adresse..."
          />

          <button
            type="button"
            onClick={recharger}
            disabled={chargement}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition disabled:opacity-50 shrink-0"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {!estModeLectureSeule && (
            <button
              type="button"
              onClick={ouvrirCreation}
              className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle Entreprise</span>
            </button>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {erreur && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {erreur}
        </div>
      )}

      {/* Affichage des entreprises */}
      {chargement ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
            <span className="text-xs">Chargement des entreprises conventionnées...</span>
          </div>
        </div>
      ) : entreprises.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs italic">
          Aucune entreprise partenaire enregistrée.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entreprises.map((comp) => (
            <div
              key={comp.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                        ID: {comp.id}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                        {libelleSmie(comp.smie)}
                      </span>
                      {comp.matriculeAsina && (
                        <span
                          className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200"
                          title="Sigle racine des matricules salariés et ayants droit"
                        >
                          Racine : {comp.matriculeAsina}
                        </span>
                      )}
                      {comp.numeroCnaps && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-200 font-mono">
                          CNAPS: {comp.numeroCnaps}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{comp.nom}</h4>
                    {comp.raisonSociale && comp.raisonSociale !== comp.nom && (
                      <p className="text-[11px] text-slate-500 italic">{comp.raisonSociale}</p>
                    )}
                  </div>

                  {typeof comp.nombreAgents === "number" && (
                    <span
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 shrink-0"
                      title="Nombre de salariés (agents) affiliés à cette entreprise"
                    >
                      <Users className="h-3 w-3 text-slate-500" />
                      <span>
                        {comp.nombreAgents} salarié{comp.nombreAgents > 1 ? "s" : ""}
                      </span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-1 text-slate-600 text-xs">
                  {comp.adresse ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{comp.adresse}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">Adresse non renseignée</div>
                  )}

                  {comp.contact && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">{comp.contact}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-3 border-t border-slate-100">
                {/* Actions gauche : impression / téléchargement / import */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => imprimerCartes(comp)}
                    disabled={impressionEntrepriseId !== null}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Imprimer les cartes d'adhérent de tous les patients de cette entreprise"
                  >
                    {impressionEntrepriseId === comp.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Génération…</span>
                      </>
                    ) : (
                      <>
                        <Printer className="h-3.5 w-3.5" />
                        <span>Imprimer</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTelechargerCartes(comp)}
                    disabled={telechargementId !== null}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Télécharger le PDF des cartes d'adhérents"
                  >
                    {telechargementId === comp.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Téléchargement…</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </>
                    )}
                  </button>

                  {!estModeLectureSeule && (
                    <button
                      type="button"
                      onClick={() => ouvrirImport(comp)}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                      title="Importer la liste des salariés depuis un fichier Excel"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Excel</span>
                    </button>
                  )}
                </div>

                {!estModeLectureSeule && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => ouvrirEdition(comp)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                      title="Modifier l'entreprise"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntrepriseASupprimer(comp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                      title="Supprimer l'entreprise"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'ajout / modification */}
      <FormulaireEntrepriseModale
        ouvert={modalFormulaireOuverte}
        entrepriseEnEdition={entrepriseEnEdition}
        onFermer={() => setModalFormulaireOuverte(false)}
        onEnregistrer={handleEnregistrer}
      />

      {/* Modale d'importation Excel ciblée sur l'entreprise */}
      <FormulaireImportModale
        ouvert={modalImportOuverte}
        entreprises={
          entreprisePourImport
            ? [{ id: entreprisePourImport.id, nom: entreprisePourImport.nom }]
            : optionsEntreprises
        }
        onFermer={() => {
          setModalImportOuverte(false);
          setEntreprisePourImport(null);
        }}
        onImporter={handleImporterExcel}
      />

      {/* Modale de confirmation de suppression */}
      <ModaleConfirmationSuppression
        ouvert={entrepriseASupprimer !== null}
        onFermer={() => setEntrepriseASupprimer(null)}
        onConfirmer={confirmerSuppression}
        enCours={suppressionEnCours}
        titre="Supprimer l'entreprise partenaire"
        message="Voulez-vous vraiment supprimer cette entreprise de la convention ? Les salariés et dossiers rattachés peuvent être impactés."
        nomElement={entrepriseASupprimer?.nom}
      />
    </div>
  );
};

export default PanneauEntreprises;
