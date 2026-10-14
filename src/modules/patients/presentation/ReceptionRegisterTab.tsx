/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Eye,
  Printer,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
} from "lucide-react";
import { ASINAState, Patient } from "@/core/types";
import { patientsRepository } from "../infrastructure/patients.repository";

interface ReceptionSearchTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export default function ReceptionSearchTab({
  state,
  updateState,
  triggerNotification,
}: ReceptionSearchTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [viewDetailPatient, setViewDetailPatient] = useState<Patient | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [massPrintPatients, setMassPrintPatients] = useState<Patient[] | null>(null);

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Charger les patients depuis l'API
  const handleRefresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const list = await patientsRepository.findAll();
      if (Array.isArray(list) && list.length > 0) {
        const mapped: Patient[] = list.map((raw, idx) => ({
          Id_Patient: idx + 1,
          Matricule: raw.matricule || raw.matriculeAgent || `PAT-${idx + 1}`,
          Nom: raw.nom || "",
          Prenom: raw.prenom || "",
          DateN: raw.dateNaissance || "",
          GS: raw.groupeSanguin || "N/A",
        }));

        updateState({ Patient: mapped });
        triggerNotification("success", `${list.length} patients chargés avec succès.`);
      } else {
        triggerNotification("success", "Base de données synchronisée (aucun patient trouvé).");
      }
    } catch (error) {
      triggerNotification("error", "Erreur lors de la récupération des patients depuis l'API.");
    } finally {
      setIsSyncing(false);
    }
  }, [updateState, triggerNotification]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCompany, itemsPerPage]);

  const handleDelete = async (id: number, matricule: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le patient ${matricule} ?`)) {
      return;
    }

    try {
      await patientsRepository.remove(id);
      updateState({
        Patient: state.Patient.filter((p) => p.Id_Patient !== id),
      });
      triggerNotification("success", `Patient [${matricule}] supprimé.`);
    } catch {
      triggerNotification("error", `Échec de la suppression du patient [${matricule}].`);
    }
  };

  // Liste des entreprises uniques
  const companiesList = useMemo(() => {
    const list = state.Entreprise || [];
    return list.map((e) => e.Nom_Entreprise).filter(Boolean);
  }, [state.Entreprise]);

  // Récupérer le nom de l'entreprise rattachée au patient
  const getPatientCompanyName = (patientId: number): string => {
    const agent = state.Agent.find((a) => a.Id_Patient === patientId);
    if (agent) {
      const ent = state.Entreprise.find((e) => e.Id_Entreprise === agent.Id_Entreprise);
      return ent ? ent.Nom_Entreprise : "Indépendant / Non spécifié";
    }

    const ayantDroit = state.Ayant_Droit.find((ad) => ad.Id_Patient_1 === patientId);
    if (ayantDroit) {
      const parentAgent = state.Agent.find((a) => a.Id_Patient === ayantDroit.Id_Patient);
      if (parentAgent) {
        const ent = state.Entreprise.find((e) => e.Id_Entreprise === parentAgent.Id_Entreprise);
        return ent ? ent.Nom_Entreprise : "Indépendant / Non spécifié";
      }
    }

    return "Non rattaché";
  };

  // Logique de filtrage
  const filteredPatients = state.Patient.filter((p) => {
    const searchString = `${p.Matricule} ${p.Nom} ${p.Prenom}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCompany === "ALL") return true;

    return getPatientCompanyName(p.Id_Patient) === selectedCompany;
  });

  // Calculs de pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);

  // Action d'impression individuelle directe
  const handlePrintSingle = (patient: Patient) => {
    setViewDetailPatient(patient);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Action d'impression massive de la page actuelle
  const handlePrintMassive = () => {
    if (currentPatients.length === 0) {
      triggerNotification("error", "Aucun patient à imprimer.");
      return;
    }
    setMassPrintPatients(currentPatients);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-6 animate-fade-in">
      {/* Barre de recherche, filtres et actions */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-3xl">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par matricule, nom ou prénom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filtre Entreprise */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Toutes les entreprises</option>
              {companiesList.map((company, idx) => (
                <option key={idx} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Boutons d'impression massive, actualisation et statistiques */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <button
            onClick={handlePrintMassive}
            disabled={currentPatients.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Imprimer toutes les cartes affichées sur la page"
          >
            <Layers className="h-3.5 w-3.5" />
            Impression massive ({currentPatients.length})
          </button>

          <button
            onClick={handleRefresh}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      {/* Tableau d'affichage */}
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
              <th className="p-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                Groupe Sanguin
              </th>
              <th className="p-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {currentPatients.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  {isSyncing ? "Chargement des patients..." : "Aucun patient trouvé."}
                </td>
              </tr>
            ) : (
              currentPatients.map((p) => {
                const isAgent = state.Agent.some((a) => a.Id_Patient === p.Id_Patient);
                const isAyantDroit = state.Ayant_Droit.find((d) => d.Id_Patient_1 === p.Id_Patient);
                const companyName = getPatientCompanyName(p.Id_Patient);

                return (
                  <tr key={p.Id_Patient} className="hover:bg-gray-50/50">
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
                            Ayant Droit (
                            {isAyantDroit.Relation === "CJ"
                              ? "Conjoint"
                              : `Enfant ${isAyantDroit.Relation}`}
                            )
                          </span>
                        )}
                        {!isAgent && !isAyantDroit && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                            Patient Simple
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-xs font-bold">
                        {p.GS}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewDetailPatient(p)}
                          className="text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Fiche
                        </button>

                        {/* Bouton d'impression individuelle */}
                        <button
                          onClick={() => handlePrintSingle(p)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                          title="Imprimer la carte individuelle"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Carte
                        </button>

                        <button
                          onClick={() => handleDelete(p.Id_Patient, p.Matricule)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Supprimer le dossier patient"
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

      {/* Barre de Pagination */}
      {filteredPatients.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Afficher</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-hidden focus:border-primary"
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

      {/* Modal Fiche / Carte Individuelle */}
      {viewDetailPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-300 shadow-xl max-w-lg w-full p-6 space-y-6 animate-fade-in">
            <div
              id="print-area"
              className="border-4 border-primary/20 rounded-xl p-5 bg-stone-50 space-y-4"
            >
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">ASINA MEDICAL</h2>
                  <p className="text-xs text-gray-400">Système Hospitalier & Pharmaceutique</p>
                </div>
                <span className="px-3 py-1 font-mono text-xs bg-primary text-white font-bold rounded">
                  {viewDetailPatient.Matricule}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">Nom</span>
                  <span className="font-bold text-gray-900">{viewDetailPatient.Nom}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">
                    Prénom
                  </span>
                  <span className="font-bold text-gray-900">{viewDetailPatient.Prenom}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">
                    Entreprise
                  </span>
                  <span className="font-medium text-gray-800">
                    {getPatientCompanyName(viewDetailPatient.Id_Patient)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">
                    Groupe Sanguin
                  </span>
                  <span className="text-sm font-bold text-red-600">{viewDetailPatient.GS}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Imprimer cette carte
              </button>
              <button
                onClick={() => setViewDetailPatient(null)}
                className="btn-primary px-5 py-2 text-sm cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impression Massive */}
      {massPrintPatients && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-300 shadow-xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Impression en lot ({massPrintPatients.length} carte(s))
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Lancer l'impression
                </button>
                <button
                  onClick={() => setMassPrintPatients(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Cartes à imprimer (mises en page pour la planche d'impression) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {massPrintPatients.map((p) => (
                <div
                  key={p.Id_Patient}
                  className="border-2 border-primary/30 rounded-xl p-4 bg-stone-50 space-y-3"
                >
                  <div className="flex justify-between items-start border-b border-gray-200 pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">ASINA MEDICAL</h4>
                      <p className="text-[10px] text-gray-400">Carte de Patient</p>
                    </div>
                    <span className="px-2 py-0.5 font-mono text-[10px] bg-primary text-white font-bold rounded">
                      {p.Matricule}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-[10px] text-gray-400 font-semibold">
                        Nom & Prénom
                      </span>
                      <span className="font-bold text-gray-900">
                        {p.Nom} {p.Prenom}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-semibold">
                        Groupe Sanguin
                      </span>
                      <span className="font-bold text-red-600">{p.GS}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[10px] text-gray-400 font-semibold">
                        Entreprise
                      </span>
                      <span className="font-medium text-gray-800">
                        {getPatientCompanyName(p.Id_Patient)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
