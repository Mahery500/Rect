/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Layers, Plus, Edit2, Trash2, Hospital, RefreshCw, Activity } from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { ChampRecherche } from "@/noyau/ui/ChampRecherche";
import { BadgeStatut } from "@/noyau/ui/BadgeStatut";
import { SousOnglets } from "@/noyau/ui/SousOnglets";
import { ModaleConfirmationSuppression } from "@/noyau/ui/ModaleConfirmationSuppression";
import {
  ServiceMedical,
  TypeServiceMedical,
  NouveauServiceInput,
  ModificationServiceInput,
  NouveauTypeServiceInput,
  ModificationTypeServiceInput,
} from "../modele/service.types";
import { useServices } from "../hooks/useServices";
import { FormulaireServiceModale } from "./FormulaireServiceModale";
import { FormulaireTypeServiceModale } from "./FormulaireTypeServiceModale";

export interface PanneauServicesProps {
  mode?: ModeAffichage;
}

export const PanneauServices: React.FC<PanneauServicesProps> = ({ mode = "edition" }) => {
  if (mode === "masque") {
    return null;
  }

  const estModeLectureSeule = mode === "lecture";

  const {
    services,
    totalServices,
    types,
    totalTypes,
    statsTypes, // ← AJOUT
    sitesDisponibles,
    chargement,
    erreur,
    sousOnglet,
    setSousOnglet,
    recherche,
    setRecherche,
    siteFiltreId,
    setSiteFiltreId,
    filtreAiguillage, // ← AJOUT
    setFiltreAiguillage, // ← AJOUT
    recharger,
    creerService,
    modifierService,
    supprimerService,
    creerType,
    modifierType,
    supprimerType,
  } = useServices();

  const [modalServiceOuverte, setModalServiceOuverte] = useState(false);
  const [serviceEnEdition, setServiceEnEdition] = useState<ServiceMedical | null>(null);

  const [modalTypeOuverte, setModalTypeOuverte] = useState(false);
  const [typeEnEdition, setTypeEnEdition] = useState<TypeServiceMedical | null>(null);

  const [serviceASupprimer, setServiceASupprimer] = useState<ServiceMedical | null>(null);
  const [typeASupprimer, setTypeASupprimer] = useState<TypeServiceMedical | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const onglets = [
    {
      id: "cartographie",
      libelle: "Cartographie des Services",
      icone: <Layers className="h-4 w-4" />,
      badge: totalServices,
    },
    {
      id: "types",
      libelle: "Types & Spécialités",
      icone: <Activity className="h-4 w-4" />,
      badge: totalTypes,
    },
  ];

  const handleEnregistrerService = async (
    saisie: NouveauServiceInput | ModificationServiceInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifierService(id, saisie);
    }
    return creerService(saisie as NouveauServiceInput);
  };

  const handleEnregistrerType = async (
    saisie: NouveauTypeServiceInput | ModificationTypeServiceInput,
    id?: number,
  ): Promise<boolean> => {
    if (id) {
      return modifierType(id, saisie);
    }
    return creerType(saisie as NouveauTypeServiceInput);
  };

  const confirmerSuppressionService = async () => {
    if (!serviceASupprimer) return;
    setSuppressionEnCours(true);
    try {
      const ok = await supprimerService(serviceASupprimer.id);
      if (ok) setServiceASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const confirmerSuppressionType = async () => {
    if (!typeASupprimer) return;
    setSuppressionEnCours(true);
    try {
      const ok = await supprimerType(typeASupprimer.id, typeASupprimer.nom);
      if (ok) setTypeASupprimer(null);
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
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Services & Spécialités Médicales</h3>
              <p className="text-[11px] text-slate-500">
                Cartographie des services hospitaliers et catalogue des spécialités cliniques.
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

            {!estModeLectureSeule && sousOnglet === "cartographie" && (
              <button
                type="button"
                onClick={() => {
                  setServiceEnEdition(null);
                  setModalServiceOuverte(true);
                }}
                disabled={sitesDisponibles.length === 0 || types.length === 0}
                className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>Rattacher un Service</span>
              </button>
            )}

            {!estModeLectureSeule && sousOnglet === "types" && (
              <button
                type="button"
                onClick={() => {
                  setTypeEnEdition(null);
                  setModalTypeOuverte(true);
                }}
                className="btn-primary py-2 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau Type</span>
              </button>
            )}
          </div>
        </div>

        {/* Sous-onglets */}
        <SousOnglets
          onglets={onglets}
          ongletActif={sousOnglet}
          onChanger={(id) => setSousOnglet(id as "cartographie" | "types")}
        />

        {/* ← AJOUT : compteur aiguillables (uniquement sur l'onglet Types) */}
        {sousOnglet === "types" && !chargement && (
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
              <span className="text-[10px] uppercase font-bold text-slate-500">Total Types</span>
              <p className="text-lg font-extrabold text-slate-900 leading-tight">
                {statsTypes.total}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-150">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Types Actifs</span>
              <p className="text-lg font-extrabold text-emerald-800 leading-tight">
                {statsTypes.actifs}
              </p>
            </div>
            <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-150">
              <span className="text-[10px] uppercase font-bold text-amber-700">
                Services aiguillables
              </span>
              <p className="text-lg font-extrabold text-amber-800 leading-tight">
                {statsTypes.aiguillables} / {statsTypes.total}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <ChampRecherche
          valeur={recherche}
          onChange={setRecherche}
          placeholder={
            sousOnglet === "cartographie"
              ? "Filtrer les services par libellé ou site..."
              : "Filtrer les spécialités par nom ou code..."
          }
        />

        {sousOnglet === "cartographie" && (
          <select
            value={siteFiltreId === "tous" ? "" : siteFiltreId}
            onChange={(e) => {
              const val = e.target.value;
              setSiteFiltreId(val === "" ? "tous" : Number(val));
            }}
            className="w-full sm:w-64 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 transition focus:outline-hidden focus:border-asina-500"
          >
            <option value="">Tous les établissements</option>
            {sitesDisponibles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        )}

        {/* ← AJOUT : filtre sur la capacité d'aiguillage (uniquement onglet Types) */}
        {sousOnglet === "types" && (
          <select
            value={filtreAiguillage}
            onChange={(e) =>
              setFiltreAiguillage(e.target.value as "tous" | "aiguillage" | "hors_aiguillage")
            }
            className="w-full sm:w-56 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 transition focus:outline-hidden focus:border-asina-500"
          >
            <option value="tous">Tous les types</option>
            <option value="aiguillage">Aiguillables uniquement</option>
            <option value="hors_aiguillage">Hors aiguillage uniquement</option>
          </select>
        )}
      </div>

      {/* État d'erreur */}
      {erreur && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {erreur}
        </div>
      )}

      {/* Contenu selon sous-onglet */}
      {chargement ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-asina-600" />
            <span className="text-xs">Chargement en cours...</span>
          </div>
        </div>
      ) : sousOnglet === "cartographie" ? (
        services.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
            Aucun service rattaché ne correspond à la recherche.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((ser) => (
              <div
                key={ser.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        ID: {ser.id}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {ser.nomTypeService || `Service #${ser.id}`}
                      </h4>
                    </div>
                    <BadgeStatut statut={ser.actif ? "actif" : "inactif"} />
                  </div>

                  <div className="space-y-1 text-slate-600 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Hospital className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">
                        {ser.nomSite || `Site #${ser.siteId}`}
                      </span>
                    </div>

                    {ser.description && (
                      <p className="text-[11px] text-slate-500 italic pt-1">{ser.description}</p>
                    )}
                  </div>
                </div>

                {!estModeLectureSeule && (
                  <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setServiceEnEdition(ser);
                        setModalServiceOuverte(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                      title="Modifier le service"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceASupprimer(ser)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                      title="Détacher le service"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : types.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
          Aucun type de service trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-mono text-[10px] font-bold text-asina-700 bg-asina-50 px-1.5 py-0.5 rounded border border-asina-150">
                      {t.code}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{t.nom}</h4>
                  </div>

                  {/* ← AJOUT : badges empilés (statut + éventuel « Hors aiguillage ») */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <BadgeStatut statut={t.actif ? "actif" : "inactif"} />
                    {!t.supporteAiguillage && (
                      <span
                        className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold uppercase tracking-wide"
                        title="Ce service ne peut pas recevoir d'aiguillage patient"
                      >
                        Hors aiguillage
                      </span>
                    )}
                  </div>
                </div>

                {t.description && (
                  <p className="text-[11px] text-slate-500 leading-relaxed">{t.description}</p>
                )}
              </div>

              {!estModeLectureSeule && (
                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeEnEdition(t);
                      setModalTypeOuverte(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                    title="Modifier le type"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeASupprimer(t)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                    title="Supprimer le type"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale d'ajout / modification de service */}
      <FormulaireServiceModale
        ouvert={modalServiceOuverte}
        serviceEnEdition={serviceEnEdition}
        sitesDisponibles={sitesDisponibles}
        typesDisponibles={types}
        onFermer={() => setModalServiceOuverte(false)}
        onEnregistrer={handleEnregistrerService}
      />

      {/* Modale d'ajout / modification de type de service */}
      <FormulaireTypeServiceModale
        ouvert={modalTypeOuverte}
        typeEnEdition={typeEnEdition}
        onFermer={() => setModalTypeOuverte(false)}
        onEnregistrer={handleEnregistrerType}
      />

      {/* Modale de confirmation de suppression de service */}
      <ModaleConfirmationSuppression
        ouvert={serviceASupprimer !== null}
        onFermer={() => setServiceASupprimer(null)}
        onConfirmer={confirmerSuppressionService}
        enCours={suppressionEnCours}
        titre="Détacher le service de cet établissement"
        message="Voulez-vous vraiment retirer ce service du site médical ?"
        nomElement={serviceASupprimer?.nomTypeService}
      />

      {/* Modale de confirmation de suppression de type de service */}
      <ModaleConfirmationSuppression
        ouvert={typeASupprimer !== null}
        onFermer={() => setTypeASupprimer(null)}
        onConfirmer={confirmerSuppressionType}
        enCours={suppressionEnCours}
        titre="Supprimer le type de service"
        message="Voulez-vous vraiment supprimer cette spécialité du catalogue ?"
        nomElement={typeASupprimer?.nom}
      />
    </div>
  );
};

export default PanneauServices;
