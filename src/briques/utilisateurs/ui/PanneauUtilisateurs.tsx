/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Users,
  ShieldCheck,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  UserCheck,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import { ModaleConfirmationSuppression } from "@/noyau/ui/ModaleConfirmationSuppression";
import {
  UtilisateurCompte,
  NouveauCompteAdminInput,
  NouveauComptePersonnelInput,
  ModificationCompteInput,
  ROLES_SYMFONY_DISPONIBLES,
} from "../modele/utilisateur.types";
import { useUtilisateurs } from "../hooks/useUtilisateurs";
import { FormulaireUtilisateurModale } from "./FormulaireUtilisateurModale";
import { FormulaireEditionUtilisateurModale } from "./FormulaireEditionUtilisateurModale";

export interface PanneauUtilisateursProps {
  mode?: ModeAffichage;
}

export const PanneauUtilisateurs: React.FC<PanneauUtilisateursProps> = ({ mode = "edition" }) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";

  const {
    comptes,
    comptesTous,
    chargement,
    erreur,
    stats,
    recherche,
    setRecherche,
    filtreType,
    setFiltreType,
    filtreStatut,
    setFiltreStatut,
    filtreRole,
    setFiltreRole,
    recharger,
    creerAdmin,
    creerPersonnel,
    modifierCompte,
    basculerStatut,
    supprimerCompte,
  } = useUtilisateurs();

  const [modalCreationOuverte, setModalCreationOuverte] = useState(false);
  const [compteEnEdition, setCompteEnEdition] = useState<UtilisateurCompte | null>(null);
  const [compteASupprimer, setCompteASupprimer] = useState<UtilisateurCompte | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const initialesUtilisateur = (u: UtilisateurCompte) => {
    if (u.prenom && u.nom) {
      return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase();
    }
    if (u.login) {
      return u.login.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  const handleConfirmerSuppression = async () => {
    if (!compteASupprimer) return;
    setSuppressionEnCours(true);
    try {
      const succes = await supprimerCompte(compteASupprimer.id, compteASupprimer.login);
      if (succes) {
        setCompteASupprimer(null);
      }
    } finally {
      setSuppressionEnCours(false);
    }
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
                Gestion des Utilisateurs & Personnels
              </h3>
              <p className="text-[11px] text-slate-500">
                Comptes d'accès applicatifs, rôles cliniques et habilitations de sécurité.
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
                onClick={() => setModalCreationOuverte(true)}
                className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau Compte</span>
              </button>
            )}
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Total Utilisateurs
            </span>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{stats.total}</p>
          </div>
          <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-150">
            <span className="text-[10px] uppercase font-bold text-emerald-700">
              Personnel Soignant
            </span>
            <p className="text-lg font-extrabold text-emerald-800 leading-tight">
              {stats.personnel}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50/60 rounded-lg border border-purple-150">
            <span className="text-[10px] uppercase font-bold text-purple-700">Administrateurs</span>
            <p className="text-lg font-extrabold text-purple-800 leading-tight">{stats.admins}</p>
          </div>
          <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-150">
            <span className="text-[10px] uppercase font-bold text-blue-700">Comptes Actifs</span>
            <p className="text-lg font-extrabold text-blue-800 leading-tight">{stats.actifs}</p>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Catégories de comptes & statut */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFiltreType("tous")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filtreType === "tous"
                  ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>Tous ({stats.total})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltreType("personnel")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filtreType === "personnel"
                  ? "bg-white text-emerald-700 font-bold shadow-xs border border-emerald-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Personnel ({stats.personnel})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltreType("admin")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filtreType === "admin"
                  ? "bg-white text-purple-700 font-bold shadow-xs border border-purple-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              <span>Admins ({stats.admins})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtreRole}
              onChange={(e) => setFiltreRole(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-asina-500"
            >
              <option value="tous">Tous les rôles</option>
              {ROLES_SYMFONY_DISPONIBLES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.libelle}
                </option>
              ))}
            </select>

            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value as "tous" | "actifs" | "inactifs")}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-asina-500"
            >
              <option value="tous">Tous les statuts</option>
              <option value="actifs">Actifs uniquement</option>
              <option value="inactifs">Inactifs uniquement</option>
            </select>
          </div>
        </div>

        {/* Champ de recherche */}
        <ChampRecherche
          valeur={recherche}
          onChange={setRecherche}
          placeholder="Rechercher par identifiant, nom, prénom ou email..."
        />
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

      {/* Tableau des utilisateurs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {chargement ? (
          <div className="p-12 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
              <span className="text-xs">Chargement des comptes utilisateurs...</span>
            </div>
          </div>
        ) : comptes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {comptesTous.length === 0
              ? "Aucun utilisateur répertorié dans la base."
              : "Aucun utilisateur ne correspond aux filtres appliqués."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Identifiant (login)</th>
                  <th className="py-3 px-4">Rôle attribué</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  {!estModeLectureSeule && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comptes.map((u) => {
                  const estAdmin = u.typeCompte === "admin";
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition ${
                        u.actif ? "" : "opacity-60 bg-slate-50/30"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs select-none border ${
                              estAdmin
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {initialesUtilisateur(u)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {u.prenom || u.nom ? `${u.prenom} ${u.nom}` : u.login}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {u.email || "Sans email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {u.login}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            estAdmin
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {estAdmin ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          <span>{u.libelleRole}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {u.typeCompte}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {!estModeLectureSeule ? (
                          <button
                            type="button"
                            onClick={() => basculerStatut(u)}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition"
                            title={u.actif ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                          >
                            <BadgeStatut statut={u.actif ? "actif" : "inactif"} />
                            {u.actif ? (
                              <ToggleRight className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          <BadgeStatut statut={u.actif ? "actif" : "inactif"} />
                        )}
                      </td>

                      {!estModeLectureSeule && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCompteEnEdition(u)}
                              title="Modifier l'utilisateur"
                              className="p-1.5 text-slate-400 hover:text-asina-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompteASupprimer(u)}
                              title="Supprimer l'utilisateur"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale de création d'utilisateur */}
      <FormulaireUtilisateurModale
        ouvert={modalCreationOuverte}
        onFermer={() => setModalCreationOuverte(false)}
        onCreerAdmin={creerAdmin}
        onCreerPersonnel={creerPersonnel}
      />

      {/* Modale d'édition d'utilisateur */}
      <FormulaireEditionUtilisateurModale
        ouvert={compteEnEdition !== null}
        compte={compteEnEdition}
        onFermer={() => setCompteEnEdition(null)}
        onModifier={modifierCompte}
      />

      {/* Modale de confirmation de suppression */}
      <ModaleConfirmationSuppression
        ouvert={compteASupprimer !== null}
        onFermer={() => setCompteASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        enCours={suppressionEnCours}
        titre="Supprimer l'utilisateur"
        message="Voulez-vous vraiment supprimer définitivement ce compte d'accès ?"
        nomElement={compteASupprimer?.login}
      />
    </div>
  );
};

export default PanneauUtilisateurs;
