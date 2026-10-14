/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  AffectationPersonnel,
  OptionPersonnel,
  OptionServiceSite,
  OptionSite,
  NouvelleAffectationInput,
  ModificationAffectationInput,
} from "../modele/affectation.types";

export interface FormulaireAffectationModaleProps {
  ouvert: boolean;
  affectationEnEdition: AffectationPersonnel | null;
  optionsPersonnel: OptionPersonnel[];
  optionsServices: OptionServiceSite[];
  optionsSites: OptionSite[];
  affectationsExistantes?: AffectationPersonnel[];
  onFermer: () => void;
  onEnregistrer: (
    saisie: NouvelleAffectationInput | ModificationAffectationInput,
    id?: number,
  ) => Promise<boolean>;
}

export const FormulaireAffectationModale: React.FC<FormulaireAffectationModaleProps> = ({
  ouvert,
  affectationEnEdition,
  optionsPersonnel,
  optionsServices,
  optionsSites,
  affectationsExistantes = [],
  onFermer,
  onEnregistrer,
}) => {
  const [staffId, setStaffId] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>("");
  const [dateFin, setDateFin] = useState<string>("");
  const [estPrincipal, setEstPrincipal] = useState<boolean>(true);
  const [actif, setActif] = useState<boolean>(true);
  const [enCours, setEnCours] = useState<boolean>(false);
  const [erreurValidation, setErreurValidation] = useState<string | null>(null);

  // Services filtrés par le site sélectionné avec repli vers l'ensemble des services si aucun spécifique
  const servicesDuSite = React.useMemo(() => {
    if (!siteId) return optionsServices;
    const duSite = optionsServices.filter((s) => s.siteId === Number(siteId) || s.siteId === 0);
    return duSite.length > 0 ? duSite : optionsServices;
  }, [optionsServices, siteId]);

  useEffect(() => {
    if (affectationEnEdition) {
      setStaffId(String(affectationEnEdition.staffId || ""));
      setSiteId(String(affectationEnEdition.siteId || ""));
      setServiceId(String(affectationEnEdition.serviceId || ""));
      setDateDebut(affectationEnEdition.dateDebut || "");
      setDateFin(affectationEnEdition.dateFin || "");
      setEstPrincipal(affectationEnEdition.estPrincipal);
      setActif(affectationEnEdition.actif);
    } else {
      setStaffId(optionsPersonnel.length > 0 ? String(optionsPersonnel[0].id) : "");
      const premierSite = optionsSites.length > 0 ? String(optionsSites[0].id) : "";
      setSiteId(premierSite);

      // Pré-sélectionner le premier service disponible
      const servicesInitiaux = premierSite
        ? optionsServices.filter((s) => s.siteId === Number(premierSite) || s.siteId === 0)
        : optionsServices;
      const serviceParDefaut =
        servicesInitiaux.length > 0
          ? String(servicesInitiaux[0].serviceId)
          : optionsServices.length > 0
            ? String(optionsServices[0].serviceId)
            : "";
      setServiceId(serviceParDefaut);

      try {
        setDateDebut(new Date().toISOString().split("T")[0]);
      } catch {
        setDateDebut("");
      }
      setDateFin("");
      setEstPrincipal(true);
      setActif(true);
    }
    setErreurValidation(null);
  }, [affectationEnEdition, optionsPersonnel, optionsSites, optionsServices, ouvert]);

  // Si l'utilisateur change de site, s'assurer que le service sélectionné est cohérent
  const handleChangementSite = (nouveauSiteId: string) => {
    setSiteId(nouveauSiteId);
    const servicesDispos = nouveauSiteId
      ? optionsServices.filter((s) => s.siteId === Number(nouveauSiteId) || s.siteId === 0)
      : optionsServices;
    const serviceCandidat =
      servicesDispos.length > 0
        ? servicesDispos[0].serviceId
        : optionsServices.length > 0
          ? optionsServices[0].serviceId
          : "";
    setServiceId(serviceCandidat ? String(serviceCandidat) : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurValidation(null);

    const staffIdNum = Number(staffId);
    const serviceIdNum = Number(serviceId);

    if (!staffIdNum || staffIdNum <= 0) {
      setErreurValidation("Veuillez sélectionner un membre du personnel.");
      return;
    }
    if (!serviceIdNum || serviceIdNum <= 0) {
      setErreurValidation("Veuillez sélectionner un service d’affectation.");
      return;
    }
    if (!dateDebut) {
      setErreurValidation("La date de prise de fonction est obligatoire.");
      return;
    }

    setEnCours(true);
    try {
      let succes = false;
      if (affectationEnEdition) {
        const payload: ModificationAffectationInput = {
          staffId: staffIdNum,
          serviceId: serviceIdNum,
          dateDebut,
          dateFin: dateFin ? dateFin : null,
          estPrincipal,
          actif,
        };
        succes = await onEnregistrer(payload, affectationEnEdition.id);
      } else {
        const payload: NouvelleAffectationInput = {
          staffId: staffIdNum,
          serviceId: serviceIdNum,
          dateDebut,
          dateFin: dateFin ? dateFin : null,
          estPrincipal,
        };
        succes = await onEnregistrer(payload);
      }

      if (succes) {
        onFermer();
      }
    } finally {
      setEnCours(false);
    }
  };

  const affectationActiveExistante =
    !affectationEnEdition && staffId
      ? affectationsExistantes.find((a) => a.staffId === Number(staffId) && a.actif)
      : null;

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={
        affectationEnEdition
          ? "Modifier la fiche d'affectation"
          : "Nouvelle Affectation de Personnel"
      }
      largeurMax="md"
      enfants={
        <form id="form-affectation" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {erreurValidation && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreurValidation}
            </div>
          )}

          {affectationActiveExistante && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <div className="space-y-0.5">
                <span className="font-bold block">Affectation active existante</span>
                <span className="text-[11px] block">
                  Cet agent est déjà affecté activement au service{" "}
                  <strong>{affectationActiveExistante.nomService}</strong> (
                  {affectationActiveExistante.nomSite}). Selon la règle D3 de l'hôpital, un
                  collaborateur ne peut avoir qu'une seule affectation active à la fois. Veuillez
                  d'abord clôturer son affectation actuelle.
                </span>
              </div>
            </div>
          )}

          {optionsPersonnel.length === 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
              Aucun profil de personnel (hors administrateurs) n'est disponible. Veuillez d'abord
              créer des comptes de personnel (accueil, secrétariat, soins, pharmacie, stock...) dans
              l'onglet « Comptes Utilisateurs ».
            </div>
          )}

          {optionsServices.length === 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
              Aucun service médical disponible. Veuillez d'abord configurer vos services dans
              l'onglet « Services Médicaux ».
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Collaborateur / Membre du personnel (hors admin) *
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              disabled={Boolean(affectationEnEdition) || enCours || optionsPersonnel.length === 0}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="" disabled>
                — Sélectionner un membre du personnel (accueil, secrétariat, soins, pharmacie,
                stock...) —
              </option>
              {optionsPersonnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom} — {p.role} (Réf. Staff #{p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Site d'implantation *
              </label>
              <select
                value={siteId}
                onChange={(e) => handleChangementSite(e.target.value)}
                required
                disabled={enCours}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
              >
                <option value="" disabled>
                  — Choisir un établissement —
                </option>
                {optionsSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Service médical *</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
                disabled={enCours || servicesDuSite.length === 0}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500 disabled:bg-slate-100"
              >
                <option value="" disabled>
                  — Choisir le service —
                </option>
                {servicesDuSite.map((srv) => (
                  <option key={srv.serviceId} value={srv.serviceId}>
                    {srv.nomService} {srv.siteId > 0 && !siteId ? `(${srv.nomSite})` : ""}
                  </option>
                ))}
              </select>
              {servicesDuSite.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-0.5">
                  Aucun service disponible pour cet établissement.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Date de prise de fonction *
              </label>
              <input
                type="date"
                required
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                disabled={enCours}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Date de fin (optionnelle)
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                disabled={enCours}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={estPrincipal}
                onChange={(e) => setEstPrincipal(e.target.checked)}
                disabled={enCours}
                className="rounded border-slate-300 text-asina-600 focus:ring-asina-500"
              />
              <span className="text-slate-800 text-xs font-medium">
                Définir comme affectation principale de l'agent
              </span>
            </label>

            {affectationEnEdition && (
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={actif}
                    onChange={(e) => setActif(e.target.checked)}
                    disabled={enCours}
                    className="rounded border-slate-300 text-asina-600 focus:ring-asina-500"
                  />
                  <span className="text-slate-800 text-xs font-medium">Affectation active</span>
                </label>
              </div>
            )}
          </div>
        </form>
      }
      pied={
        <div className="w-full">
          <ActionsFormulaire
            idFormulaire="form-affectation"
            onAnnuler={onFermer}
            enCours={enCours}
            desactive={enCours}
            labelValider={affectationEnEdition ? "Mettre à jour" : "Valider l'affectation"}
          />
        </div>
      }
    />
  );
};
