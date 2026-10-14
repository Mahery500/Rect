/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Printer,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Layers,
} from "lucide-react";
import { ASINAState, Patient } from "@/core/types";
import { patientsRepository } from "../infrastructure/patients.repository";
import { companiesRepository } from "../../companies/infrastructure/companies.repository";

interface ReceptionSearchTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

const getPatientCompanyName = (p: Patient): string => p.Entreprise || "Non rattaché";

export default function ReceptionSearchTab({
  state,
  updateState,
  triggerNotification,
}: ReceptionSearchTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0); // 0 = toutes les entreprises
  const [isSyncing, setIsSyncing] = useState(false);

  // --- IMPRESSION DES CARTES ---
  const [printingId, setPrintingId] = useState<string | null>(null);
  // Entreprise dont le PDF est en cours de génération (une seule à la fois)
  const [printingCompanyId, setPrintingCompanyId] = useState<number | null>(null);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const companyMenuRef = useRef<HTMLDivElement>(null);

  // --- PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Utilisation de useRef pour éviter les re-rendus infinis provoqués par les fonctions de callback
  const updateStateRef = useRef(updateState);
  const triggerNotificationRef = useRef(triggerNotification);

  useEffect(() => {
    updateStateRef.current = updateState;
    triggerNotificationRef.current = triggerNotification;
  }, [updateState, triggerNotification]);

  // Chargement des patients et des entreprises
  const handleRefresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [list, entreprises] = await Promise.all([
        selectedCompanyId
          ? patientsRepository.findByEntreprise(selectedCompanyId)
          : patientsRepository.findAll(),
        companiesRepository.findAll(),
      ]);

      const rawArray: any[] = Array.isArray(list)
        ? list
        : (list as any)?.patients || (list as any)?.["hydra:member"] || [];

      const mapped: Patient[] = rawArray.map((raw: any) => ({
        // Plusieurs formes d'identifiant possibles selon la source (id, idPatient, IRI Hydra « /api/patients/49 »)
        Id_Patient:
          raw.id ??
          raw.idPatient ??
          raw.Id_Patient ??
          String(raw["@id"] ?? "")
            .split("/")
            .pop() ??
          "",
        Matricule: raw.matricule || raw.matriculeAgent || "",
        Nom: raw.nom || "",
        Prenom: raw.prenom || "",
        DateN: raw.dateNaissance || "",
        GS: raw.groupeSanguin || "N/A",
        Id_Entreprise: raw.idEntreprise,
        Entreprise: raw.nomEntreprise,
        Statut: raw.statut,
        MatriculeAgent: raw.matriculeAgent,
      }));

      updateStateRef.current({ Patient: mapped, Entreprise: entreprises });

      triggerNotificationRef.current(
        "success",
        mapped.length > 0
          ? `${mapped.length} patient(s) chargé(s) avec succès.`
          : "Base de données synchronisée (aucun patient trouvé).",
      );
    } catch (error) {
      console.error("Erreur API Patients:", error);
      triggerNotificationRef.current(
        "error",
        "Erreur lors de la récupération des données depuis l'API.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [selectedCompanyId]);

  // Déclencheur contrôlé pour éviter les boucles infinies
  useEffect(() => {
    handleRefresh();
  }, [selectedCompanyId]); // Exécuté uniquement quand le filtre entreprise change ou au montage

  // Réinitialiser la page lors d'un changement de filtre
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCompanyId, itemsPerPage]);

  // Fermer le menu « par entreprise » au clic extérieur ou avec Échap
  useEffect(() => {
    if (!showCompanyMenu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) {
        setShowCompanyMenu(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCompanyMenu(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showCompanyMenu]);

  const handleDelete = async (id: string, matricule: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le patient [${matricule}] ?`)) {
      return;
    }

    try {
      await patientsRepository.remove(id);
      updateState({
        Patient: state.Patient.filter((p) => p.Id_Patient !== id),
      });
      triggerNotification("success", `Patient [${matricule}] supprimé.`);
    } catch (err) {
      triggerNotification(
        "error",
        err instanceof Error ? err.message : `Échec de la suppression du patient [${matricule}].`,
      );
    }
  };

  // Filtre local
  const filteredPatients = state.Patient.filter((p) =>
    `${p.Matricule} ${p.Nom} ${p.Prenom}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculs de pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);

  // Entreprises proposées dans le menu d'impression (triées, filtrables)
  const visibleCompanies = [...(state.Entreprise || [])]
    .filter((ent) => (ent.Nom ?? "").toLowerCase().includes(companyQuery.trim().toLowerCase()))
    .sort((a, b) => (a.Nom ?? "").localeCompare(b.Nom ?? "", "fr"));

  // Ouvre le PDF dans un nouvel onglet. window.open doit être appelé de façon synchrone
  // dans le gestionnaire de clic, sinon le navigateur bloque la fenêtre.
  const openPdf = async (fetchBlob: () => Promise<Blob>) => {
    const win = window.open("", "_blank");
    if (!win) {
      throw new Error("Fenêtre bloquée : autorise les popups pour ce site.");
    }
    win.document.title = "Génération des cartes...";
    win.document.body.innerHTML =
      '<p style="font-family:sans-serif;padding:24px">Génération des cartes en cours...</p>';

    try {
      const blob = await fetchBlob();
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    } catch (error) {
      win.close();
      throw error;
    }
  };

  // Carte individuelle
  const handlePrintSingle = async (patient: Patient) => {
    if (
      patient.Id_Patient === undefined ||
      patient.Id_Patient === null ||
      String(patient.Id_Patient) === ""
    ) {
      triggerNotification(
        "error",
        `Identifiant manquant pour [${patient.Matricule}] : carte impossible.`,
      );
      return;
    }
    setPrintingId(patient.Id_Patient);
    try {
      await openPdf(() => patientsRepository.downloadCard(patient.Id_Patient));
    } catch (err) {
      triggerNotification(
        "error",
        err instanceof Error
          ? err.message
          : `Échec de la génération de la carte [${patient.Matricule}].`,
      );
    } finally {
      setPrintingId(null);
    }
  };

  // Impression massive d'UNE entreprise : toutes ses cartes dans un seul PDF
  const handlePrintCompany = async (companyId: number, companyName: string) => {
    if (printingCompanyId !== null) return; // une génération à la fois
    setShowCompanyMenu(false);
    setPrintingCompanyId(companyId);
    try {
      await openPdf(() => patientsRepository.downloadCompanyCards(companyId));
    } catch (err) {
      triggerNotification(
        "error",
        err instanceof Error
          ? err.message
          : `Échec de la génération des cartes de « ${companyName} ».`,
      );
    } finally {
      setPrintingCompanyId(null);
    }
  };

  const isPrintingCompany = printingCompanyId !== null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-6 animate-fade-in">
      {/* BARRE DE RECHERCHE ET ACTIONS */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par matricule, nom ou prénom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="relative min-w-[220px]">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value={0}>Toutes les entreprises</option>
              {(state.Entreprise || []).map((ent) => (
                <option key={ent.Id_Entreprise} value={ent.Id_Entreprise}>
                  {ent.Nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500 font-medium">
            <strong>{filteredPatients.length}</strong> patient(s) trouvé(s)
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Impression massive : une entreprise à la fois (un PDF par entreprise) */}
            <div className="relative" ref={companyMenuRef}>
              <button
                type="button"
                onClick={() => setShowCompanyMenu((open) => !open)}
                disabled={isPrintingCompany}
                aria-haspopup="listbox"
                aria-expanded={showCompanyMenu}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer disabled:opacity-50"
                title="Imprimer toutes les cartes d'une entreprise (un PDF par entreprise)"
              >
                <Layers className="h-3.5 w-3.5" />
                {isPrintingCompany ? "Génération..." : "Impression par entreprise"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {showCompanyMenu && (
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="search"
                      value={companyQuery}
                      onChange={(e) => setCompanyQuery(e.target.value)}
                      placeholder="Filtrer les entreprises…"
                      aria-label="Filtrer les entreprises"
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <ul
                    role="listbox"
                    aria-label="Entreprises"
                    className="max-h-64 overflow-auto py-1"
                  >
                    {visibleCompanies.length === 0 ? (
                      <li className="px-3 py-3 text-xs text-gray-400">Aucune entreprise.</li>
                    ) : (
                      visibleCompanies.map((ent) => {
                        const isSelected = ent.Id_Entreprise === selectedCompanyId;
                        return (
                          <li key={ent.Id_Entreprise} role="option" aria-selected={isSelected}>
                            <button
                              type="button"
                              onClick={() => handlePrintCompany(ent.Id_Entreprise, ent.Nom)}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-indigo-50 cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-50/60 font-semibold text-indigo-800"
                                  : "text-gray-800"
                              }`}
                            >
                              <span className="truncate">{ent.Nom}</span>
                              <Printer className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Actualiser */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Chargement..." : "Actualiser"}
            </button>
          </div>
        </div>
      </div>

      {/* TABLEAU DES PATIENTS */}
      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                Matricule ASINA
              </th>
              <th className="p-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                Nom & Prénom
              </th>
              <th className="p-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                Entreprise / Affiliation
              </th>
              <th className="p-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-right min-w-[120px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {currentPatients.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-400">
                  {isSyncing
                    ? "Chargement des patients..."
                    : "Aucun patient ne correspond aux critères."}
                </td>
              </tr>
            ) : (
              currentPatients.map((p, index) => {
                const isAgent = p.Statut === "Agent";
                const isAyantDroit = !!p.Statut && p.Statut !== "Agent";
                const companyName = getPatientCompanyName(p);
                const hasId =
                  p.Id_Patient !== undefined &&
                  p.Id_Patient !== null &&
                  String(p.Id_Patient) !== "";
                const isPrinting = hasId && printingId === p.Id_Patient;
                // Clé de secours si l'identifiant manque, pour ne pas casser le rendu de la liste
                const rowKey = hasId ? p.Id_Patient : `${p.Matricule}-${indexOfFirstItem + index}`;

                return (
                  <tr key={rowKey} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono text-xs font-semibold text-gray-900">
                      {p.Matricule}
                    </td>
                    <td className="p-3 text-gray-950 font-medium">
                      {p.Nom} {p.Prenom}
                    </td>
                    <td className="p-3 text-xs space-y-1">
                      <div className="font-semibold text-gray-800">{companyName}</div>
                      <div>
                        {isAgent && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                            Agent Salarié
                          </span>
                        )}
                        {isAyantDroit && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                            Ayant Droit ({p.Statut})
                            {p.MatriculeAgent ? ` · agent ${p.MatriculeAgent}` : ""}
                          </span>
                        )}
                        {!p.Statut && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                            Patient Simple
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintSingle(p)}
                          disabled={isPrinting || !hasId}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title={hasId ? "Imprimer la carte d'adhérent" : "Identifiant manquant"}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          {isPrinting ? "..." : "Carte"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(p.Id_Patient, p.Matricule)}
                          disabled={!hasId}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer disabled:opacity-40"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {filteredPatients.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Afficher</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>éléments par page</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Affichage de <strong className="text-gray-900">{indexOfFirstItem + 1}</strong> à{" "}
              <strong className="text-gray-900">
                {Math.min(indexOfLastItem, filteredPatients.length)}
              </strong>{" "}
              sur <strong className="text-gray-900">{filteredPatients.length}</strong>
            </span>
            <div className="flex items-center gap-1 ml-4">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                title="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
