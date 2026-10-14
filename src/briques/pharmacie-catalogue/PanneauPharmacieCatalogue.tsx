// pharmacie-catalogue/PanneauPharmacieCatalogue.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Layers,
  Package,
  Pencil,
  Pill,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { ModeAffichage } from "@/cerveau/permissions";
import { stockApi, refApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Bouton, Erreur } from "../stock-commun/ui";
import type { Option, Produit } from "../stock-commun/types";

/* ================================================================== *
 * Outils communs
 * ================================================================== */
const ic = "w-4 h-4";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const trier = <T,>(liste: T[], cle: (x: T) => string): T[] =>
  [...liste].sort((a, b) => cle(a).localeCompare(cle(b), "fr"));

const libelleDe = (x: any): string => x.libelle ?? x.nom ?? x.name ?? `#${x.id}`;
const enOption = (x: any): Option => ({ id: x.id, libelle: libelleDe(x) });
const options = (liste: () => Promise<any[]>) => async () => (await liste()).map(enOption);

const listeFamilles = options(refApi.familles.liste);
const listePrincipes = options(refApi.principesActifs.liste);
const listeFormes = options(refApi.formes.liste);
const listeVoies = options(refApi.voies.liste);

/* ------------------------------------------------------------------ *
 * UCUM — codes pertinents pour les médicaments uniquement
 * ------------------------------------------------------------------ */
type UcumCategorie = "masse" | "volume" | "activite" | "concentration";

const UCUM_COURANTS: { code: string; libelle: string; categorie: UcumCategorie }[] = [
  { code: "kg", libelle: "Kilogramme", categorie: "masse" },
  { code: "g", libelle: "Gramme", categorie: "masse" },
  { code: "mg", libelle: "Milligramme", categorie: "masse" },
  { code: "µg", libelle: "Microgramme", categorie: "masse" },
  { code: "ng", libelle: "Nanogramme", categorie: "masse" },
  { code: "L", libelle: "Litre", categorie: "volume" },
  { code: "dL", libelle: "Décilitre", categorie: "volume" },
  { code: "mL", libelle: "Millilitre", categorie: "volume" },
  { code: "[iU]", libelle: "Unité Internationale", categorie: "activite" },
  { code: "U", libelle: "Unité enzymatique", categorie: "activite" },
  { code: "%", libelle: "Pourcentage", categorie: "concentration" },
  { code: "mmol", libelle: "Millimole", categorie: "concentration" },
  { code: "mEq", libelle: "Milliéquivalent", categorie: "concentration" },
];

const UCUM_CATEGORIES: { id: UcumCategorie; titre: string }[] = [
  { id: "masse", titre: "Masse" },
  { id: "volume", titre: "Volume" },
  { id: "activite", titre: "Activité" },
  { id: "concentration", titre: "Concentration" },
];

const UNITES_BASE = [
  {
    valeur: "comprime",
    libelle: "Comprimé",
    singulier: "comprimé",
    pluriel: "comprimés",
    plaquette: true,
  },
  { valeur: "gelule", libelle: "Gélule", singulier: "gélule", pluriel: "gélules", plaquette: true },
  {
    valeur: "flacon",
    libelle: "Flacon",
    singulier: "flacon",
    pluriel: "flacons",
    plaquette: false,
  },
  {
    valeur: "ampoule",
    libelle: "Ampoule",
    singulier: "ampoule",
    pluriel: "ampoules",
    plaquette: false,
  },
  {
    valeur: "sachet",
    libelle: "Sachet",
    singulier: "sachet",
    pluriel: "sachets",
    plaquette: false,
  },
  { valeur: "tube", libelle: "Tube", singulier: "tube", pluriel: "tubes", plaquette: false },
];

const nomUnite = (valeur: string | undefined, n: number) => {
  const u = UNITES_BASE.find((x) => x.valeur === valeur);
  if (!u) return n > 1 ? "unités" : "unité";
  return n > 1 ? u.pluriel : u.singulier;
};

const detailCond = (c: any, pres: any): string => {
  const b = Number(c?.nbUnitesParBoite);
  if (!(b > 0)) return "";
  const p = Number(c.nbUnitesParPlaquette);
  return `${b} ${nomUnite(pres?.uniteBase, b)} par boîte${p > 0 ? ` · ${p} par plaquette` : ""}`;
};

const CHAMP =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600 transition";

/* ================================================================== *
 * UI de base
 * ================================================================== */
const Champ: React.FC<{ libelle: string; aide?: React.ReactNode; children: React.ReactNode }> = ({
  libelle,
  aide,
  children,
}) => (
  <div className="text-sm">
    {libelle && <div className="mb-1 font-medium text-gray-700">{libelle}</div>}
    {children}
    {aide && <div className="mt-1 text-xs text-gray-500">{aide}</div>}
  </div>
);

const useSoumission = () => {
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const lancer = async (action: () => Promise<void>, defaut: string) => {
    setOccupe(true);
    setErreur(null);
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e, defaut));
    } finally {
      setOccupe(false);
    }
  };
  return { erreur, setErreur, occupe, lancer };
};

const useInfo = () => {
  const [info, setInfo] = useState<string | null>(null);
  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(null), 3500);
    return () => clearTimeout(t);
  }, [info]);
  return { info, setInfo };
};

const Info: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div
      role="status"
      className="flex items-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 animate-in fade-in"
    >
      <Check className="w-4 h-4" />
      {message}
    </div>
  ) : null;

const Apercu: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
    {children}
  </div>
);

const Alerte: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    role="alert"
    className="flex gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
  >
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
    <div>{children}</div>
  </div>
);

const BoutonsPied: React.FC<{
  occupe: boolean;
  onFermer: () => void;
  onValider: () => void;
  libelle: string;
}> = ({ occupe, onFermer, onValider, libelle }) => (
  <div className="flex justify-end gap-2">
    <Bouton disabled={occupe} onClick={onFermer}>
      Annuler
    </Bouton>
    <Bouton variante="primaire" disabled={occupe} onClick={onValider}>
      {occupe ? "Enregistrement…" : libelle}
    </Bouton>
  </div>
);

const Tiroir: React.FC<{
  titre: string;
  icone: React.ReactNode;
  onFermer: () => void;
  onValider?: () => void;
  pied: React.ReactNode;
  children: React.ReactNode;
}> = ({ titre, icone, onFermer, onValider, pied, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFermer]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onFermer} />
      <aside
        className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            onValider &&
            e.target instanceof HTMLInputElement &&
            !e.target.dataset.noSubmit
          ) {
            e.preventDefault();
            onValider();
          }
        }}
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-teal-50/60 to-white">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-700">{icone}</div>
          <h2 className="flex-1 text-lg font-semibold">{titre}</h2>
          <button
            onClick={onFermer}
            aria-label="Fermer"
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 pb-40">{children}</div>
        <footer className="border-t px-5 py-4 bg-white space-y-3">{pied}</footer>
      </aside>
    </div>
  );
};

const Combobox: React.FC<{
  libelle: string;
  icone: React.ReactNode;
  options: Option[];
  valeur: number | "";
  onChange: (v: number | "") => void;
  placeholder: string;
  facultatif?: boolean;
  aide?: React.ReactNode;
}> = ({ libelle, icone, options, valeur, onChange, placeholder, facultatif, aide }) => {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");
  const choisie = options.find((o) => o.id === valeur);
  const filtrees = options.filter((o) => norm(o.libelle).includes(norm(requete)));
  const fermer = () => {
    setOuvert(false);
    setRequete("");
  };

  return (
    <Champ libelle={facultatif ? `${libelle} (facultatif)` : libelle} aide={aide}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className={`${CHAMP} flex items-center gap-2 text-left`}
        >
          <span className="text-teal-700">{icone}</span>
          <span className={`flex-1 truncate ${choisie ? "text-gray-900" : "text-gray-400"}`}>
            {choisie ? choisie.libelle : placeholder}
          </span>
          {choisie && facultatif && (
            <span
              role="button"
              aria-label="Retirer"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
            >
              <X className="w-4 h-4" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {ouvert && (
          <>
            <div className="fixed inset-0 z-10" onClick={fermer} />
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    data-no-submit="1"
                    value={requete}
                    onChange={(e) => setRequete(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filtrees[0]) {
                          onChange(filtrees[0].id);
                          fermer();
                        }
                      }
                    }}
                    placeholder="Rechercher…"
                    className={`${CHAMP} pl-8`}
                  />
                </div>
              </div>
              <ul className="max-h-52 overflow-y-auto py-1">
                {filtrees.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.id);
                        fermer();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-teal-50"
                    >
                      <span className="flex-1 truncate">{o.libelle}</span>
                      {o.id === valeur && <Check className="w-4 h-4 text-teal-700" />}
                    </button>
                  </li>
                ))}
                {filtrees.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-500">Aucun résultat</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </Champ>
  );
};

