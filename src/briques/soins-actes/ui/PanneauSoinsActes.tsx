/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ArrowRightLeft,
  Stethoscope,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Check,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useSoinsActes } from "../hooks/useSoinsActes";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import {
  estActesEnSuspens,
  estConflitActesDemandes,
  extraireCodesActes,
} from "@/noyau/http/erreursCloture";
import {
  StatutActe,
  LIBELLES_STATUT_ACTE,
  TRANSITIONS_AUTORISEES,
  ActeDemandeItem,
  ActeSaisiItem,
} from "../modele/soin-acte.types";
import { ModaleReorientationService } from "./ModaleReorientationService";
import { ModaleRealisationActe, type ActeDefinitionPourRealisation } from "./ModaleRealisationActe";

export interface PanneauSoinsActesProps {
  mode?: ModeAffichage;
  encounterId?: number | null;
  patientId?: number | null;
  patientNom?: string;
  ticketNumero?: string;
  onTermineSucces?: () => void;
}

export const PanneauSoinsActes: React.FC<PanneauSoinsActesProps> = ({
  mode = "edition",
  encounterId,
  patientId,
  patientNom,
  ticketNumero,
  onTermineSucces,
}) => {
  const {
    actesSaisis,
    actesDemandes,
    catalogueRealisable,
    chargement,
    actionEnCours,
    erreur,
    changerStatut,
    ajouterResultat,
    terminerPriseEnCharge,
    orienterPatient,
    rafraichir,
  } = useSoinsActes(encounterId, patientId);

  const { notifierSucces, notifierErreur } = useNotifier();

  const estModifiable = mode === "edition";

  // Modale de réalisation d'acte (moule + création dans la même passe)
  const [acteARealiser, setActeARealiser] = useState<ActeDefinitionPourRealisation | null>(null);
  const [ligneDemandeEnCours, setLigneDemandeEnCours] = useState<number | null>(null);

  // Saisie libre : recherche dans le catalogue réalisable
  const [rechercheCatalogue, setRechercheCatalogue] = useState("");

  // Modale de réorientation
  const [modaleReorientationOuverte, setModaleReorientationOuverte] = useState(false);

  // Clôture
  const [clotureEnCours, setClotureEnCours] = useState(false);

  const catalogueFiltre = catalogueRealisable.filter((c) => {
    const term = rechercheCatalogue.toLowerCase().trim();
    if (!term) return true;
    return c.libelle.toLowerCase().includes(term) || c.code.toLowerCase().includes(term);
  });

  const handleOrienter = async (serviceId: number): Promise<boolean> => {
    try {
      await orienterPatient(serviceId);
      notifierSucces("Patient réorienté. Il apparaîtra dans la file du service destinataire.");
      return true;
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
      return false;
    }
  };

  const ouvrirRealisation = (
    acte: ActeDefinitionPourRealisation,
    ligneDemandeId: number | null,
  ) => {
    setActeARealiser(acte);
    setLigneDemandeEnCours(ligneDemandeId);
  };

  const fermerRealisation = () => {
    setActeARealiser(null);
    setLigneDemandeEnCours(null);
  };

  const gererCloture = async () => {
    if (!estModifiable) return;

    // Pré-contrôle local : actes réalisés encore en planifie/en_cours → 422 non forçable
    const actesEnSuspens = actesSaisis.filter(
      (a) => a.statut === "planifie" || a.statut === "en_cours",
    );
    if (actesEnSuspens.length > 0) {
      const codes = actesEnSuspens
        .map((a) => a.acteDefinitionCode)
        .filter(Boolean)
        .join(", ");
      notifierErreur(
        `Actes en suspens : ${codes}. Terminez-les ou annulez-les avant de clôturer la prise en charge.`,
      );
      return;
    }

    setClotureEnCours(true);
    try {
      try {
        await terminerPriseEnCharge(false);
      } catch (err: unknown) {
        if (estConflitActesDemandes(err)) {
          const codes = extraireCodesActes(err.message);
          const liste = codes.length > 0 ? `\n• ${codes.join("\n• ")}` : "";
          if (
            !window.confirm(
              `Il reste des actes demandés non réalisés :${liste}\n\nSouhaitez-vous forcer la clôture de la prise en charge ?`,
            )
          ) {
            return;
          }
          await terminerPriseEnCharge(true);
        } else if (estActesEnSuspens(err)) {
          notifierErreur(err.message);
          return;
        } else {
          throw err;
        }
      }
      notifierSucces("Prise en charge terminée avec succès.");
      if (onTermineSucces) onTermineSucces();
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    } finally {
      setClotureEnCours(false);
    }
  };

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des droits nécessaires pour accéder aux actes de soins.
      </div>
    );
  }

  if (!encounterId) {
    return (
      <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-2">
        <Stethoscope className="h-8 w-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-700">Aucun patient en cours de soins</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Prenez un patient en charge depuis la file d'attente pour démarrer la réalisation des
          actes et soins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête prise en charge & Bouton Terminer */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Prise en charge infirmière active
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-bold text-slate-900 text-base">{patientNom || "Patient"}</span>
            {ticketNumero && (
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">
                Ticket {ticketNumero}
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono">Dossier #{encounterId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {estModifiable && (
            <button
              type="button"
              disabled={actionEnCours || clotureEnCours || !encounterId}
              onClick={() => setModaleReorientationOuverte(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-2xs transition cursor-pointer disabled:opacity-50"
              title="Orienter le patient vers un autre service sans clôturer la prise en charge"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Réorienter vers un service</span>
            </button>
          )}

          {estModifiable && (
            <button
              type="button"
              disabled={clotureEnCours || actionEnCours}
              onClick={gererCloture}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{clotureEnCours ? "Clôture en cours…" : "Terminer la prise en charge"}</span>
            </button>
          )}
        </div>
      </div>

      {erreur && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Actes prescrits demandés à exécuter */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Actes prescrits à exécuter ({actesDemandes.length})
            </h3>
            <p className="text-xs text-slate-500">
              Prescriptions médicales et demandes en attente pour ce patient
            </p>
          </div>
        </div>

        {actesDemandes.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">Aucun acte médical prescrit en attente.</p>
        ) : (
          <div className="space-y-3">
            {actesDemandes.map((d) => (
              <CarteDemandeActe
                key={d.id}
                demande={d}
                estModifiable={estModifiable}
                desactive={actionEnCours}
                onOuvrirRealisation={(demande) =>
                  ouvrirRealisation(
                    {
                      id: demande.acteDefinitionId,
                      code: demande.acteDefinitionCode,
                      libelle: demande.acteDefinitionLibelle,
                    },
                    demande.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Saisie libre d'un acte depuis le catalogue autorisé */}
      {estModifiable && (
        <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Saisie libre d'un soin ou acte</h3>
            <p className="text-xs text-slate-500">
              Actes réalisables dans le service de cette prise en charge :{" "}
              {catalogueRealisable.length} acte
              {catalogueRealisable.length > 1 ? "s" : ""}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              placeholder="Filtrer le catalogue…"
              value={rechercheCatalogue}
              onChange={(e) => setRechercheCatalogue(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden"
            />
          </div>

          {catalogueFiltre.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center italic">
              Aucun acte réalisable dans ce service.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {catalogueFiltre.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={actionEnCours}
                  onClick={() =>
                    ouvrirRealisation({ id: c.id, code: c.code, libelle: c.libelle }, null)
                  }
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-asina-400 hover:bg-asina-50/40 transition cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-asina-700 bg-white border border-asina-200 px-1.5 py-0.5 rounded">
                      {c.code}
                    </span>
                    {c.estSoinInfirmier && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase">
                        Soins
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-800 leading-tight">
                    {c.libelle}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actes saisis pour cet encounter */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Actes et soins enregistrés sur ce dossier ({actesSaisis.length})
          </h3>
          <p className="text-xs text-slate-500">
            Cycle de vie, observations et résultats cliniques associés
          </p>
        </div>

        {chargement && actesSaisis.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">Chargement des actes…</p>
        ) : actesSaisis.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Aucun acte saisi sur ce dossier pour le moment.
          </p>
        ) : (
          <div className="space-y-4">
            {actesSaisis.map((acte) => (
              <CarteActeSaisi
                key={acte.id}
                acte={acte}
                estModifiable={estModifiable}
                desactive={actionEnCours}
                onStatut={async (nouveauStatut) => {
                  try {
                    await changerStatut(acte.id, nouveauStatut);
                    notifierSucces(`Statut mis à jour : ${LIBELLES_STATUT_ACTE[nouveauStatut]}`);
                  } catch (err) {
                    notifierErreur(extraireMessageErreur(err));
                  }
                }}
                onResultat={async (res) => {
                  try {
                    await ajouterResultat(acte.id, res);
                    notifierSucces("Résultat clinique ajouté.");
                  } catch (err) {
                    notifierErreur(extraireMessageErreur(err));
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale de réorientation */}
      <ModaleReorientationService
        ouvert={modaleReorientationOuverte}
        encounterId={encounterId ?? null}
        onFermer={() => setModaleReorientationOuverte(false)}
        onOrienter={handleOrienter}
      />

      {/* Modale de réalisation / complétion d'acte (moule inclus) */}
      <ModaleRealisationActe
        ouvert={!!acteARealiser}
        encounterId={encounterId}
        acteDefinition={acteARealiser}
        ligneDemandeId={ligneDemandeEnCours}
        onFermer={fermerRealisation}
        onTermine={() => {
          notifierSucces("Acte enregistré.");
          void rafraichir();
          fermerRealisation();
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Carte pour un acte demandé (à exécuter depuis la file)
 * ------------------------------------------------------------------ */
const CarteDemandeActe: React.FC<{
  demande: ActeDemandeItem;
  estModifiable: boolean;
  desactive: boolean;
  onOuvrirRealisation: (demande: ActeDemandeItem) => void;
}> = ({ demande, estModifiable, desactive, onOuvrirRealisation }) => (
  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
    <div className="flex flex-wrap justify-between items-center gap-2">
      <div className="flex items-center gap-2">
        <strong className="text-slate-900 font-bold text-sm">
          {demande.acteDefinitionLibelle}
        </strong>
        <span className="font-mono text-[10px] text-slate-400">({demande.acteDefinitionCode})</span>
        {demande.urgente && (
          <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded font-bold text-[10px]">
            URGENT
          </span>
        )}
      </div>
    </div>

    {demande.commentaire && (
      <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 text-xs italic">
        Instruction : « {demande.commentaire} »
      </p>
    )}

    {estModifiable && (
      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={desactive}
          onClick={() => onOuvrirRealisation(demande)}
          className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Réaliser cet acte</span>
        </button>
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ *
 * Carte pour un acte saisi sur l'encounter
 *
 * NB : la saisie du moule d'observations se fait désormais EN AMONT dans
 * ModaleRealisationActe. Ici on se contente d'afficher les observations
 * déjà saisies, de proposer les transitions de statut et l'ajout d'un
 * résultat d'examen (qui reste une action "après coup").
 * ------------------------------------------------------------------ */
const CarteActeSaisi: React.FC<{
  acte: ActeSaisiItem;
  estModifiable: boolean;
  desactive: boolean;
  onStatut: (s: StatutActe) => Promise<void>;
  onResultat: (res: {
    type: string;
    conclusion?: string | null;
    interpretation?: string | null;
  }) => Promise<void>;
}> = ({ acte, estModifiable, desactive, onStatut, onResultat }) => {
  const transitions = TRANSITIONS_AUTORISEES[acte.statut] || [];

  const [typeRes, setTypeRes] = useState("");
  const [conclusionRes, setConclusionRes] = useState("");
  const [interpretationRes, setInterpretationRes] = useState("");
  const [enCoursAjoutRes, setEnCoursAjoutRes] = useState(false);

  const badgeCouleur =
    acte.statut === "realise"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : acte.statut === "en_cours"
        ? "bg-blue-50 text-blue-800 border-blue-200"
        : acte.statut === "annule" || acte.statut === "saisi_par_erreur"
          ? "bg-slate-100 text-slate-500 border-slate-200 line-through"
          : "bg-amber-50 text-amber-800 border-amber-200";

  /**
   * Les règles du moule (observations obligatoires) sont déjà appliquées :
   *  - côté client, par ModaleRealisationActe au moment de la création ;
   *  - côté serveur, par ActeRealise::assertObligatoiresSaisies() au moment
   *    du changement de statut (le message remonte déjà le détail des
   *    observations manquantes).
   * On délègue donc simplement au parent, qui notifie l'erreur le cas échéant.
   */
  const gererClicStatut = async (cible: StatutActe) => {
    await onStatut(cible);
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs shadow-2xs">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <span className="font-bold text-slate-900 text-sm">{acte.acteDefinitionLibelle}</span>
          <span className="font-mono text-slate-400 text-[10px] ml-2">
            ({acte.acteDefinitionCode})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badgeCouleur}`}>
            {LIBELLES_STATUT_ACTE[acte.statut]}
          </span>

          {estModifiable && transitions.length > 0 && (
            <div className="flex gap-1">
              {transitions.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={desactive}
                  onClick={() => gererClicStatut(t)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 font-semibold text-[10px] cursor-pointer disabled:opacity-50"
                >
                  → {LIBELLES_STATUT_ACTE[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {acte.commentaire && (
        <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
          {acte.commentaire}
        </p>
      )}

      {/* Observations déjà enregistrées */}
      {acte.observations.length > 0 && (
        <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">
            Observations cliniques enregistrées ({acte.observations.length}) :
          </span>
          <div className="space-y-1">
            {acte.observations.map((o) => (
              <p
                key={o.id}
                className="text-slate-800 flex items-center gap-1.5 font-mono text-[11px]"
              >
                <span className="font-bold text-slate-900">{o.code} :</span>
                <span className="px-1.5 py-0.2 bg-white rounded border border-slate-200 font-bold">
                  {o.valeur} {o.uniteCode || o.unite || ""}
                </span>
                {o.interpretation && (
                  <span className="text-slate-500 italic text-[10px]">({o.interpretation})</span>
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Résultats d'examens déjà enregistrés */}
      {acte.resultats.length > 0 && (
        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">
            Résultats d'examens associés :
          </span>
          {acte.resultats.map((r) => (
            <p key={r.id} className="text-emerald-950 text-[11px]">
              <strong className="font-semibold uppercase font-mono">{r.type} :</strong>{" "}
              {r.conclusion || r.resultat}
              {r.interpretation ? ` — ${r.interpretation}` : ""}
            </p>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout d'un résultat d'examen */}
      {estModifiable && acte.statut !== "annule" && acte.statut !== "saisi_par_erreur" && (
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2">
            <span className="font-bold text-emerald-900 text-[11px] block">
              Ajouter un résultat d'examen ou conclusion médicale
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Type (ex: ANALYSE, ECG)"
                  value={typeRes}
                  onChange={(e) => setTypeRes(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-emerald-300 rounded p-1.5 text-[11px] font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Conclusion du résultat..."
                  value={conclusionRes}
                  onChange={(e) => setConclusionRes(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded p-1.5 text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Interprétation"
                  value={interpretationRes}
                  onChange={(e) => setInterpretationRes(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded p-1.5 text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={
                    !typeRes.trim() || !conclusionRes.trim() || desactive || enCoursAjoutRes
                  }
                  onClick={async () => {
                    setEnCoursAjoutRes(true);
                    try {
                      await onResultat({
                        type: typeRes.trim(),
                        conclusion: conclusionRes.trim(),
                        interpretation: interpretationRes.trim() || null,
                      });
                      setTypeRes("");
                      setConclusionRes("");
                      setInterpretationRes("");
                    } finally {
                      setEnCoursAjoutRes(false);
                    }
                  }}
                  className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold cursor-pointer disabled:opacity-40 transition"
                >
                  + Résultat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanneauSoinsActes;
