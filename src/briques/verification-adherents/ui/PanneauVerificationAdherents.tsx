/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ShieldCheck,
  Search,
  UserCheck,
  User,
  Building2,
  CalendarCheck2,
  Ticket,
  Printer,
  Tv,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Square,
  Clock,
  Heart,
  Phone,
  CreditCard,
  Building,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useVerificationAdherent } from "../hooks/useVerificationAdherent";
import { BadgeEligibilite } from "./BadgeEligibilite";
import { CarteAdherentModale } from "./CarteAdherentModale";
import { RendezVousDuJour } from "../modele/verification-adherent.types";

export interface PanneauVerificationAdherentsProps {
  mode?: ModeAffichage;
  siteId?: number;
}

const ETAPES_WORKFLOW = [
  { cle: "PLANIFIE", label: "Planifié" },
  { cle: "CONFIRME", label: "Arrivée confirmée" },
  { cle: "HONORE", label: "Consultation honorée" },
];

function WorkflowRendezVous({ rdv }: { rdv: RendezVousDuJour }) {
  if (rdv.statut === "ANNULE" || rdv.statut === "ABSENT") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
        <AlertTriangle className="h-3.5 w-3.5" />
        {rdv.statut === "ANNULE" ? "Rendez-vous annulé" : "Patient déclaré absent"}
      </div>
    );
  }

  const indexCourant = ETAPES_WORKFLOW.findIndex((s) => s.cle === rdv.statut);

  return (
    <div className="flex items-center gap-1">
      {ETAPES_WORKFLOW.map((etape, idx) => {
        const estFait = indexCourant >= 0 && idx <= indexCourant;
        return (
          <React.Fragment key={etape.cle}>
            {idx > 0 && (
              <div className={`h-0.5 w-4 sm:w-6 ${estFait ? "bg-emerald-500" : "bg-slate-200"}`} />
            )}
            <div
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                estFait ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"
              }`}
            >
              {estFait ? <CheckCircle2 className="h-3 w-3" /> : <Square className="h-3 w-3" />}
              <span>{etape.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const PanneauVerificationAdherents: React.FC<PanneauVerificationAdherentsProps> = ({
  mode = "edition",
  siteId,
}) => {
  const estLectureSeule = mode === "lecture";

  const {
    termeRecherche,
    setTermeRecherche,
    resultatsRecherche,
    rechercheEnCours,
    adherentActif,
    selectionnerAdherent,
    reinitialiserSelection,
    rendezVous,
    chargementRdv,
    servicesOrientation,
    serviceSelectionneId,
    setServiceSelectionneId,
    identiteVerifiee,
    setIdentiteVerifiee,
    dernierTicketEmis,
    actionEnCours,
    confirmerArriveeRdv,
    emettreTicketSpontane,
  } = useVerificationAdherent(siteId);

  const [carteModaleOuverte, setCarteModaleOuverte] = useState(false);

  const ouvrirEcranSalleAttente = () => {
    window.open("/ecran-attente", "asina-ecran-attente", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* En-tête du panneau */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-asina-600" />
            <span>Vérification Accueil & Éligibilité Adhérents</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Contrôle d'affiliation CNAPS/Entreprise, confirmation d'arrivée des rendez-vous et
            délivrance des tickets de file d'attente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={ouvrirEcranSalleAttente}
            className="btn-secondary py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Ouvrir l'écran d'affichage pour la salle d'attente (2e écran)"
          >
            <Tv className="h-4 w-4 text-slate-500" />
            <span>Écran Salle d'Attente</span>
          </button>
        </div>
      </div>

      {/* Grille principale : Recherche & Profil / Orientation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche : Recherche et Identification */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <span>Rechercher un Usager / Salarié</span>
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={termeRecherche}
                onChange={(e) => setTermeRecherche(e.target.value)}
                placeholder="Nom, prénom, matricule ou CNAPS..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-asina-500"
              />
              {rechercheEnCours && (
                <div className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-mono">
                  Recherche...
                </div>
              )}
            </div>

            {/* Résultats de recherche déroulants */}
            {resultatsRecherche.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto bg-slate-50/50 shadow-inner">
                {resultatsRecherche.map((adh) => (
                  <button
                    key={adh.patient.id}
                    type="button"
                    onClick={() => selectionnerAdherent(adh)}
                    className="w-full text-left p-3 hover:bg-asina-50/60 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {adh.patient.nom} {adh.patient.prenom}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-600">{adh.patient.matricule}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">
                          {adh.affiliation.nomEntreprise || "Indépendant"}
                        </span>
                      </div>
                    </div>
                    <BadgeEligibilite eligibilite={adh.eligibilite} compact />
                  </button>
                ))}
              </div>
            )}

            {termeRecherche.trim().length >= 2 &&
              !rechercheEnCours &&
              resultatsRecherche.length === 0 && (
                <div className="text-center p-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  Aucun adhérent trouvé pour « {termeRecherche} ».
                </div>
              )}
          </div>

          {/* Fiche détaillée de l'adhérent sélectionné */}
          {adherentActif ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2 border-b border-slate-150 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-asina-100 text-asina-800 flex items-center justify-center font-bold text-sm shrink-0 border border-asina-200">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {adherentActif.patient.nom} {adherentActif.patient.prenom}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Matricule : {adherentActif.patient.matricule}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={reinitialiserSelection}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md text-xs transition cursor-pointer"
                  title="Sélectionner un autre usager"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Statut d'éligibilité */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Contrôle des Droits :
                  </span>
                  <BadgeEligibilite eligibilite={adherentActif.eligibilite} />
                </div>
                {adherentActif.eligibilite.motif && (
                  <p className="text-[11px] text-slate-500 italic">
                    {adherentActif.eligibilite.motif}
                  </p>
                )}
              </div>

              {/* Détails administratifs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-150">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                    Entreprise Employeur
                  </span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {adherentActif.affiliation.nomEntreprise || "Non rattaché"}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-150">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                    Numéro CNAPS
                  </span>
                  <span className="font-mono font-bold text-slate-800 truncate block mt-0.5">
                    {adherentActif.affiliation.cnaps || "Non renseigné"}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-150">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                    Groupe Sanguin
                  </span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {adherentActif.patient.groupeSanguin || "Inconnu"}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-150">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                    Téléphone
                  </span>
                  <span className="font-mono text-slate-800 block mt-0.5">
                    {adherentActif.patient.telephone || "Non renseigné"}
                  </span>
                </div>
              </div>

              {/* Actions carte adhérent */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCarteModaleOuverte(true)}
                  className="w-full btn-secondary py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <CreditCard className="h-4 w-4 text-asina-600" />
                  <span>Afficher la Carte d'Adhérent Santé</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs space-y-2">
              <UserCheck className="h-8 w-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Aucun usager sélectionné</p>
              <p className="text-[11px]">
                Recherchez un salarié ou adhérent par son nom ou matricule dans le champ ci-dessus
                pour lancer la vérification d'accueil.
              </p>
            </div>
          )}
        </div>

        {/* Colonne droite : Contrôle au guichet, Rendez-vous & Émission tickets */}
        <div className="lg:col-span-7 space-y-4">
          {adherentActif ? (
            <>
              {/* Carte Contrôle d'Identité & Service d'Orientation */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>Contrôle Présence & Orientation Guichet</span>
                  </h3>

                  <div className="text-[11px] text-slate-500 font-medium">Guichet Accueil</div>
                </div>

                {/* Case à cocher de vérification d'identité */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={identiteVerifiee}
                    disabled={estLectureSeule || actionEnCours}
                    onChange={(e) => setIdentiteVerifiee(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-emerald-950 block">
                      Vérification physique effectuée
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      La pièce d'identité ou le badge entreprise a été présenté(e) et validé(e) par
                      l'agent d'accueil.
                    </span>
                  </div>
                </label>

                {/* Sélection du service médical d'orientation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Service médical d'aiguillage *
                    </label>
                    {servicesOrientation.length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {servicesOrientation.length} service
                        {servicesOrientation.length > 1 ? "s" : ""} disponible
                        {servicesOrientation.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <select
                    value={serviceSelectionneId ?? ""}
                    disabled={estLectureSeule || actionEnCours || servicesOrientation.length === 0}
                    onChange={(e) => setServiceSelectionneId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-asina-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {servicesOrientation.length === 0 ? (
                      <option value="">Aucun service actif configuré</option>
                    ) : (
                      servicesOrientation.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom} ({s.codeFile}){s.description ? ` — ${s.description}` : ""}
                        </option>
                      ))
                    )}
                  </select>
                  {serviceSelectionneId &&
                    servicesOrientation.length > 0 &&
                    (() => {
                      const serv = servicesOrientation.find((s) => s.id === serviceSelectionneId);
                      if (!serv) return null;
                      return (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-asina-50 text-asina-700 border border-asina-200">
                            {serv.codeFile}
                          </span>
                          <span className="font-medium text-slate-700">{serv.nom}</span>
                          {serv.siteName && (
                            <span className="text-slate-400">• {serv.siteName}</span>
                          )}
                          {serv.description && (
                            <span className="italic text-slate-500">• {serv.description}</span>
                          )}
                        </div>
                      );
                    })()}
                </div>
              </div>

              {/* Section Rendez-vous du jour */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck2 className="h-4.5 w-4.5 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Rendez-vous programmés pour cet adhérent
                    </h3>
                  </div>

                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    {rendezVous.length}
                  </span>
                </div>

                {chargementRdv ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Vérification des rendez-vous en cours...
                  </div>
                ) : rendezVous.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-center text-xs text-slate-500">
                    Aucun rendez-vous planifié enregistré pour cet adhérent. Vous pouvez émettre un
                    ticket de visite spontanée ci-dessous.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rendezVous.map((rdv) => (
                      <div
                        key={rdv.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono font-bold text-slate-800">
                              {rdv.heureRdv}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">
                              {new Date(rdv.dateRdv).toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>

                          <WorkflowRendezVous rdv={rdv} />

                          {rdv.commentaire && (
                            <p className="text-[11px] text-slate-500 italic mt-1">
                              « {rdv.commentaire} »
                            </p>
                          )}
                        </div>

                        {rdv.actionnable && !estLectureSeule && (
                          <button
                            type="button"
                            disabled={actionEnCours || servicesOrientation.length === 0}
                            onClick={() => confirmerArriveeRdv(rdv.id)}
                            className="btn-primary py-2 px-3.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs shrink-0"
                          >
                            <Ticket className="h-4 w-4" />
                            <span>
                              {actionEnCours ? "Confirmation..." : "Confirmer & Émettre Ticket"}
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section Visite Spontanée (Sans RDV) */}
              {!estLectureSeule && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-emerald-600" />
                        <span>Visite Spontanée (Sans Rendez-Vous)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Pour une consultation non programmée, un soin d'urgence ou un passage
                        spontané à l'infirmerie.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={actionEnCours || servicesOrientation.length === 0}
                      onClick={emettreTicketSpontane}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs shrink-0"
                    >
                      <Ticket className="h-4 w-4" />
                      <span>
                        {actionEnCours ? "Émission en cours..." : "Émettre Ticket Spontané"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bannière de confirmation du Dernier Ticket émis */}
              {dernierTicketEmis && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      <span>
                        Ticket généré avec succès (
                        {dernierTicketEmis.estRdv ? "Rendez-vous confirmé" : "Visite spontanée"})
                      </span>
                    </div>
                    <div className="text-3xl font-black font-mono tracking-wider">
                      {dernierTicketEmis.numTicket}
                    </div>
                    <div className="text-[11px] text-emerald-100">
                      Émis le {new Date(dernierTicketEmis.dateEmission).toLocaleTimeString("fr-FR")}{" "}
                      • Le patient est invité à patienter en salle d'attente.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Imprimer Ticket</span>
                    </button>
                    <button
                      type="button"
                      onClick={ouvrirEcranSalleAttente}
                      className="bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Tv className="h-4 w-4" />
                      <span>Voir Écran</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs space-y-3 shadow-2xs">
              <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-700 text-sm">
                  Prêt pour l'accueil des adhérents
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Sélectionnez un adhérent dans la colonne de gauche pour vérifier ses droits
                  conventionnels, constater sa présence physique, confirmer ses rendez-vous du jour
                  ou émettre un ticket d'orientation vers l'infirmerie ou la consultation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modale de la carte adhérent */}
      <CarteAdherentModale
        ouvert={carteModaleOuverte}
        adherent={adherentActif}
        onFermer={() => setCarteModaleOuverte(false)}
      />
    </div>
  );
};