const LienOnglet: React.FC<{ onClick: () => void; libelle: string }> = ({ onClick, libelle }) => (
  <>
    Introuvable ?{" "}
    <button type="button" onClick={onClick} className="text-teal-700 underline">
      Ajoutez-le dans l'onglet {libelle}
    </button>
    .
  </>
);

/* ------------------------------------------------------------------ *
 * Composants de tableau unifiés
 * ------------------------------------------------------------------ */
const Th: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <th
    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 ${className}`}
  >
    {children}
  </th>
);

const Td: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <td className={`px-4 py-3 align-middle text-gray-700 ${className}`}>{children}</td>;

type CouleurBadge = "teal" | "gray" | "amber" | "sky" | "violet" | "rose";

const Badge: React.FC<{ children: React.ReactNode; couleur?: CouleurBadge }> = ({
  children,
  couleur = "teal",
}) => {
  const couleurs: Record<CouleurBadge, string> = {
    teal: "bg-teal-50 text-teal-800 ring-teal-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    sky: "bg-sky-50 text-sky-800 ring-sky-200",
    violet: "bg-violet-50 text-violet-800 ring-violet-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${couleurs[couleur]}`}
    >
      {children}
    </span>
  );
};

const Tableau: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  </div>
);

const EtatVide: React.FC<{
  colSpan: number;
  recherche: string;
  message: string;
  icone: React.ReactNode;
  action?: { libelle: string; onClick: () => void };
}> = ({ colSpan, recherche, message, icone, action }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="p-4 rounded-full bg-gray-50 ring-1 ring-gray-100 text-gray-400">
          {icone}
        </div>
        <p className="text-sm max-w-sm">
          {recherche ? "Aucun résultat pour cette recherche." : message}
        </p>
        {!recherche && action && (
          <Bouton variante="primaire" onClick={action.onClick}>
            <Plus className="w-4 h-4 inline mr-1" />
            {action.libelle}
          </Bouton>
        )}
      </div>
    </td>
  </tr>
);

const BarreOutils: React.FC<{
  compte: string;
  recherche: string;
  onRecherche: (v: string) => void;
  placeholder: string;
  bouton?: { libelle: string; onClick: () => void };
}> = ({ compte, recherche, onRecherche, placeholder, bouton }) => (
  <div className="flex flex-wrap items-center gap-3">
    <p className="text-sm text-gray-500">{compte}</p>
    <div className="relative ml-auto">
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
      <input
        value={recherche}
        onChange={(e) => onRecherche(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-600/40 transition"
      />
      {recherche && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => onRecherche("")}
          className="absolute right-2 top-2 p-0.5 rounded text-gray-400 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    {bouton && (
      <Bouton variante="primaire" onClick={bouton.onClick}>
        <Plus className="w-4 h-4 inline mr-1" />
        {bouton.libelle}
      </Bouton>
    )}
  </div>
);

const compteDe = (visibles: number, total: number, singulier: string, pluriel: string) =>
  visibles === total ? `${total} ${total > 1 ? pluriel : singulier}` : `${visibles} sur ${total}`;

const ActionsLigne: React.FC<{ onModifier: () => void; onSupprimer: () => void }> = ({
  onModifier,
  onSupprimer,
}) => (
  <div className="flex gap-1 justify-end">
    <button
      onClick={onModifier}
      aria-label="Modifier"
      className="p-2 hover:bg-gray-100 rounded transition"
    >
      <Pencil className="w-4 h-4" />
    </button>
    <button
      onClick={onSupprimer}
      aria-label="Supprimer"
      className="p-2 hover:bg-red-50 text-red-600 rounded transition"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

/* ================================================================== *
 * Référentiels
 * ================================================================== */
interface ChampDef {
  cle: string;
  libelle: string;
  type: "texte" | "nombre" | "liste" | "pastilles";
  requis?: boolean;
  placeholder?: string;
  aide?: string;
  defaut?: any;
  source?: () => Promise<Option[]>;
  choix?: { valeur: string; libelle: string }[];
  ailleurs?: { onglet: string; libelle: string };
}

interface FormProps {
  config: ConfigRef;
  item: any | null;
  refs: Record<string, Option[]>;
  onTermine: () => void;
  onFermer: () => void;
  onAller: (onglet: string) => void;
}

interface ConfigRef {
  titre: string;
  nouveau: string;
  modifier: string;
  vide: string;
  icone: React.ReactNode;
  api: {
    liste: () => Promise<any[]>;
    creer: (p: any) => Promise<any>;
    modifier: (id: number, p: any) => Promise<any>;
    supprimer: (id: number) => Promise<any>;
  };
  champs: ChampDef[];
  resume?: (x: any) => string;
  formulaire?: React.FC<FormProps>;
  couleurBadge?: CouleurBadge;
}

/* ------------------------------------------------------------------ *
 * Formulaire Conditionnement
 * ------------------------------------------------------------------ */
const FormulaireConditionnement: React.FC<FormProps> = ({ config, item, onTermine, onFermer }) => {
  const upp0 = Number(item?.nbUnitesParPlaquette) || 0;
  const b0 = Number(item?.nbUnitesParBoite) || 0;
  const divisible = upp0 > 0 && b0 > 0 && b0 % upp0 === 0;

  const [mode, setMode] = useState<"plaquettes" | "direct">(divisible ? "plaquettes" : "direct");
  const [libelle, setLibelle] = useState<string>(item?.libelle ?? "");
  const [libelleManuel, setLibelleManuel] = useState(!!item);
  const [code, setCode] = useState<string>(item?.code ?? "");
  const [nbPlaq, setNbPlaq] = useState<string>(divisible ? String(b0 / upp0) : "");
  const [uPlaq, setUPlaq] = useState<string>(divisible ? String(upp0) : "");
  const [uBoite, setUBoite] = useState<string>(!divisible && b0 ? String(b0) : "");
  const s = useSoumission();

  const nP = Number(nbPlaq),
    uP = Number(uPlaq),
    uB = Number(uBoite);
  const total = mode === "plaquettes" ? nP * uP : uB;
  const valide = mode === "plaquettes" ? nP >= 1 && uP >= 1 : uB >= 1;
  const suggestion = valide
    ? mode === "plaquettes"
      ? `Boîte de ${nP} plaquette${nP > 1 ? "s" : ""} de ${uP}`
      : `Boîte de ${uB}`
    : "";

  useEffect(() => {
    if (!libelleManuel && suggestion) setLibelle(suggestion);
  }, [suggestion, libelleManuel]);

  const apercu = valide
    ? mode === "plaquettes"
      ? `${nP} plaquette${nP > 1 ? "s" : ""} × ${uP} = ${total} unités par boîte`
      : `${total} unité${total > 1 ? "s" : ""} par boîte`
    : "";

  const valider = () => {
    if (!libelle.trim()) return s.setErreur("Renseignez le libellé.");
    if (!valide)
      return s.setErreur(
        mode === "plaquettes"
          ? "Indiquez le nombre de plaquettes et le nombre d’unités par plaquette."
          : "Indiquez le nombre d’unités par boîte.",
      );
    const payload = {
      libelle: libelle.trim(),
      code: code.trim() || null,
      nbUnitesParBoite: total,
      nbUnitesParPlaquette: mode === "plaquettes" ? uP : null,
    };
    s.lancer(async () => {
      if (item) await config.api.modifier(item.id, payload);
      else await config.api.creer(payload);
      onTermine();
    }, "L'enregistrement a échoué.");
  };

  const choixMode = (id: "plaquettes" | "direct", titre: string, exemple: string) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      aria-pressed={mode === id}
      className={`flex-1 text-left rounded-xl border px-3 py-2.5 transition ${
        mode === id
          ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
          : "border-gray-300 bg-white hover:border-teal-600"
      }`}
    >
      <div className="text-sm font-medium text-gray-900">{titre}</div>
      <div className="text-xs text-gray-500">{exemple}</div>
    </button>
  );

  return (
    <Tiroir
      titre={item ? config.modifier : config.nouveau}
      icone={config.icone}
      onFermer={onFermer}
      onValider={valider}
      pied={
        <>
          <Erreur message={s.erreur} />
          <BoutonsPied
            occupe={s.occupe}
            onFermer={onFermer}
            onValider={valider}
            libelle={item ? "Enregistrer" : "Créer"}
          />
        </>
      }
    >
      <Champ libelle="Comment la boîte est-elle composée ?">
        <div className="flex gap-2">
          {choixMode("plaquettes", "En plaquettes", "Comprimés, gélules")}
          {choixMode("direct", "À l’unité", "Flacon, ampoule, sachet, tube")}
        </div>
      </Champ>

      {mode === "plaquettes" ? (
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Plaquettes par boîte">
            <input
              autoFocus
              type="number"
              min={1}
              inputMode="numeric"
              value={nbPlaq}
              placeholder="Ex. 3"
              onChange={(e) => setNbPlaq(e.target.value)}
              className={CHAMP}
            />
          </Champ>
          <Champ libelle="Unités par plaquette">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={uPlaq}
              placeholder="Ex. 10"
              onChange={(e) => setUPlaq(e.target.value)}
              className={CHAMP}
            />
          </Champ>
        </div>
      ) : (
        <Champ
          libelle="Unités par boîte"
          aide="Le nom de l’unité (flacon, ampoule…) vient de la présentation du produit."
        >
          <input
            autoFocus
            type="number"
            min={1}
            inputMode="numeric"
            value={uBoite}
            placeholder="Ex. 10"
            onChange={(e) => setUBoite(e.target.value)}
            className={CHAMP}
          />
        </Champ>
      )}

      {apercu && <Apercu>{apercu}</Apercu>}

      <Champ libelle="Libellé">
        <input
          value={libelle}
          placeholder="Ex. Boîte de 3 plaquettes de 10"
          onChange={(e) => {
            setLibelle(e.target.value);
            setLibelleManuel(e.target.value !== "");
          }}
          className={CHAMP}
        />
        {suggestion && libelle !== suggestion && (
          <button
            type="button"
            onClick={() => {
              setLibelle(suggestion);
              setLibelleManuel(false);
            }}
            className="mt-1.5 text-xs text-teal-700 underline"
          >
            Utiliser « {suggestion} »
          </button>
        )}
      </Champ>

      <Champ libelle="Code (facultatif)">
        <input
          value={code}
          placeholder="Ex. BT30"
          onChange={(e) => setCode(e.target.value)}
          className={CHAMP}
        />
      </Champ>
    </Tiroir>
  );
};

