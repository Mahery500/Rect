/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Syringe,
  History,
  CheckCircle2,
  HeartPulse,
  ArrowRightLeft,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions";
import { SousOnglets, OngletElement } from "@/noyau/ui/SousOnglets";
import {
  PanneauInfirmerieFile,
  infirmerieFileApi,
  PriseEnChargeInfo,
} from "@/briques/infirmerie-file";
import { PanneauActes, actesApi } from "@/briques/actes-realisation";
import { PanneauInfirmerieHistorique } from "@/briques/infirmerie-historique";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import {
  estConflitActesDemandes,
  extraireCodesActes,
} from "@/noyau/http/erreursCloture";

export interface AssemblageInfirmerieProps {
  siteActifId?: number | null;
  serviceActifId?: number | null;
  ongletParDefaut?: string;
  modes?: {
    file?: ModeAffichage;
    soins?: ModeAffichage;
    historique?: ModeAffichage;
  };
  sousOngletActif?: string | null;
  onSousOngletChange?: (id: string) => void;
}

export interface PatientActifInfirmerie {
  patientId: number;
  encounterId: number;
  numTicket?: string;
  patientNom?: string;
  debut?: string;
  dureeMinutes?: number;
}

export const AssemblageInfirmerie: React.FC<AssemblageInfirmerieProps> = ({
  siteActifId,
  serviceActifId,
  ongletParDefaut = "file",
  modes = {},
  sousOngletActif,
  onSousOngletChange,
}) => {
  const [ongletInterne, setOngletInterne] = useState(ongletParDefaut);
  const ongletActif = sousOngletActif ?? ongletInterne;

  const changerOnglet = (id: string) => {
    setOngletInterne(id);
    onSousOngletChange?.(id);
  };

  const [patientActif, setPatientActif] =
    useState<PatientActifInfirmerie | null>(null);
  const [clotureEnCours, setClotureEnCours] = useState(false);

  const { notifierSucces, notifierErreur } = useNotifier();

  const modeFile = modes.file ?? "edition";
  const modeSoins = modes.soins ?? "edition";
  const modeHistorique = modes.historique ?? "edition";

  const synchroniserPatientEnCours = useCallback(async () => {
    try {
      const enCours = await infirmerieFileApi.obtenirPatientEnCours();

      if (enCours?.enCours && enCours.patientId && enCours.encounterId) {
        setPatientActif({
          patientId: enCours.patientId,
          encounterId: enCours.encounterId,
          numTicket: enCours.numTicket || undefined,
          patientNom:
            enCours.patientNom || `Patient #${enCours.patientId}`,
          debut: enCours.debut || undefined,
          dureeMinutes: enCours.dureeMinutes || undefined,
        });
      } else {
        setPatientActif(null);
      }
    } catch {
      // Échec réseau : on ne touche PAS à l'état courant.
    }
  }, []);

  useEffect(() => {
    synchroniserPatientEnCours();

    const intervalle = setInterval(synchroniserPatientEnCours, 15000);

    return () => clearInterval(intervalle);
  }, [synchroniserPatientEnCours]);

  const handlePriseEnChargeSucces = (info: PriseEnChargeInfo) => {
    setPatientActif({
      patientId: info.patientId,
      encounterId: info.encounterId,
      numTicket: info.numTicket,
      patientNom: info.patientNom || `Patient #${info.patientId}`,
      debut: new Date().toISOString(),
      dureeMinutes: 0,
    });

    changerOnglet("soins");
  };

  const handleCloturerSoins = async () => {
    if (!patientActif?.encounterId) return;

    if (
      !window.confirm(
        `Confirmez-vous la fin de prise en charge pour ${
          patientActif.patientNom || "ce patient"
        } ?`,
      )
    ) {
      return;
    }

    setClotureEnCours(true);

    try {
      try {
        await actesApi.terminer(patientActif.encounterId, false);
      } catch (err: unknown) {
        if (estConflitActesDemandes(err)) {
          const codes = extraireCodesActes(
            extraireMessageErreur(err),
          );
          const liste =
            codes.length > 0 ? `\n• ${codes.join("\n• ")}` : "";

          if (
            !window.confirm(
              `Il reste des actes demandés non réalisés :${liste}\n\nSouhaitez-vous forcer la clôture ?`,
            )
          ) {
            return;
          }

          await actesApi.terminer(patientActif.encounterId, true);
        } else {
          throw err;
        }
      }

      notifierSucces(
        "Prise en charge infirmerie clôturée avec succès. Le poste est libéré.",
      );

      setPatientActif(null);
      changerOnglet("file");
      await synchroniserPatientEnCours();
    } catch (err: unknown) {
      notifierErreur(extraireMessageErreur(err));
    } finally {
      setClotureEnCours(false);
    }
  };

  const onglets: OngletElement[] = [
    {
      id: "file",
      libelle: "File d’Attente & Prise en Charge",
      icone: <Users className="w-4 h-4" />,
    },
    {
      id: "soins",
      libelle: "Actes & Soins Infirmiers",
      icone: <Syringe className="w-4 h-4" />,
      badge: patientActif ? "En soins" : undefined,
    },
    {
      id: "historique",
      libelle: "Historique des Actes",
      icone: <History className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {patientActif && (
        <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-white shrink-0 shadow-inner">
              <HeartPulse className="h-6 w-6 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-white/25 px-2 py-0.5 rounded text-emerald-100">
                  Patient en cours
                </span>

                {patientActif.numTicket && (
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-white text-emerald-900 shadow-2xs">
                    Ticket {patientActif.numTicket}
                  </span>
                )}

                <span className="text-[11px] font-mono text-emerald-200">
                  Dossier #{patientActif.encounterId}
                </span>
              </div>

              <h3 className="font-bold text-white text-base mt-0.5">
                {patientActif.patientNom}
              </h3>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => changerOnglet("soins")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                ongletActif === "soins"
                  ? "bg-white text-emerald-900 ring-2 ring-white/50"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
            >
              <Syringe className="h-3.5 w-3.5" />
              <span>Actes & Soins</span>
            </button>

            <button
              type="button"
              onClick={handleCloturerSoins}
              disabled={clotureEnCours}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Clôturer la prise en charge pour ce patient et libérer le poste de soins"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              <span>
                {clotureEnCours ? "Clôture…" : "Terminer Soins"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => changerOnglet("soins")}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1.5"
              title="Réorienter vers un autre service"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Réorienter</span>
            </button>
          </div>
        </div>
      )}

      <SousOnglets
        onglets={onglets}
        ongletActif={ongletActif}
        onChanger={changerOnglet}
      />

      {ongletActif === "file" && (
        <PanneauInfirmerieFile
          mode={modeFile}
          siteActifId={siteActifId ?? undefined}
          patientEnCoursActif={patientActif}
          onPrendreEnChargeSucces={handlePriseEnChargeSucces}
          onOuvrirSoinsPatient={() => changerOnglet("soins")}
        />
      )}

      {ongletActif === "soins" && (
        <PanneauActes
          mode={modeSoins}
          encounterId={patientActif?.encounterId}
          patientId={patientActif?.patientId}
          patientNom={patientActif?.patientNom}
          serviceActuelId={serviceActifId}
          siteId={siteActifId}
        />
      )}

      {ongletActif === "historique" && (
        <PanneauInfirmerieHistorique
          mode={modeHistorique}
          patientIdFiltre={patientActif?.patientId}
        />
      )}
    </div>
  );
};

export default AssemblageInfirmerie;