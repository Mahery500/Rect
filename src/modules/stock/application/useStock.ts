/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef, useState } from "react";
import { StockTabType } from "../domain/stock.types";
import {
  medicamentsRepository,
  famillesRepository,
  principesActifsRepository,
  conditionnementsRepository,
  presentationsRepository,
  produitsRepository,
} from "../infrastructure/pharmacy-catalog.repository";
import { fournisseursRepository } from "@/modules/stock/infrastructure";
import { commandesRepository } from "../infrastructure/commandes-repository";
import { lotsRepository } from "../infrastructure/lot-repository";
import { approsRepository } from "../infrastructure/appros.repository";
// stockSitesRepository et stockLevelsRepository sont exportés par le même fichier
import {
  stockLevelsRepository,
  stockSitesRepository,
} from "../infrastructure/stock-levels.repository";
import { ajustementTypesRepository } from "../infrastructure/ajustement-types.repository";
import { stockAjustementsRepository } from "../infrastructure/stock-ajustements.repository";
import { transfertsRepository } from "../infrastructure/transferts.repository";
import type { TransfertRequest } from "../infrastructure/transferts.repository";

import type {
  MedicamentRequest,
  MedicamentResponse,
  FamilleResource,
  PrincipeActifResource,
  ConditionnementResource,
  PresentationResource,
  CommandeRequest,
  CommandeResponse,
  ProduitResponse,
  ProduitRequest,
  LotRequest,
  LotResponse,
  ApproRequest,
  StockLevelResponse,
  StockSiteResponse,
  AjustementTypeResponse,
  StockAjustementRequest,
} from "@/core/api-contracts";

export interface FamilleRequest {
  libelle: string;
}

export interface FournisseurResource {
  id: number | null;
  nom: string;
  adresse: string | null;
  contact: string | null;
}

export interface FournisseurRequest {
  nom: string;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
}

// Un principe actif est une molécule seule : la dose est saisie par médicament.
export interface PrincipeActifRequest {
  libelle: string;
}

export interface ConditionnementRequest {
  libelle: string;
}

export interface PresentationRequest {
  libelle: string;
}