/* ------------------------------------------------------------------ *
 * Formulaire Unité de mesure (UCUM + code libre)
 * ------------------------------------------------------------------ */
const FormulaireUnite: React.FC<FormProps> = ({ config, item, onTermine, onFermer }) => {
  const codeInitial = item?.code ?? "";
  const estUcum = UCUM_COURANTS.some((u) => u.code === codeInitial);
  const [libre, setLibre] = useState<boolean>(!!item && !estUcum);
  const [libelle, setLibelle] = useState<string>(item?.libelle ?? "");
  const [code, setCode] = useState<string>(codeInitial);
  const [libelleAuto, setLibelleAuto] = useState<boolean>(!item);
  const s = useSoumission();

  const choisirCode = (nouveau: string) => {
    setCode(nouveau);
    const u = UCUM_COURANTS.find((x) => x.code === nouveau);
    if (u && libelleAuto) setLibelle(u.libelle);
  };

  const basculerMode = () => {
    setLibre((v) => !v);
    setCode("");
    setLibelle("");
    setLibelleAuto(true);
  };

  const valider = () => {
    if (!libelle.trim()) return s.setErreur("Renseignez le libellé.");
    if (!code.trim()) return s.setErreur(libre ? "Saisissez un code." : "Choisissez un code UCUM.");
    const payload = { libelle: libelle.trim(), code: code.trim() };
    s.lancer(async () => {
      if (item) await config.api.modifier(item.id, payload);
      else await config.api.creer(payload);
      onTermine();
    }, "L'enregistrement a échoué.");
  };

  const ucumChoisi = UCUM_COURANTS.find((u) => u.code === code);

  return (
    <Tiroir
      titre={item ? config.modifier : config.nouveau}
      icone={config.icone}
      onFermer={onFermer}
      onValider={valider}
      pied={
        <>
          <Erreur message={s.erreur} />
          <BoutonsPied
            occupe={s.occupe}
            onFermer={onFermer}
            onValider={valider}
            libelle={item ? "Enregistrer" : "Créer"}
          />
        </>
      }
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => libre && basculerMode()}
          aria-pressed={!libre}
          className={`flex-1 text-left rounded-xl border px-3 py-2.5 transition ${
            !libre
              ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
              : "border-gray-300 bg-white hover:border-teal-600"
          }`}
        >
          <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Code UCUM
          </div>
          <div className="text-xs text-gray-500">mg, mL, [iU]…</div>
        </button>
        <button
          type="button"
          onClick={() => !libre && basculerMode()}
          aria-pressed={libre}
          className={`flex-1 text-left rounded-xl border px-3 py-2.5 transition ${
            libre
              ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
              : "border-gray-300 bg-white hover:border-teal-600"
          }`}
        >
          <div className="text-sm font-medium text-gray-900">Code libre</div>
          <div className="text-xs text-gray-500">comprimé, boîte…</div>
        </button>
      </div>

      {!libre ? (
        <Champ
          libelle="Code UCUM"
          aide={
            <>
              Codes les plus courants en pharmacie.{" "}
              <a
                href="https://ucum.org"
                target="_blank"
                rel="noreferrer"
                className="text-teal-700 underline"
              >
                Voir la doc UCUM
              </a>
            </>
          }
        >
          <div className="space-y-3">
            {UCUM_CATEGORIES.map((cat) => {
              const groupe = UCUM_COURANTS.filter((u) => u.categorie === cat.id);
              return (
                <div key={cat.id}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    {cat.titre}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {groupe.map((u) => {
                      const actif = code === u.code;
                      return (
                        <button
                          key={u.code}
                          type="button"
                          aria-pressed={actif}
                          onClick={() => choisirCode(u.code)}
                          className={`text-left rounded-lg border px-3 py-2 transition ${
                            actif
                              ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600 shadow-sm"
                              : "border-gray-200 bg-white hover:border-teal-500 hover:shadow-sm"
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">{u.libelle}</div>
                          <div className="text-xs text-gray-500 font-mono">{u.code}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {ucumChoisi && (
            <div className="mt-3 flex items-center gap-2 text-xs text-teal-900 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
              <Check className="w-3.5 h-3.5" />
              Code sélectionné : <strong>{ucumChoisi.libelle}</strong>
              <span className="font-mono bg-white/60 px-1.5 py-0.5 rounded border border-teal-200">
                {ucumChoisi.code}
              </span>
            </div>
          )}
        </Champ>
      ) : (
        <Champ
          libelle="Code libre"
          aide="Pour les unités qui ne sont pas des unités de mesure UCUM : comprimé, boîte, flacon…"
        >
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex. comprimé, boîte, flacon"
            className={CHAMP}
          />
        </Champ>
      )}

      <Champ
        libelle="Libellé"
        aide={
          !libre && libelleAuto
            ? "Rempli automatiquement quand vous choisissez un code UCUM."
            : undefined
        }
      >
        <input
          value={libelle}
          onChange={(e) => {
            setLibelle(e.target.value);
            setLibelleAuto(false);
          }}
          placeholder="Ex. milligramme"
          className={CHAMP}
        />
        {!libre && ucumChoisi && libelle !== ucumChoisi.libelle && (
          <button
            type="button"
            onClick={() => {
              setLibelle(ucumChoisi.libelle);
              setLibelleAuto(true);
            }}
            className="mt-1.5 text-xs text-teal-700 underline"
          >
            Utiliser « {ucumChoisi.libelle} »
          </button>
        )}
      </Champ>
    </Tiroir>
  );
};

/* ------------------------------------------------------------------ *
 * Configurations des référentiels
 * ------------------------------------------------------------------ */
const REFERENCES: Record<string, ConfigRef> = {
  familles: {
    titre: "Familles",
    nouveau: "Nouvelle famille",
    modifier: "Modifier la famille",
    vide: "Aucune famille. Créez-en une pour classer vos médicaments.",
    icone: <Layers className={ic} />,
    api: refApi.familles,
    couleurBadge: "teal",
    champs: [
      {
        cle: "libelle",
        libelle: "Libellé",
        type: "texte",
        requis: true,
        placeholder: "Ex. Antalgiques",
      },
    ],
  },
  principes: {
    titre: "Principes actifs",
    nouveau: "Nouveau principe actif",
    modifier: "Modifier le principe actif",
    vide: "Aucun principe actif. Créez-en un pour le rattacher à un médicament.",
    icone: <FlaskConical className={ic} />,
    api: refApi.principesActifs,
    couleurBadge: "violet",
    champs: [
      {
        cle: "libelle",
        libelle: "Libellé",
        type: "texte",
        requis: true,
        placeholder: "Ex. Paracétamol",
      },
    ],
  },
  presentations: {
    titre: "Présentations",
    nouveau: "Nouvelle présentation",
    modifier: "Modifier la présentation",
    vide: "Aucune présentation. Créez-en une, par exemple « Comprimé 500 mg » ou « Sirop 120 ml ».",
    icone: <ClipboardList className={ic} />,
    api: refApi.presentations,
    couleurBadge: "sky",
    champs: [
      {
        cle: "libelle",
        libelle: "Libellé",
        type: "texte",
        requis: true,
        placeholder: "Ex. Comprimé 500 mg",
      },
      { cle: "code", libelle: "Code", type: "texte", placeholder: "Ex. CP500" },
      {
        cle: "uniteBase",
        libelle: "Unité de base",
        type: "pastilles",
        requis: true,
        defaut: "comprime",
        aide: "Ce qu’on compte en stock : un sirop se compte en flacons, un injectable en ampoules.",
        choix: UNITES_BASE.map(({ valeur, libelle }) => ({ valeur, libelle })),
      },
    ],
  },
  conditionnements: {
    titre: "Conditionnements",
    nouveau: "Nouveau conditionnement",
    modifier: "Modifier le conditionnement",
    vide: "Aucun conditionnement. Créez-en un, par exemple « Boîte de 3 plaquettes de 10 ».",
    icone: <Package className={ic} />,
    api: refApi.conditionnements,
    couleurBadge: "amber",
    formulaire: FormulaireConditionnement,
    champs: [
      { cle: "libelle", libelle: "Libellé", type: "texte" },
      { cle: "code", libelle: "Code", type: "texte" },
      { cle: "nbUnitesParBoite", libelle: "Unités par boîte", type: "nombre" },
      { cle: "nbUnitesParPlaquette", libelle: "Unités par plaquette", type: "nombre" },
    ],
    resume: (x) => {
      const b = Number(x.nbUnitesParBoite),
        p = Number(x.nbUnitesParPlaquette);
      if (!(b > 0)) return "";
      if (p > 0)
        return b % p === 0
          ? `${b / p} plaquettes × ${p} = ${b} unités`
          : `${b} unités, ${p} par plaquette`;
      return `${b} unité${b > 1 ? "s" : ""} par boîte`;
    },
  },
  formes: {
    titre: "Formes",
    nouveau: "Nouvelle forme",
    modifier: "Modifier la forme",
    vide: "Aucune forme pharmaceutique.",
    icone: <Pill className={ic} />,
    api: refApi.formes,
    couleurBadge: "rose",
    champs: [
      {
        cle: "libelle",
        libelle: "Libellé",
        type: "texte",
        requis: true,
        placeholder: "Ex. Comprimé",
      },
      { cle: "code", libelle: "Code", type: "texte", requis: true, placeholder: "Ex. COMPRIME" },
    ],
  },
  voies: {
    titre: "Voies",
    nouveau: "Nouvelle voie",
    modifier: "Modifier la voie",
    vide: "Aucune voie d’administration.",
    icone: <Pill className={ic} />,
    api: refApi.voies,
    couleurBadge: "gray",
    champs: [
      {
        cle: "libelle",
        libelle: "Libellé",
        type: "texte",
        requis: true,
        placeholder: "Ex. Voie orale",
      },
      { cle: "code", libelle: "Code", type: "texte", requis: true, placeholder: "Ex. ORALE" },
    ],
  },
  unites: {
    titre: "Unités de mesure",
    nouveau: "Nouvelle unité",
    modifier: "Modifier l’unité",
    vide: "Aucune unité de mesure. Ajoutez un code UCUM standard ou un code libre.",
    icone: <FlaskConical className={ic} />,
    api: refApi.unitesMesure,
    couleurBadge: "teal",
    formulaire: FormulaireUnite,
    champs: [
      { cle: "libelle", libelle: "Libellé", type: "texte" },
      { cle: "code", libelle: "Code", type: "texte" },
    ],
  },
};

const valeurDe = (x: any, cle: string) => x[cle] ?? x[cle.replace(/Id$/, "")]?.id ?? "";

/* ------------------------------------------------------------------ *
 * Formulaire générique
 * ------------------------------------------------------------------ */
const FormulaireReference: React.FC<FormProps> = ({
  config,
  item,
  refs,
  onTermine,
  onFermer,
  onAller,
}) => {
  const [v, setV] = useState<Record<string, any>>(() =>
    Object.fromEntries(
      config.champs.map((c) => [c.cle, item ? valeurDe(item, c.cle) : (c.defaut ?? "")]),
    ),
  );
  const s = useSoumission();
  const set = (cle: string, val: any) => setV((p) => ({ ...p, [cle]: val }));

  const valider = () => {
    for (const c of config.champs) {
      const val = v[c.cle];
      if (c.requis && (val === "" || val === null || (c.type === "nombre" && Number(val) < 1)))
        return s.setErreur(`Renseignez « ${c.libelle} ».`);
    }
    const payload = Object.fromEntries(
      config.champs.map((c) => {
        const val = v[c.cle];
        if (c.type === "nombre" || c.type === "liste")
          return [c.cle, val === "" || val === null ? null : Number(val)];
        return [c.cle, typeof val === "string" ? val.trim() || null : val];
      }),
    );
    s.lancer(async () => {
      if (item) await config.api.modifier(item.id, payload);
      else await config.api.creer(payload);
      onTermine();
    }, "L'enregistrement a échoué.");
  };

  const apercu = config.resume?.(v);

  return (
    <Tiroir
      titre={item ? config.modifier : config.nouveau}
      icone={config.icone}
      onFermer={onFermer}
      onValider={valider}
      pied={
        <>
          <Erreur message={s.erreur} />
          <BoutonsPied
            occupe={s.occupe}
            onFermer={onFermer}
            onValider={valider}
            libelle={item ? "Enregistrer" : "Créer"}
          />
        </>
      }
    >
      {config.champs.map((c, i) => {
        if (c.type === "liste")
          return (
            <Combobox
              key={c.cle}
              libelle={c.libelle}
              icone={<Layers className={ic} />}
              options={refs[c.cle] ?? []}
              valeur={v[c.cle]}
              onChange={(x) => set(c.cle, x)}
              placeholder={`Choisir (${c.libelle.toLowerCase()})`}
              aide={
                c.ailleurs && (
                  <LienOnglet
                    onClick={() => onAller(c.ailleurs!.onglet)}
                    libelle={c.ailleurs.libelle}
                  />
                )
              }
            />
          );
        if (c.type === "pastilles")
          return (
            <Champ key={c.cle} libelle={c.libelle} aide={c.aide}>
              <div className="flex flex-wrap gap-2">
                {c.choix!.map((f) => (
                  <button
                    key={f.valeur}
                    type="button"
                    aria-pressed={v[c.cle] === f.valeur}
                    onClick={() => set(c.cle, f.valeur)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      v[c.cle] === f.valeur
                        ? "bg-teal-700 border-teal-700 text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:border-teal-600"
                    }`}
                  >
                    {f.libelle}
                  </button>
                ))}
              </div>
            </Champ>
          );
        return (
          <Champ key={c.cle} libelle={c.libelle} aide={c.aide}>
            <input
              autoFocus={i === 0}
              type={c.type === "nombre" ? "number" : "text"}
              min={c.type === "nombre" ? 1 : undefined}
              inputMode={c.type === "nombre" ? "numeric" : undefined}
              value={v[c.cle] ?? ""}
              placeholder={c.placeholder}
              onChange={(e) => set(c.cle, e.target.value)}
              className={CHAMP}
            />
          </Champ>
        );
      })}
      {apercu && <Apercu>{apercu}</Apercu>}
    </Tiroir>
  );
};

/* ------------------------------------------------------------------ *
 * Panneau de référence générique
 * ------------------------------------------------------------------ */
const PanneauReference: React.FC<{
  config: ConfigRef;
  editable: boolean;
  onAller: (o: string) => void;
}> = ({ config, editable, onAller }) => {
  const { items, erreur, recharger } = useListe(config.api.liste);
  const [refs, setRefs] = useState<Record<string, Option[]>>({});
  const [edition, setEdition] = useState<any | "nouveau" | null>(null);
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { info, setInfo } = useInfo();

  useEffect(() => {
    config.champs
      .filter((c) => c.source)
      .forEach(async (c) => {
        try {
          const o = await c.source!();
          setRefs((p) => ({ ...p, [c.cle]: o }));
        } catch {
          /* vide */
        }
      });
  }, [config]);

  const cellule = (x: any, c: ChampDef) => {
    const val = valeurDe(x, c.cle);
    if (c.type === "liste")
      return refs[c.cle]?.find((o) => o.id === val)?.libelle ?? (val ? `#${val}` : "—");
    if (c.type === "pastilles")
      return c.choix?.find((f) => f.valeur === val)?.libelle ?? (val || "—");
    if (c.cle === "code" && val)
      return (
        <Badge couleur="gray">
          <span className="font-mono">{val}</span>
        </Badge>
      );
    if (val === "" || val === null) return <span className="text-gray-400">—</span>;
    if (c.cle === "libelle" && config.couleurBadge)
      return <Badge couleur={config.couleurBadge}>{val}</Badge>;
    return val;
  };

  const visibles = trier(
    items.filter((x: any) => norm(libelleDe(x)).includes(norm(recherche))),
    libelleDe,
  );

  const supprimer = async (x: any) => {
    if (!window.confirm(`Supprimer « ${libelleDe(x)} » ?`)) return;
    setMessage(null);
    try {
      await config.api.supprimer(x.id);
      await recharger();
      setInfo("Élément supprimé.");
    } catch (e) {
      setMessage(messageErreur(e, "Suppression impossible (élément utilisé ailleurs ?)."));
    }
  };

  const Formulaire = config.formulaire ?? FormulaireReference;

  return (
    <div className="space-y-4">
      <BarreOutils
        compte={compteDe(visibles.length, items.length, "élément", "éléments")}
        recherche={recherche}
        onRecherche={setRecherche}
        placeholder="Rechercher…"
        bouton={
          editable ? { libelle: config.nouveau, onClick: () => setEdition("nouveau") } : undefined
        }
      />
      <Erreur message={erreur ?? message} />
      <Info message={info} />
      <Tableau>
        <thead>
          <tr>
            {config.champs.map((c) => (
              <Th key={c.cle}>{c.libelle}</Th>
            ))}
            {config.resume && <Th>Résumé</Th>}
            <Th className="w-24 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visibles.map((x: any) => (
            <tr key={x.id} className="hover:bg-teal-50/40 transition-colors">
              {config.champs.map((c, i) => (
                <Td key={c.cle} className={i === 0 ? "font-medium text-gray-900" : ""}>
                  {cellule(x, c)}
                </Td>
              ))}
              {config.resume && <Td className="text-gray-500">{config.resume(x)}</Td>}
              <Td className="text-right">
                {editable && (
                  <ActionsLigne onModifier={() => setEdition(x)} onSupprimer={() => supprimer(x)} />
                )}
              </Td>
            </tr>
          ))}
          {visibles.length === 0 && (
            <EtatVide
              colSpan={config.champs.length + (config.resume ? 2 : 1)}
              recherche={recherche}
              message={config.vide}
              icone={config.icone}
              action={
                editable
                  ? { libelle: config.nouveau, onClick: () => setEdition("nouveau") }
                  : undefined
              }
            />
          )}
        </tbody>
      </Tableau>
      {edition && (
        <Formulaire
          config={config}
          item={edition === "nouveau" ? null : edition}
          refs={refs}
          onAller={onAller}
          onFermer={() => setEdition(null)}
          onTermine={() => {
            setEdition(null);
            recharger();
            setInfo("Enregistré.");
          }}
        />
      )}
    </div>
  );
};

