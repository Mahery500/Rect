/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Users, ShieldCheck, Lock, Eye, EyeOff, Sparkles, Check, AlertCircle } from "lucide-react";
import { Modale } from "@/noyau/ui/Modale";
import { ActionsFormulaire } from "@/noyau/ui/ActionsFormulaire";
import {
  NouveauCompteAdminInput,
  NouveauComptePersonnelInput,
  ROLES_PERSONNEL,
} from "../modele/utilisateur.types";

export interface FormulaireUtilisateurModaleProps {
  ouvert: boolean;
  onFermer: () => void;
  onCreerAdmin: (saisie: NouveauCompteAdminInput) => Promise<boolean>;
  onCreerPersonnel: (saisie: NouveauComptePersonnelInput) => Promise<boolean>;
}

// Regex exacte imposée par le backend Symfony (CreateStaffRequest / ResetPasswordRequest)
const REGEX_MDP_SYMFONY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export const FormulaireUtilisateurModale: React.FC<FormulaireUtilisateurModaleProps> = ({
  ouvert,
  onFermer,
  onCreerAdmin,
  onCreerPersonnel,
}) => {
  const [typeCompte, setTypeCompte] = useState<"personnel" | "admin">("personnel");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<string>("ROLE_MEDECIN");
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreurValidation, setErreurValidation] = useState<string | null>(null);

  const suggererLogin = (nouveauPrenom: string, nouveauNom: string) => {
    const p = nouveauPrenom
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const n = nouveauNom
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (p && n) {
      setLogin(`${p}.${n}`);
    } else if (p) {
      setLogin(p);
    } else if (n) {
      setLogin(n);
    }
  };

  const genererMotDePasseConforme = () => {
    const minuscules = "abcdefghjkmnpqrstuvwxyz";
    const majuscules = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const chiffres = "23456789";
    const speciaux = "@$!%*?&";

    // Assurer au moins 1 caractère de chaque classe exigée par Symfony
    let mdp = "";
    mdp += majuscules.charAt(Math.floor(Math.random() * majuscules.length));
    mdp += minuscules.charAt(Math.floor(Math.random() * minuscules.length));
    mdp += minuscules.charAt(Math.floor(Math.random() * minuscules.length));
    mdp += minuscules.charAt(Math.floor(Math.random() * minuscules.length));
    mdp += speciaux.charAt(Math.floor(Math.random() * speciaux.length));
    mdp += chiffres.charAt(Math.floor(Math.random() * chiffres.length));
    mdp += chiffres.charAt(Math.floor(Math.random() * chiffres.length));
    mdp += chiffres.charAt(Math.floor(Math.random() * chiffres.length));
    mdp += speciaux.charAt(Math.floor(Math.random() * speciaux.length));

    setMotDePasse(mdp);
    setAfficherMdp(true);
    setErreurValidation(null);
  };

  const handlePrenomChange = (val: string) => {
    setPrenom(val);
    if (!login || login.includes(".")) {
      suggererLogin(val, nom);
    }
  };

  const handleNomChange = (val: string) => {
    setNom(val);
    if (!login || login.includes(".")) {
      suggererLogin(prenom, val);
    }
  };

  const reinitialiser = () => {
    setPrenom("");
    setNom("");
    setLogin("");
    setEmail("");
    setTelephone("");
    setMotDePasse("");
    setRole("ROLE_MEDECIN");
    setErreurValidation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurValidation(null);

    const loginNettoye = login.trim().toLowerCase();
    const mdpNettoye = motDePasse.trim();

    if (!loginNettoye) {
      setErreurValidation("L'identifiant de connexion est obligatoire.");
      return;
    }

    if (mdpNettoye.length < 8) {
      setErreurValidation("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    if (!REGEX_MDP_SYMFONY.test(mdpNettoye)) {
      setErreurValidation(
        "Le mot de passe doit contenir au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial parmi @$!%*?&.",
      );
      return;
    }

    const emailNettoye = email.trim();
    if (emailNettoye && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNettoye)) {
      setErreurValidation("L'adresse email est invalide.");
      return;
    }

    setEnCours(true);
    try {
      let succes = false;
      if (typeCompte === "admin") {
        if (!emailNettoye) {
          setErreurValidation("L'adresse email est requise pour un administrateur.");
          setEnCours(false);
          return;
        }
        succes = await onCreerAdmin({
          type: "admin",
          login: loginNettoye,
          email: emailNettoye,
          motDePasse: mdpNettoye,
        });
      } else {
        const prenomNettoye = prenom.trim();
        const nomNettoye = nom.trim();
        if (!prenomNettoye || !nomNettoye) {
          setErreurValidation("Le prénom et le nom sont requis pour le personnel.");
          setEnCours(false);
          return;
        }
        succes = await onCreerPersonnel({
          type: "personnel",
          prenom: prenomNettoye,
          nom: nomNettoye,
          login: loginNettoye,
          motDePasse: mdpNettoye,
          role,
          email: emailNettoye || undefined,
          telephone: telephone.trim() || undefined,
        });
      }

      if (succes) {
        reinitialiser();
        onFermer();
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modale
      ouvert={ouvert}
      onFermer={enCours ? () => {} : onFermer}
      titre={
        typeCompte === "admin" ? "Nouveau Compte Administrateur" : "Nouveau Membre du Personnel"
      }
      largeurMax="md"
      enfants={
        <form id="form-nouvel-utilisateur" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {erreurValidation && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {erreurValidation}
            </div>
          )}

          {/* Sélecteur de type de compte */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setTypeCompte("personnel")}
              className={`py-2 px-3 rounded-md text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                typeCompte === "personnel"
                  ? "bg-white text-emerald-700 shadow-xs font-bold border border-emerald-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Personnel Soignant</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeCompte("admin")}
              className={`py-2 px-3 rounded-md text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                typeCompte === "admin"
                  ? "bg-white text-purple-700 shadow-xs font-bold border border-purple-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Administrateur</span>
            </button>
          </div>

          {typeCompte === "personnel" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Prénom *</label>
                <input
                  type="text"
                  required
                  placeholder="EX: Jean"
                  value={prenom}
                  onChange={(e) => handlePrenomChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  placeholder="EX: Rakoto"
                  value={nom}
                  onChange={(e) => handleNomChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Identifiant de connexion (login) *
            </label>
            <input
              type="text"
              required
              placeholder="jean.rakoto"
              value={login}
              onChange={(e) => setLogin(e.target.value.toLowerCase().trim())}
              className="w-full font-mono bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Mot de passe temporaire *</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={genererMotDePasseConforme}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition"
                >
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>Générer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAfficherMdp(!afficherMdp)}
                  className="text-[11px] text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  {afficherMdp ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type={afficherMdp ? "text" : "password"}
                required
                minLength={8}
                placeholder="Ex: Asina@2026!"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full font-mono bg-white border border-slate-300 rounded-lg p-2 pr-9 text-xs focus:outline-hidden focus:border-asina-500"
              />
              <button
                type="button"
                onClick={() => setAfficherMdp(!afficherMdp)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {afficherMdp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Règles de complexité imposées par Symfony */}
            <div className="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-700">Règles de sécurité backend :</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span
                  className={
                    motDePasse.length >= 8 ? "text-emerald-700 font-medium" : "text-slate-500"
                  }
                >
                  {motDePasse.length >= 8 ? "✓" : "•"} 8 caractères minimum
                </span>
                <span
                  className={
                    /[A-Z]/.test(motDePasse) ? "text-emerald-700 font-medium" : "text-slate-500"
                  }
                >
                  {/[A-Z]/.test(motDePasse) ? "✓" : "•"} 1 majuscule (A-Z)
                </span>
                <span
                  className={
                    /[a-z]/.test(motDePasse) ? "text-emerald-700 font-medium" : "text-slate-500"
                  }
                >
                  {/[a-z]/.test(motDePasse) ? "✓" : "•"} 1 minuscule (a-z)
                </span>
                <span
                  className={
                    /\d/.test(motDePasse) ? "text-emerald-700 font-medium" : "text-slate-500"
                  }
                >
                  {/\d/.test(motDePasse) ? "✓" : "•"} 1 chiffre (0-9)
                </span>
                <span
                  className={
                    /[@$!%*?&]/.test(motDePasse)
                      ? "text-emerald-700 font-medium col-span-2"
                      : "text-slate-500 col-span-2"
                  }
                >
                  {/[@$!%*?&]/.test(motDePasse) ? "✓" : "•"} 1 caractère spécial parmi @ $ ! % * ? &
                </span>
              </div>
            </div>
          </div>

          {typeCompte === "personnel" ? (
            <>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Fonction / Rôle *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500 font-medium text-slate-800"
                >
                  {ROLES_PERSONNEL.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.libelle} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Email professionnel
                  </label>
                  <input
                    type="email"
                    placeholder="jean.rakoto@asina.mg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="+261 34 00 000 00"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Adresse email officielle *
              </label>
              <input
                type="email"
                required
                placeholder="admin@asina-medical.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-hidden focus:border-asina-500"
              />
              <div className="mt-2.5 p-3 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-700 shrink-0" />
                <span>
                  Le rôle <code>ROLE_ADMIN</code> sera attribué automatiquement avec accès illimité.
                </span>
              </div>
            </div>
          )}
        </form>
      }
      pied={
        <div className="w-full">
          <ActionsFormulaire
            idFormulaire="form-nouvel-utilisateur"
            onAnnuler={onFermer}
            enCours={enCours}
            desactive={enCours}
            labelValider={typeCompte === "admin" ? "Créer l'administrateur" : "Créer l'utilisateur"}
          />
        </div>
      }
    />
  );
};
