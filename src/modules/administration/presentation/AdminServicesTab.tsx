/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Layers,
  Hospital,
  Plus,
  Edit2,
  Trash2,
  Search,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Activity,
  FileText,
} from "lucide-react";
import { ASINAState, Site, Service, TypeService } from "@/core/types";
import {
  administrationApi,
  SiteInput,
  TypeServiceInput,
  ServiceInput,
} from "../infrastructure/administration.api";

interface AdminServicesTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

type SubTab = "sites" | "types" | "cartographie";

export default function AdminServicesTab({
  state,
  updateState,
  triggerNotification,
}: AdminServicesTabProps) {
  // Navigation interne
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("sites");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<number | "all">("all");

  // État local des TypeServices (si pas encore dans state)
  const [typeServices, setTypeServices] = useState<TypeService[]>(() => {
    return state.TypeService && state.TypeService.length > 0 ? state.TypeService : [];
  });

  // Modals d'édition / création
  const [siteModalOpen, setSiteModalOpen] = useState<boolean>(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [siteForm, setSiteForm] = useState<SiteInput>({
    code: "",
    name: "",
    city: "Antananarivo",
    address: "",
    phone: "",
  });

  const [typeModalOpen, setTypeModalOpen] = useState<boolean>(false);
  const [editingType, setEditingType] = useState<TypeService | null>(null);
  const [typeForm, setTypeForm] = useState<TypeServiceInput>({
    code: "",
    name: "",
    description: "",
  });

  const [serviceModalOpen, setServiceModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState<{
    siteId: number;
    typeServiceId: number;
    description: string;
  }>({
    siteId: state.Site[0]?.Id_Site || 1,
    typeServiceId: 1,
    description: "",
  });

  // Modal de confirmation de suppression
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "site" | "type" | "service";
    id: number;
    title: string;
    details?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronisation des TypeServices depuis state.TypeService
  useEffect(() => {
    if (state.TypeService) {
      setTypeServices(state.TypeService);
    }
  }, [state.TypeService]);

  // Actualisation complète depuis l'API backend
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [sitesRes, servicesRes, typesRes] = await Promise.allSettled([
        administrationApi.getSites(),
        administrationApi.getServices(),
        administrationApi.getTypeServices(),
      ]);

      const newSites =
        sitesRes.status === "fulfilled" && Array.isArray(sitesRes.value) ? sitesRes.value : [];
      const newServices =
        servicesRes.status === "fulfilled" && Array.isArray(servicesRes.value)
          ? servicesRes.value
          : [];
      const newTypes =
        typesRes.status === "fulfilled" && Array.isArray(typesRes.value) ? typesRes.value : [];

      updateState({
        Site: newSites,
        Service: newServices,
        TypeService: newTypes,
      });
      setTypeServices(newTypes);
      triggerNotification("success", "Organisation synchronisée avec succès depuis l'API.");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur lors de la synchronisation avec le serveur: ${err.message || "Erreur réseau"}`,
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [updateState, triggerNotification]);

  // Chargement initial depuis l'API Symfony
  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // ---------------------------------------------------------------------------
  // GESTION DES SITES
  // ---------------------------------------------------------------------------
  const openCreateSiteModal = () => {
    setEditingSite(null);
    setSiteForm({
      code: `SITE-${(state.Site.length + 1).toString().padStart(2, "0")}`,
      name: "",
      city: "Antananarivo",
      address: "",
      phone: "",
    });
    setSiteModalOpen(true);
  };

  const openEditSiteModal = (site: Site) => {
    setEditingSite(site);
    setSiteForm({
      code: site.code || `SITE-${site.Id_Site}`,
      name: site.name || site.Libelle || "",
      city: site.city || "Antananarivo",
      address: site.address || "",
      phone: site.phone || "",
    });
    setSiteModalOpen(true);
  };

  const handleSubmitSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.name.trim() || !siteForm.code.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingSite) {
        // Mise à jour
        const updated = await administrationApi.updateSite(editingSite.Id_Site, siteForm);
        await handleRefreshAll();
        triggerNotification(
          "success",
          `Site médical « ${updated.Libelle} » mis à jour avec succès via l'API.`,
        );
      } else {
        // Création
        const created = await administrationApi.createSite(siteForm);
        await handleRefreshAll();
        triggerNotification(
          "success",
          `Site médical « ${created.Libelle} » créé avec succès via l'API.`,
        );
      }
      setSiteModalOpen(false);
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de l'enregistrement du site : ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteSite = async (siteId: number) => {
    setIsSubmitting(true);
    try {
      await administrationApi.deleteSite(siteId);
      await handleRefreshAll();
      triggerNotification("success", "Site médical retiré avec succès via l'API.");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la suppression du site : ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmation(null);
    }
  };

  // ---------------------------------------------------------------------------
  // GESTION DES TYPES DE SERVICES
  // ---------------------------------------------------------------------------
  const openCreateTypeModal = () => {
    setEditingType(null);
    setTypeForm({
      code: `TS-${(typeServices.length + 1).toString().padStart(2, "0")}`,
      name: "",
      description: "",
    });
    setTypeModalOpen(true);
  };

  const openEditTypeModal = (ts: TypeService) => {
    setEditingType(ts);
    setTypeForm({
      code: ts.code || `TS-${ts.id}`,
      name: ts.name || ts.Libelle || "",
      description: ts.description || "",
    });
    setTypeModalOpen(true);
  };

  const handleSubmitType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim() || !typeForm.code.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingType) {
        // Mise à jour
        const updated = await administrationApi.updateTypeService(editingType.id, typeForm);
        await handleRefreshAll();
        triggerNotification(
          "success",
          `Type de service « ${updated.name} » mis à jour avec succès via l'API.`,
        );
      } else {
        // Création
        const created = await administrationApi.createTypeService(typeForm);
        await handleRefreshAll();
        triggerNotification(
          "success",
          `Type de service « ${created.name} » créé avec succès via l'API.`,
        );
      }
      setTypeModalOpen(false);
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de l'enregistrement du type de service : ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteType = async (typeId: number) => {
    setIsSubmitting(true);
    try {
      await administrationApi.deleteTypeService(typeId);
      await handleRefreshAll();
      triggerNotification("success", "Type de service supprimé avec succès via l'API.");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la suppression du type : ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmation(null);
    }
  };

  // ---------------------------------------------------------------------------
  // GESTION DES SERVICES RATTACHÉS (CARTOGRAPHIE)
  // ---------------------------------------------------------------------------
  const openCreateServiceModal = (presetSiteId?: number) => {
    setEditingService(null);
    const defaultSiteId = presetSiteId ?? (state.Site[0]?.Id_Site || 1);
    const defaultTypeId = typeServices[0]?.id || 1;
    setServiceForm({
      siteId: defaultSiteId,
      typeServiceId: defaultTypeId,
      description: "",
    });
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (ser: Service) => {
    setEditingService(ser);
    setServiceForm({
      siteId: ser.siteId || ser.Id_Site || 1,
      typeServiceId: ser.typeServiceId || 1,
      description: ser.description || "",
    });
    setServiceModalOpen(true);
  };

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.siteId || !serviceForm.typeServiceId) return;

    setIsSubmitting(true);
    try {
      const payload: ServiceInput = {
        siteId: Number(serviceForm.siteId),
        typeServiceId: Number(serviceForm.typeServiceId),
        description: serviceForm.description ? serviceForm.description.trim() : null,
      };

      if (editingService) {
        // Mise à jour
        const updated = await administrationApi.updateService(editingService.Id_Service, payload);
        await handleRefreshAll();
        triggerNotification(
          "success",
          `Service « ${updated.Libelle} » mis à jour avec succès via l'API.`,
        );
      } else {
        // Création
        const created = await administrationApi.createService(payload);
        await handleRefreshAll();
        triggerNotification(
          "success",
          `Service « ${created.Libelle} » déployé avec succès via l'API.`,
        );
      }
      setServiceModalOpen(false);
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de l'affectation du service : ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteService = async (serviceId: number) => {
    setIsSubmitting(true);
    try {
      await administrationApi.deleteService(serviceId);
      await handleRefreshAll();
      triggerNotification("success", "Service retiré de cet établissement avec succès via l'API.");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors du retrait du service : ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmation(null);
    }
  };

  // ---------------------------------------------------------------------------
  // DONNÉES FILTRÉES
  // ---------------------------------------------------------------------------
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return state.Site;
    const q = searchQuery.toLowerCase();
    return state.Site.filter(
      (s) =>
        s.Libelle.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)),
    );
  }, [state.Site, searchQuery]);

  const filteredTypeServices = useMemo(() => {
    if (!searchQuery.trim()) return typeServices;
    const q = searchQuery.toLowerCase();
    return typeServices.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [typeServices, searchQuery]);

  const filteredCartographieSites = useMemo(() => {
    if (selectedSiteFilter === "all") {
      return state.Site;
    }
    return state.Site.filter((s) => s.Id_Site === selectedSiteFilter);
  }, [state.Site, selectedSiteFilter]);

  return (
    <div className="space-y-6 animate-fade-in" id="admin-services-container">
      {/* Entête avec indicateurs et synchronisation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Architecture Hospitalière ASINA
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sites, Types & Services Médicaux</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Gestion centralisée des centres hospitaliers, du catalogue des spécialités et de leur
              déploiement opérationnel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeSubTab === "sites" && (
              <button
                type="button"
                onClick={openCreateSiteModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouveau Site</span>
              </button>
            )}

            {activeSubTab === "types" && (
              <button
                type="button"
                onClick={openCreateTypeModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouveau Type</span>
              </button>
            )}

            {activeSubTab === "cartographie" && (
              <button
                type="button"
                onClick={() => openCreateServiceModal()}
                disabled={state.Site.length === 0 || typeServices.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Rattacher un Service</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre de navigation par sous-onglets */}
        <div className="flex items-center justify-between border-t border-gray-150 mt-5 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab("sites");
                setSearchQuery("");
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === "sites"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Hospital className="h-4 w-4" />
              <span>Sites Médicaux</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeSubTab === "sites" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {state.Site.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab("types");
                setSearchQuery("");
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === "types"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Catalogue des Types de Services</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeSubTab === "types" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {typeServices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab("cartographie");
                setSearchQuery("");
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === "cartographie"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Services Déployés par Site</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeSubTab === "cartographie"
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {state.Service.length}
              </span>
            </button>
          </div>

          {/* Recherche rapide */}
          {activeSubTab !== "cartographie" && (
            <div className="relative w-64">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeSubTab === "sites"
                    ? "Rechercher un site, ville..."
                    : "Rechercher un type, code..."
                }
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:bg-white focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {activeSubTab === "cartographie" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-medium">Filtrer par site :</label>
              <select
                value={selectedSiteFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSiteFilter(val === "all" ? "all" : Number(val));
                }}
                className="bg-gray-50 border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-gray-700 focus:outline-hidden focus:border-primary cursor-pointer"
              >
                <option value="all">Tous les sites ({state.Site.length})</option>
                {state.Site.map((s) => (
                  <option key={s.Id_Site} value={s.Id_Site}>
                    {s.Libelle}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* VUE 1 : SITES MÉDICAUX */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === "sites" && (
        <div className="space-y-4">
          {filteredSites.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <Hospital className="h-10 w-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-700">Aucun site médical trouvé</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                {searchQuery
                  ? "Aucun établissement ne correspond aux critères de recherche actuels."
                  : "Aucun site médical n'a encore été configuré. Cliquez sur « Nouveau Site » pour ajouter votre première implantation."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={openCreateSiteModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Ajouter un site médical</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSites.map((site) => {
                const deployedServices = state.Service.filter((s) => s.Id_Site === site.Id_Site);
                return (
                  <div
                    key={site.Id_Site}
                    className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs hover:shadow-sm transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-blue-50 text-blue-700 border border-blue-150">
                            {site.code || `SITE-${site.Id_Site}`}
                          </span>
                          <h3 className="text-sm font-bold text-gray-900 leading-snug">
                            {site.Libelle}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditSiteModal(site)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                            title="Modifier les coordonnées"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirmation({
                                type: "site",
                                id: site.Id_Site,
                                title: site.Libelle,
                                details: `${deployedServices.length} service(s) rattaché(s) à ce site seront également détachés.`,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Supprimer ce site"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800">
                            {site.city || "Non renseigné"}
                          </span>
                          {site.address && (
                            <span className="text-gray-400 truncate">({site.address})</span>
                          )}
                        </div>

                        {site.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{site.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">
                        {deployedServices.length} service{deployedServices.length > 1 ? "s" : ""}{" "}
                        actif{deployedServices.length > 1 ? "s" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSiteFilter(site.Id_Site);
                          setActiveSubTab("cartographie");
                        }}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Voir les services →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VUE 2 : CATALOGUE DES TYPES DE SERVICES */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === "types" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-gray-150 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Catalogue des Types de Services Médicaux
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Définit les spécialités et départements disponibles dans l'ensemble du réseau
                hospitalier.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {filteredTypeServices.length} type{filteredTypeServices.length > 1 ? "s" : ""}{" "}
              enregistré{filteredTypeServices.length > 1 ? "s" : ""}
            </span>
          </div>

          {filteredTypeServices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Layers className="h-10 w-10 text-gray-300 mx-auto" />
              <h4 className="text-sm font-bold text-gray-700">Aucun type de service trouvé</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                {searchQuery
                  ? "Aucune spécialité ne correspond à votre recherche."
                  : "Aucun type de service n'est encore enregistré. Créez les types pour pouvoir les déployer sur vos sites."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={openCreateTypeModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Créer un type de service</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-150 text-[11px]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Nom de la Spécialité / Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Déploiements</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTypeServices.map((item) => {
                    const usageCount = state.Service.filter(
                      (s) => s.typeServiceId === item.id || s.Libelle === item.name,
                    ).length;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded text-[11px]">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                          {item.description || (
                            <span className="text-gray-300 italic">Aucune description</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                            {usageCount} site{usageCount > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Actif</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditTypeModal(item)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded transition-colors cursor-pointer"
                              title="Modifier ce type"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirmation({
                                  type: "type",
                                  id: item.id,
                                  title: item.name,
                                  details:
                                    usageCount > 0
                                      ? `Attention: ${usageCount} service(s) utilisent actuellement cette spécialité.`
                                      : undefined,
                                })
                              }
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Supprimer ce type"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VUE 3 : SERVICES DÉPLOYÉS PAR SITE & CARTOGRAPHIE */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === "cartographie" && (
        <div className="space-y-6">
          {filteredCartographieSites.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <Hospital className="h-10 w-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-700">Aucun site disponible</h3>
              <p className="text-xs text-gray-500">
                Créez d'abord au moins un site médical pour commencer à y rattacher des services.
              </p>
            </div>
          ) : (
            filteredCartographieSites.map((site) => {
              const servicesOnSite = state.Service.filter((s) => s.Id_Site === site.Id_Site);

              return (
                <div
                  key={site.Id_Site}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs"
                >
                  {/* Entête du site */}
                  <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Hospital className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900">{site.Libelle}</h3>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded">
                            {site.code || `SITE-${site.Id_Site}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{site.city || "Antananarivo"}</span>
                          {site.address && <span>• {site.address}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">
                        {servicesOnSite.length} service{servicesOnSite.length > 1 ? "s" : ""}{" "}
                        déployé{servicesOnSite.length > 1 ? "s" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => openCreateServiceModal(site.Id_Site)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-primary hover:text-white hover:bg-primary border border-primary/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Rattacher un Service</span>
                      </button>
                    </div>
                  </div>

                  {/* Liste des services du site */}
                  <div className="p-5">
                    {servicesOnSite.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs border border-dashed border-gray-200 rounded-lg">
                        Aucun service médical n'est actuellement affecté à cet établissement.
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => openCreateServiceModal(site.Id_Site)}
                            className="text-primary hover:underline font-semibold cursor-pointer"
                          >
                            + Déployer le premier service
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {servicesOnSite.map((srv) => {
                          const typeObj = typeServices.find((t) => t.id === srv.typeServiceId);
                          const typeName = typeObj?.name || srv.typeServiceName || srv.Libelle;
                          const typeCode = typeObj?.code || "SRV";

                          return (
                            <div
                              key={srv.Id_Service}
                              className="p-3 bg-gray-50/70 hover:bg-white border border-gray-200 rounded-lg transition-all flex flex-col justify-between space-y-2 group"
                            >
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-mono text-[10px] font-bold text-gray-600 bg-gray-200/80 px-1.5 py-0.2 rounded">
                                    {typeCode}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => openEditServiceModal(srv)}
                                      className="p-1 text-gray-400 hover:text-primary hover:bg-gray-200/60 rounded cursor-pointer"
                                      title="Modifier l'emplacement / description"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteConfirmation({
                                          type: "service",
                                          id: srv.Id_Service,
                                          title: srv.Libelle,
                                          details: `Le service sera détaché de l'établissement « ${site.Libelle} ».`,
                                        })
                                      }
                                      className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                      title="Retirer ce service du site"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>

                                <h4 className="text-xs font-bold text-gray-900 leading-tight">
                                  {typeName}
                                </h4>

                                {srv.description && (
                                  <p className="text-[11px] text-gray-500 italic">
                                    {srv.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-150/70">
                                <span className="flex items-center gap-1">
                                  <Activity className="h-3 w-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-medium">Opérationnel</span>
                                </span>
                                <span>ID #{srv.Id_Service}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL : CRÉATION / ÉDITION D'UN SITE */}
      {/* --------------------------------------------------------------------- */}
      {siteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hospital className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-900">
                  {editingSite ? "Modifier le site médical" : "Nouveau site médical"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSiteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSite} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-gray-700 font-semibold mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={siteForm.code}
                    onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value })}
                    placeholder="CMP-01"
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono uppercase focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-700 font-semibold mb-1">Ville *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={siteForm.city}
                    onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
                    placeholder="Antananarivo"
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Nom du Site / Établissement *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={siteForm.name}
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  placeholder="Centre Médical Principal Ampefiloha"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Adresse complète</label>
                <input
                  type="text"
                  maxLength={255}
                  value={siteForm.address || ""}
                  onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                  placeholder="12 rue de la Paix, Lot IV-B"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Téléphone de contact
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={siteForm.phone || ""}
                  onChange={(e) => setSiteForm({ ...siteForm, phone: e.target.value })}
                  placeholder="+261 20 22 123 45"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="border-t border-gray-150 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSiteModalOpen(false)}
                  className="px-3.5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : editingSite
                      ? "Mettre à jour"
                      : "Créer le site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL : CRÉATION / ÉDITION D'UN TYPE DE SERVICE */}
      {/* --------------------------------------------------------------------- */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-900">
                  {editingType ? "Modifier la spécialité médicale" : "Nouveau type de service"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTypeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitType} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Code Spécialité *</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  placeholder="MED-GEN, CARDIO, URG..."
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono uppercase focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Nom / Libellé de la Spécialité *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Médecine Générale, Cardiologie, Pédiatrie..."
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Description / Champ d'intervention
                </label>
                <textarea
                  rows={3}
                  value={typeForm.description || ""}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Consultations, suivis ambulatoires et urgences relatives..."
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="border-t border-gray-150 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className="px-3.5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : editingType
                      ? "Mettre à jour"
                      : "Créer la spécialité"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL : RATTACHEMENT D'UN SERVICE À UN SITE */}
      {/* --------------------------------------------------------------------- */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-900">
                  {editingService ? "Modifier le service déployé" : "Rattacher un service au site"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Site Médical d'Affectation *
                </label>
                <select
                  required
                  value={serviceForm.siteId}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, siteId: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary cursor-pointer"
                >
                  {state.Site.map((s) => (
                    <option key={s.Id_Site} value={s.Id_Site}>
                      {s.Libelle} ({s.city || "Antananarivo"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Type de Service / Spécialité *
                </label>
                <select
                  required
                  value={serviceForm.typeServiceId}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, typeServiceId: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary cursor-pointer"
                >
                  {typeServices.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Localisation interne / Description spécifique
                </label>
                <input
                  type="text"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="EX: Pavillon A - RDC - Bureau 102"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-hidden focus:border-primary"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Précise l'aile, le pavillon ou le numéro de salle au sein de cet établissement.
                </p>
              </div>

              <div className="border-t border-gray-150 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="px-3.5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : editingService
                      ? "Mettre à jour"
                      : "Rattacher le service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL : CONFIRMATION DE SUPPRESSION */}
      {/* --------------------------------------------------------------------- */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Confirmer la suppression</h3>
                <p className="text-xs text-gray-500">Cette action est irréversible.</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
              <p className="font-semibold text-gray-800">« {deleteConfirmation.title} »</p>
              {deleteConfirmation.details && (
                <p className="text-gray-500">{deleteConfirmation.details}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmation.type === "site") {
                    confirmDeleteSite(deleteConfirmation.id);
                  } else if (deleteConfirmation.type === "type") {
                    confirmDeleteType(deleteConfirmation.id);
                  } else if (deleteConfirmation.type === "service") {
                    confirmDeleteService(deleteConfirmation.id);
                  }
                }}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