/* ================================================================== *
 * Médicaments
 * ================================================================== */
interface LigneComposition {
  principeActifId: number | "";
  role: "actif" | "adjuvant";
  forceNum: string;
  uniteNumId: number | "";
}

const ligneVide = (): LigneComposition => ({
  principeActifId: "",
  role: "actif",
  forceNum: "",
  uniteNumId: "",
});

const normaliserForce = (s: string) => s.trim().replace(",", ".");
const FORCE_VALIDE = /^\d+(\.\d+)?$/;

const famillesDe = (x: any): number[] =>
  (x.familleIds ?? x.familles ?? []).map((f: any) => (typeof f === "object" ? f.id : f));

const lignesDe = (x: any): LigneComposition[] =>
  (x.ingredients ?? []).map((l: any): LigneComposition => ({
    principeActifId: l.principeActifId ?? l.principeActif?.id ?? "",
    role: l.role === "adjuvant" ? "adjuvant" : "actif",
    forceNum: l.forceNum != null ? String(l.forceNum) : "",
    uniteNumId: l.uniteNumId ?? l.uniteNum?.id ?? "",
  }));

const compositionDe = (x: any, _noms?: Map<number, string>): string =>
  x.nomNormalise || x.libelle || `Médicament #${x.id}`;

const FormulaireMedicament: React.FC<{
  item: any | null;
  familles: Option[];
  principes: Option[];
  formes: Option[];
  voies: Option[];
  unites: any[];
  onTermine: () => void;
  onFermer: () => void;
  onAller: (o: string) => void;
}> = ({ item, familles, principes, formes, voies, unites, onTermine, onFermer, onAller }) => {
  const [nom, setNom] = useState<string>(item?.nomNormalise ?? "");
  const [nomManuel, setNomManuel] = useState(!!item);
  const [formeId, setFormeId] = useState<number | "">(item?.formeId ?? "");
  const [voieId, setVoieId] = useState<number | "">(item?.voieId ?? "");
  const [familleIds, setFamilleIds] = useState<number[]>(item ? famillesDe(item) : []);
  const [lignes, setLignes] = useState<LigneComposition[]>(() => {
    const l = item ? lignesDe(item) : [];
    return l.length ? l : [ligneVide()];
  });
  const s = useSoumission();

  const majLigne = (i: number, c: Partial<LigneComposition>) =>
    setLignes((p) => p.map((l, k) => (k === i ? { ...l, ...c } : l)));
  const basculer = (id: number) =>
    setFamilleIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const optionsUnites = useMemo(
    () =>
      trier(
        unites.map((u: any): Option => ({
          id: u.id,
          libelle: u.code ? `${u.code} (${libelleDe(u)})` : libelleDe(u),
        })),
        (o) => o.libelle,
      ),
    [unites],
  );

  const codeUnite = new Map<number, string>(unites.map((u: any) => [u.id, u.code ?? libelleDe(u)]));
  const nomsPrincipes = new Map(principes.map((o) => [o.id, o.libelle]));
  const nomForme = formes.find((f) => f.id === formeId)?.libelle;

  const texteLigne = (l: LigneComposition) => {
    const force = normaliserForce(l.forceNum);
    const unite = l.uniteNumId ? codeUnite.get(Number(l.uniteNumId)) : "";
    return `${nomsPrincipes.get(Number(l.principeActifId)) ?? "…"}${force ? ` ${force}${unite ? ` ${unite}` : ""}` : ""}`;
  };

  const composition = lignes
    .filter((l) => l.principeActifId && l.role === "actif")
    .map(texteLigne)
    .join(" + ");
  const suggestion = composition
    ? `${composition}${nomForme ? ` ${nomForme.toLowerCase()}` : ""}`
    : "";

  useEffect(() => {
    if (!nomManuel && suggestion) setNom(suggestion);
  }, [suggestion, nomManuel]);

  const valider = () => {
    if (!formeId) return s.setErreur("Choisissez la forme du médicament.");
    const valides = lignes.filter((l) => l.principeActifId);
    if (valides.length === 0) return s.setErreur("Ajoutez au moins un principe actif.");
    if (!valides.some((l) => l.role === "actif"))
      return s.setErreur("Au moins un ingrédient doit avoir le rôle « Actif ».");
    if (new Set(valides.map((l) => l.principeActifId)).size !== valides.length)
      return s.setErreur("Un principe actif ne peut apparaître qu’une seule fois.");
    for (const l of valides) {
      const force = normaliserForce(l.forceNum);
      if (force === "") continue;
      const nomPa = nomsPrincipes.get(Number(l.principeActifId)) ?? "ce principe actif";
      if (!FORCE_VALIDE.test(force) || Number(force) <= 0)
        return s.setErreur(
          `La force de « ${nomPa} » doit être un nombre positif (ex. 500 ou 0.5).`,
        );
      if (!l.uniteNumId) return s.setErreur(`Choisissez l’unité de la force de « ${nomPa} ».`);
    }
    if (!nom.trim()) return s.setErreur("Renseignez le nom du médicament.");

    const payload = {
      nomNormalise: nom.trim(),
      formeId: Number(formeId),
      voieId: voieId ? Number(voieId) : null,
      familleIds,
      ingredients: valides.map((l) => {
        const force = normaliserForce(l.forceNum);
        return {
          principeActifId: Number(l.principeActifId),
          role: l.role,
          forceNum: force === "" ? null : force,
          uniteNumId: force === "" ? null : Number(l.uniteNumId),
        };
      }),
    };
    s.lancer(async () => {
      if (item) await refApi.medicaments.modifier(item.id, payload);
      else await refApi.medicaments.creer(payload);
      onTermine();
    }, "L'enregistrement a échoué.");
  };

  return (
    <Tiroir
      titre={item ? "Modifier le médicament" : "Nouveau médicament"}
      icone={<Pill className="w-5 h-5" />}
      onFermer={onFermer}
      onValider={valider}
      pied={
        <>
          <Erreur message={s.erreur} />
          <BoutonsPied
            occupe={s.occupe}
            onFermer={onFermer}
            onValider={valider}
            libelle={item ? "Enregistrer" : "Créer"}
          />
        </>
      }
    >
      <Combobox
        libelle="Forme"
        icone={<Pill className={ic} />}
        options={formes}
        valeur={formeId}
        onChange={setFormeId}
        placeholder="Comprimé, sirop, injectable…"
        aide={<LienOnglet onClick={() => onAller("formes")} libelle="Formes" />}
      />

      <Champ
        libelle="Composition"
        aide={
          <div className="space-y-0.5">
            <div>
              <LienOnglet onClick={() => onAller("principes")} libelle="Principes actifs" />
            </div>
            <div>
              <LienOnglet onClick={() => onAller("unites")} libelle="Unités de mesure" />
            </div>
          </div>
        }
      >
        <div className="space-y-2">
          {lignes.map((l, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50/40">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Combobox
                    libelle=""
                    icone={<FlaskConical className={ic} />}
                    options={principes}
                    valeur={l.principeActifId}
                    onChange={(v) => majLigne(i, { principeActifId: v })}
                    placeholder="Principe actif"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLignes((p) => p.filter((_, k) => k !== i))}
                  disabled={lignes.length === 1}
                  aria-label="Retirer ce principe actif"
                  className="p-2 mt-0.5 text-gray-500 hover:text-red-600 disabled:opacity-30 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  aria-label="Force"
                  inputMode="decimal"
                  value={l.forceNum}
                  onChange={(e) => majLigne(i, { forceNum: e.target.value })}
                  placeholder="Force, ex. 500"
                  className={CHAMP}
                />
                <Combobox
                  libelle=""
                  icone={<FlaskConical className={ic} />}
                  options={optionsUnites}
                  valeur={l.uniteNumId}
                  onChange={(v) => majLigne(i, { uniteNumId: v })}
                  placeholder="Unité"
                />
                <select
                  aria-label="Rôle"
                  value={l.role}
                  onChange={(e) =>
                    majLigne(i, { role: e.target.value === "adjuvant" ? "adjuvant" : "actif" })
                  }
                  className={CHAMP}
                >
                  <option value="actif">Actif</option>
                  <option value="adjuvant">Adjuvant</option>
                </select>
              </div>
            </div>
          ))}
          <Bouton onClick={() => setLignes((p) => [...p, ligneVide()])}>
            <Plus className="w-4 h-4 inline mr-1" />
            Ajouter un principe actif
          </Bouton>
        </div>
      </Champ>

      <Champ
        libelle="Nom du médicament"
        aide="Proposé à partir de la composition et de la forme. Vous pouvez le modifier."
      >
        <input
          value={nom}
          placeholder="Ex. Paracétamol 500 mg comprimé"
          onChange={(e) => {
            setNom(e.target.value);
            setNomManuel(e.target.value !== "");
          }}
          className={CHAMP}
        />
        {suggestion && nom !== suggestion && (
          <button
            type="button"
            onClick={() => {
              setNom(suggestion);
              setNomManuel(false);
            }}
            className="mt-1.5 text-xs text-teal-700 underline"
          >
            Utiliser « {suggestion} »
          </button>
        )}
      </Champ>

      <Combobox
        libelle="Voie d’administration"
        icone={<Pill className={ic} />}
        options={voies}
        valeur={voieId}
        onChange={setVoieId}
        placeholder="Voie orale, injectable…"
        facultatif
        aide={<LienOnglet onClick={() => onAller("voies")} libelle="Voies" />}
      />

      <Champ
        libelle="Familles (facultatif)"
        aide={<LienOnglet onClick={() => onAller("familles")} libelle="Familles" />}
      >
        <div className="flex flex-wrap gap-2">
          {familles.map((f) => {
            const actif = familleIds.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={actif}
                onClick={() => basculer(f.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition ${
                  actif
                    ? "bg-teal-700 border-teal-700 text-white"
                    : "bg-white border-gray-300 text-gray-700 hover:border-teal-600"
                }`}
              >
                {actif && <Check className="w-3.5 h-3.5" />}
                {f.libelle}
              </button>
            );
          })}
          {familles.length === 0 && (
            <span className="text-sm text-gray-500">Aucune famille pour le moment.</span>
          )}
        </div>
      </Champ>
    </Tiroir>
  );
};

const PanneauMedicaments: React.FC<{ editable: boolean; onAller: (o: string) => void }> = ({
  editable,
  onAller,
}) => {
  const meds = useListe(refApi.medicaments.liste);
  const familles = useListe(listeFamilles);
  const principes = useListe(listePrincipes);
  const formes = useListe(listeFormes);
  const voies = useListe(listeVoies);
  const unites = useListe(refApi.unitesMesure.liste);
  const [edition, setEdition] = useState<any | "nouveau" | null>(null);
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { info, setInfo } = useInfo();

  const nomsFam = new Map(familles.items.map((o) => [o.id, o.libelle]));
  const nomsForme = new Map(formes.items.map((o) => [o.id, o.libelle]));
  const visibles = trier(
    meds.items.filter((x: any) => norm(compositionDe(x)).includes(norm(recherche))),
    (x: any) => compositionDe(x),
  );

  const supprimer = async (x: any) => {
    if (!window.confirm(`Supprimer « ${compositionDe(x)} » ?`)) return;
    setMessage(null);
    try {
      await refApi.medicaments.supprimer(x.id);
      await meds.recharger();
      setInfo("Médicament supprimé.");
    } catch (e) {
      setMessage(messageErreur(e, "Suppression impossible (produits ou ordonnances rattachés ?)."));
    }
  };

  return (
    <div className="space-y-4">
      <BarreOutils
        compte={compteDe(visibles.length, meds.items.length, "médicament", "médicaments")}
        recherche={recherche}
        onRecherche={setRecherche}
        placeholder="Rechercher…"
        bouton={
          editable
            ? { libelle: "Nouveau médicament", onClick: () => setEdition("nouveau") }
            : undefined
        }
      />
      <Erreur message={meds.erreur ?? message} />
      <Info message={info} />
      <Tableau>
        <thead>
          <tr>
            <Th>Médicament</Th>
            <Th>Forme</Th>
            <Th>Familles</Th>
            <Th className="w-24 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visibles.map((x: any) => (
            <tr key={x.id} className="hover:bg-teal-50/40 transition-colors">
              <Td className="font-medium text-gray-900">{compositionDe(x)}</Td>
              <Td>
                {x.formeId ? (
                  <Badge couleur="sky">{nomsForme.get(x.formeId) ?? `#${x.formeId}`}</Badge>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {famillesDe(x).map((id) => (
                    <Badge key={id} couleur="teal">
                      {nomsFam.get(id) ?? `#${id}`}
                    </Badge>
                  ))}
                  {famillesDe(x).length === 0 && <span className="text-gray-400">—</span>}
                </div>
              </Td>
              <Td className="text-right">
                {editable && (
                  <ActionsLigne onModifier={() => setEdition(x)} onSupprimer={() => supprimer(x)} />
                )}
              </Td>
            </tr>
          ))}
          {visibles.length === 0 && (
            <EtatVide
              colSpan={4}
              recherche={recherche}
              message="Aucun médicament. Créez-en un : forme, ingrédients avec leur force, puis familles."
              icone={<Pill className="w-6 h-6" />}
              action={
                editable
                  ? { libelle: "Nouveau médicament", onClick: () => setEdition("nouveau") }
                  : undefined
              }
            />
          )}
        </tbody>
      </Tableau>
      {edition && (
        <FormulaireMedicament
          item={edition === "nouveau" ? null : edition}
          familles={familles.items}
          principes={principes.items}
          formes={formes.items}
          voies={voies.items}
          unites={unites.items}
          onAller={onAller}
          onFermer={() => setEdition(null)}
          onTermine={() => {
            setEdition(null);
            meds.recharger();
            setInfo("Enregistré.");
          }}
        />
      )}
    </div>
  );
};

