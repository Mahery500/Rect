/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNotifier } from "@/noyau/notifications";
import { messageErreur } from "@/noyau/utils/erreur";
import {
  UtilisateurCompte,
  NouveauCompteAdminInput,
  NouveauComptePersonnelInput,
  ModificationCompteInput,
} from "../modele/utilisateur.types";
import { utilisateursApi } from "../api/utilisateurs.api";

export function useUtilisateurs() {
  const notif = useNotifier();

  const [comptes, setComptes] = useState<UtilisateurCompte[]>([]);
  const [chargement, setChargement] = useState<boolean>(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Filtres
  const [recherche, setRecherche] = useState<string>("");
  const [filtreType, setFiltreType] = useState<"tous" | "personnel" | "admin">("tous");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | "actifs" | "inactifs">("tous");
  const [filtreRole, setFiltreRole] = useState<string>("tous");

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const liste = await utilisateursApi.lister();
      setComptes(liste);
    } catch (err) {
      const msg = messageErreur(err, "Impossible de charger la liste des utilisateurs.");
      setErreur(msg);
      notif.erreur(msg);
    } finally {
      setChargement(false);
    }
  }, [notif]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  // Filtrage combiné en mémoire des données chargées depuis l'API
  const comptesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return comptes.filter((c) => {
      // Filtre catégorie de compte
      if (filtreType === "admin" && c.typeCompte !== "admin") return false;
      if (filtreType === "personnel" && c.typeCompte !== "personnel") return false;

      // Filtre statut
      if (filtreStatut === "actifs" && !c.actif) return false;
      if (filtreStatut === "inactifs" && c.actif) return false;

      // Filtre rôle
      if (filtreRole !== "tous" && !c.roles.includes(filtreRole)) return false;

      // Recherche textuelle
      if (q) {
        const correspondNom = c.nom.toLowerCase().includes(q);
        const correspondPrenom = c.prenom.toLowerCase().includes(q);
        const correspondLogin = c.login.toLowerCase().includes(q);
        const correspondEmail = c.email.toLowerCase().includes(q);
        const correspondRole = c.libelleRole.toLowerCase().includes(q);
        if (
          !correspondNom &&
          !correspondPrenom &&
          !correspondLogin &&
          !correspondEmail &&
          !correspondRole
        ) {
          return false;
        }
      }
      return true;
    });
  }, [comptes, recherche, filtreType, filtreStatut, filtreRole]);

  const creerAdmin = useCallback(
    async (saisie: NouveauCompteAdminInput): Promise<boolean> => {
      try {
        const nouvelAdmin = await utilisateursApi.creerAdmin(saisie);
        setComptes((prev) =>
          [...prev, nouvelAdmin].sort((a, b) =>
            (a.nom || a.login).localeCompare(b.nom || b.login, "fr"),
          ),
        );
        notif.succes(`Compte administrateur « ${nouvelAdmin.login} » créé avec succès.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la création du compte administrateur."));
        return false;
      }
    },
    [notif],
  );

  const creerPersonnel = useCallback(
    async (saisie: NouveauComptePersonnelInput): Promise<boolean> => {
      try {
        const nouveauStaff = await utilisateursApi.creerPersonnel(saisie);
        setComptes((prev) =>
          [...prev, nouveauStaff].sort((a, b) =>
            (a.nom || a.login).localeCompare(b.nom || b.login, "fr"),
          ),
        );
        notif.succes(`Membre du personnel ${nouveauStaff.prenom} ${nouveauStaff.nom} enregistré.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la création du membre du personnel."));
        return false;
      }
    },
    [notif],
  );

  const modifierCompte = useCallback(
    async (id: number, saisie: ModificationCompteInput): Promise<boolean> => {
      const compte = comptes.find((c) => c.id === id);
      try {
        const modifie = await utilisateursApi.modifier(id, saisie, compte?.typeCompte ?? "admin");
        setComptes((prev) => prev.map((c) => (c.id === id ? { ...c, ...modifie } : c)));
        notif.succes(`Compte « ${modifie.login} » mis à jour avec succès.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la mise à jour du compte utilisateur."));
        return false;
      }
    },
    [comptes, notif],
  );

  const basculerStatut = useCallback(
    async (compte: UtilisateurCompte): Promise<boolean> => {
      const nouvelEtat = !compte.actif;
      try {
        await utilisateursApi.changerStatut(compte.id, nouvelEtat, compte.typeCompte);
        setComptes((prev) =>
          prev.map((c) => (c.id === compte.id ? { ...c, actif: nouvelEtat } : c)),
        );
        notif.info(
          nouvelEtat
            ? `Le compte « ${compte.login} » est désormais actif.`
            : `Le compte « ${compte.login} » a été désactivé.`,
        );
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Impossible de modifier le statut de ce compte."));
        return false;
      }
    },
    [notif],
  );

  const supprimerCompte = useCallback(
    async (id: number, login: string): Promise<boolean> => {
      const compte = comptes.find((c) => c.id === id);
      try {
        await utilisateursApi.supprimer(id, compte?.typeCompte ?? "admin");
        setComptes((prev) => prev.filter((c) => c.id !== id));
        notif.succes(`Compte « ${login} » supprimé avec succès.`);
        return true;
      } catch (err) {
        notif.erreur(messageErreur(err, "Échec de la suppression du compte sur le serveur."));
        return false;
      }
    },
    [comptes, notif],
  );

  const stats = useMemo(() => {
    const total = comptes.length;
    const personnel = comptes.filter((c) => c.typeCompte === "personnel").length;
    const admins = comptes.filter((c) => c.typeCompte === "admin").length;
    const actifs = comptes.filter((c) => c.actif).length;
    const inactifs = total - actifs;
    return { total, personnel, admins, actifs, inactifs };
  }, [comptes]);

  return {
    comptes: comptesFiltres,
    comptesTous: comptes,
    chargement,
    erreur,
    stats,
    recherche,
    setRecherche,
    filtreType,
    setFiltreType,
    filtreStatut,
    setFiltreStatut,
    filtreRole,
    setFiltreRole,
    recharger,
    creerAdmin,
    creerPersonnel,
    modifierCompte,
    basculerStatut,
    supprimerCompte,
  };
}
