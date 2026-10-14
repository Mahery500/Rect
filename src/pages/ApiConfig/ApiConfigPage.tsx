/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Database,
  RefreshCw,
  Code,
  CloudLightning,
  KeyRound,
  CheckCircle2,
  Layers,
  ArrowRightLeft,
  Server,
  Save,
  RotateCcw,
} from "lucide-react";
import { ASINAState } from "@/core/types";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  getStoredJwtToken,
  setStoredJwtToken,
  clearStoredAuth,
} from "@/core/http";
import { decodeJwt, isJwtExpired } from "@/core/http";
import { patientsRepository } from "@/modules/patients/infrastructure/patients.repository";
import { companiesRepository } from "@/modules/companies/infrastructure/companies.repository";
import { administrationApi } from "@/modules/administration/infrastructure/administration.api";

export interface ApiConfigPageProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
}

interface TargetedEndpoint {
  domain: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "CRUD";
  path: string;
  symfonyRoute: string;
  description: string;
  featureModule: string;
  liveCount?: number;
}

export const ApiConfigPage: React.FC<ApiConfigPageProps> = ({ state, updateState }) => {
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({ message: "", type: null });

  const token = getStoredJwtToken();
  const decodedPayload = token ? decodeJwt(token) : null;
  const isExpired = token ? isJwtExpired(token) : true;

  const [manualTokenInput, setManualTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<"endpoints" | "symfony_jwt" | "models">(
    "endpoints",
  );
  const [domainFilter, setDomainFilter] = useState<string>("all");

  // Enregistre l'URL cible de l'API Symfony
  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = apiUrl.replace(/\/+$/, "");
    setApiBaseUrl(cleanUrl);
    setApiUrl(cleanUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaultUrl = () => {
    const defaultUrl = "http://localhost:8000/api";
    setApiBaseUrl(defaultUrl);
    setApiUrl(defaultUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Synchronisation réelle des endpoints sans passer par une batterie de test
  const handleSyncData = async () => {
    setSyncLoading(true);
    setSyncStatus({ message: "", type: null });

    try {
      const [
        patientsRes,
        companiesRes,
        sitesRes,
        servicesRes,
        assignmentsRes,
        usersRes,
        staffsRes,
      ] = await Promise.allSettled([
        patientsRepository.findAll(), // GET /api/patients
        companiesRepository.findAll(), // GET /api/companies
        administrationApi.getSites(), // GET /api/sites
        administrationApi.getServices(), // GET /api/services
        administrationApi.getAssignments(), // GET /api/assignments
        administrationApi.getUsers(), // GET /api/users
        administrationApi.getStaffs(), // GET /api/staffs
      ]);

      let updatedUsers =
        usersRes.status === "fulfilled" &&
        Array.isArray(usersRes.value) &&
        usersRes.value.length > 0
          ? usersRes.value
          : state.User_;

      let updatedStaffProfiles = state.StaffProfile;

      if (staffsRes.status === "fulfilled" && staffsRes.value) {
        const { profiles, users: staffUsers } = staffsRes.value;
        if (profiles && profiles.length > 0) {
          const profileMap = new Map(updatedStaffProfiles.map((sp) => [sp.Id_staff_profile, sp]));
          profiles.forEach((p) => profileMap.set(p.Id_staff_profile, p));
          updatedStaffProfiles = Array.from(profileMap.values());
        }
        if (staffUsers && staffUsers.length > 0) {
          const usersMap = new Map(updatedUsers.map((u) => [u.Id_User, u]));
          staffUsers.forEach((su) => usersMap.set(su.Id_User, su));
          updatedUsers = Array.from(usersMap.values());
        }
      }

      updateState({
        Patient:
          patientsRes.status === "fulfilled" &&
          Array.isArray(patientsRes.value) &&
          patientsRes.value.length > 0
            ? patientsRes.value
            : state.Patient,
        Entreprise:
          companiesRes.status === "fulfilled" &&
          Array.isArray(companiesRes.value) &&
          companiesRes.value.length > 0
            ? companiesRes.value
            : state.Entreprise,
        Site:
          sitesRes.status === "fulfilled" &&
          Array.isArray(sitesRes.value) &&
          sitesRes.value.length > 0
            ? sitesRes.value
            : state.Site,
        Service:
          servicesRes.status === "fulfilled" &&
          Array.isArray(servicesRes.value) &&
          servicesRes.value.length > 0
            ? servicesRes.value
            : state.Service,
        Affectation:
          assignmentsRes.status === "fulfilled" &&
          Array.isArray(assignmentsRes.value) &&
          assignmentsRes.value.length > 0
            ? assignmentsRes.value
            : state.Affectation,
        User_: updatedUsers,
        StaffProfile: updatedStaffProfiles,
      });

      setSyncStatus({
        message: "Synchronisation réussie avec les endpoints Symfony.",
        type: "success",
      });
    } catch (e: any) {
      setSyncStatus({
        message: `Erreur lors de la synchronisation : ${e?.message || "Erreur réseau ou CORS"}`,
        type: "error",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleApplyManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    setStoredJwtToken(manualTokenInput.trim());
    setManualTokenInput("");
    setShowTokenInput(false);
  };

  // Liste exhaustive des 14 endpoints Symfony ciblés directement par ASINA
  const targetedEndpoints: TargetedEndpoint[] = [
    // Auth
    {
      domain: "Authentification",
      method: "POST",
      path: "/api/login",
      symfonyRoute: "_api_/login_post",
      description: "Génération du jeton JWT (LexikJWTAuthenticationBundle)",
      featureModule: "Écran de Connexion",
    },
    {
      domain: "Authentification",
      method: "POST",
      path: "/api/refresh",
      symfonyRoute: "_api_/refresh_post",
      description: "Renouvellement automatique du jeton de session JWT",
      featureModule: "Client HTTP (apiClient)",
    },
    {
      domain: "Authentification",
      method: "POST",
      path: "/api/logout",
      symfonyRoute: "_api_/logout_post",
      description: "Clôture de session et révocation du jeton côté backend",
      featureModule: "Déconnexion Utilisateur",
    },

    // Patients
    {
      domain: "Patients",
      method: "GET",
      path: "/api/patients",
      symfonyRoute: "api_patients_get_collection",
      description: "Récupération de la collection des dossiers patients",
      featureModule: "Réception & Recherche",
      liveCount: state.Patient.length,
    },
    {
      domain: "Patients",
      method: "POST",
      path: "/api/patients",
      symfonyRoute: "api_patients_post_collection",
      description: "Enregistrement nouveau dossier patient (Simple, Agent, Ayant-Droit)",
      featureModule: "Réception Dossiers",
    },
    {
      domain: "Patients",
      method: "PATCH",
      path: "/api/patients/{id}/checkup",
      symfonyRoute: "api_patients_checkup_patch_subresource",
      description: "Enregistrement du bilan clinique, constantes et conclusion d'aptitude",
      featureModule: "Consultation Médecin",
    },
    {
      domain: "Patients",
      method: "DELETE",
      path: "/api/patients/{id}",
      symfonyRoute: "api_patients_delete_item",
      description: "Suppression définitive d'un dossier patient",
      featureModule: "Réception & Recherche",
    },

    // Entreprises
    {
      domain: "Entreprises",
      method: "GET",
      path: "/api/companies",
      symfonyRoute: "api_companies_get_collection",
      description: "Liste des entreprises partenaires sous convention médicale",
      featureModule: "Administration & Facturation",
      liveCount: state.Entreprise.length,
    },
    {
      domain: "Entreprises",
      method: "POST",
      path: "/api/companies",
      symfonyRoute: "api_companies_post_collection",
      description: "Création d'une entreprise cliente ou partenaire",
      featureModule: "Administration Entreprises",
    },
    {
      domain: "Entreprises",
      method: "PUT",
      path: "/api/companies/{id}",
      symfonyRoute: "api_companies_put_item",
      description: "Mise à jour des coordonnées et de la convention entreprise",
      featureModule: "Administration Entreprises",
    },
    {
      domain: "Entreprises",
      method: "DELETE",
      path: "/api/companies/{id}",
      symfonyRoute: "api_companies_delete_item",
      description: "Suppression d'une entreprise partenaire",
      featureModule: "Administration Entreprises",
    },
    {
      domain: "Entreprises",
      method: "POST",
      path: "/api/companies/{id}/import-patients",
      symfonyRoute: "api_companies_import_patients_post_subresource",
      description: "Importation matricielle en masse des salariés d'une entreprise",
      featureModule: "Réception Import Massif",
    },

    // Utilisateurs
    {
      domain: "Utilisateurs",
      method: "GET",
      path: "/api/users",
      symfonyRoute: "api_users_get_collection",
      description: "Gestion des comptes avec filtres ?role=ROLE_ADMIN, ?isActive, ?page",
      featureModule: "Administration Utilisateurs",
      liveCount: state.User_.length,
    },
    {
      domain: "Utilisateurs",
      method: "POST",
      path: "/api/users",
      symfonyRoute: "api_users_post_collection",
      description: "Création d'un compte utilisateur ou administrateur",
      featureModule: "Administration Utilisateurs",
    },
    {
      domain: "Utilisateurs",
      method: "PUT",
      path: "/api/users/{id}",
      symfonyRoute: "api_users_put_item",
      description: "Modification du profil, rôles et activation du compte",
      featureModule: "Administration Utilisateurs",
    },
    {
      domain: "Utilisateurs",
      method: "DELETE",
      path: "/api/users/{id}",
      symfonyRoute: "api_users_delete_item",
      description: "Désactivation ou suppression d'un compte utilisateur",
      featureModule: "Administration Utilisateurs",
    },

    // Personnel soignant
    {
      domain: "Personnel Soignant",
      method: "GET",
      path: "/api/staffs",
      symfonyRoute: "api_staffs_get_collection",
      description: "Récupération du personnel médical (médecins, infirmiers) avec spécialités",
      featureModule: "Administration Staff",
      liveCount: state.StaffProfile.length,
    },
    {
      domain: "Personnel Soignant",
      method: "POST",
      path: "/api/staffs",
      symfonyRoute: "api_staffs_post_collection",
      description: "Enregistrement d'un profil soignant avec matricule STF",
      featureModule: "Administration Staff",
    },
    {
      domain: "Personnel Soignant",
      method: "PATCH",
      path: "/api/staffs/{id}",
      symfonyRoute: "api_staffs_patch_item",
      description: "Mise à jour partielle du profil médical",
      featureModule: "Administration Staff",
    },
    {
      domain: "Personnel Soignant",
      method: "DELETE",
      path: "/api/staffs/{id}",
      symfonyRoute: "api_staffs_delete_item",
      description: "Retrait d'un profil du personnel soignant",
      featureModule: "Administration Staff",
    },

    // Affectations
    {
      domain: "Affectations",
      method: "GET",
      path: "/api/assignments",
      symfonyRoute: "api_assignments_get_collection",
      description: "Cartographie des affectations du staff aux sites et services",
      featureModule: "Administration Affectations",
      liveCount: state.Affectation.length,
    },
    {
      domain: "Affectations",
      method: "POST",
      path: "/api/assignments",
      symfonyRoute: "api_assignments_post_collection",
      description: "Création d'une affectation soignant <-> site <-> service",
      featureModule: "Administration Affectations",
    },
    {
      domain: "Affectations",
      method: "PATCH",
      path: "/api/assignments/{id}",
      symfonyRoute: "api_assignments_patch_item",
      description: "Modification de la période ou du poste d'affectation",
      featureModule: "Administration Affectations",
    },
    {
      domain: "Affectations",
      method: "DELETE",
      path: "/api/assignments/{id}",
      symfonyRoute: "api_assignments_delete_item",
      description: "Clôture ou suppression d'une affectation",
      featureModule: "Administration Affectations",
    },

    // Sites
    {
      domain: "Structure Hospitalière",
      method: "GET",
      path: "/api/sites",
      symfonyRoute: "api_sites_get_collection",
      description: "Établissements, antennes et centres médicaux ASINA",
      featureModule: "Administration Sites",
      liveCount: state.Site.length,
    },
    {
      domain: "Structure Hospitalière",
      method: "POST",
      path: "/api/sites",
      symfonyRoute: "api_sites_post_collection",
      description: "Enregistrement d'un nouveau site hospitalier",
      featureModule: "Administration Sites",
    },
    {
      domain: "Structure Hospitalière",
      method: "DELETE",
      path: "/api/sites/{id}",
      symfonyRoute: "api_sites_delete_item",
      description: "Suppression d'un site médical",
      featureModule: "Administration Sites",
    },

    // Services
    {
      domain: "Structure Hospitalière",
      method: "GET",
      path: "/api/services",
      symfonyRoute: "api_services_get_collection",
      description: "Services et départements cliniques rattachés aux sites",
      featureModule: "Administration Services",
      liveCount: state.Service.length,
    },
    {
      domain: "Structure Hospitalière",
      method: "POST",
      path: "/api/services",
      symfonyRoute: "api_services_post_collection",
      description: "Création d'un service rattaché à un site",
      featureModule: "Administration Services",
    },
    {
      domain: "Structure Hospitalière",
      method: "DELETE",
      path: "/api/services/{id}",
      symfonyRoute: "api_services_delete_item",
      description: "Suppression d'un service clinique",
      featureModule: "Administration Services",
    },

    // Types de services & Actes
    {
      domain: "Nomenclatures",
      method: "GET",
      path: "/api/type-services",
      symfonyRoute: "api_type-services_get_collection",
      description: "Référentiel des types de services médicaux",
      featureModule: "Référentiels Cliniques",
    },
    {
      domain: "Nomenclatures",
      method: "GET",
      path: "/api/type_actes",
      symfonyRoute: "api_type_actes_get_collection",
      description: "Nomenclature et cotation des types d'actes médicaux",
      featureModule: "Référentiels Cliniques",
    },
  ];

  const domains = ["all", ...Array.from(new Set(targetedEndpoints.map((e) => e.domain)))];

  const filteredEndpoints =
    domainFilter === "all"
      ? targetedEndpoints
      : targetedEndpoints.filter((e) => e.domain === domainFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-sm">
              <CloudLightning className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Ciblage Direct des Endpoints Symfony API
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            L'application cible directement les 14 routes de votre backend Symfony (issues de{" "}
            <code>php bin/console debug:router</code>) avec injection automatique du jeton{" "}
            <strong>JWT Bearer</strong> et typage strict des requêtes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncData}
            disabled={syncLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
            <span>{syncLoading ? "Synchronisation..." : "Synchroniser les Données Réelles"}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner if any */}
      {syncStatus.type && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            syncStatus.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {syncStatus.type === "success" ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          ) : (
            <Server className="h-4.5 w-4.5 text-rose-600 shrink-0" />
          )}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Target Base URL Configuration */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Point d'Entrée API Ciblé (Symfony Base URL)
              </h3>
            </div>
            {savedSuccess && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> URL Enregistrée
              </span>
            )}
          </div>

          <form onSubmit={handleSaveUrl} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                URL racine du backend Symfony
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:8000/api"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px]">Raccourcis :</span>
              <button
                type="button"
                onClick={() => {
                  setApiUrl("http://localhost:8000/api");
                  setApiBaseUrl("http://localhost:8000/api");
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 2000);
                }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono transition cursor-pointer"
              >
                localhost:8000/api
              </button>
              <button
                type="button"
                onClick={() => {
                  setApiUrl("http://127.0.0.1:8000/api");
                  setApiBaseUrl("http://127.0.0.1:8000/api");
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 2000);
                }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono transition cursor-pointer"
              >
                127.0.0.1:8000/api
              </button>
              <button
                type="button"
                onClick={handleResetDefaultUrl}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[10px] transition cursor-pointer flex items-center gap-1 ml-auto"
              >
                <RotateCcw className="h-3 w-3" />
                Défaut
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
              Toutes les requêtes fonctionnelles (authentification, création de patients, fiches
              soignants, import massif, affectations) construisent leurs URLs à partir de cette
              adresse racine.
            </p>
          </form>
        </div>

        {/* Right: Active JWT Authentication Status */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Jeton JWT Actif (Lexik)</h3>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                token && !isExpired
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {token && !isExpired ? "Connecté" : token ? "Expiré" : "Non Authentifié"}
            </span>
          </div>

          {token && decodedPayload ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">
                    Utilisateur
                  </span>
                  <span className="font-semibold text-slate-800">
                    {decodedPayload.username || decodedPayload.email || "N/A"}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">
                    Expiration
                  </span>
                  <span className="font-mono text-slate-800">
                    {decodedPayload.exp
                      ? new Date(decodedPayload.exp * 1000).toLocaleTimeString()
                      : "Indéterminée"}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1">
                  Rôles Symfony
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(decodedPayload.roles) && decodedPayload.roles.length > 0 ? (
                    decodedPayload.roles.map((r: string) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono font-bold"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Aucun rôle explicite</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-center space-y-2">
              <KeyRound className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-semibold">Aucun jeton JWT en session</p>
              <p className="text-[11px] text-slate-400">
                Connectez-vous via l'écran de login pour obtenir un jeton valide délivré par{" "}
                <code>/api/login</code>.
              </p>
            </div>
          )}

          {/* Toggle manual token */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="text-slate-500 hover:text-indigo-600 text-[11px] font-semibold cursor-pointer"
            >
              {showTokenInput ? "Fermer la saisie manuelle" : "Saisir un jeton JWT manuellement"}
            </button>
            {token && (
              <button
                type="button"
                onClick={() => {
                  clearStoredAuth();
                  window.location.reload();
                }}
                className="text-rose-500 hover:underline text-[11px] font-semibold cursor-pointer"
              >
                Révoquer
              </button>
            )}
          </div>

          {showTokenInput && (
            <form onSubmit={handleApplyManualToken} className="space-y-2 pt-2">
              <textarea
                rows={2}
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="Coller ici le jeton JWT (eyJhbGciOi...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[10px] text-slate-800 focus:outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold cursor-pointer"
              >
                Appliquer le jeton
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Cartographie Complète des Endpoints Ciblés */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Cartographie des 14 Endpoints Symfony Ciblés
            </h3>
          </div>

          {/* Domain Filter Pills */}
          <div className="flex flex-wrap gap-1">
            {domains.map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => setDomainFilter(dom)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  domainFilter === dom
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {dom === "all" ? "Tous les domaines" : dom}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoints Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Méthode</th>
                <th className="p-3">Chemin Cible (Path)</th>
                <th className="p-3">Route Symfony (debug:router)</th>
                <th className="p-3">Description & Rôle</th>
                <th className="p-3">Composant Frontend ASINA</th>
                <th className="p-3 text-right">Données Actives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredEndpoints.map((ep, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="p-3 font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        ep.method === "GET"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : ep.method === "POST"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ep.method === "PUT"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : ep.method === "PATCH"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : ep.method === "DELETE"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900">{ep.path}</td>
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{ep.symfonyRoute}</td>
                  <td className="p-3 text-slate-700">{ep.description}</td>
                  <td className="p-3 text-slate-800 font-medium">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                      <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                      {ep.featureModule}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {ep.liveCount !== undefined ? (
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {ep.liveCount} enregistrement(s)
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide de Configuration Symfony */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Code className="h-4.5 w-4.5 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">
              Spécifications Techniques Backend Symfony
            </h3>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveDocTab("endpoints")}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${activeDocTab === "endpoints" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
            >
              Payloads & Schémas
            </button>
            <button
              type="button"
              onClick={() => setActiveDocTab("symfony_jwt")}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${activeDocTab === "symfony_jwt" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
            >
              LexikJWT & CORS
            </button>
          </div>
        </div>

        {activeDocTab === "endpoints" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">
                POST /api/staffs (Création Personnel)
              </span>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[10px] overflow-x-auto">
                {`POST /api/staffs
Content-Type: application/json
Authorization: Bearer <token>

{
  "prenom": "Jean",
  "nom": "RAKOTO",
  "login": "jean.rakoto",
  "password": "Password123!",
  "roles": ["ROLE_STAFF"]
}`}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">
                POST /api/assignments (Affectation)
              </span>
              <pre className="p-3 bg-slate-950 text-cyan-300 rounded-lg font-mono text-[10px] overflow-x-auto">
                {`POST /api/assignments
Content-Type: application/json
Authorization: Bearer <token>

{
  "staffId": 2,
  "serviceId": 1,
  "dateDebut": "2025-01-15T08:00:00Z",
  "dateFin": null,
  "estPrincipal": true
}`}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">POST /api/sites (Site Médical)</span>
              <pre className="p-3 bg-slate-950 text-amber-300 rounded-lg font-mono text-[10px] overflow-x-auto">
                {`POST /api/sites
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "SITE-TANA-01",
  "name": "Centre Médical Ankorondrano",
  "city": "Antananarivo",
  "address": "Zone Galaxy",
  "phone": "+261 20 22 000 00"
}`}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">
                POST /api/services (Service Clinique)
              </span>
              <pre className="p-3 bg-slate-950 text-violet-300 rounded-lg font-mono text-[10px] overflow-x-auto">
                {`POST /api/services
Content-Type: application/json
Authorization: Bearer <token>

{
  "siteId": 1,
  "typeServiceId": 2,
  "description": "Consultations Médecine du Travail"
}`}
              </pre>
            </div>
          </div>
        )}

        {activeDocTab === "symfony_jwt" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Pour connecter votre backend Symfony avec ASINA, assurez-vous que{" "}
              <strong>LexikJWTAuthenticationBundle</strong> et <strong>NelmioCorsBundle</strong>{" "}
              autorisent les requêtes :
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Sécurité (security.yaml)
                </span>
                <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed">
                  {`security:
    firewalls:
        login:
            pattern: ^/api/login
            stateless: true
            json_login:
                check_path: /api/login
                success_handler: lexik_jwt_authentication.handler.authentication_success
                failure_handler: lexik_jwt_authentication.handler.authentication_failure
        api:
            pattern: ^/api
            stateless: true
            jwt: ~`}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  CORS (nelmio_cors.yaml)
                </span>
                <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed">
                  {`nelmio_cors:
    defaults:
        allow_origin: ['*']
        allow_methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']
        allow_headers: ['Content-Type', 'Authorization', 'Accept']
        max_age: 3600`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiConfigPage;