/* ================================================================== *
 * Produits
 * ================================================================== */
const TiroirProduit: React.FC<{
  produit: Produit | null;
  meds: Option[];
  condsBrut: any[];
  presBrut: any[];
  onTermine: () => void;
  onFermer: () => void;
  onAller: (o: string) => void;
}> = ({ produit, meds, condsBrut, presBrut, onTermine, onFermer, onAller }) => {
  const [nom, setNom] = useState(produit?.nomCommercial ?? "");
  const [medId, setMedId] = useState<number | "">(produit?.medicamentId ?? "");
  const [condId, setCondId] = useState<number | "">(produit?.conditionnementId ?? "");
  const [presId, setPresId] = useState<number | "">(produit?.presentationId ?? "");
  const [titulaire, setTitulaire] = useState(produit?.titulaire ?? "");
  const [statutAmm, setStatutAmm] = useState(produit?.statutAmm ?? "");
  const s = useSoumission();

  const conds = trier(condsBrut.map(enOption), (o) => o.libelle);
  const press = trier(presBrut.map(enOption), (o) => o.libelle);
  const cond = condsBrut.find((c) => c.id === condId);
  const pres = presBrut.find((p) => p.id === presId);
  const uniteAvecPlaquette =
    UNITES_BASE.find((u) => u.valeur === pres?.uniteBase)?.plaquette ?? true;
  const incoherent =
    !!cond && !!pres && Number(cond.nbUnitesParPlaquette) > 0 && !uniteAvecPlaquette;

  const valider = () => {
    if (!nom.trim()) return s.setErreur("Saisissez le nom commercial.");
    if (!medId) return s.setErreur("Choisissez un médicament.");
    if (!condId) return s.setErreur("Choisissez un conditionnement.");
    const payload = {
      nomCommercial: nom.trim(),
      medicamentId: Number(medId),
      conditionnementId: Number(condId),
      presentationId: presId ? Number(presId) : null,
      titulaire: titulaire.trim() || null,
      statutAmm: statutAmm.trim() || null,
    };
    s.lancer(async () => {
      if (produit) await stockApi.modifierProduit(produit.id, payload);
      else await stockApi.creerProduit(payload);
      onTermine();
    }, "Le produit n'a pas pu être enregistré.");
  };

  return (
    <Tiroir
      titre={produit ? "Modifier le produit" : "Nouveau produit"}
      icone={<Pill className="w-5 h-5" />}
      onFermer={onFermer}
      onValider={valider}
      pied={
        <>
          <Erreur message={s.erreur} />
          <BoutonsPied
            occupe={s.occupe}
            onFermer={onFermer}
            onValider={valider}
            libelle={produit ? "Enregistrer" : "Créer le produit"}
          />
        </>
      }
    >
      <Champ libelle="Nom commercial" aide="Le nom tel qu'il figure sur la boîte.">
        <input
          autoFocus={!produit}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex. Doliprane"
          className={CHAMP}
        />
      </Champ>
      <Champ libelle="Titulaire de l'AMM (facultatif)">
        <input
          value={titulaire}
          onChange={(e) => setTitulaire(e.target.value)}
          placeholder="Ex. Sanofi"
          className={CHAMP}
        />
      </Champ>
      <Champ libelle="Statut AMM (facultatif)">
        <input
          value={statutAmm}
          onChange={(e) => setStatutAmm(e.target.value)}
          placeholder="Ex. autorisé"
          className={CHAMP}
        />
      </Champ>
      <Combobox
        libelle="Médicament"
        icone={<Pill className={ic} />}
        options={meds}
        valeur={medId}
        onChange={setMedId}
        placeholder="Rechercher un médicament"
        aide={<LienOnglet onClick={() => onAller("medicaments")} libelle="Médicaments" />}
      />
      <Combobox
        libelle="Présentation"
        icone={<ClipboardList className={ic} />}
        options={press}
        valeur={presId}
        onChange={setPresId}
        placeholder="Comprimé, sirop, injectable…"
        facultatif
        aide={<LienOnglet onClick={() => onAller("presentations")} libelle="Présentations" />}
      />
      <Combobox
        libelle="Conditionnement"
        icone={<Package className={ic} />}
        options={conds}
        valeur={condId}
        onChange={setCondId}
        placeholder="Boîte de 3 plaquettes de 10…"
        aide={<LienOnglet onClick={() => onAller("conditionnements")} libelle="Conditionnements" />}
      />

      {cond && <Apercu>{detailCond(cond, pres)}</Apercu>}
      {incoherent && (
        <Alerte>
          Ce conditionnement est en plaquettes, mais la présentation « {libelleDe(pres)} » se compte
          en {nomUnite(pres.uniteBase, 2)}. Vérifiez votre choix.
        </Alerte>
      )}
    </Tiroir>
  );
};

