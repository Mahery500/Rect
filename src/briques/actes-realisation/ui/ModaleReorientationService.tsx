/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ArrowRightLeft, Building2 } from "lucide-react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import { servicesApi, ServiceMedical } from "@/briques/services";
import { extraireMessageErreur } from "@/noyau/utils/erreur";

export interface ModaleReorientationServiceProps {
  ouvert: boolean;
  encounterId: number | null;
  /** Service actuellement porteur de l'encounter (sera masqué/neutralisé dans la liste). */
  serviceActuelId?: number | null;
  /** Restreindre aux services d'un même site. */
  siteId?: number | null;
  onFermer: () => void;
  onOrienter: (serviceId: number) => Promise<boolean>;
}

export const ModaleReorientationService: React.FC<ModaleReorientationServiceProps> = ({
  ouvert,
  encounterId,
  serviceActuelId,
  siteId,
  onFermer,
  onOrienter,
}) => {
  const [services, setServices] = useState<ServiceMedical[]>([]);
  const [serviceSelectionne, setServiceSelectionne] = useState<number | "">("");
  const [chargement, setChargement] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    let annule = false;
    setChargement(true);
    setErreur(null);

    servicesApi
      .listerServices()
      .then((liste) => {
        if (annule) return;
        const filtres = siteId ? liste.filter((s) => s.siteId === siteId) : liste;
        const aConserver = filtres.length > 0 ? filtres : liste;
        setServices(aConserver);
        // Pré-sélectionner le premier service qui n'est pas le service courant.
        const candidat = aConserver.find((s) => s.id !== serviceActuelId);
        setServiceSelectionne(candidat ? candidat.id : "");
      })
      .catch((err) => !annule && setErreur(extraireMessageErreur(err)))
      .finally(() => !annule && setChargement(false));

    return () => {
      annule = true;
    };
  }, [ouvert, siteId, serviceActuelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceSelectionne || !encounterId) return;

    setEnCours(true);
    setErreur(null);
    try {
      const ok = await onOrienter(Number(serviceSelectionne));
      if (ok) onFermer();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre="Réorienter le patient vers un autre service"
      icone={<ArrowRightLeft className="h-4 w-4 text-asina-600" />}
      largeurMax="md"
      enfants={
        <form id="form-reorientation" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {erreur && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreur}
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] leading-relaxed">
            Le patient reste sur le <strong>même ticket</strong>. Un nouvel aiguillage est créé vers
            le service choisi : il apparaîtra dans la file d'attente de ce service dès validation.
            L'acte ou la consultation en cours n'est pas clôturé automatiquement.
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Service destinataire *</span>
            </label>
            {chargement ? (
              <p className="text-slate-400 py-2">Chargement des services…</p>
            ) : services.length === 0 ? (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Aucun service actif disponible sur ce site.
              </p>
            ) : (
              <select
                required
                disabled={enCours}
                value={serviceSelectionne}
                onChange={(e) => setServiceSelectionne(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-asina-500"
              >
                <option value="" disabled>
                  — Choisir le service d'orientation —
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomTypeService}
                    {s.nomSite ? ` — ${s.nomSite}` : ""}
                    {s.id === serviceActuelId ? " (service courant)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </form>
      }
      pied={
        <div className="w-full">
          <ActionsFormulaire
            idFormulaire="form-reorientation"
            onAnnuler={onFermer}
            enCours={enCours}
            desactive={enCours || !serviceSelectionne || !encounterId}
            labelValider="Réorienter le patient"
          />
        </div>
      }
    />
  );
};

export default ModaleReorientationService;
