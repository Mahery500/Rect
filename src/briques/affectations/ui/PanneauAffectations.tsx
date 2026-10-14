/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  UserCheck,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  MapPin,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import { ModaleConfirmationSuppression } from "@/noyau/ui/ModaleConfirmationSuppression";
import {
  AffectationPersonnel,
  NouvelleAffectationInput,
  ModificationAffectationInput,
} from "../modele/affectation.types";
import { useAffectations } from "../hooks/useAffectations";
import { FormulaireAffectationModale } from "./FormulaireAffectationModale";

export interface PanneauAffectationsProps {
  mode?: ModeAffichage;
}

export const PanneauAffectations: React.FC<PanneauAffectationsProps> = ({ mode = "edition" }) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";

  const {
    affectations,
    affectationsToutes,
    optionsPersonnel,
    optionsServices,
    optionsSites,
    chargement,
    erreur,
    stats,
    recherche,
    setRecherche,
    filtreSiteId,
    setFiltreSiteId,
    filtreActif,
    setFiltreActif,
    recharger,
    creerAffectation,
    modifierAffectation,
    supprimerAffectation,
  } = useAffectations();

  const [modalOuverte, setModalOuverte] = useState(false);
  const [affectationEnEdition, setAffectationEnEdition] = useState<AffectationPersonnel | null>(
    null,
  );
  const [affectationASupprimer, setAffectationASupprimer] = useState<AffectationPersonnel | null>(
    null,
  );
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const handleConfirmerSuppression = async () => {
    if (!affectationASupprimer) return;
    setSuppressionEnCours(true);
    try {
      const succes = await supprimerAffectation(
        affectationASupprimer.id,
        `${affectationASupprimer.prenomPersonnel} ${affectationASupprimer.nomPersonnel}`,
      );
      if (succes) {
        setAffectationASupprimer(null);
      }
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const handleEnregistrer = async (
    saisie: NouvelleAffectationInput | ModificationAffectationInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifierAffectation(id, saisie as ModificationAffectationInput);
    }
    return creerAffectation(saisie as NouvelleAffectationInput);
  };

  return (
    <div className="space-y-4">
      {/* Barre d'en-tête */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-asina-50 text-asina-700 rounded-lg shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Affectations du Personnel Hospitalier
              </h3>
              <p className="text-[11px] text-slate-500">
                Répartition opérationnelle de tous les agents (accueil, secrétariat, soins,
                pharmacie, stock) aux sites et services.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={() => {
                  setAffectationEnEdition(null);
                  setModalOuverte(true);
                }}
                className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Affecter un Collaborateur</span>
              </button>
            )}
          </div>
        </div>

        {/* Bannière d'aide si référentiels incomplets */}
        {!chargement && (optionsPersonnel.length === 0 || optionsServices.length === 0) && (
          <div className="p-3 bg-amber-50/90 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              {optionsPersonnel.length === 0 && optionsServices.length === 0
                ? "Pour affecter des collaborateurs, veuillez d'abord créer des comptes personnels (onglet « Comptes Utilisateurs ») et rattacher des services (onglet « Services Médicaux »)."
                : optionsPersonnel.length === 0
                  ? "Aucun profil de personnel éligible (hors administrateurs) n'a été trouvé. Veuillez créer des profils d'agents (accueil, secrétariat, soins, pharmacie, stock...) dans l'onglet « Comptes Utilisateurs »."
                  : "Aucun service médical n'est configuré. Veuillez d'abord rattacher des services aux établissements dans l'onglet « Services Médicaux »."}
            </span>
          </div>
        )}

        {/* Métriques clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Total Affectations
            </span>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{stats.total}</p>
          </div>
          <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-150">
            <span className="text-[10px] uppercase font-bold text-emerald-700">
              Affectations Actives
            </span>
            <p className="text-lg font-extrabold text-emerald-800 leading-tight">{stats.actives}</p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Affectations Clôturées
            </span>
            <p className="text-lg font-extrabold text-slate-600 leading-tight">{stats.inactives}</p>
          </div>
          <div className="p-2.5 bg-asina-50/60 rounded-lg border border-asina-150">
            <span className="text-[10px] uppercase font-bold text-asina-700">
              Personnels Répartis
            </span>
            <p className="text-lg font-extrabold text-asina-800 leading-tight">
              {stats.agentsAffectes}
            </p>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Rechercher par nom d'agent, service, rôle ou site..."
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          {/* Filtre site */}
          <select
            value={filtreSiteId === "tous" ? "" : filtreSiteId}
            onChange={(e) => {
              const val = e.target.value;
              setFiltreSiteId(val === "" ? "tous" : Number(val));
            }}
            className="w-full sm:w-52 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="">Tous les établissements</option>
            {optionsSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>

          {/* Filtre statut */}
          <select
            value={filtreActif}
            onChange={(e) => setFiltreActif(e.target.value as "tous" | "actifs" | "inactifs")}
            className="w-full sm:w-36 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Tous statuts</option>
            <option value="actifs">Actives seules</option>
            <option value="inactifs">Clôturées</option>
          </select>
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

      {/* Tableau des affectations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {chargement ? (
          <div className="p-12 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
              <span className="text-xs">Chargement des affectations...</span>
            </div>
          </div>
        ) : affectations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {affectationsToutes.length === 0
              ? "Aucune affectation enregistrée dans le système."
              : "Aucune affectation ne correspond aux filtres appliqués."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Agent / Personnel</th>
                  <th className="py-3 px-4">Site Médical</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Période & Rôle</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  {!estModeLectureSeule && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {affectations.map((aff) => (
                  <tr
                    key={aff.id}
                    className={`hover:bg-slate-50/70 transition ${
                      aff.actif ? "" : "opacity-60 bg-slate-50/30"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold text-slate-900">
                          {aff.nomPersonnel} {aff.prenomPersonnel}
                        </div>
                        <div className="text-[10px] text-slate-500">{aff.rolePersonnel}</div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{aff.nomSite}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                        <Building2 className="h-3.5 w-3.5 text-asina-600 shrink-0" />
                        <span>{aff.nomService}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>Depuis le {aff.dateDebut}</span>
                          {aff.dateFin && <span>jusqu'au {aff.dateFin}</span>}
                        </div>
                        {aff.estPrincipal && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-asina-50 text-asina-700 border border-asina-150 text-[9px] font-bold uppercase">
                            Affectation Principale
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <BadgeStatut statut={aff.actif ? "actif" : "inactif"} />
                    </td>

                    {!estModeLectureSeule && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAffectationEnEdition(aff);
                              setModalOuverte(true);
                            }}
                            title="Modifier l'affectation"
                            className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAffectationASupprimer(aff)}
                            title="Supprimer l'affectation"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale d'ajout / modification d'affectation */}
      <FormulaireAffectationModale
        ouvert={modalOuverte}
        affectationEnEdition={affectationEnEdition}
        optionsPersonnel={optionsPersonnel}
        optionsServices={optionsServices}
        optionsSites={optionsSites}
        affectationsExistantes={affectationsToutes}
        onFermer={() => setModalOuverte(false)}
        onEnregistrer={handleEnregistrer}
      />

      {/* Modale de confirmation de suppression */}
      <ModaleConfirmationSuppression
        ouvert={affectationASupprimer !== null}
        onFermer={() => setAffectationASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        enCours={suppressionEnCours}
        titre="Supprimer l'affectation"
        message="Voulez-vous vraiment retirer cette affectation de personnel ?"
        nomElement={
          affectationASupprimer
            ? `${affectationASupprimer.nomPersonnel} ${affectationASupprimer.prenomPersonnel} (${affectationASupprimer.nomService})`
            : undefined
        }
      />
    </div>
  );
};

export default PanneauAffectations;