const PanneauProduits: React.FC<{ editable: boolean; onAller: (o: string) => void }> = ({
  editable,
  onAller,
}) => {
  const produits = useListe(stockApi.produits);
  const medsBrut = useListe(refApi.medicaments.liste);
  const condsBrut = useListe(refApi.conditionnements.liste);
  const presBrut = useListe(refApi.presentations.liste);
  const meds = trier(
    medsBrut.items.map((x: any): Option => ({ id: x.id, libelle: compositionDe(x) })),
    (o) => o.libelle,
  );
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState<Produit | "nouveau" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { info, setInfo } = useInfo();

  const nomMed = new Map(meds.map((o) => [o.id, o.libelle]));
  const condParId = new Map<number, any>(condsBrut.items.map((c: any) => [c.id, c]));
  const presParId = new Map<number, any>(presBrut.items.map((p: any) => [p.id, p]));
  const visibles = trier(
    produits.items.filter((p) => norm(p.nomCommercial).includes(norm(recherche))),
    (p) => p.nomCommercial,
  );

  const supprimer = async (p: Produit) => {
    if (!window.confirm(`Supprimer « ${p.nomCommercial} » ?`)) return;
    setMessage(null);
    try {
      await stockApi.supprimerProduit(p.id);
      await produits.recharger();
      setInfo("Produit supprimé.");
    } catch (e) {
      setMessage(messageErreur(e, "Suppression impossible (produit utilisé ?)."));
    }
  };

  return (
    <div className="space-y-4">
      <BarreOutils
        compte={compteDe(visibles.length, produits.items.length, "produit", "produits")}
        recherche={recherche}
        onRecherche={setRecherche}
        placeholder="Rechercher un produit…"
        bouton={
          editable
            ? { libelle: "Nouveau produit", onClick: () => setEdition("nouveau") }
            : undefined
        }
      />
      <Erreur message={produits.erreur ?? message} />
      <Info message={info} />
      <Tableau>
        <thead>
          <tr>
            <Th>Produit</Th>
            <Th>Médicament</Th>
            <Th>Conditionnement</Th>
            <Th className="w-24 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visibles.map((p) => {
            const cond = p.conditionnementId ? condParId.get(p.conditionnementId) : undefined;
            const pres = p.presentationId ? presParId.get(p.presentationId) : undefined;
            return (
              <tr key={p.id} className="hover:bg-teal-50/40 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{p.nomCommercial}</div>
                      <div className="text-xs text-gray-500">
                        {pres ? libelleDe(pres) : "Présentation non précisée"}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  {p.medicamentId ? (
                    (nomMed.get(p.medicamentId) ?? `#${p.medicamentId}`)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td>
                  {p.conditionnementId ? (
                    <div>
                      <div className="font-medium text-gray-900">
                        {cond ? libelleDe(cond) : `#${p.conditionnementId}`}
                      </div>
                      {cond && (
                        <div className="text-xs text-gray-500">{detailCond(cond, pres)}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td className="text-right">
                  {editable && (
                    <ActionsLigne
                      onModifier={() => setEdition(p)}
                      onSupprimer={() => supprimer(p)}
                    />
                  )}
                </Td>
              </tr>
            );
          })}
          {visibles.length === 0 && (
            <EtatVide
              colSpan={4}
              recherche={recherche}
              message="Le catalogue est vide. Créez le premier produit."
              icone={<Package className="w-6 h-6" />}
              action={
                editable
                  ? { libelle: "Nouveau produit", onClick: () => setEdition("nouveau") }
                  : undefined
              }
            />
          )}
        </tbody>
      </Tableau>
      {edition && (
        <TiroirProduit
          produit={edition === "nouveau" ? null : edition}
          meds={meds}
          condsBrut={condsBrut.items}
          presBrut={presBrut.items}
          onAller={onAller}
          onFermer={() => setEdition(null)}
          onTermine={() => {
            setEdition(null);
            produits.recharger();
            setInfo("Enregistré.");
          }}
        />
      )}
    </div>
  );
};

/* ================================================================== *
 * Navigation : sidebar groupée (desktop) + menu déroulant (mobile)
 * ================================================================== */
interface OngletDef {
  id: string;
  libelle: string;
  icone: React.ReactNode;
}

const GROUPES: { titre: string; items: OngletDef[] }[] = [
  {
    titre: "Produits",
    items: [
      { id: "produits", libelle: "Produits", icone: <Pill className={ic} /> },
      { id: "medicaments", libelle: "Médicaments", icone: <Pill className={ic} /> },
    ],
  },
  {
    titre: "Composition",
    items: [
      { id: "principes", libelle: "Principes actifs", icone: <FlaskConical className={ic} /> },
      { id: "familles", libelle: "Familles", icone: <Layers className={ic} /> },
    ],
  },
  {
    titre: "Présentation",
    items: [
      { id: "presentations", libelle: "Présentations", icone: <ClipboardList className={ic} /> },
      { id: "conditionnements", libelle: "Conditionnements", icone: <Package className={ic} /> },
      { id: "formes", libelle: "Formes", icone: <Pill className={ic} /> },
      { id: "voies", libelle: "Voies", icone: <Pill className={ic} /> },
      { id: "unites", libelle: "Unités de mesure", icone: <FlaskConical className={ic} /> },
    ],
  },
];

const TOUS_ONGLETS: OngletDef[] = GROUPES.flatMap((g) => g.items);
const titreOnglet = (id: string) => TOUS_ONGLETS.find((o) => o.id === id)?.libelle ?? "";

const NavigationCatalogue: React.FC<{ onglet: string; setOnglet: (id: string) => void }> = ({
  onglet,
  setOnglet,
}) => {
  const [menuMobile, setMenuMobile] = useState(false);

  const Item: React.FC<{ o: OngletDef; onClick: () => void }> = ({ o, onClick }) => {
    const actif = onglet === o.id;
    return (
      <button
        onClick={onClick}
        aria-current={actif ? "page" : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition text-left ${
          actif
            ? "bg-teal-50 text-teal-900 font-medium ring-1 ring-teal-200"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <span className={actif ? "text-teal-700" : "text-gray-400"}>{o.icone}</span>
        <span className="flex-1 truncate">{o.libelle}</span>
        {actif && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
      </button>
    );
  };

  return (
    <>
      {/* Desktop : sidebar */}
      <aside className="hidden lg:block w-[240px] shrink-0">
        <div className="sticky top-4 space-y-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3">
            Catalogue
          </div>
          {GROUPES.map((groupe) => (
            <div key={groupe.titre} className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-3 pb-0.5">
                {groupe.titre}
              </div>
              <nav className="space-y-0.5">
                {groupe.items.map((o) => (
                  <Item key={o.id} o={o} onClick={() => setOnglet(o.id)} />
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile : bouton + menu déroulant */}
      <div className="lg:hidden relative">
        <button
          onClick={() => setMenuMobile((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition"
          aria-expanded={menuMobile}
        >
          <span className="text-teal-700">{TOUS_ONGLETS.find((o) => o.id === onglet)?.icone}</span>
          <span className="flex-1 text-left font-medium text-gray-900">{titreOnglet(onglet)}</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${menuMobile ? "rotate-180" : ""}`}
          />
        </button>

        {menuMobile && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuMobile(false)} />
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-[70vh] overflow-y-auto">
              {GROUPES.map((groupe, idx) => (
                <div key={groupe.titre} className={idx > 0 ? "border-t border-gray-100" : ""}>
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {groupe.titre}
                  </div>
                  <div className="pb-1">
                    {groupe.items.map((o) => (
                      <Item
                        key={o.id}
                        o={o}
                        onClick={() => {
                          setOnglet(o.id);
                          setMenuMobile(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ *
 * Fil d'Ariane
 * ------------------------------------------------------------------ */
const FilAriane: React.FC<{ onglet: string }> = ({ onglet }) => {
  const groupe = GROUPES.find((g) => g.items.some((o) => o.id === onglet));
  return (
    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
      <span>Catalogue</span>
      {groupe && (
        <>
          <span>›</span>
          <span>{groupe.titre}</span>
        </>
      )}
      <span>›</span>
      <span className="text-gray-700 font-medium">{titreOnglet(onglet)}</span>
    </div>
  );
};

/* ================================================================== *
 * Panneau principal
 * ================================================================== */
export const PanneauPharmacieCatalogue: React.FC<{ mode: ModeAffichage }> = ({ mode }) => {
  const [onglet, setOnglet] = useState("produits");
  const editable = mode === "edition";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Catalogue</h2>
        <FilAriane onglet={onglet} />
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">
        <NavigationCatalogue onglet={onglet} setOnglet={setOnglet} />

        <div className="flex-1 min-w-0 mt-4 lg:mt-0">
          {onglet === "produits" && <PanneauProduits editable={editable} onAller={setOnglet} />}
          {onglet === "medicaments" && (
            <PanneauMedicaments editable={editable} onAller={setOnglet} />
          )}
          {onglet !== "produits" && onglet !== "medicaments" && (
            <PanneauReference
              key={onglet}
              config={REFERENCES[onglet]}
              editable={editable}
              onAller={setOnglet}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PanneauPharmacieCatalogue;
