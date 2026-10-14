// stock-commun/FormulaireFournisseur.tsx
import { useState } from "react";
import { stockApi, messageErreur } from "./api";
import type * as T from "./types";

type Props = {
  onCree: (f: T.Fournisseur) => void; // pour recharger la liste / sélectionner le nouveau
  onAnnuler: () => void;
};

export function FormulaireFournisseur({ onCree, onAnnuler }: Props) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = async () => {
    if (!nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const cree = await stockApi.creerFournisseur({
        nom: nom.trim(),
        telephone: telephone.trim() || null,
        email: email.trim() || null,
        adresse: adresse.trim() || null,
      });
      onCree(cree as T.Fournisseur);
    } catch (e) {
      setErreur(messageErreur(e, "Impossible de créer le fournisseur."));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div>
      <input placeholder="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input
        placeholder="Téléphone"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
      />
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
      {erreur && <p role="alert">{erreur}</p>}
      <button onClick={valider} disabled={enCours}>
        Enregistrer
      </button>
      <button onClick={onAnnuler} disabled={enCours}>
        Annuler
      </button>
    </div>
  );
}
