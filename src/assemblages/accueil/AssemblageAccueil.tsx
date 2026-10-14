/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Ticket,
  Calendar,
  Users,
  Tv,
} from 'lucide-react';
import { ModeAffichage } from '@/cerveau/permissions';
import { SousOnglets, OngletElement } from '@/noyau/ui/SousOnglets';
import { PanneauVerificationAdherents } from '@/briques/verification-adherents';
import { PanneauTicketsAccueil } from '@/briques/tickets-accueil';
import { PageRendezVous } from '@/briques/rendez-vous';
import { PanneauPatients } from '@/briques/patients';
import { AffichageEcranSalleAttente } from '@/briques/ecran-attente';

export interface AssemblageAccueilProps {
  siteActifId?: number | null;
  serviceActifId?: number | null;
  ongletParDefaut?: string;
  modes?: {
    verification?: ModeAffichage;
    tickets?: ModeAffichage;
    rendezvous?: ModeAffichage;
    patients?: ModeAffichage;
  };
  sousOngletActif?: string | null;
  onSousOngletChange?: (id: string) => void;
}

export const AssemblageAccueil: React.FC<AssemblageAccueilProps> = ({
  siteActifId,
  ongletParDefaut = "verification",
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

  const modeVerification = modes.verification ?? "edition";
  const modeTickets = modes.tickets ?? "edition";
  const modeRendezvous = modes.rendezvous ?? "edition";
  const modePatients = modes.patients ?? "edition";

  const onglets: OngletElement[] = [
    {
      id: "verification",
      libelle: "Vérification & Contrôle",
      icone: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: "tickets",
      libelle: "File Accueil & Tickets",
      icone: <Ticket className="w-4 h-4" />,
    },
    {
      id: "rendezvous",
      libelle: "Rendez-vous",
      icone: <Calendar className="w-4 h-4" />,
    },
    {
      id: "patients",
      libelle: "Dossiers Patients",
      icone: <Users className="w-4 h-4" />,
    },
    {
      id: "ecran",
      libelle: "Écran Salle d’Attente",
      icone: <Tv className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <SousOnglets onglets={onglets} ongletActif={ongletActif} onChanger={changerOnglet} />

      {ongletActif === "verification" && (
        <PanneauVerificationAdherents mode={modeVerification} siteId={siteActifId ?? undefined} />
      )}

      {ongletActif === "tickets" && (
        <PanneauTicketsAccueil mode={modeTickets} siteId={siteActifId ?? undefined} />
      )}

      {ongletActif === 'rendezvous' && (
        <PageRendezVous
          peutReserver={true}
          peutGerer={true}
          siteId={siteActifId ?? undefined}
        />
      )}

      {ongletActif === "patients" && <PanneauPatients mode={modePatients} />}

      {ongletActif === "ecran" &&
        (siteActifId ? (
          <AffichageEcranSalleAttente siteId={siteActifId} />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            Veuillez sélectionner un site actif dans l’en-tête pour afficher l’écran de salle
            d’attente.
          </div>
        ))}
    </div>
  );
};

export default AssemblageAccueil;
