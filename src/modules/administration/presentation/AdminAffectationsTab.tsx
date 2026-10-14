/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { UserCheck, Plus, Trash2, MapPin, Building2 } from "lucide-react";
import { ASINAState, Affectation } from "@/core/types";
import { isUserAdmin } from "@/core/utils/formatters";
import { administrationApi } from "../infrastructure/administration.api";

interface AdminAffectationsTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

export default function AdminAffectationsTab({
  state,
  updateState,
  triggerNotification,
}: AdminAffectationsTabProps) {
  const [newAffStaffId, setNewAffStaffId] = useState<string>("");
  const [newAffSiteId, setNewAffSiteId] = useState<string>("");
  const [newAffServiceId, setNewAffServiceId] = useState<string>("");
  const [newAffDate, setNewAffDate] = useState<string>(() => {
    try {
      return new Date().toISOString().split("T")[0];
    } catch {
      return "2025-01-01";
    }
  });
  const [searchAffQuery, setSearchAffQuery] = useState<string>("");
  const [filterAffSiteId, setFilterAffSiteId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchAssignmentsFromApi = useCallback(async () => {
    setIsSyncing(true);
    try {
      const assignments = await administrationApi.getAssignments();
      updateState({ Affectation: Array.isArray(assignments) ? assignments : [] });
      triggerNotification(
        "success",
        `${assignments.length} affectation(s) synchronisée(s) depuis l'API.`,
      );
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API /api/assignments: ${err.message || "Erreur réseau"}`,
      );
    } finally {
      setIsSyncing(false);
    }
  }, [updateState, triggerNotification]);

  // Chargement initial depuis l'API Symfony
  useEffect(() => {
    fetchAssignmentsFromApi();
  }, [fetchAssignmentsFromApi]);

  const handleCreateAffectation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAffStaffId || !newAffSiteId || !newAffServiceId) {
      triggerNotification("error", "Veuillez sélectionner le personnel, le site et le service.");
      return;
    }

    const payload: Partial<Affectation> = {
      DateA: newAffDate || new Date().toISOString().split("T")[0],
      Id_staff_profile: Number(newAffStaffId),
      Id_Site: Number(newAffSiteId),
      Id_Service: Number(newAffServiceId),
    };

    try {
      await administrationApi.createAssignment(payload as any);
      await fetchAssignmentsFromApi();
      triggerNotification("success", "Affectation enregistrée avec succès via l'API.");

      setNewAffStaffId("");
      setNewAffSiteId("");
      setNewAffServiceId("");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de l'enregistrement de l'affectation : ${err.message || "Erreur backend"}`,
      );
    }
  };

  const handleDeleteAffectation = async (id: number) => {
    if (!window.confirm("Confirmez-vous le retrait de cette affectation ?")) return;

    try {
      await administrationApi.deleteAssignment(id);
      await fetchAssignmentsFromApi();
      triggerNotification("success", "Affectation supprimée avec succès via l'API.");
    } catch (err: any) {
      triggerNotification(
        "error",
        `Erreur API lors de la suppression : ${err.message || "Erreur backend"}`,
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left Column: Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <UserCheck className="h-4 w-4 text-primary" />
          Affecter un Personnel
        </h3>

        <form onSubmit={handleCreateAffectation} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-750 font-semibold mb-1">
              Agent de santé / Personnel <span className="text-red-500">*</span>
            </label>
            <select
              value={newAffStaffId}
              onChange={(e) => setNewAffStaffId(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden"
              required
            >
              <option value="">-- Sélectionner un agent --</option>
              {state.StaffProfile.filter((sp) => {
                const u = state.User_.find((user) => user.Id_User === sp.Id_User);
                return u ? !isUserAdmin(u) : true;
              }).map((sp) => {
                const u = state.User_.find((user) => user.Id_User === sp.Id_User);
                const displayName = u
                  ? `${u.nom} ${u.prenom} (${sp.Type})`
                  : `Profil #${sp.Id_staff_profile} (${sp.Type})`;
                return (
                  <option key={sp.Id_staff_profile} value={sp.Id_staff_profile}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-gray-750 font-semibold mb-1">
              Site / Antenne Médicale <span className="text-red-500">*</span>
            </label>
            <select
              value={newAffSiteId}
              onChange={(e) => {
                setNewAffSiteId(e.target.value);
                setNewAffServiceId(""); // reset service
              }}
              className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden"
              required
            >
              <option value="">-- Choisir l'établissement --</option>
              {state.Site.map((s) => (
                <option key={s.Id_Site} value={s.Id_Site}>
                  {s.Libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-750 font-semibold mb-1">
              Service d'Affectation <span className="text-red-500">*</span>
            </label>
            <select
              value={newAffServiceId}
              onChange={(e) => setNewAffServiceId(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden"
              disabled={!newAffSiteId}
              required
            >
              <option value="">-- Choisir le service --</option>
              {state.Service.filter((srv) => srv.Id_Site === Number(newAffSiteId)).map((srv) => (
                <option key={srv.Id_Service} value={srv.Id_Service}>
                  {srv.Libelle}
                </option>
              ))}
            </select>
            {!newAffSiteId && (
              <p className="text-[10px] text-gray-400 mt-1">
                Sélectionnez d'abord un site pour voir les services disponibles.
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-750 font-semibold mb-1">
              Date d'Affectation <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={newAffDate}
              onChange={(e) => setNewAffDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded p-1.5 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full btn-primary py-2 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Valider l'affectation
          </button>
        </form>
      </div>

      {/* Right Column: List */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Fiches d'Affectations Actives</h3>
            <span className="text-xs text-slate-500">
              Répartition opérationnelle du personnel par centre médical et service
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-asina-50 text-asina-700 font-bold font-mono px-2.5 py-1 text-[11px] rounded-full border border-asina-100">
              {
                state.Affectation.filter((aff) => {
                  const staff = state.StaffProfile.find(
                    (sp) => sp.Id_staff_profile === aff.Id_staff_profile,
                  );
                  const user = staff ? state.User_.find((u) => u.Id_User === staff.Id_User) : null;
                  const nameMatch = user
                    ? `${user.nom} ${user.prenom}`
                        .toLowerCase()
                        .includes(searchAffQuery.toLowerCase())
                    : false;
                  const roleMatch = staff?.Type.toLowerCase().includes(
                    searchAffQuery.toLowerCase(),
                  );
                  const queryMatch = !searchAffQuery || nameMatch || roleMatch;
                  const siteMatch = !filterAffSiteId || aff.Id_Site === Number(filterAffSiteId);
                  return queryMatch && siteMatch;
                }).length
              }{" "}
              Affectation(s)
            </span>
          </div>
        </div>

        {/* Search and filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Rechercher par nom ou rôle..."
            value={searchAffQuery}
            onChange={(e) => setSearchAffQuery(e.target.value)}
            className="text-xs bg-slate-50 border border-gray-200 rounded-lg p-2 focus:outline-hidden focus:border-primary focus:bg-white"
          />
          <select
            value={filterAffSiteId}
            onChange={(e) => setFilterAffSiteId(e.target.value)}
            className="text-xs bg-slate-50 border border-gray-200 rounded-lg p-2 focus:outline-hidden focus:border-primary focus:bg-white"
          >
            <option value="">Tous les sites</option>
            {state.Site.map((s) => (
              <option key={s.Id_Site} value={s.Id_Site}>
                {s.Libelle}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3">Personnel</th>
                <th className="p-3">Site Médical</th>
                <th className="p-3">Service</th>
                <th className="p-3">Date d'affectation</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.Affectation.filter((aff) => {
                const staff = state.StaffProfile.find(
                  (sp) => sp.Id_staff_profile === aff.Id_staff_profile,
                );
                const user = staff ? state.User_.find((u) => u.Id_User === staff.Id_User) : null;
                const nameMatch = user
                  ? `${user.nom} ${user.prenom}`
                      .toLowerCase()
                      .includes(searchAffQuery.toLowerCase())
                  : false;
                const roleMatch = staff?.Type.toLowerCase().includes(searchAffQuery.toLowerCase());
                const queryMatch = !searchAffQuery || nameMatch || roleMatch;
                const siteMatch = !filterAffSiteId || aff.Id_Site === Number(filterAffSiteId);
                return queryMatch && siteMatch;
              }).map((aff) => {
                const staff = state.StaffProfile.find(
                  (sp) => sp.Id_staff_profile === aff.Id_staff_profile,
                );
                const user = staff ? state.User_.find((u) => u.Id_User === staff.Id_User) : null;
                const site = state.Site.find((s) => s.Id_Site === aff.Id_Site);
                const service = state.Service.find((s) => s.Id_Service === aff.Id_Service);

                return (
                  <tr key={aff.Id_Affectation} className="hover:bg-gray-50/50">
                    <td className="p-3">
                      {user ? (
                        <div>
                          <div className="font-semibold text-gray-900">
                            {user.nom} {user.prenom}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{staff?.Type}</div>
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">Profil #{aff.Id_staff_profile}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-stone-700 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-500" />
                        {site ? site.Libelle : `Site #${aff.Id_Site}`}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-stone-700 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-blue-500" />
                        {service ? service.Libelle : `Service #${aff.Id_Service}`}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-gray-500">{aff.DateA}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Voulez-vous vraiment retirer cette affectation ?")) {
                            handleDeleteAffectation(aff.Id_Affectation);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition cursor-pointer"
                        title="Supprimer l'affectation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {state.Affectation.filter((aff) => {
                const staff = state.StaffProfile.find(
                  (sp) => sp.Id_staff_profile === aff.Id_staff_profile,
                );
                const user = staff ? state.User_.find((u) => u.Id_User === staff.Id_User) : null;
                const nameMatch = user
                  ? `${user.nom} ${user.prenom}`
                      .toLowerCase()
                      .includes(searchAffQuery.toLowerCase())
                  : false;
                const roleMatch = staff?.Type.toLowerCase().includes(searchAffQuery.toLowerCase());
                const queryMatch = !searchAffQuery || nameMatch || roleMatch;
                const siteMatch = !filterAffSiteId || aff.Id_Site === Number(filterAffSiteId);
                return queryMatch && siteMatch;
              }).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                    Aucune affectation correspondante trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
