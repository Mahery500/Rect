/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { BookHeart, Plus, Trash2, Package, Truck, Sliders, Loader2 } from "lucide-react";
import {
  ASINAState,
  Medicament,
  Produit,
  Fournisseur,
  Conditionnement,
  Presentation,
} from "@/core/types";
import {
  fournisseursRepository,
  medicamentsRepository,
  produitsRepository,
  famillesRepository,
  principesActifsRepository,
  presentationsRepository,
  conditionnementsRepository,
} from "@/modules/stock/infrastructure";

interface AdminCatalogueTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export default function AdminCatalogueTab({
  state,
  updateState,
  triggerNotification,
}: AdminCatalogueTabProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states
  const [newMedicamentLibelle, setNewMedicamentLibelle] = useState("");

  const [newProduitNom, setNewProduitNom] = useState("");
  const [selectedMedicamentId, setSelectedMedicamentId] = useState<number>(1);
  const [selectedPresentationId, setSelectedPresentationId] = useState<number>(1);
  const [selectedConditionnementId, setSelectedConditionnementId] = useState<number>(1);

  const [newFournisseurNom, setNewFournisseurNom] = useState("");
  const [newFournisseurAdresse, setNewFournisseurAdresse] = useState("");
  const [newFournisseurContact, setNewFournisseurContact] = useState("");

  const [newCondCode, setNewCondCode] = useState("");
  const [newCondLibelle, setNewCondLibelle] = useState("");
  const [newCondTaux, setNewCondTaux] = useState<string>("100");
  const [newCondUnite, setNewCondUnite] = useState("Comprimé");

  /**
   * Synchronisation complète depuis les endpoints réels de l'API Symfony
   */
  const fetchCatalogueData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        fournisseursRes,
        medicamentsRes,
        produitsRes,
        principesActifsRes,
        conditionnementsRes,
        presentationsRes,
        famillesRes,
      ] = await Promise.allSettled([
        fournisseursRepository.findAll(),
        medicamentsRepository.findAll(),
        produitsRepository.findAll(),
        principesActifsRepository.findAll(),
        conditionnementsRepository.findAll(),
        presentationsRepository.findAll(),
        famillesRepository.findAll(),
      ]);

      const resolvedFournisseurs: Fournisseur[] =
        fournisseursRes.status === "fulfilled" && Array.isArray(fournisseursRes.value)
          ? fournisseursRes.value.map((f) => ({
              Id_Fournisseur: Number(f.id) || 0,
              Nom: f.nom || "",
              Adresse: f.adresse || "",
              Contact: f.telephone || f.email || "",
            }))
          : state.Fournisseur;

      const resolvedMedicaments: Medicament[] =
        principesActifsRes.status === "fulfilled" &&
        Array.isArray(principesActifsRes.value) &&
        principesActifsRes.value.length > 0
          ? principesActifsRes.value.map((pa) => ({
              Id_Medicament: Number(pa.id) || 0,
              Libelle: pa.libelle || "",
            }))
          : medicamentsRes.status === "fulfilled" && Array.isArray(medicamentsRes.value)
            ? medicamentsRes.value.map((m) => ({
                Id_Medicament: Number(m.id) || 0,
                Libelle: m.familleLibelle || m.presentationLibelle || `Médicament #${m.id}`,
              }))
            : state.Medicament;

      const resolvedProduits: Produit[] =
        produitsRes.status === "fulfilled" && Array.isArray(produitsRes.value)
          ? produitsRes.value.map((p) => ({
              Id_Produit: Number(p.id) || 0,
              Nom_Commercial: p.nomCommercial || "",
              Id_Medicament: Number(p.medicamentId) || 1,
              Id_Conditionnement: Number(p.conditionnementId) || 1,
              Id_Presentation: 1,
            }))
          : state.Produit;

      const resolvedConditionnements: Conditionnement[] =
        conditionnementsRes.status === "fulfilled" && Array.isArray(conditionnementsRes.value)
          ? conditionnementsRes.value.map((c) => ({
              Id_Conditionnement: Number(c.id) || 0,
              Code: `CND-${c.id}`,
              Libelle: c.libelle || "",
              taux_conversion: 1,
              Unite_Base: "Unité",
            }))
          : state.Conditionnement;

      const resolvedPresentations: Presentation[] =
        presentationsRes.status === "fulfilled" && Array.isArray(presentationsRes.value)
          ? presentationsRes.value.map((pr) => ({
              Id_Presentation: Number(pr.id) || 0,
              Libelle: pr.libelle || "",
              Code: pr.code || "",
            }))
          : state.Presentation;

      updateState({
        Fournisseur: resolvedFournisseurs,
        Medicament: resolvedMedicaments,
        Produit: resolvedProduits,
        Conditionnement: resolvedConditionnements,
        Presentation: resolvedPresentations,
        Famille:
          famillesRes.status === "fulfilled" && Array.isArray(famillesRes.value)
            ? (famillesRes.value as any)
            : state.Famille,
        Principe_Actif:
          principesActifsRes.status === "fulfilled" && Array.isArray(principesActifsRes.value)
            ? (principesActifsRes.value as any)
            : state.Principe_Actif,
      });

      if (resolvedMedicaments.length > 0 && !selectedMedicamentId) {
        setSelectedMedicamentId(resolvedMedicaments[0].Id_Medicament);
      }
      if (resolvedConditionnements.length > 0 && !selectedConditionnementId) {
        setSelectedConditionnementId(resolvedConditionnements[0].Id_Conditionnement);
      }
      if (resolvedPresentations.length > 0 && !selectedPresentationId) {
        setSelectedPresentationId(resolvedPresentations[0].Id_Presentation);
      }
    } catch (err: any) {
      console.info("[AdminCatalogueTab] Erreur lors de la synchronisation:", err);
      triggerNotification(
        "error",
        `Erreur lors de la récupération des données API: ${err.message || "Erreur réseau"}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    updateState,
    triggerNotification,
    state.Fournisseur,
    state.Medicament,
    state.Produit,
    state.Conditionnement,
    state.Presentation,
    state.Famille,
    state.Principe_Actif,
    selectedMedicamentId,
    selectedConditionnementId,
    selectedPresentationId,
  ]);

  // Chargement initial depuis l'API Symfony
  useEffect(() => {
    fetchCatalogueData();
  }, [fetchCatalogueData]);

  // Handlers
  const handleCreateMedicament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedicamentLibelle.trim()) return;

    setIsSubmitting(true);
    try {
      await principesActifsRepository.create({
        libelle: newMedicamentLibelle.trim(),
      });
      await fetchCatalogueData();

      triggerNotification(
        "success",
        `Substance pharmacologique [${newMedicamentLibelle}] créée avec succès via l'API.`,
      );
      setNewMedicamentLibelle("");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la création de la substance: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMedicament = async (id: number) => {
    const isUsed = state.Produit.some((p) => p.Id_Medicament === id);
    if (isUsed) {
      triggerNotification(
        "error",
        `Impossible de supprimer : cette substance est référencée par des fiches produits.`,
      );
      return;
    }
    if (!window.confirm("Confirmez-vous le retrait de cette substance ?")) return;

    setIsSubmitting(true);
    try {
      await principesActifsRepository.remove(id);
      await fetchCatalogueData();
      triggerNotification("success", `Substance supprimée du catalogue via l'API.`);
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la suppression: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduitNom.trim()) return;

    setIsSubmitting(true);
    try {
      await produitsRepository.create({
        nomCommercial: newProduitNom.trim(),
        medicamentId: Number(selectedMedicamentId) || 1,
        conditionnementId: Number(selectedConditionnementId) || null,
        principeActifIds: [Number(selectedMedicamentId) || 1],
      });
      await fetchCatalogueData();

      triggerNotification(
        "success",
        `Produit fini "${newProduitNom}" enregistré avec succès via l'API.`,
      );
      setNewProduitNom("");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la création du produit: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduit = async (id: number) => {
    const inStock = state.Stock.some((s) => {
      const lot = state.Lot.find((l) => l.Id_Lot === s.Id_Lot);
      return lot && lot.Id_Produit === id;
    });
    if (inStock) {
      triggerNotification("error", `Impossible de supprimer : des stocks de ce produit existent.`);
      return;
    }
    if (!window.confirm("Confirmez-vous le retrait de ce produit du catalogue ?")) return;

    setIsSubmitting(true);
    try {
      await produitsRepository.remove(id);
      await fetchCatalogueData();
      triggerNotification("success", `Produit supprimé du catalogue via l'API.`);
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la suppression du produit: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFournisseurNom.trim()) return;

    setIsSubmitting(true);
    try {
      await fournisseursRepository.create({
        nom: newFournisseurNom.trim(),
        adresse: newFournisseurAdresse.trim() || undefined,
        telephone: newFournisseurContact.trim() || undefined,
      });
      await fetchCatalogueData();

      triggerNotification(
        "success",
        `Fournisseur "${newFournisseurNom}" enregistré avec succès via l'API.`,
      );
      setNewFournisseurNom("");
      setNewFournisseurAdresse("");
      setNewFournisseurContact("");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de l'enregistrement du fournisseur: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFournisseur = async (id: number) => {
    const isReferenced = state.Commande.some((cmd) => cmd.Id_Fournisseur === id);
    if (isReferenced) {
      triggerNotification(
        "error",
        `Impossible de supprimer : ce fournisseur possède des commandes associées.`,
      );
      return;
    }
    if (!window.confirm("Confirmez-vous le retrait de ce fournisseur ?")) return;

    setIsSubmitting(true);
    try {
      await fournisseursRepository.remove(id);
      await fetchCatalogueData();
      triggerNotification("success", `Fournisseur retiré des registres via l'API.`);
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la suppression du fournisseur: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateConditionnement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCondLibelle.trim()) return;

    setIsSubmitting(true);
    try {
      const libelleFinal = newCondCode.trim()
        ? `${newCondLibelle.trim()} (${newCondCode.trim().toUpperCase()})`
        : newCondLibelle.trim();

      await conditionnementsRepository.create({
        libelle: libelleFinal,
      });
      await fetchCatalogueData();

      triggerNotification(
        "success",
        `Nouveau format d'emballage [${newCondLibelle}] créé avec succès via l'API.`,
      );
      setNewCondCode("");
      setNewCondLibelle("");
      setNewCondTaux("100");
      setNewCondUnite("Comprimé");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la création du conditionnement: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConditionnement = async (id: number) => {
    const isUsed = state.Produit.some((p) => p.Id_Conditionnement === id);
    if (isUsed) {
      triggerNotification(
        "error",
        `Impossible de supprimer : ce format est référencé par des fiches produits.`,
      );
      return;
    }
    if (!window.confirm("Confirmez-vous le retrait de ce format d'emballage ?")) return;

    setIsSubmitting(true);
    try {
      await conditionnementsRepository.remove(id);
      await fetchCatalogueData();
      triggerNotification("success", `Format de conditionnement retiré via l'API.`);
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la suppression du format: ${err.message || "Erreur backend"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SECTION 1: MEDICAMENTS DE BASE (DCI) / SUBSTANCES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-asina-50 rounded text-asina-600">
              <BookHeart className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Nouvelle DCI / Substance de Base
            </h3>
          </div>
          <p className="text-[11px] text-gray-500">
            La Dénomination Commune Internationale (DCI) représente le principe actif du médicament
            nécessaire à la prescription biomédicale.
          </p>

          <form onSubmit={handleCreateMedicament} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-750 font-semibold mb-1">
                Nom du Principe Actif (DCI)
              </label>
              <input
                type="text"
                required
                placeholder="EX: Ibuprofène, Amoxicilline"
                value={newMedicamentLibelle}
                onChange={(e) => setNewMedicamentLibelle(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-asina-600 hover:bg-asina-700 text-white py-2 px-3 rounded text-xs font-bold transition hover:cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Enregistrer la substance
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100 flex justify-between items-center">
            <span>Dictionnaire des Substances Actives disponibles</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {state.Medicament.length} DCI enregistrées
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
            {state.Medicament.map((m) => {
              const correlatedProductsCount = state.Produit.filter(
                (p) => p.Id_Medicament === m.Id_Medicament,
              ).length;
              return (
                <div
                  key={m.Id_Medicament}
                  className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/60 flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{m.Libelle}</span>
                    <span className="text-[10px] text-asina-600 font-semibold">
                      {correlatedProductsCount} conditionnement(s) associé(s)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteMedicament(m.Id_Medicament)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                    title="Supprimer la DCI"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: PRODUITS COMMERCIAUX (MEDICAMENTS EN BOITE / LOTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-asina-50 rounded text-asina-600">
              <Package className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Créer un Produit Commercialisable
            </h3>
          </div>
          <p className="text-[11px] text-gray-500">
            Spécifiez le nom commercial d'origine ou générique, associé à sa présentation et sa
            contenance.
          </p>

          <form onSubmit={handleCreateProduit} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-750 font-semibold mb-1">
                Nom Commercial & Dosage
              </label>
              <input
                type="text"
                required
                placeholder="EX: Doliprane 1000mg"
                value={newProduitNom}
                onChange={(e) => setNewProduitNom(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-gray-750 font-semibold mb-1">
                  Substance Active (DCI) de base
                </label>
                <select
                  value={selectedMedicamentId}
                  onChange={(e) => setSelectedMedicamentId(Number(e.target.value))}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
                >
                  {state.Medicament.map((m) => (
                    <option key={m.Id_Medicament} value={m.Id_Medicament}>
                      {m.Libelle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-750 font-semibold mb-1">Présentation</label>
                  <select
                    value={selectedPresentationId}
                    onChange={(e) => setSelectedPresentationId(Number(e.target.value))}
                    className="w-full bg-white border border-gray-300 rounded p-1 text-xs focus:outline-hidden"
                  >
                    {state.Presentation.map((p) => (
                      <option key={p.Id_Presentation} value={p.Id_Presentation}>
                        {p.Libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-750 font-semibold mb-1">Conditionnement</label>
                  <select
                    value={selectedConditionnementId}
                    onChange={(e) => setSelectedConditionnementId(Number(e.target.value))}
                    className="w-full bg-white border border-gray-300 rounded p-1 text-xs focus:outline-hidden"
                  >
                    {state.Conditionnement.map((c) => (
                      <option key={c.Id_Conditionnement} value={c.Id_Conditionnement}>
                        {c.Libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-asina-600 hover:bg-asina-700 text-white py-2 px-3 rounded text-xs font-bold transition hover:cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Enregistrer dans la pharmacopée
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100 flex justify-between items-center">
            <span>Codex des Produits / Médicament Conditionnés fini</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {state.Produit.length} Produits référencés
            </span>
          </h3>

          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Code</th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Nom Commercial
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Substance DCI
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Forme & Contenu
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.Produit.map((prod) => {
                  const med = state.Medicament.find((m) => m.Id_Medicament === prod.Id_Medicament);
                  const pres = state.Presentation.find(
                    (p) => p.Id_Presentation === prod.Id_Presentation,
                  );
                  const cond = state.Conditionnement.find(
                    (c) => c.Id_Conditionnement === prod.Id_Conditionnement,
                  );
                  return (
                    <tr key={prod.Id_Produit} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-asina-600 text-[10px]">
                        #PRD-{prod.Id_Produit}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{prod.Nom_Commercial}</td>
                      <td className="p-3 text-slate-600">{med?.Libelle || "Non spécifié"}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {pres?.Libelle} • {cond?.Libelle}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteProduit(prod.Id_Produit)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                          title="Retirer le produit"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: FOURNISSEURS (SUPPLIERS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-asina-50 rounded text-asina-600">
              <Truck className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Enregistrer un Fournisseur
            </h3>
          </div>
          <p className="text-[11px] text-gray-500">
            Créez une entité de distribution pour les flux d'approvisionnement et commandes
            globales.
          </p>

          <form onSubmit={handleCreateFournisseur} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-750 font-semibold mb-1">Raison Sociale / Nom</label>
              <input
                type="text"
                required
                placeholder="EX: MadaPharma Dist., Sanofi Pasteur"
                value={newFournisseurNom}
                onChange={(e) => setNewFournisseurNom(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
              />
            </div>

            <div>
              <label className="block text-gray-750 font-semibold mb-1">Adresse Municipale</label>
              <input
                type="text"
                required
                placeholder="EX: Rue de la Réunion, Moroni"
                value={newFournisseurAdresse}
                onChange={(e) => setNewFournisseurAdresse(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
              />
            </div>

            <div>
              <label className="block text-gray-750 font-semibold mb-1">Téléphone de Contact</label>
              <input
                type="text"
                required
                placeholder="EX: +261 34 00 123 45"
                value={newFournisseurContact}
                onChange={(e) => setNewFournisseurContact(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-asina-600 hover:bg-asina-700 text-white py-2 px-3 rounded text-xs font-bold transition hover:cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Créer la fiche fournisseur
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100 flex justify-between items-center">
            <span>Registres des Fournisseurs Pharmaceutiques Agréés</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {state.Fournisseur.length} Fournisseurs agréés
            </span>
          </h3>

          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">Id</th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Raison Sociale
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Zone / Adresse
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-center">
                    Contact
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-center">
                    Suppression
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.Fournisseur.map((fourn) => (
                  <tr key={fourn.Id_Fournisseur} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[11px] text-gray-400">
                      #F-{fourn.Id_Fournisseur}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{fourn.Nom}</td>
                    <td className="p-3 text-slate-600">{fourn.Adresse}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">
                      {fourn.Contact}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteFournisseur(fourn.Id_Fournisseur)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                        title="Supprimer la fiche fournisseur"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: CONDITIONNEMENTS (COEFFICIENTS DE CONVERSION ET UNITÉS DE BASE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-asina-50 rounded text-asina-600">
              <Sliders className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Nouveau Format de Conditionnement
            </h3>
          </div>
          <p className="text-[11px] text-gray-500">
            Configurez comment une boîte commerciale est divisée en unités de base (ex: Boîte de
            10*10 = 100 comprimés).
          </p>

          <form onSubmit={handleCreateConditionnement} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-750 font-semibold mb-1">
                Code Technique Format
              </label>
              <input
                type="text"
                required
                placeholder="EX: BTE_100 ou BTE_10x10"
                value={newCondCode}
                onChange={(e) => setNewCondCode(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
              />
            </div>

            <div>
              <label className="block text-gray-750 font-semibold mb-1">
                Libellé d'affichage (Explicite)
              </label>
              <input
                type="text"
                required
                placeholder="EX: BTE/10*10 (Boîte de 100)"
                value={newCondLibelle}
                onChange={(e) => setNewCondLibelle(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-750 font-semibold mb-1">Taux Conversion</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="EX: 100"
                  value={newCondTaux}
                  onChange={(e) => setNewCondTaux(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-asina-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-750 font-semibold mb-1">Unité de Base</label>
                <select
                  value={newCondUnite}
                  onChange={(e) => setNewCondUnite(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden text-xs"
                >
                  <option value="Comprimé">Comprimé</option>
                  <option value="Gélule">Gélule</option>
                  <option value="Ampoule">Ampoule</option>
                  <option value="Sachet">Sachet</option>
                  <option value="Flacon">Flacon</option>
                  <option value="Unité">Unité</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-asina-600 hover:bg-asina-700 text-white py-2 px-3 rounded text-xs font-bold transition hover:cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Enregistrer le format
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100 flex justify-between items-center">
            <span>Registre des Formats de Distribution & Unités</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {state.Conditionnement.length} Formats enregistrés
            </span>
          </h3>

          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Code technique
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Libellé d'Emballage
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Multiplicateur
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase">
                    Unité Élémentaire
                  </th>
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase text-center font-semibold">
                    Suppr.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.Conditionnement.map((cond) => (
                  <tr key={cond.Id_Conditionnement} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[10px] text-asina-600 font-bold">
                      {cond.Code}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{cond.Libelle}</td>
                    <td className="p-3 font-mono font-bold text-emerald-600">
                      x{cond.taux_conversion || 1}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-full font-bold">
                        {cond.Unite_Base || "Unité"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteConditionnement(cond.Id_Conditionnement)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                        title="Supprimer ce conditionnement"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
