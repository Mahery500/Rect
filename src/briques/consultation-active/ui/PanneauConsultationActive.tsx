/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Stethoscope,
  ClipboardList,
  CheckCircle,
  Plus,
  AlertTriangle,
  ShieldAlert,
  Send,
  Zap,
  Syringe,
  FlaskConical,
  X,
  Search,
  Pill,
  Trash2,
  Printer,
  Check,
  Activity,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useConsultationActive } from "../hooks/useConsultationActive";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import {
  estActesEnSuspens,
  estConflitActesDemandes,
  extraireCodesActes,
} from "@/noyau/http/erreursCloture";
import { diagnosticDefinitionApi } from "@/briques/diagnostic-definitions/api/diagnostic-definition.api";
import { useOrdonnances } from "@/briques/ordonnances/hooks/useOrdonnances";
import type {
  MedicamentCatalogue,
  OrdonnanceItem,
} from "@/briques/ordonnances/api/ordonnances.api";
import { imprimerOrdonnance } from "@/briques/ordonnances/utils/imprimerOrdonnance";
import { SelecteurActe } from "@/briques/actes-realisation";

import {
  TypeDiagnostic,
  StatutDiagnostic,
  PrioriteDemande,
  ActePrescritItem,
} from "../modele/consultation-active.types";

export interface PanneauConsultationActiveProps {
  mode?: ModeAffichage;
  encounterId?: number | null;
  patientId?: number | null;
  patientNom?: string;
  ticketNumero?: string;
  onClotureSucces?: () => void;
  onConsultationTerminee?: () => void;
}

interface LigneOrdonnanceForm {
  cle: number;
  medicamentId: string;
  quantite: string;
  posologie: string;
  dureeJours: string;
}

let compteurLigne = 0;
const nouvelleLigne = (): LigneOrdonnanceForm => ({
  cle: ++compteurLigne,
  medicamentId: "",
  quantite: "",
  posologie: "",
  dureeJours: "",
});

/* -------------------------------------------------------------------------- */
/*  Barre de recherche de médicament (autocomplétion)                         */
/* -------------------------------------------------------------------------- */

interface RechercheMedicamentProps {
  medicaments: MedicamentCatalogue[];
  valeur: string;
  onChange: (id: string) => void;
  exclusIds?: string[];
  chargement?: boolean;
  disabled?: boolean;
}

const LIMITE_AFFICHAGE_MEDICAMENTS = 30;

