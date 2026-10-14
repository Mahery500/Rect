// stock-commandes/PanneauFournisseurs.tsx
import React, { useState } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, Truck } from "lucide-react";
import { stockApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Bouton, Erreur, Modal } from "../stock-commun/ui";
import type { Fournisseur } from "../stock-commun/types";

type FournisseurComplet = Fournisseur & {
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
};

const CHAMP =
  "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600";

const FormulaireFournisseur: React.FC<{
  item: FournisseurComplet | null;
  onTermine: () => void;
}> = ({ item, onTermine }) => {
  const [nom, setNom] = useState(item?.nom ?? "");
  const [telephone, setTelephone] = useState(item?.telephone ?? "");
  const [email, setEmail] = useState(item?.email ?? "");
  const [adresse, setAdresse] = useState(item?.adresse ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const valider = async () => {
    if (!nom.trim()) return setErreur("Saisissez le nom du fournisseur.");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setErreur("L'adresse e-mail n'est pas valide.");
    const payload = {
      nom: nom.trim(),
      telephone: telephone.trim() || null,
      email: email.trim() || null,
      adresse: adresse.trim() || null,
    };
    setOccupe(true);
    setErreur(null);
    try {
      if (item) await stockApi.modifierFournisseur(item.id, payload);
      else await stockApi.creerFournisseur(payload);
      onTermine();
    } catch (e) {
      setErreur(messageErreur(e, "Le fournisseur n'a pas pu être enregistré."));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Nom</span>
        <input
          autoFocus
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex. Pharmacie Centrale"
          className={CHAMP}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Téléphone</span>
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="Ex. 034 00 000 00"
            className={CHAMP}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@exemple.mg"
            className={CHAMP}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Adresse</span>
        <textarea
          rows={2}
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          className={CHAMP}
        />
      </label>
      <Erreur message={erreur} />
      <div className="flex justify-end">
        <Bouton variante="primaire" disabled={occupe} onClick={valider}>
          {item ? "Enregistrer" : "Créer le fournisseur"}
        </Bouton>
      </div>
    </div>
  );
};

export const PanneauFournisseurs: React.FC<{ editable: boolean }> = ({ editable }) => {
  const { items, erreur, recharger } = useListe(stockApi.fournisseurs);
  const fournisseurs = items as FournisseurComplet[];
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState<FournisseurComplet | "nouveau" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const q = recherche.trim().toLowerCase();
  const visibles = fournisseurs.filter((f) =>
    [f.nom, f.telephone, f.email, f.adresse].some((v) => (v ?? "").toLowerCase().includes(q)),
  );

  const supprimer = async (f: FournisseurComplet) => {
    if (!window.confirm(`Supprimer « ${f.nom} » ?`)) return;
    setMessage(null);
    try {
      await stockApi.supprimerFournisseur(f.id);
      await recharger();
    } catch (e) {
      setMessage(
        messageErreur(e, "Suppression impossible (fournisseur utilisé par des commandes ?)."),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-500">
          {fournisseurs.length} fournisseur{fournisseurs.length > 1 ? "s" : ""}
        </p>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un fournisseur…"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          />
        </div>
        {editable && (
          <Bouton variante="primaire" onClick={() => setEdition("nouveau")}>
            <Plus className="w-4 h-4 inline mr-1" />
            Nouveau fournisseur
          </Bouton>
        )}
      </div>

      <Erreur message={erreur ?? message} />

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-3 font-medium">Fournisseur</th>
              <th className="p-3 font-medium">Téléphone</th>
              <th className="p-3 font-medium">E-mail</th>
              <th className="p-3 font-medium">Adresse</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.id} className="border-t hover:bg-gray-50/60">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{f.nom}</span>
                  </div>
                </td>
                <td className="p-3">
                  {f.telephone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {f.telephone}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  {f.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {f.email}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 max-w-xs">
                  {f.adresse ? (
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                      {f.adresse}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  {editable && (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setEdition(f)}
                        aria-label="Modifier"
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => supprimer(f)}
                        aria-label="Supprimer"
                        className="p-2 hover:bg-red-50 text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">
                  {recherche
                    ? "Aucun fournisseur ne correspond à cette recherche."
                    : "Aucun fournisseur. Ajoutez-en un pour pouvoir passer commande."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {edition && (
        <Modal
          titre={edition === "nouveau" ? "Nouveau fournisseur" : "Modifier le fournisseur"}
          onFermer={() => setEdition(null)}
        >
          <FormulaireFournisseur
            item={edition === "nouveau" ? null : edition}
            onTermine={() => {
              setEdition(null);
              recharger();
            }}
          />
        </Modal>
      )}
    </div>
  );
};
export default PanneauFournisseurs;
