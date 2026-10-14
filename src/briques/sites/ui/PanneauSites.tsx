/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Hospital, Plus, Edit2, Trash2, MapPin, Phone, RefreshCw } from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import { ModaleConfirmationSuppression } from "@/noyau/ui/ModaleConfirmationSuppression";
import { SiteHospitalier, NouveauSiteInput, ModificationSiteInput } from "../modele/site.types";
import { useSites } from "../hooks/useSites";
import { FormulaireSiteModale } from "./FormulaireSiteModale";

export interface PanneauSitesProps {
  mode?: ModeAffichage;
}

export const PanneauSites: React.FC<PanneauSitesProps> = ({ mode = "edition" }) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";

  const {
    sites,
    totalSites,
    chargement,
    erreur,
    recherche,
    setRecherche,
    recharger,
    creerSite,
    modifierSite,
    supprimerSite,
  } = useSites();

  const [modalFormulaireOuverte, setModalFormulaireOuverte] = useState(false);
  const [siteEnEdition, setSiteEnEdition] = useState<SiteHospitalier | null>(null);

  const [siteASupprimer, setSiteASupprimer] = useState<SiteHospitalier | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const ouvrirCreation = () => {
    setSiteEnEdition(null);
    setModalFormulaireOuverte(true);
  };

  const ouvrirEdition = (site: SiteHospitalier) => {
    setSiteEnEdition(site);
    setModalFormulaireOuverte(true);
  };

  const handleEnregistrer = async (
    saisie: NouveauSiteInput | ModificationSiteInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifierSite(id, saisie);
    }
    return creerSite(saisie as NouveauSiteInput);
  };

  const confirmerSuppression = async () => {
    if (!siteASupprimer) return;
    setSuppressionEnCours(true);
    try {
      const ok = await supprimerSite(siteASupprimer.id, siteASupprimer.nom);
      if (ok) {
        setSiteASupprimer(null);
      }
    } finally {
      setSuppressionEnCours(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre d'actions supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-asina-50 text-asina-700 rounded-lg shrink-0">
            <Hospital className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sites Médicaux & Centres Cliniques</h3>
            <p className="text-[11px] text-slate-500">
              {totalSites} établissement(s) répertorié(s) dans le réseau de soins.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ChampRecherche
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Filtrer par nom, code, ville..."
          />

          <button
            type="button"
            onClick={recharger}
            disabled={chargement}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition disabled:opacity-50 shrink-0"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin text-asina-600" : ""}`} />
          </button>

          {!estModeLectureSeule && (
            <button
              type="button"
              onClick={ouvrirCreation}
              className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Site</span>
            </button>
          )}
        </div>
      </div>

      {/* État d'erreur */}
      {erreur && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {erreur}
        </div>
      )}

      {/* Grille des sites */}
      {chargement ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
            <span className="text-xs">Chargement des sites médicaux...</span>
          </div>
        </div>
      ) : sites.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
          Aucun site médical trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] font-bold text-asina-700 bg-asina-50 px-1.5 py-0.5 rounded border border-asina-150">
                      {site.code || `ID: ${site.id}`}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{site.nom}</h4>
                  </div>
                  <BadgeStatut statut={site.actif ? "actif" : "inactif"} />
                </div>

                <div className="space-y-1.5 pt-1 text-slate-600 text-xs">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      {site.ville}
                      {site.adresse ? ` — ${site.adresse}` : ""}
                    </span>
                  </div>

                  {site.telephone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">{site.telephone}</span>
                    </div>
                  )}
                </div>
              </div>

              {!estModeLectureSeule && (
                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => ouvrirEdition(site)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                    title="Modifier le site"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSiteASupprimer(site)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                    title="Supprimer le site"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale d'ajout / modification */}
      <FormulaireSiteModale
        ouvert={modalFormulaireOuverte}
        siteEnEdition={siteEnEdition}
        onFermer={() => setModalFormulaireOuverte(false)}
        onEnregistrer={handleEnregistrer}
      />

      {/* Modale de confirmation de suppression */}
      <ModaleConfirmationSuppression
        ouvert={siteASupprimer !== null}
        onFermer={() => setSiteASupprimer(null)}
        onConfirmer={confirmerSuppression}
        enCours={suppressionEnCours}
        titre="Supprimer le site médical"
        message="Voulez-vous vraiment supprimer cet établissement du réseau ? Les services associés devront être réassignés."
        nomElement={siteASupprimer?.nom}
      />
    </div>
  );
};

export default PanneauSites;
