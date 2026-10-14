// AssemblageStock.tsx
import React, { useMemo, useState } from "react";
import {
  Layers,
  Pill,
  ArrowLeftRight,
  ClipboardCheck,
  BookOpen,
  Truck,
  Repeat,
  PackagePlus,
  ShieldAlert,
  Store,
} from "lucide-react";
import { useSession } from "@/cerveau/session";
import { ModeAffichage } from "@/cerveau/permissions";
import { SousOnglets, OngletElement } from "@/noyau/ui/SousOnglets";
import { PanneauStockNiveaux } from "@/briques/stock-niveaux";
import { PanneauStockDispensation } from "@/briques/stock-dispensation";
import { PanneauStockCommandes } from "@/briques/stock-commandes";
import { PanneauStockAppro } from "@/briques/stock-appro";
import { PanneauStockTransferts } from "@/briques/stock-transferts";
import { PanneauStockAjustements } from "@/briques/stock-ajustements";
import { PanneauPharmacieCatalogue } from "@/briques/pharmacie-catalogue";
import { SelecteurSite } from "@/briques/stock-commun/SelecteurSite";
import { useStockPermissions } from "./useStockPermissions";

type Cle =
  "niveaux" | "dispensation" | "commandes" | "appro" | "transferts" | "ajustements" | "catalogue";

export interface AssemblageStockProps {
  siteActifId?: number | null;
  serviceActifId?: number | null;
  ongletParDefaut?: Cle;
  modes?: Partial<Record<Cle, ModeAffichage>>;
  sousOngletActif?: string | null;
  onSousOngletChange?: (id: string) => void;
}

interface DefinitionOnglet extends OngletElement {
  id: Cle;
  autorise: boolean;
  /** Regroupement visuel (affiché comme séparateur si souhaité). */
  groupe?: string;
}

export const AssemblageStock: React.FC<AssemblageStockProps> = ({
  siteActifId,
  ongletParDefaut = "niveaux",
  modes = {},
  sousOngletActif,
  onSousOngletChange,
}) => {
  const { siteActifId: siteSessionId } = useSession();
  const permissions = useStockPermissions();

  const tousOnglets: DefinitionOnglet[] = useMemo(
    () => [
      {
        id: "niveaux",
        libelle: "État des Stocks & Alertes",
        icone: <Layers className="w-4 h-4" />,
        autorise: permissions.peutVoirNiveaux,
        groupe: "Pilotage",
      },
      {
        id: "dispensation",
        libelle: "Dispensation Comptoir",
        icone: <Pill className="w-4 h-4" />,
        autorise: permissions.peutDispenser,
        groupe: "Pilotage",
      },
      {
        id: "commandes",
        libelle: "Commandes & Réceptions",
        icone: <Truck className="w-4 h-4" />,
        autorise: permissions.peutGererCommandes,
        groupe: "Flux",
      },
      {
        id: "appro",
        libelle: "Approvisionnements",
        icone: <PackagePlus className="w-4 h-4" />,
        autorise: permissions.peutGererAppro,
        groupe: "Flux",
      },
      {
        id: "transferts",
        libelle: "Transferts",
        icone: <Repeat className="w-4 h-4" />,
        autorise: permissions.peutGererTransferts,
        groupe: "Flux",
      },
      {
        id: "ajustements",
        libelle: "Inventaires & Ajustements",
        icone: <ClipboardCheck className="w-4 h-4" />,
        autorise: permissions.peutGererAjustements,
        groupe: "Flux",
      },
      {
        id: "catalogue",
        libelle: "Référentiel Médicaments",
        icone: <BookOpen className="w-4 h-4" />,
        autorise: permissions.peutVoirCatalogue,
        groupe: "Référentiel",
      },
    ],
    [permissions],
  );

  const onglets = useMemo(() => tousOnglets.filter((o) => o.autorise), [tousOnglets]);

  const [actifInterne, setActifInterne] = useState<Cle>(ongletParDefaut);

  const actif: Cle = useMemo(() => {
    const propose = (sousOngletActif as Cle | null) ?? actifInterne;
    if (onglets.some((o) => o.id === propose)) return propose;
    return onglets[0]?.id ?? "niveaux";
  }, [sousOngletActif, actifInterne, onglets]);

  const changerActif = (id: string) => {
    setActifInterne(id as Cle);
    onSousOngletChange?.(id);
  };

  const siteVerrouille = !permissions.peutChangerSite;
  const siteDeSession = siteActifId ?? siteSessionId ?? null;
  const [siteSelectionne, setSiteSelectionne] = useState<number | null>(siteDeSession);
  const site = siteVerrouille ? siteDeSession : siteSelectionne;

  const m = (c: Cle): ModeAffichage => modes[c] ?? "edition";

  /* ------------------------------------------------------------------ *
   * Aucun accès
   * ------------------------------------------------------------------ */
  if (permissions.profil === "aucun") {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-2">
        <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-700">Aucun accès au module Stock</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Votre compte ne dispose d'aucun profil Stock (Dispensateur, Responsable ou Gestionnaire).
          Contactez un administrateur.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------ *
   * Rendu principal
   * ------------------------------------------------------------------ */
  return (
    <div className="space-y-5">
      {/* En-tête : navigation + contexte site */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 overflow-x-auto">
          <SousOnglets onglets={onglets} ongletActif={actif} onChanger={changerActif} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {permissions.peutChangerSite ? (
            <SelecteurSite valeur={siteSelectionne} onChanger={setSiteSelectionne} />
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Store className="w-4 h-4 text-slate-400" />
              Site de session
            </span>
          )}
        </div>
      </div>

      {/* Bandeau contexte : vue multi-sites */}
      {permissions.peutChangerSite && site === null && (
        <div className="flex items-center gap-2 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="font-medium">Vue multi-sites</span>
          <span className="text-indigo-600/80">
            — les données affichées consolident tous les sites.
          </span>
        </div>
      )}

      {/* Contenu de l'onglet actif */}
      <div className="min-w-0">
        {actif === "niveaux" && (
          <PanneauStockNiveaux mode={m("niveaux")} siteActifId={site ?? undefined} />
        )}
        {actif === "dispensation" && (
          <PanneauStockDispensation mode={m("dispensation")} siteActifId={site ?? undefined} />
        )}
        {actif === "commandes" && (
          <PanneauStockCommandes mode={m("commandes")} siteActifId={site ?? undefined} />
        )}
        {actif === "appro" && (
          <PanneauStockAppro mode={m("appro")} siteActifId={site ?? undefined} />
        )}
        {actif === "transferts" && (
          <PanneauStockTransferts mode={m("transferts")} siteActifId={site ?? undefined} />
        )}
        {actif === "ajustements" && (
          <PanneauStockAjustements mode={m("ajustements")} siteActifId={site ?? undefined} />
        )}
        {actif === "catalogue" && <PanneauPharmacieCatalogue mode={m("catalogue")} />}
      </div>
    </div>
  );
};

export default AssemblageStock;