const normaliserRecherche = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const RechercheMedicament: React.FC<RechercheMedicamentProps> = ({
  medicaments,
  valeur,
  onChange,
  exclusIds = [],
  chargement = false,
  disabled = false,
}) => {
  const [requete, setRequete] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [indexActif, setIndexActif] = useState(0);
  const conteneurRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listeRef = React.useRef<HTMLUListElement>(null);

  const selectionne = valeur ? (medicaments.find((m) => String(m.id) === valeur) ?? null) : null;

  const jetons = normaliserRecherche(requete).split(/\s+/).filter(Boolean);
  const resultats = medicaments.filter((m) => {
    if (exclusIds.includes(String(m.id))) return false;
    if (jetons.length === 0) return true;
    const texte = normaliserRecherche(`${m.libelle} ${m.forme ?? ""} ${m.code ?? ""}`);
    return jetons.every((j) => texte.includes(j));
  });
  const affiches = resultats.slice(0, LIMITE_AFFICHAGE_MEDICAMENTS);
  const restants = resultats.length - affiches.length;

  React.useEffect(() => {
    const surClic = (e: MouseEvent) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", surClic);
    return () => document.removeEventListener("mousedown", surClic);
  }, []);

  React.useEffect(() => {
    if (!ouvert) return;
    listeRef.current
      ?.querySelector<HTMLElement>('[data-actif="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [indexActif, ouvert]);

  const choisir = (m: MedicamentCatalogue) => {
    onChange(String(m.id));
    setRequete("");
    setOuvert(false);
  };

  const effacer = () => {
    onChange("");
    setRequete("");
    setOuvert(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const surTouche = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOuvert(true);
        setIndexActif((i) => Math.min(i + 1, Math.max(affiches.length - 1, 0)));
        break;
      case "ArrowUp":
        e.preventDefault();
        setIndexActif((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (ouvert && affiches[indexActif]) choisir(affiches[indexActif]);
        break;
      case "Escape":
        setOuvert(false);
        break;
    }
  };

  if (selectionne) {
    return (
      <div className="flex items-center justify-between gap-2 bg-white border border-violet-300 rounded p-1.5 text-xs">
        <span className="min-w-0 truncate">
          <strong className="text-slate-900">{selectionne.libelle}</strong>
          {selectionne.forme && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-semibold">
              {selectionne.forme}
            </span>
          )}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={effacer}
            className="shrink-0 text-slate-400 hover:text-slate-700 cursor-pointer"
            title="Changer de médicament"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={conteneurRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={ouvert}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={
          chargement ? "Chargement du catalogue…" : "Rechercher un médicament (nom, forme)…"
        }
        value={requete}
        onChange={(e) => {
          setRequete(e.target.value);
          setIndexActif(0);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={surTouche}
        className="w-full bg-white border border-slate-300 rounded p-1.5 pl-7 text-xs focus:outline-hidden focus:ring-1 focus:ring-violet-500 disabled:bg-slate-100"
      />
      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />

      {ouvert && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {chargement ? (
            <p className="px-3 py-2 text-xs text-slate-400">Chargement du catalogue…</p>
          ) : affiches.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">
              {requete.trim()
                ? `Aucun médicament ne correspond à « ${requete.trim()} ».`
                : "Aucun médicament disponible."}
            </p>
          ) : (
            <ul ref={listeRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
              {affiches.map((m, i) => (
                <li
                  key={m.id}
                  role="option"
                  aria-selected={i === indexActif}
                  data-actif={i === indexActif}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choisir(m);
                  }}
                  onMouseEnter={() => setIndexActif(i)}
                  className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between gap-2 ${
                    i === indexActif ? "bg-violet-50" : ""
                  }`}
                >
                  <span className="min-w-0 truncate">
                    <strong className="text-slate-900">{m.libelle}</strong>
                    {m.forme && <span className="ml-1.5 text-slate-500">{m.forme}</span>}
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5">
                    {m.statut === "brouillon" && (
                      <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                        brouillon
                      </span>
                    )}
                    {m.code && (
                      <span className="font-mono text-[10px] text-slate-400">{m.code}</span>
                    )}
                  </span>
                </li>
              ))}
              {restants > 0 && (
                <li className="px-3 py-1.5 text-[10px] text-slate-400 italic border-t border-slate-100">
                  + {restants} autre{restants > 1 ? "s" : ""} résultat{restants > 1 ? "s" : ""} :
                  affinez la recherche
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Panneau de consultation active                                            */
/* -------------------------------------------------------------------------- */

export const PanneauConsultationActive: React.FC<PanneauConsultationActiveProps> = ({
  mode = "edition",
  encounterId,
  patientId,
  patientNom,
  ticketNumero,
  onClotureSucces,
  onConsultationTerminee,
}) => {
  const cloturerCallback = onClotureSucces ?? onConsultationTerminee;

  const {
    diagnostics,
    catalogueDiagnostics,
    codeSystems,
    actesPrescrits,
    demandesActes,
    catalogueActes,
    chargement,
    sauvegardeEnCours,
    erreur,
    poserDiagnostic,
    modifierStatutDiagnostic,
    prescrireActe,
    changerStatutActe,
    ajouterResultatActe,
    ajouterObservationActe,
    recupererObservationsAttendues,
    creerDemandeActe,
    cloturerConsultation,
    rafraichir,
  } = useConsultationActive(encounterId, patientId);

  const {
    medicaments,
    ordonnances,
    chargement: chargementMedicaments,
    erreurMedicaments,
    enCours: ordonnanceEnCours,
    creer: creerOrdonnance,
    annuler: annulerOrdonnance,
  } = useOrdonnances(encounterId);

  const { notifierSucces, notifierErreur } = useNotifier();

  const estModifiable = mode === "edition";

  /* --------------------------------------------------------------------- */
  /*  Diagnostic                                                            */
  /* --------------------------------------------------------------------- */
  const [diagDefId, setDiagDefId] = useState("");
  const [rechercheDiag, setRechercheDiag] = useState("");
  const [typeDiag, setTypeDiag] = useState<TypeDiagnostic>("principal");
  const [statutDiag, setStatutDiag] = useState<StatutDiagnostic>("provisoire");
  const [commentaireDiag, setCommentaireDiag] = useState("");
  const [modeCreationDiag, setModeCreationDiag] = useState(false);
  const [nouveauDiagCode, setNouveauDiagCode] = useState("");
  const [nouveauDiagLibelle, setNouveauDiagLibelle] = useState("");
  const [nouveauDiagCodeSystem, setNouveauDiagCodeSystem] = useState("");
  const [nouveauDiagCodeExterne, setNouveauDiagCodeExterne] = useState("");

  React.useEffect(() => {
    if (codeSystems.length > 0 && !nouveauDiagCodeSystem) {
      const premierActif = codeSystems.find((cs) => cs.actif) || codeSystems[0];
      if (premierActif) {
        setNouveauDiagCodeSystem(premierActif.code);
      }
    }
  }, [codeSystems, nouveauDiagCodeSystem]);

  /* --------------------------------------------------------------------- */
  /*  Ajout de résultat clinique à un acte existant                         */
  /* --------------------------------------------------------------------- */
  const [actePourResultat, setActePourResultat] = useState<ActePrescritItem | null>(null);
  const [typeResultat, setTypeResultat] = useState("Examen clinique");
  const [conclusionResultat, setConclusionResultat] = useState("");
  const [interpretationResultat, setInterpretationResultat] = useState("");
  const [enCoursAjoutResultat, setEnCoursAjoutResultat] = useState(false);

  /* --------------------------------------------------------------------- */
  /*  Ajout d'observation clinique à un acte existant                       */
  /* --------------------------------------------------------------------- */
  const [actePourObs, setActePourObs] = useState<ActePrescritItem | null>(null);
  const [mouleObservations, setMouleObservations] = useState<any[]>([]);
  const [obsDefinitionId, setObsDefinitionId] = useState("");
  const [valeurObs, setValeurObs] = useState("");
  const [interpretationObs, setInterpretationObs] = useState("");
  const [enCoursAjoutObs, setEnCoursAjoutObs] = useState(false);

  /* --------------------------------------------------------------------- */
  /*  Demandes d'actes & prescriptions                                      */
  /* --------------------------------------------------------------------- */
  const [actePrescritId, setActePrescritId] = useState("");
  const [instructionActe, setInstructionActe] = useState("");
  const [prioriteDemande, setPrioriteDemande] = useState<PrioriteDemande>("NORMALE");
  const [estUrgente, setEstUrgente] = useState(false);
  const [serviceDestinataireId, setServiceDestinataireId] = useState("3");

  /* --------------------------------------------------------------------- */
  /*  Ordonnance médicamenteuse                                             */
  /* --------------------------------------------------------------------- */
  const [lignesOrdonnance, setLignesOrdonnance] = useState<LigneOrdonnanceForm[]>(() => [
    nouvelleLigne(),
  ]);

  const [clotureEnCours, setClotureEnCours] = useState(false);

  /* --------------------------------------------------------------------- */
  /*  Handlers                                                              */
  /* --------------------------------------------------------------------- */

  const handleAjouterDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estModifiable) return;

    let targetDefId: number | null = null;

    if (modeCreationDiag) {
      if (!nouveauDiagCode.trim() || !nouveauDiagLibelle.trim()) {
        notifierErreur(
          "Le code et le libellé sont obligatoires pour créer un diagnostic dans le catalogue.",
        );
        return;
      }
      try {
        const codePrincipal = nouveauDiagCode.trim().toUpperCase();
        const codeExt = nouveauDiagCodeExterne.trim().toUpperCase() || codePrincipal;
        const systemeChoisi = nouveauDiagCodeSystem.trim().toUpperCase();
        const codifs = systemeChoisi ? [{ codeSystem: systemeChoisi, code: codeExt }] : [];
        const nouv = await diagnosticDefinitionApi.creerDefinition({
          code: codePrincipal,
          libelle: nouveauDiagLibelle.trim(),
          codifications: codifs,
        });
        targetDefId = nouv.id;
        notifierSucces(`Diagnostic [${nouv.code}] enregistré au catalogue.`);
      } catch (err) {
        notifierErreur(extraireMessageErreur(err));
        return;
      }
    } else {
      if (!diagDefId) {
        notifierErreur(
          "Veuillez sélectionner un diagnostic dans la nomenclature ou en créer un nouveau.",
        );
        return;
      }
      targetDefId = Number(diagDefId);
    }

    try {
      await poserDiagnostic({
        diagnosticDefinitionId: targetDefId,
        type: typeDiag,
        statut: statutDiag,
        commentaire: commentaireDiag.trim() || null,
      });
      notifierSucces("Diagnostic médical posé avec succès.");
      setDiagDefId("");
      setRechercheDiag("");
      setCommentaireDiag("");
      setModeCreationDiag(false);
      setNouveauDiagCode("");
      setNouveauDiagLibelle("");
      setNouveauDiagCodeExterne("");
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  const handleMarquerActeRealise = async (acteId: number) => {
    if (!estModifiable) return;
    try {
      await changerStatutActe(acteId, "realise");
      notifierSucces("Statut de l’acte mis à jour : Réalisé.");
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  const handleMarquerActeSaisiParErreur = async (acteId: number) => {
    if (!estModifiable) return;
    if (
      !window.confirm(
        "Voulez-vous marquer cet acte comme « saisi par erreur » ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    try {
      await changerStatutActe(acteId, "saisi_par_erreur");
      notifierSucces("Acte marqué comme saisi par erreur.");
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  const handleOuvrirAjoutResultat = (acte: ActePrescritItem) => {
    setActePourResultat(acte);
    setTypeResultat("Examen clinique");
    setConclusionResultat("");
    setInterpretationResultat("");
  };

  const handleValiderResultat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actePourResultat || !typeResultat.trim() || !conclusionResultat.trim()) return;
    setEnCoursAjoutResultat(true);
    try {
      await ajouterResultatActe(actePourResultat.id, {
        type: typeResultat.trim(),
        conclusion: conclusionResultat.trim(),
        interpretation: interpretationResultat.trim() || null,
      });
      notifierSucces("Résultat clinique consigné sur l’acte.");
      setActePourResultat(null);
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    } finally {
      setEnCoursAjoutResultat(false);
    }
  };

  const handleOuvrirAjoutObservation = async (acte: ActePrescritItem) => {
    setActePourObs(acte);
    setObsDefinitionId("");
    setValeurObs("");
    setInterpretationObs("");
    try {
      const attendues = await recupererObservationsAttendues(acte.acteDefinitionId);
      setMouleObservations(attendues);
      if (attendues.length > 0) {
        setObsDefinitionId(String(attendues[0].observation.id));
      }
    } catch {
      setMouleObservations([]);
    }
  };

  const handleValiderObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actePourObs || !obsDefinitionId || !valeurObs.trim()) return;
    setEnCoursAjoutObs(true);
    try {
      await ajouterObservationActe(actePourObs.id, {
        observationDefinitionId: Number(obsDefinitionId),
        valeur: valeurObs.trim(),
        interpretation: interpretationObs.trim() || null,
      });
      notifierSucces("Observation clinique ajoutée à l’acte.");
      setActePourObs(null);
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    } finally {
      setEnCoursAjoutObs(false);
    }
  };

  const handlePrescrireActe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estModifiable || !actePrescritId) return;
    try {
      await creerDemandeActe({
        acteDefinitionId: Number(actePrescritId),
        priorite: estUrgente ? "URGENTE" : prioriteDemande,
        urgente: estUrgente,
        serviceId: serviceDestinataireId ? Number(serviceDestinataireId) : 3,
        commentaire: instructionActe.trim() || null,
      });
      notifierSucces("Demande d’acte ou prescription médicale enregistrée.");
      setActePrescritId("");
      setInstructionActe("");
      setEstUrgente(false);
      setPrioriteDemande("NORMALE");
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  /* --------------------------------------------------------------------- */
  /*  Ordonnance                                                            */
  /* --------------------------------------------------------------------- */
  const majLigneOrdonnance = (
    cle: number,
    champ: keyof Omit<LigneOrdonnanceForm, "cle">,
    valeur: string,
  ) => {
    setLignesOrdonnance((prev) => prev.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)));
  };

  const ajouterLigneOrdonnance = () => {
    setLignesOrdonnance((prev) => [...prev, nouvelleLigne()]);
  };

  const supprimerLigneOrdonnance = (cle: number) => {
    setLignesOrdonnance((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.cle !== cle)));
  };

  const handleCreerOrdonnance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estModifiable || !encounterId) return;

    for (let i = 0; i < lignesOrdonnance.length; i++) {
      const l = lignesOrdonnance[i];
      const n = i + 1;
      if (!l.medicamentId) {
        notifierErreur(`Ligne ${n} : recherchez et sélectionnez un médicament.`);
        return;
      }
      if (!(Number(l.quantite) > 0) || !Number.isInteger(Number(l.quantite))) {
        notifierErreur(`Ligne ${n} : la quantité doit être un entier strictement positif.`);
        return;
      }
      if (!l.posologie.trim()) {
        notifierErreur(`Ligne ${n} : la posologie est obligatoire.`);
        return;
      }
      if (
        l.dureeJours.trim() &&
        (!(Number(l.dureeJours) > 0) || !Number.isInteger(Number(l.dureeJours)))
      ) {
        notifierErreur(
          `Ligne ${n} : la durée doit être un nombre entier de jours strictement positif.`,
        );
        return;
      }
    }

    const doublons = new Set<string>();
    for (const l of lignesOrdonnance) {
      if (doublons.has(l.medicamentId)) {
        notifierErreur("Un même médicament apparaît plusieurs fois dans l’ordonnance.");
        return;
      }
      doublons.add(l.medicamentId);
    }

    try {
      await creerOrdonnance({
        encounterId,
        lignes: lignesOrdonnance.map((l) => ({
          medicamentId: Number(l.medicamentId),
          quantite: Number(l.quantite),
          posologie: l.posologie.trim(),
          dureeJours: l.dureeJours.trim() ? Number(l.dureeJours) : null,
        })),
      });
      notifierSucces("Ordonnance enregistrée avec succès.");
      setLignesOrdonnance([nouvelleLigne()]);
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  const handleAnnulerOrdonnance = async (id: number) => {
    if (!estModifiable) return;
    if (!window.confirm("Voulez-vous annuler cette ordonnance ?")) return;
    try {
      await annulerOrdonnance(id);
      notifierSucces("Ordonnance annulée.");
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  const libelleMedicament = (id?: number, fallback?: string | null) =>
    fallback ||
    medicaments.find((m) => m.id === id)?.libelle ||
    (id ? `Médicament #${id}` : "Médicament");

  const formeMedicament = (id?: number) =>
    id ? (medicaments.find((m) => m.id === id)?.forme ?? null) : null;

  const handleImprimerOrdonnance = async (o: OrdonnanceItem) => {
    if (!encounterId || !o.lignes?.length) {
      notifierErreur("Cette ordonnance ne contient aucune ligne à imprimer.");
      return;
    }
    try {
      await imprimerOrdonnance({
        numero: o.id,
        date: o.createdAt ?? o.dateCreation ?? (o as any).dateOrdonnance ?? null,
        patientNom: patientNom || "Patient",
        ticketNumero,
        encounterId,
        lignes: o.lignes.map((l) => ({
          nom: libelleMedicament(l.medicamentId, l.medicamentLibelle ?? l.medicamentNom),
          forme: formeMedicament(l.medicamentId),
          quantite: l.quantite,
          posologie: l.posologie,
          dureeJours: l.dureeJours,
        })),
      });
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };

  const handleCloturer = async () => {
    if (!estModifiable) return;

    const actesEnSuspens = actesPrescrits.filter(
      (a) => a.statut === "planifie" || a.statut === "en_cours",
    );
    if (actesEnSuspens.length > 0) {
      const codes = actesEnSuspens
        .map((a) => a.code)
        .filter(Boolean)
        .join(", ");
      notifierErreur(
        `Actes en suspens : ${codes}. Terminez-les (réalisé) ou annulez-les avant de clôturer la consultation.`,
      );
      return;
    }

    setClotureEnCours(true);
    try {
      try {
        await cloturerConsultation(false);
      } catch (err: unknown) {
        if (estConflitActesDemandes(err)) {
          const codes = extraireCodesActes(err.message);
          const liste = codes.length > 0 ? `\n• ${codes.join("\n• ")}` : "";
          if (
            !window.confirm(
              `Il reste des actes demandés non réalisés :${liste}\n\nForcer la clôture de la consultation médicale ?`,
            )
          ) {
            return;
          }
          await cloturerConsultation(true);
        } else if (estActesEnSuspens(err)) {
          notifierErreur(err.message);
          return;
        } else {
          throw err;
        }
      }
      notifierSucces("Consultation médicale clôturée avec succès.");
      if (cloturerCallback) cloturerCallback();
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    } finally {
      setClotureEnCours(false);
    }
  };

  /* --------------------------------------------------------------------- */
  /*  Rendu                                                                 */
  /* --------------------------------------------------------------------- */

  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous ne disposez pas des autorisations nécessaires pour accéder à la consultation médicale.
      </div>
    );
  }

  if (!encounterId) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
        <Stethoscope className="h-10 w-10 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-700">Aucune consultation active</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Pour démarrer une consultation, appelez un patient depuis l'onglet Salle d'Attente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bandeau consultation & Action de Clôture */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Consultation médicale en cours
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

        {estModifiable && (
          <button
            type="button"
            disabled={clotureEnCours || sauvegardeEnCours}
            onClick={handleCloturer}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            <span>{clotureEnCours ? "Clôture en cours…" : "Clôturer la consultation"}</span>
          </button>
        )}
      </div>

      {erreur && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Volet 2 : Diagnostics + Actes & Résultats */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 lg:col-span-2">
        {/* Diagnostics */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-cyan-700" />
                <span>Pose de Diagnostic (CIM-10)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Diagnostics nosologiques rattachés au catalogue officiel
              </p>
            </div>
            {estModifiable && (
              <button
                type="button"
                onClick={() => setModeCreationDiag((prev) => !prev)}
                className="text-[11px] font-bold text-cyan-700 hover:text-cyan-800 hover:underline cursor-pointer"
              >
                {modeCreationDiag ? "← Choisir du catalogue" : "+ Nouveau dans catalogue"}
              </button>
            )}
          </div>

          {estModifiable && (
            <form onSubmit={handleAjouterDiagnostic} className="space-y-3">
              {modeCreationDiag ? (
                <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-900 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-cyan-700" />
                      <span>Ajouter une nouvelle définition au catalogue CIM-10</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setModeCreationDiag(false)}
                      className="text-cyan-600 hover:text-cyan-800 text-[10px] font-semibold"
                    >
                      Annuler
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Code CIM-10 *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ex: J18.9"
                        value={nouveauDiagCode}
                        onChange={(e) => setNouveauDiagCode(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono uppercase focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Libellé nosologique complet *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Pneumopathie infectieuse aiguë"
                        value={nouveauDiagLibelle}
                        onChange={(e) => setNouveauDiagLibelle(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-cyan-200/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Système de codification
                      </label>
                      <select
                        value={nouveauDiagCodeSystem}
                        onChange={(e) => setNouveauDiagCodeSystem(e.target.value)}
                        disabled={codeSystems.length === 0}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {codeSystems.length > 0 ? (
                          <>
                            {codeSystems.map((cs) => (
                              <option key={cs.id} value={cs.code}>
                                {cs.code} — {cs.libelle}
                              </option>
                            ))}
                            {nouveauDiagCodeSystem &&
                              !codeSystems.some((cs) => cs.code === nouveauDiagCodeSystem) && (
                                <option value={nouveauDiagCodeSystem}>
                                  {nouveauDiagCodeSystem}
                                </option>
                              )}
                          </>
                        ) : (
                          <option value="">Aucun système de codification enregistré</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Code externe officiel (si différent)
                      </label>
                      <input
                        type="text"
                        placeholder="Optionnel (défaut = code nosologique)"
                        value={nouveauDiagCodeExterne}
                        onChange={(e) => setNouveauDiagCodeExterne(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono uppercase focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                      Rechercher et sélectionner dans le référentiel des diagnostics *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Filtrer par code (ex: J18), libellé ou codification internationale…"
                        value={rechercheDiag}
                        onChange={(e) => setRechercheDiag(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 pl-8 text-xs focus:outline-hidden"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <select
                      required
                      value={diagDefId}
                      onChange={(e) => setDiagDefId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden"
                    >
                      <option value="">
                        Sélectionner un diagnostic du catalogue ({catalogueDiagnostics.length})…
                      </option>
                      {catalogueDiagnostics
                        .filter((d) => {
                          if (!rechercheDiag.trim()) return true;
                          const r = rechercheDiag.toLowerCase();
                          const matchCode = d.code.toLowerCase().includes(r);
                          const matchLibelle = d.libelle.toLowerCase().includes(r);
                          const matchCodif = d.codifications?.some(
                            (c) =>
                              c.code.toLowerCase().includes(r) ||
                              c.codeSystem.toLowerCase().includes(r),
                          );
                          return matchCode || matchLibelle || matchCodif;
                        })
                        .map((d) => {
                          const codifsStr = d.codifications?.length
                            ? ` [${d.codifications
                                .map((c) => `${c.codeSystem}:${c.code}`)
                                .join(", ")}]`
                            : "";
                          return (
                            <option key={d.id} value={d.id}>
                              [{d.code}] {d.libelle}
                              {codifsStr}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {diagDefId &&
                    (() => {
                      const sel = catalogueDiagnostics.find((d) => String(d.id) === diagDefId);
                      if (!sel) return null;
                      return (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              <span className="font-mono text-rose-700 mr-1.5">[{sel.code}]</span>
                              {sel.libelle}
                            </span>
                          </div>
                          {sel.codifications && sel.codifications.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Codifications :
                              </span>
                              {sel.codifications.map((c, i) => (
                                <span
                                  key={`${c.codeSystem}-${c.code}-${i}`}
                                  className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-mono text-[10px] font-bold"
                                >
                                  {c.codeSystem}: {c.code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">
                              Aucune codification internationale externe rattachée à cette
                              définition
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Catégorie du diagnostic
                  </label>
                  <select
                    value={typeDiag}
                    onChange={(e) => setTypeDiag(e.target.value as TypeDiagnostic)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden font-semibold"
                  >
                    <option value="principal">Diagnostic principal</option>
                    <option value="secondaire">Diagnostic secondaire / associé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Statut médical
                  </label>
                  <select
                    value={statutDiag}
                    onChange={(e) => setStatutDiag(e.target.value as StatutDiagnostic)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden font-semibold"
                  >
                    <option value="provisoire">Provisoire</option>
                    <option value="confirme">Confirmé</option>
                    <option value="infirme">Infirmé</option>
                  </select>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Précisions cliniques, arguments ou commentaire (facultatif)…"
                  value={commentaireDiag}
                  onChange={(e) => setCommentaireDiag(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={(!diagDefId && !modeCreationDiag) || sauvegardeEnCours}
                className="w-full py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {modeCreationDiag
                    ? "Créer la définition et poser le diagnostic"
                    : "Poser le diagnostic"}
                </span>
              </button>
            </form>
          )}

          {/* Diagnostics posés */}
          <div className="pt-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Diagnostics consignés sur ce dossier ({diagnostics.length})
            </h4>

            {diagnostics.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Aucun diagnostic posé.</p>
            ) : (
              <ul className="space-y-2">
                {diagnostics.map((d) => (
                  <li
                    key={d.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-rose-700">[{d.code}]</span>
                          <strong className="text-slate-900">{d.libelle}</strong>
                          <span className="text-[10px] text-slate-400 font-medium">({d.type})</span>
                        </div>
                        {d.codifications && d.codifications.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {d.codifications.map((c, i) => (
                              <span
                                key={`${c.codeSystem}-${c.code}-${i}`}
                                className="px-1.5 py-0.2 bg-white border border-slate-200 rounded font-mono text-[9px] text-slate-600 font-bold"
                              >
                                {c.codeSystem}: {c.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          d.statut === "confirme"
                            ? "bg-emerald-100 text-emerald-800"
                            : d.statut === "infirme"
                              ? "bg-red-100 text-red-800 line-through"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {d.statut === "infirme" ? "Infirmé (définitif)" : d.statut}
                      </span>
                    </div>

                    {d.commentaire && (
                      <p className="text-[11px] text-slate-600 italic">« {d.commentaire} »</p>
                    )}

                    {estModifiable && d.statut === "provisoire" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => modifierStatutDiagnostic(d.id, "confirme")}
                          className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          onClick={() => modifierStatutDiagnostic(d.id, "infirme")}
                          className="text-[10px] text-red-700 font-bold hover:underline cursor-pointer"
                        >
                          Infirmer
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actes médicaux réalisés en séance (brique actes-realisation) */}
<div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 lg:col-span-2">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Syringe className="h-4 w-4 text-rose-700" />
              <span>Actes Médicaux Réalisés & Résultats d'Examens</span>
            </h3>
            <p className="text-xs text-slate-500">
              Sélection d'un acte, saisie de son moule d'observations et enregistrement
            </p>
          </div>

          {/* Réalisation / complétion d'acte : brique actes-realisation */}
          <SelecteurActe
            mode={mode}
            encounterId={encounterId}
            patientId={patientId}
            onEnregistre={(acte) => {
              notifierSucces(
                acte.statut === "realise"
                  ? "Acte réalisé et consigné."
                  : "Acte enregistré (en cours : obligatoires manquants).",
              );
              // Resynchronise la liste locale (CartesActeConsultation, clôture, etc.)
              void rafraichir();
            }}
          />
        </div>

        {/* Résultats & observations complémentaires sur actes déjà enregistrés */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-emerald-700" />
              <span>Résultats & observations complémentaires</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ajout de résultats cliniques ou d'observations sur un acte déjà enregistré
            </p>
          </div>

          {/* Formulaire Modal/Inline : Ajout d'un Résultat à un Acte */}
          {actePourResultat && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3 text-xs animate-slide-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-emerald-700" />
                  <span>Ajouter un résultat pour : {actePourResultat.libelle}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActePourResultat(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleValiderResultat} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Type de résultat *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Biologie, Imagerie, ECG"
                      value={typeResultat}
                      onChange={(e) => setTypeResultat(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Conclusion / Résultat principal *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Négatif, Taux conforme, Pas d'anomalie visible"
                      value={conclusionResultat}
                      onChange={(e) => setConclusionResultat(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Interprétation médicale ou détails (facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="Interprétation clinique du praticien…"
                    value={interpretationResultat}
                    onChange={(e) => setInterpretationResultat(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActePourResultat(null)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={enCoursAjoutResultat || !conclusionResultat.trim()}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Consigner le résultat</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Formulaire Modal/Inline : Ajout d'une Observation à un Acte */}
          {actePourObs && (
            <div className="p-3.5 bg-cyan-50 border border-cyan-300 rounded-xl space-y-3 text-xs animate-slide-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-950 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-700" />
                  <span>Ajouter une observation pour : {actePourObs.libelle}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActePourObs(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleValiderObservation} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Paramètre / Observation attendue *
                    </label>
                    {mouleObservations.length > 0 ? (
                      <select
                        required
                        value={obsDefinitionId}
                        onChange={(e) => setObsDefinitionId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                      >
                        {mouleObservations.map((m) => (
                          <option key={m.observation.id} value={m.observation.id}>
                            {m.observation.libelle} ({m.observation.code})
                            {m.obligatoire ? " *obligatoire" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        required
                        placeholder="ID Définition observation"
                        value={obsDefinitionId}
                        onChange={(e) => setObsDefinitionId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Valeur constatée *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ex: 120, Positif, Normal…"
                      value={valeurObs}
                      onChange={(e) => setValeurObs(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Interprétation (facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="Normale, Élevée, En surveillance…"
                    value={interpretationObs}
                    onChange={(e) => setInterpretationObs(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActePourObs(null)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={enCoursAjoutObs || !valeurObs.trim()}
                    className="px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistrer l'observation</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Actes consignés sur la consultation */}
          <div className="pt-2 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Actes enregistrés sur cet encounter ({actesPrescrits.length})
            </h4>

            {actesPrescrits.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Aucun acte médical enregistré sur cette consultation.
              </p>
            ) : (
              <div className="space-y-3">
                {actesPrescrits.map((a) => (
                  <CarteActeConsultation
                    key={a.id}
                    acte={a}
                    estModifiable={estModifiable}
                    actionEnCours={sauvegardeEnCours}
                    onMarquerRealise={() => handleMarquerActeRealise(a.id)}
                    onMarquerErreur={() => handleMarquerActeSaisiParErreur(a.id)}
                    onAjouterResultat={() => handleOuvrirAjoutResultat(a)}
                    onAjouterObservation={() => handleOuvrirAjoutObservation(a)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Demandes d'Actes & Prescriptions Médicales */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-700" />
              <span>Demandes d'Actes & Prescriptions Cliniques</span>
            </h3>
            <p className="text-xs text-slate-500">
              Transmission des demandes d'actes au personnel soignant (soins infirmiers, biologie,
              imagerie)
            </p>
          </div>

          {estModifiable && (
            <form onSubmit={handlePrescrireActe} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                  Acte médical / soin prescrit *
                </label>
                <select
                  required
                  value={actePrescritId}
                  onChange={(e) => setActePrescritId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden"
                >
                  <option value="">Sélectionner un acte à prescrire…</option>
                  {catalogueActes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.libelle} ({a.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                    Destinataire / Unité
                  </label>
                  <select
                    value={serviceDestinataireId}
                    onChange={(e) => setServiceDestinataireId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:outline-hidden"
                  >
                    <option value="3">Infirmerie (Soins infirmiers)</option>
                    <option value="2">Laboratoire d'analyses</option>
                    <option value="4">Imagerie & Radiologie</option>
                    <option value="1">Consultation / Général</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                    Priorité de réalisation
                  </label>
                  <select
                    value={prioriteDemande}
                    onChange={(e) => {
                      const val = e.target.value as PrioriteDemande;
                      setPrioriteDemande(val);
                      if (val === "URGENTE" || val === "TRES_URGENTE") setEstUrgente(true);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:outline-hidden font-medium"
                  >
                    <option value="NORMALE">Normale (En consultation)</option>
                    <option value="URGENTE">Urgente (Prioritaire)</option>
                    <option value="TRES_URGENTE">Très urgente (Immédiate)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 text-xs font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={estUrgente}
                    onChange={(e) => {
                      setEstUrgente(e.target.checked);
                      if (e.target.checked && prioriteDemande === "NORMALE") {
                        setPrioriteDemande("URGENTE");
                      }
                    }}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <Zap
                    className={`w-3.5 h-3.5 ${
                      estUrgente ? "text-amber-500 fill-amber-500" : "text-slate-400"
                    }`}
                  />
                  <span>Demande urgente (signalée immédiatement en tête de file de soins)</span>
                </label>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Instructions cliniques, posologie ou précisions d'exécution…"
                  value={instructionActe}
                  onChange={(e) => setInstructionActe(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={!actePrescritId || sauvegardeEnCours}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                <span>Émettre la demande d'acte</span>
              </button>
            </form>
          )}

          {/* Demandes d'actes émises */}
          <div className="pt-2 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Demandes d'actes & prescriptions émises ({demandesActes.length})
            </h4>

            {demandesActes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Aucune demande d'acte émise pour ce patient.
              </p>
            ) : (
              <ul className="space-y-2">
                {demandesActes.map((dem) => (
                  <li
                    key={dem.id}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      dem.urgente ? "bg-rose-50/60 border-rose-200" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-slate-900">{dem.acteDefinitionLibelle}</strong>
                          {dem.acteDefinitionCode && (
                            <span className="font-mono text-slate-500 text-[10px] bg-slate-200/70 px-1.5 py-0.2 rounded">
                              {dem.acteDefinitionCode}
                            </span>
                          )}
                          {dem.urgente && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                              <Zap className="w-2.5 h-2.5 fill-white" />
                              URGENT
                            </span>
                          )}
                          {dem.serviceNom && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {dem.serviceNom}
                            </span>
                          )}
                        </div>

                        {dem.commentaire && (
                          <p className="text-[11px] text-slate-600 italic">
                            Instruction : « {dem.commentaire} »
                          </p>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          dem.statut === "realise"
                            ? "bg-emerald-100 text-emerald-800"
                            : dem.statut === "en_cours"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {dem.statut === "realise"
                          ? "Réalisé"
                          : dem.statut === "en_cours"
                            ? "En cours"
                            : "En attente"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Ordonnance médicamenteuse */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 lg:col-span-2">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Pill className="h-4 w-4 text-violet-700" />
              <span>Ordonnance médicamenteuse</span>
            </h3>
            <p className="text-xs text-slate-500">
              Prescription des médicaments à dispenser à la pharmacie, tous types de formes
              confondues
            </p>
          </div>

          {estModifiable && erreurMedicaments && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{erreurMedicaments}</span>
            </div>
          )}

          {estModifiable && (
            <form onSubmit={handleCreerOrdonnance} className="space-y-3">
              <div className="space-y-2">
                {lignesOrdonnance.map((l, idx) => (
                  <div
                    key={l.cle}
                    className="p-3 bg-violet-50/40 border border-violet-200 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800">
                        Ligne {idx + 1}
                      </span>
                      {lignesOrdonnance.length > 1 && (
                        <button
                          type="button"
                          onClick={() => supprimerLigneOrdonnance(l.cle)}
                          className="text-slate-400 hover:text-red-700 cursor-pointer"
                          title="Retirer cette ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Médicament *
                        </label>
                        <RechercheMedicament
                          medicaments={medicaments}
                          valeur={l.medicamentId}
                          onChange={(id) => majLigneOrdonnance(l.cle, "medicamentId", id)}
                          exclusIds={lignesOrdonnance
                            .filter((autre) => autre.cle !== l.cle && autre.medicamentId)
                            .map((autre) => autre.medicamentId)}
                          chargement={chargementMedicaments}
                          disabled={ordonnanceEnCours}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Quantité (unités) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          step={1}
                          placeholder="ex: 20"
                          value={l.quantite}
                          onChange={(e) => majLigneOrdonnance(l.cle, "quantite", e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Durée (jours)
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="Facultatif"
                          value={l.dureeJours}
                          onChange={(e) => majLigneOrdonnance(l.cle, "dureeJours", e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Posologie *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={255}
                        placeholder="ex: 1 comprimé matin et soir · 5 ml 3 fois par jour · 1 ampoule IM par jour"
                        value={l.posologie}
                        onChange={(e) => majLigneOrdonnance(l.cle, "posologie", e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={ajouterLigneOrdonnance}
                  className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un médicament</span>
                </button>

                <button
                  type="submit"
                  disabled={ordonnanceEnCours || sauvegardeEnCours}
                  className="px-4 py-2 bg-violet-700 hover:bg-violet-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Send className="h-4 w-4" />
                  <span>{ordonnanceEnCours ? "Enregistrement…" : "Émettre l’ordonnance"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Ordonnances émises */}
          <div className="pt-2 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ordonnances émises sur cette consultation ({ordonnances.length})
            </h4>

            {ordonnances.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Aucune ordonnance émise pour cette consultation.
              </p>
            ) : (
              <ul className="space-y-2">
                {ordonnances.map((o) => {
                  const statut = (o.statut ?? "").toLowerCase();
                  const annulee = statut === "annulee" || statut === "annulée";
                  const dispensee = statut === "dispensee" || statut === "dispensée";
                  const dateStr = o.createdAt ?? o.dateCreation;
                  return (
                    <li
                      key={o.id}
                      className={`p-3 rounded-lg border text-xs space-y-2 ${
                        annulee ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className={`text-slate-900 ${annulee ? "line-through" : ""}`}>
                              Ordonnance #{o.id}
                            </strong>
                            {o.statut && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  annulee
                                    ? "bg-red-100 text-red-800"
                                    : dispensee
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {annulee ? "Annulée" : dispensee ? "Dispensée" : "En attente"}
                              </span>
                            )}
                          </div>
                          {dateStr && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(dateStr).toLocaleString("fr-FR")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!annulee && (
                            <button
                              type="button"
                              onClick={() => handleImprimerOrdonnance(o)}
                              className="px-2 py-0.5 text-violet-700 hover:bg-violet-50 border border-violet-200 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Imprimer l'ordonnance"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Imprimer</span>
                            </button>
                          )}
                          {estModifiable && !annulee && (
                            <button
                              type="button"
                              disabled={ordonnanceEnCours}
                              onClick={() => handleAnnulerOrdonnance(o.id)}
                              className="px-1.5 py-0.5 text-slate-400 hover:text-red-700 rounded text-[10px] transition cursor-pointer disabled:opacity-50"
                              title="Annuler cette ordonnance"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>

                      {o.lignes && o.lignes.length > 0 && (
                        <ul className="space-y-1">
                          {o.lignes.map((l, i) => {
                            const forme = formeMedicament(l.medicamentId);
                            return (
                              <li
                                key={`${l.id ?? i}`}
                                className="p-1.5 bg-white rounded border border-slate-200 flex flex-wrap justify-between items-start gap-1"
                              >
                                <div>
                                  <strong className="text-slate-900">
                                    {libelleMedicament(
                                      l.medicamentId,
                                      l.medicamentLibelle ?? l.medicamentNom,
                                    )}
                                  </strong>
                                  {forme && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-semibold">
                                      {forme}
                                    </span>
                                  )}
                                  <span className="text-slate-500 text-[11px] ml-2 italic">
                                    — {l.posologie}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-600">
                                  {l.quantite} u.
                                  {l.dureeJours ? ` · ${l.dureeJours} j` : ""}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * Carte d'acte de consultation — même style visuel que CarteActeSaisi
 * de l'infirmerie (PanneauSoinsActes.tsx).
 * ------------------------------------------------------------------ */
interface CarteActeConsultationProps {
  acte: ActePrescritItem;
  estModifiable: boolean;
  actionEnCours: boolean;
  onMarquerRealise: () => void;
  onMarquerErreur: () => void;
  onAjouterResultat: () => void;
  onAjouterObservation: () => void;
}

const LIBELLES_STATUT: Record<string, string> = {
  realise: "Réalisé",
  en_cours: "En cours",
  planifie: "Planifié",
  annule: "Annulé",
  saisi_par_erreur: "Saisi par erreur",
};

const CarteActeConsultation: React.FC<CarteActeConsultationProps> = ({
  acte,
  estModifiable,
  actionEnCours,
  onMarquerRealise,
  onMarquerErreur,
  onAjouterResultat,
  onAjouterObservation,
}) => {
  const statut = acte.statut || "planifie";

  const badgeCouleur =
    statut === "realise"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : statut === "en_cours"
        ? "bg-blue-50 text-blue-800 border-blue-200"
        : statut === "annule" || statut === "saisi_par_erreur"
          ? "bg-slate-100 text-slate-500 border-slate-200 line-through"
          : "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 text-xs shadow-2xs">
      {/* En-tête : libellé + code + badge statut */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="min-w-0">
          <span className="font-bold text-slate-900 text-sm">{acte.libelle}</span>
          {acte.code && (
            <span className="font-mono text-slate-400 text-[10px] ml-2">({acte.code})</span>
          )}
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded border font-bold text-[10px] ${badgeCouleur}`}
        >
          {LIBELLES_STATUT[statut] ?? statut}
        </span>
      </div>

      {/* Commentaire */}
      {acte.commentaire && (
        <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
          {acte.commentaire}
        </p>
      )}

      {/* Observations cliniques */}
      {acte.observations && acte.observations.length > 0 && (
        <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">
            Observations cliniques enregistrées ({acte.observations.length})
          </span>
          <div className="space-y-1">
            {acte.observations.map((o, i) => (
              <p
                key={o.id ?? i}
                className="text-slate-800 flex items-center gap-1.5 font-mono text-[11px] flex-wrap"
              >
                <span className="font-bold text-slate-900">{o.code} :</span>
                <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-bold">
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

      {/* Résultats d'examens */}
      {acte.resultats && acte.resultats.length > 0 && (
        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">
            Résultats d'examens associés
          </span>
          {acte.resultats.map((r) => (
            <p key={r.id} className="text-emerald-950 text-[11px]">
              <strong className="font-semibold uppercase font-mono">{r.type} :</strong>{" "}
              {r.conclusion || r.resultat || "—"}
              {r.interpretation ? ` — ${r.interpretation}` : ""}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      {estModifiable && statut !== "saisi_par_erreur" && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={actionEnCours}
            onClick={onAjouterResultat}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <FlaskConical className="w-3 h-3 text-emerald-700" />
            <span>+ Ajouter un résultat</span>
          </button>

          <button
            type="button"
            disabled={actionEnCours}
            onClick={onAjouterObservation}
            className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Activity className="w-3 h-3 text-cyan-700" />
            <span>+ Observation</span>
          </button>

          {statut !== "realise" && (
            <button
              type="button"
              disabled={actionEnCours}
              onClick={onMarquerRealise}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ml-auto disabled:opacity-50"
              title="Marquer comme réalisé"
            >
              <Check className="w-3 h-3" />
              <span>Valider la réalisation</span>
            </button>
          )}

          <button
            type="button"
            disabled={actionEnCours}
            onClick={onMarquerErreur}
            className="px-1.5 py-0.5 text-slate-400 hover:text-red-700 rounded text-[10px] transition cursor-pointer disabled:opacity-50"
            title="Marquer comme saisi par erreur"
          >
            Annuler/Erreur
          </button>
        </div>
      )}
    </div>
  );
};

export default PanneauConsultationActive;