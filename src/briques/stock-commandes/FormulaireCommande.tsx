// stock-commandes/FormulaireCommande.tsx
import React, { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Minus, Package, Plus, Search, Trash2, Truck } from "lucide-react";
import { stockApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Bouton, Erreur } from "../stock-commun/ui";
import type { UniteStock } from "../stock-commun/types";

/** Une commande se passe toujours en boîtes : le conditionnement est celui du produit. */
const UNITE_COMMANDE: UniteStock = "boite";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40";
const CHAMP =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600";

interface Ligne {
  cle: string;
  produitId: number | "";
  qte: number;
}

let compteur = 0;
const vide = (): Ligne => ({ cle: `l${++compteur}`, produitId: "", qte: 1 });

interface ProduitOption {
  id: number;
  nomCommercial: string;
}

/** Liste déroulante de produits avec recherche ; les produits déjà pris par une autre ligne sont grisés. */
const SelecteurProduit: React.FC<{
  produits: ProduitOption[];
  valeur: number | "";
  indisponibles: Set<number>;
  onChange: (id: number) => void;
}> = ({ produits, valeur, indisponibles, onChange }) => {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");
  const choisi = produits.find((p) => p.id === valeur);
  const q = requete.trim().toLowerCase();
  const filtres = produits.filter((p) => p.nomCommercial.toLowerCase().includes(q));
  const fermer = () => {
    setOuvert(false);
    setRequete("");
  };

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        className={`${CHAMP} flex items-center gap-2 text-left`}
      >
        <Package className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
        <span
          className={`flex-1 truncate ${choisi ? "font-medium text-gray-900" : "text-gray-400"}`}
        >
          {choisi ? choisi.nomCommercial : "Choisir un produit"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
      </button>

      {ouvert && (
        <>
          <div className="fixed inset-0 z-10" onClick={fermer} />
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  autoFocus
                  value={requete}
                  onChange={(e) => setRequete(e.target.value)}
                  placeholder="Rechercher un produit…"
                  aria-label="Rechercher un produit"
                  className={`${CHAMP} pl-8`}
                />
              </div>
            </div>
            <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
              {filtres.map((p) => {
                const pris = indisponibles.has(p.id) && p.id !== valeur;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={pris}
                      role="option"
                      aria-selected={p.id === valeur}
                      onClick={() => {
                        onChange(p.id);
                        fermer();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <span className="flex-1 truncate">{p.nomCommercial}</span>
                      {pris && <span className="text-xs text-gray-500">déjà ajouté</span>}
                      {p.id === valeur && (
                        <Check className="h-4 w-4 text-teal-700" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
              {filtres.length === 0 && (
                <li className="px-3 py-3 text-sm text-gray-500">Aucun produit trouvé.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

/** Quantité en boîtes : boutons − / + et saisie directe. */
const Quantite: React.FC<{ valeur: number; onChange: (n: number) => void; libelle: string }> = ({
  valeur,
  onChange,
  libelle,
}) => (
  <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
    <button
      type="button"
      aria-label={`Une boîte de moins — ${libelle}`}
      disabled={valeur <= 1}
      onClick={() => onChange(Math.max(1, valeur - 1))}
      className={`p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30 ${FOCUS}`}
    >
      <Minus className="h-4 w-4" />
    </button>
    <input
      type="number"
      min={1}
      step={1}
      value={valeur || ""}
      aria-label={`Nombre de boîtes — ${libelle}`}
      onChange={(e) => onChange(Math.floor(Number(e.target.value)))}
      onBlur={() => valeur < 1 && onChange(1)}
      className="w-14 border-x border-gray-200 py-2 text-center text-sm tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
    <button
      type="button"
      aria-label={`Une boîte de plus — ${libelle}`}
      onClick={() => onChange(valeur + 1)}
      className={`p-2 text-gray-600 hover:bg-gray-50 ${FOCUS}`}
    >
      <Plus className="h-4 w-4" />
    </button>
  </div>
);

export const FormulaireCommande: React.FC<{
  siteId: number;
  onTermine: () => void;
  onAllerFournisseurs?: () => void;
}> = ({ siteId, onTermine, onAllerFournisseurs }) => {
  const fournisseurs = useListe(stockApi.fournisseurs);
  const produits = useListe(stockApi.produits);
  const [fournisseurId, setFournisseurId] = useState<number | "">("");
  const [lignes, setLignes] = useState<Ligne[]>([vide()]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const finListe = useRef<HTMLDivElement>(null);

  const maj = (cle: string, c: Partial<Ligne>) =>
    setLignes((p) => p.map((l) => (l.cle === cle ? { ...l, ...c } : l)));

  const valides = lignes.filter((l) => l.produitId && l.qte > 0);
  const totalBoites = valides.reduce((s, l) => s + l.qte, 0);
  const pris = useMemo(
    () => new Set(lignes.map((l) => l.produitId).filter((x): x is number => x !== "")),
    [lignes],
  );

  const ajouterLigne = () => {
    setLignes((p) => [...p, vide()]);
    // laisse le temps au rendu avant de faire défiler jusqu'à la nouvelle ligne
    setTimeout(
      () => finListe.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      50,
    );
  };

  const controler = (): string | null => {
    if (!fournisseurId) return "Choisissez un fournisseur.";
    if (valides.length === 0) return "Ajoutez au moins un produit avec une quantité.";
    if (valides.some((l) => !Number.isInteger(l.qte)))
      return "Le nombre de boîtes doit être un entier.";
    if (new Set(valides.map((l) => l.produitId)).size !== valides.length)
      return "Un produit ne peut apparaître qu’une seule fois.";
    return null;
  };

  const enregistrer = async () => {
    const e = controler();
    if (e) return setErreur(e);
    setOccupe(true);
    setErreur(null);
    try {
      await stockApi.creerCommande({
        fournisseurId: Number(fournisseurId),
        siteId,
        details: valides.map((l) => ({
          produitId: Number(l.produitId),
          qte: l.qte,
          unite: UNITE_COMMANDE,
        })),
      });
      onTermine();
    } catch (err) {
      setErreur(messageErreur(err, "La commande n'a pas pu être enregistrée."));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Fournisseur */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs text-white">
            1
          </span>
          Fournisseur
        </h4>
        <div className="relative">
          <Truck
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-700"
            aria-hidden="true"
          />
          <select
            value={fournisseurId}
            aria-label="Fournisseur"
            onChange={(e) => setFournisseurId(e.target.value ? Number(e.target.value) : "")}
            className={`${CHAMP} appearance-none pl-9 pr-9`}
          >
            <option value="">Choisir un fournisseur</option>
            {fournisseurs.items.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
        </div>
        {fournisseurs.erreur && <p className="text-xs text-red-600">{fournisseurs.erreur}</p>}
        {onAllerFournisseurs && (
          <p className="text-xs text-gray-500">
            Fournisseur absent de la liste ?{" "}
            <button type="button" onClick={onAllerFournisseurs} className="text-teal-700 underline">
              Ajoutez-le dans l'onglet Fournisseurs
            </button>
            .
          </p>
        )}
      </section>

      {/* 2. Produits */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs text-white">
              2
            </span>
            Produits à commander
          </h4>
          <span className="text-xs text-gray-500">Quantités en boîtes</span>
        </div>

        <ul className="space-y-2">
          {lignes.map((l) => {
            const nom =
              produits.items.find((p) => p.id === l.produitId)?.nomCommercial ?? "produit";
            return (
              <li
                key={l.cle}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2"
              >
                <SelecteurProduit
                  produits={produits.items}
                  valeur={l.produitId}
                  indisponibles={pris}
                  onChange={(id) => maj(l.cle, { produitId: id })}
                />
                <Quantite valeur={l.qte} libelle={nom} onChange={(n) => maj(l.cle, { qte: n })} />
                <button
                  type="button"
                  aria-label={`Retirer la ligne ${nom}`}
                  onClick={() => setLignes((p) => p.filter((x) => x.cle !== l.cle))}
                  disabled={lignes.length === 1}
                  className={`rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent ${FOCUS}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <div ref={finListe} />

        <button
          type="button"
          onClick={ajouterLigne}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-600 hover:border-teal-600 hover:bg-teal-50/50 hover:text-teal-800 ${FOCUS}`}
        >
          <Plus className="h-4 w-4" />
          Ajouter un produit
        </button>
      </section>

      <p className="text-xs text-gray-500">
        La péremption, les prix et le n° de facture se saisissent à la réception de la commande.
      </p>

      <Erreur message={erreur} />

      {/* Pied : récapitulatif + action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-gray-600" aria-live="polite">
          <span className="font-semibold tabular-nums text-gray-900">{valides.length}</span> produit
          {valides.length > 1 ? "s" : ""}
          {" · "}
          <span className="font-semibold tabular-nums text-gray-900">{totalBoites}</span> boîte
          {totalBoites > 1 ? "s" : ""}
        </p>
        <Bouton variante="primaire" disabled={occupe} onClick={enregistrer}>
          {occupe ? "Enregistrement…" : "Enregistrer la commande"}
        </Bouton>
      </div>
    </div>
  );
};