export function useStock(initialTab: StockTabType = "visualiser") {
  const [internalTab, setInternalTab] = useState<StockTabType>(initialTab);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message de la dernière écriture (mutate) ayant échoué, null si elle a réussi.
  // Séparé de `error` (réservé aux erreurs de chargement affichées en bandeau).
  const lastErrorRef = useRef<string | null>(null);
  const getLastError = useCallback(() => lastErrorRef.current, []);

  const [medicaments, setMedicaments] = useState<MedicamentResponse[]>([]);
  const [familles, setFamilles] = useState<FamilleResource[]>([]);
  const [principesActifs, setPrincipesActifs] = useState<PrincipeActifResource[]>([]);
  const [conditionnements, setConditionnements] = useState<ConditionnementResource[]>([]);
  const [presentations, setPresentations] = useState<PresentationResource[]>([]);
  const [fournisseurs, setFournisseurs] = useState<FournisseurResource[]>([]);
  const [commandes, setCommandes] = useState<CommandeResponse[]>([]);
  const [produits, setProduits] = useState<ProduitResponse[]>([]);
  const [lots, setLots] = useState<LotResponse[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevelResponse[]>([]);
  const [sites, setSites] = useState<StockSiteResponse[]>([]);
  const [ajustementTypes, setAjustementTypes] = useState<AjustementTypeResponse[]>([]);

  const triggerNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchMedicaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMedicaments(await medicamentsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des médicaments.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFamilles = useCallback(async () => {
    try {
      setFamilles(await famillesRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des familles.");
    }
  }, []);

  const fetchPrincipesActifs = useCallback(async () => {
    try {
      setPrincipesActifs(await principesActifsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des principes actifs.");
    }
  }, []);

  const fetchConditionnements = useCallback(async () => {
    try {
      setConditionnements(await conditionnementsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des conditionnements.");
    }
  }, []);

  const fetchPresentations = useCallback(async () => {
    try {
      setPresentations(await presentationsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des présentations.");
    }
  }, []);

  const fetchFournisseurs = useCallback(async () => {
    try {
      setFournisseurs(await fournisseursRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des fournisseurs.");
    }
  }, []);

  const fetchCommandes = useCallback(async () => {
    try {
      setCommandes(await commandesRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des commandes.");
    }
  }, []);

  const fetchProduits = useCallback(async () => {
    try {
      setProduits(await produitsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des produits.");
    }
  }, []);

  const fetchLots = useCallback(async () => {
    try {
      setLots(await lotsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des lots.");
    }
  }, []);

  const fetchAjustementTypes = useCallback(async () => {
    try {
      setAjustementTypes(await ajustementTypesRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des types d'ajustement.");
    }
  }, []);

  // Sites de stock (/site_resources) : sert entre autres à choisir origine et
  // destination d'un transfert, y compris pour un site qui n'a encore aucun stock.
  const fetchSites = useCallback(async () => {
    try {
      setSites(await stockSitesRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des sites.");
    }
  }, []);

  // StockResource est une vue en lecture seule (GET uniquement) sur la table
  // `stocks`. Le stock est modifié côté serveur par les approvisionnements
  // (ApproProcessor), les ajustements d'inventaire, les transferts et les
  // dispensations de prescriptions (DispenserPrescriptionProcessor).
  const fetchStockLevels = useCallback(async () => {
    try {
      setStockLevels(await stockLevelsRepository.findAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des niveaux de stock.");
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchMedicaments(),
      fetchFamilles(),
      fetchPrincipesActifs(),
      fetchConditionnements(),
      fetchPresentations(),
      fetchFournisseurs(),
      fetchCommandes(),
      fetchProduits(),
      fetchLots(),
      fetchStockLevels(),
      fetchSites(),
      fetchAjustementTypes(),
    ]);
    setLoading(false);
  }, [
    fetchMedicaments,
    fetchFamilles,
    fetchPrincipesActifs,
    fetchConditionnements,
    fetchPresentations,
    fetchFournisseurs,
    fetchCommandes,
    fetchProduits,
    fetchLots,
    fetchStockLevels,
    fetchSites,
    fetchAjustementTypes,
  ]);

  // Exécute une action d'écriture, notifie le résultat et renvoie undefined en cas d'échec.
  // Le message d'échec est conservé dans lastErrorRef (lisible via getLastError()).
  // `setGlobalError: false` évite de remplir `error`, qui sert au bandeau
  // « Impossible de charger… » : utile pour les erreurs affichées localement.
  const mutate = async <T>(
    action: () => Promise<T>,
    successText: string,
    errorFallback: string,
    opts: { setGlobalError?: boolean } = {},
  ): Promise<T | undefined> => {
    lastErrorRef.current = null;
    try {
      const result = await action();
      triggerNotification("success", successText);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : errorFallback;
      lastErrorRef.current = message;
      if (opts.setGlobalError !== false) setError(message);
      triggerNotification("error", message);
      return undefined;
    }
  };

  // Écriture dont on ne veut que le succès/échec (create, update ou remove qui
  // renvoient souvent void). Renvoie true si OK, false sinon ; le message du serveur
  // (ex. 409 « utilisé par … ») est disponible via getLastError().
  // Recharge la liste concernée uniquement en cas de succès.
  const mutateOk = async (
    action: () => Promise<unknown>,
    successText: string,
    errorFallback: string,
    refetch: () => Promise<void>,
  ): Promise<boolean> => {
    await mutate(action, successText, errorFallback, { setGlobalError: false });
    const ok = lastErrorRef.current === null;
    if (ok) await refetch();
    return ok;
  };

  // --- Médicaments ---
  const createMedicament = async (payload: MedicamentRequest) => {
    const result = await mutate(
      () => medicamentsRepository.create(payload),
      "Médicament créé.",
      "Erreur lors de la création du médicament.",
    );
    if (result) await fetchMedicaments();
    return result;
  };

  const updateMedicament = async (id: number, payload: MedicamentRequest) => {
    const result = await mutate(
      () => medicamentsRepository.update(id, payload),
      "Médicament mis à jour.",
      "Erreur lors de la mise à jour du médicament.",
    );
    if (result) await fetchMedicaments();
    return result;
  };

  const removeMedicament = (id: number): Promise<boolean> =>
    mutateOk(
      () => medicamentsRepository.remove(id),
      "Médicament supprimé.",
      "Erreur lors de la suppression du médicament.",
      fetchMedicaments,
    );

  // --- Familles ---
  const updateFamille = (id: number, payload: FamilleRequest): Promise<boolean> =>
    mutateOk(
      () => famillesRepository.update(id, payload),
      "Famille mise à jour.",
      "Erreur lors de la mise à jour de la famille.",
      fetchFamilles,
    );

  const removeFamille = (id: number): Promise<boolean> =>
    mutateOk(
      () => famillesRepository.remove(id),
      "Famille supprimée.",
      "Erreur lors de la suppression de la famille.",
      fetchFamilles,
    );

  // --- Principes actifs ---
  // Renvoie true en cas de succès ; le message d'erreur du serveur est lisible via getLastError().
  const createPrincipeActif = (payload: PrincipeActifRequest): Promise<boolean> =>
    mutateOk(
      () => principesActifsRepository.create(payload),
      "Principe actif créé.",
      "Erreur lors de la création du principe actif.",
      fetchPrincipesActifs,
    );

  const updatePrincipeActif = (id: number, payload: PrincipeActifRequest): Promise<boolean> =>
    mutateOk(
      () => principesActifsRepository.update(id, payload),
      "Principe actif mis à jour.",
      "Erreur lors de la mise à jour du principe actif.",
      fetchPrincipesActifs,
    );

  const removePrincipeActif = (id: number): Promise<boolean> =>
    mutateOk(
      () => principesActifsRepository.remove(id),
      "Principe actif supprimé.",
      "Erreur lors de la suppression du principe actif.",
      fetchPrincipesActifs,
    );

  // --- Conditionnements ---
  const updateConditionnement = (id: number, payload: ConditionnementRequest): Promise<boolean> =>
    mutateOk(
      () => conditionnementsRepository.update(id, payload),
      "Conditionnement mis à jour.",
      "Erreur lors de la mise à jour du conditionnement.",
      fetchConditionnements,
    );

  const removeConditionnement = (id: number): Promise<boolean> =>
    mutateOk(
      () => conditionnementsRepository.remove(id),
      "Conditionnement supprimé.",
      "Erreur lors de la suppression du conditionnement.",
      fetchConditionnements,
    );

  // --- Présentations ---
  const updatePresentation = (id: number, payload: PresentationRequest): Promise<boolean> =>
    mutateOk(
      () => presentationsRepository.update(id, payload),
      "Présentation mise à jour.",
      "Erreur lors de la mise à jour de la présentation.",
      fetchPresentations,
    );

  const removePresentation = (id: number): Promise<boolean> =>
    mutateOk(
      () => presentationsRepository.remove(id),
      "Présentation supprimée.",
      "Erreur lors de la suppression de la présentation.",
      fetchPresentations,
    );

  // --- Produits ---
  const createProduit = async (payload: ProduitRequest) => {
    const result = await mutate(
      () => produitsRepository.create(payload),
      "Produit créé.",
      "Erreur lors de la création du produit.",
    );
    if (result) await fetchProduits();
    return result;
  };

  // Renvoie désormais un booléen (true = succès), comme les autres update de référentiels.
  const updateProduit = (id: number, payload: ProduitRequest): Promise<boolean> =>
    mutateOk(
      () => produitsRepository.update(id, payload),
      "Produit mis à jour.",
      "Erreur lors de la mise à jour du produit.",
      fetchProduits,
    );

  const removeProduit = (id: number): Promise<boolean> =>
    mutateOk(
      () => produitsRepository.remove(id),
      "Produit supprimé.",
      "Erreur lors de la suppression du produit.",
      fetchProduits,
    );

  // --- Commandes ---
  const createCommande = async (payload: CommandeRequest) => {
    const result = await mutate(
      () => commandesRepository.create(payload),
      "Commande créée.",
      "Erreur lors de la création de la commande.",
    );
    if (result) await fetchCommandes();
    return result;
  };

  const updateCommande = async (id: number, payload: CommandeRequest) => {
    const result = await mutate(
      () => commandesRepository.update(id, payload),
      "Commande mise à jour.",
      "Erreur lors de la mise à jour de la commande.",
    );
    if (result) await fetchCommandes();
    return result;
  };

  const removeCommande = async (id: number) => {
    await mutate(
      () => commandesRepository.remove(id),
      "Commande supprimée.",
      "Erreur lors de la suppression de la commande.",
    );
    await fetchCommandes();
  };

  // --- Lots ---
  const createLot = async (payload: LotRequest) => {
    const result = await mutate(
      () => lotsRepository.create(payload),
      "Lot créé.",
      "Erreur lors de la création du lot.",
    );
    if (result) await fetchLots();
    return result;
  };

  // --- Approvisionnements : le serveur met à jour les stocks (ApproProcessor) ---
  const createAppro = async (payload: ApproRequest) => {
    const result = await mutate(
      () => approsRepository.create(payload),
      "Approvisionnement enregistré.",
      "Erreur lors de l'enregistrement de l'approvisionnement.",
    );
    if (result) await Promise.all([fetchStockLevels(), fetchLots(), fetchCommandes()]);
    return result;
  };

  // --- Ajustements d'inventaire ---
  const createStockAjustement = async (payload: StockAjustementRequest) => {
    const result = await mutate(
      () => stockAjustementsRepository.create(payload),
      "Ajustement enregistré.",
      "Erreur lors de l'enregistrement de l'ajustement.",
    );
    if (result) await fetchStockLevels();
    return result;
  };

  // --- Transferts entre sites : le serveur déplace le stock ---
  // Comme les autres écritures, renvoie undefined en cas d'échec (l'erreur est
  // déjà notifiée et stockée dans `error`).
  const createTransfert = async (payload: TransfertRequest) => {
    const result = await mutate(
      () => transfertsRepository.create(payload),
      "Transfert créé.",
      "Erreur lors de la création du transfert.",
    );
    if (result) await fetchStockLevels();
    return result;
  };

  return {
    // navigation et état global
    activeTab: internalTab,
    setActiveTab: setInternalTab,
    notification,
    triggerNotification,
    loading,
    error,
    getLastError,

    // données
    medicaments,
    familles,
    principesActifs,
    conditionnements,
    presentations,
    fournisseurs,
    commandes,
    produits,
    lots,
    stockLevels,
    sites,
    ajustementTypes,

    // chargement
    refreshAll,
    fetchMedicaments,
    fetchFamilles,
    fetchPrincipesActifs,
    fetchConditionnements,
    fetchPresentations,
    fetchFournisseurs,
    fetchCommandes,
    fetchProduits,
    fetchLots,
    fetchStockLevels,
    fetchSites,
    fetchAjustementTypes,

    // écriture
    createMedicament,
    updateMedicament,
    removeMedicament,
    updateFamille,
    removeFamille,
    createPrincipeActif,
    updatePrincipeActif,
    removePrincipeActif,
    updateConditionnement,
    removeConditionnement,
    updatePresentation,
    removePresentation,
    createProduit,
    updateProduit,
    removeProduit,
    createCommande,
    updateCommande,
    removeCommande,
    createLot,
    createAppro,
    createStockAjustement,
    createTransfert,
  };
}
