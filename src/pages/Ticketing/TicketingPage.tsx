/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  LifeBuoy,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Send,
  X,
  Laptop,
  Wrench,
  Package,
  Building,
} from "lucide-react";
import { ASINAState, User_ } from "@/core/types";
import {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/core/types/ticketing.types";
import { supportTicketingService } from "@/modules/ticketing/application/supportTicketing.service";

interface TicketingPageProps {
  state: ASINAState;
  activeUser: User_ | null;
  activeSiteId: number;
  triggerNotification?: (type: "success" | "error", text: string) => void;
}

export const TicketingPage: React.FC<TicketingPageProps> = ({
  state,
  activeUser,
  activeSiteId,
  triggerNotification,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => supportTicketingService.getAll());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [filterMyTickets, setFilterMyTickets] = useState<boolean>(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Modal create ticket
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<TicketCategory>("informatique");
  const [newPriority, setNewPriority] = useState<TicketPriority>("normale");
  const [newAssigneeId, setNewAssigneeId] = useState<string>("");

  // Comment input
  const [newComment, setNewComment] = useState("");

  // Subscribe to service
  useEffect(() => {
    const unsub = supportTicketingService.subscribe(() => {
      setTickets(supportTicketingService.getAll());
    });
    return unsub;
  }, []);

  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = selectedCategory === "ALL" || t.category === selectedCategory;
      const matchStatus = selectedStatus === "ALL" || t.status === selectedStatus;
      const matchUser =
        !filterMyTickets ||
        (activeUser &&
          (t.createdById === activeUser.Id_User || t.assignedToId === activeUser.Id_User));

      return matchSearch && matchCat && matchStatus && matchUser;
    });
  }, [tickets, searchQuery, selectedCategory, selectedStatus, filterMyTickets, activeUser]);

  // Statistics
  const countTotal = tickets.length;
  const countOpen = tickets.filter((t) => t.status === "nouveau" || t.status === "en_cours").length;
  const countUrgent = tickets.filter(
    (t) => t.priority === "urgente" && t.status !== "resolu" && t.status !== "ferme",
  ).length;
  const countResolved = tickets.filter((t) => t.status === "resolu" || t.status === "ferme").length;

  const getCategoryBadge = (cat: TicketCategory) => {
    switch (cat) {
      case "biomedical":
        return {
          label: "Biomédical",
          icon: Wrench,
          color: "bg-indigo-100 text-indigo-700 border-indigo-200",
        };
      case "informatique":
        return {
          label: "Informatique",
          icon: Laptop,
          color: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case "logistique":
        return {
          label: "Logistique / Stock",
          icon: Package,
          color: "bg-amber-100 text-amber-700 border-amber-200",
        };
      case "locaux":
        return {
          label: "Locaux & Bâtiment",
          icon: Building,
          color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        };
      default:
        return {
          label: "Administratif",
          icon: LifeBuoy,
          color: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case "urgente":
        return { label: "Urgente", color: "bg-red-100 text-red-700 font-bold border-red-200" };
      case "haute":
        return {
          label: "Haute",
          color: "bg-amber-100 text-amber-800 font-semibold border-amber-200",
        };
      case "normale":
        return { label: "Normale", color: "bg-blue-50 text-blue-700 border-blue-200" };
      default:
        return { label: "Basse", color: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case "nouveau":
        return { label: "Nouveau", color: "bg-sky-100 text-sky-800 border-sky-300" };
      case "en_cours":
        return { label: "En cours", color: "bg-amber-100 text-amber-800 border-amber-300" };
      case "en_attente":
        return { label: "En attente", color: "bg-purple-100 text-purple-800 border-purple-300" };
      case "resolu":
        return { label: "Résolu", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
      case "ferme":
        return { label: "Fermé", color: "bg-slate-200 text-slate-700 border-slate-300" };
    }
  };

  // Create ticket submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const assignedUser = state.User_.find((u) => u.Id_User === Number(newAssigneeId));

    supportTicketingService.createTicket({
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCategory,
      priority: newPriority,
      siteId: activeSiteId,
      createdById: activeUser?.Id_User || 1,
      createdByName: activeUser ? `${activeUser.nom} ${activeUser.prenom}` : "Personnel ASINA",
      assignedToId: assignedUser?.Id_User || null,
      assignedToName: assignedUser ? `${assignedUser.nom} ${assignedUser.prenom}` : "Non assigné",
    });

    setShowCreateModal(false);
    setNewTitle("");
    setNewDesc("");
    setNewAssigneeId("");
    if (triggerNotification) {
      triggerNotification("success", "Ticket de support créé avec succès");
    }
  };

  // Add comment submit
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    supportTicketingService.addComment(selectedTicket.id, {
      authorId: activeUser?.Id_User || 1,
      authorName: activeUser ? `${activeUser.nom} ${activeUser.prenom}` : "Personnel ASINA",
      authorRole: activeUser?.role || "Personnel",
      content: newComment.trim(),
    });

    setNewComment("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-asina-600" />
              <span>Gestion du Ticketing & Demandes d'Intervention</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Centre d'assistance technique, maintenance biomédicale, logistique et support interne
              ASINA
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-asina-600 hover:bg-asina-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Ticket</span>
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-150">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Total Demandes
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{countTotal}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>En cours / Ouverts</span>
            </div>
            <div className="text-xl font-bold text-amber-900 mt-0.5">{countOpen}</div>
          </div>
          <div className="p-3 rounded-lg bg-red-50/70 border border-red-200/80">
            <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Urgents</span>
            </div>
            <div className="text-xl font-bold text-red-900 mt-0.5">{countUrgent}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Résolus</span>
            </div>
            <div className="text-xl font-bold text-emerald-900 mt-0.5">{countResolved}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, code (#TCK-...), description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-asina-500 focus:ring-1 focus:ring-asina-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setFilterMyTickets(!filterMyTickets)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                filterMyTickets
                  ? "bg-asina-50 text-asina-700 border-asina-300 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Mes Demandes
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              <option value="ALL">Toutes Catégories</option>
              <option value="biomedical">Biomédical</option>
              <option value="informatique">Informatique</option>
              <option value="logistique">Logistique / Pharmacie</option>
              <option value="locaux">Locaux & Maintenance</option>
              <option value="administratif">Administratif</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              <option value="ALL">Tous Statuts</option>
              <option value="nouveau">Nouveau</option>
              <option value="en_cours">En cours</option>
              <option value="en_attente">En attente</option>
              <option value="resolu">Résolu</option>
              <option value="ferme">Fermé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tickets List & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tickets Table / List */}
        <div className={selectedTicket ? "lg:col-span-7 space-y-3" : "lg:col-span-12 space-y-3"}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                    <th className="p-3">Code</th>
                    <th className="p-3">Titre & Catégorie</th>
                    <th className="p-3">Demandeur</th>
                    <th className="p-3">Priorité</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                        Aucun ticket ne correspond à vos filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => {
                      const catBadge = getCategoryBadge(t.category);
                      const prioBadge = getPriorityBadge(t.priority);
                      const statusBadge = getStatusBadge(t.status);
                      const CatIcon = catBadge.icon;
                      const isSelected = t.id === selectedTicketId;

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`transition cursor-pointer ${
                            isSelected ? "bg-asina-50/70 font-medium" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-asina-800 whitespace-nowrap">
                            {t.code}
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-slate-900 truncate">{t.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${catBadge.color}`}
                              >
                                <CatIcon className="w-2.5 h-2.5" />
                                <span>{catBadge.label}</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{t.createdByName}</div>
                            <div className="text-[10px] text-slate-400">
                              Assigné à :{" "}
                              <span className="text-slate-600">{t.assignedToName || "—"}</span>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${prioBadge.color}`}
                            >
                              {prioBadge.label}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadge.color}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketId(t.id);
                              }}
                              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-asina-600 hover:text-white rounded-md font-semibold transition cursor-pointer"
                            >
                              Ouvrir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ticket Details Panel */}
        {selectedTicket && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-asina-700">
                    {selectedTicket.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(selectedTicket.status).color}`}
                  >
                    {getStatusBadge(selectedTicket.status).label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedTicket.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {selectedTicket.description}
            </div>

            {/* Status change actions */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-500">Changer le statut :</span>
              <div className="flex gap-1.5 flex-wrap">
                {(["nouveau", "en_cours", "en_attente", "resolu", "ferme"] as TicketStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => supportTicketingService.updateStatus(selectedTicket.id, st)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition cursor-pointer border ${
                        selectedTicket.status === st
                          ? "bg-asina-600 text-white border-asina-700 shadow-2xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {getStatusBadge(st).label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Comments / Timeline */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-asina-600" />
                <span>Interventions & Commentaires ({selectedTicket.comments.length})</span>
              </h4>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {selectedTicket.comments.length === 0 ? (
                  <div className="text-center p-3 text-slate-400 text-xs italic">
                    Aucun message sur ce ticket.
                  </div>
                ) : (
                  selectedTicket.comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-800">
                          {c.authorName} ({c.authorRole})
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply form */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter une note d'intervention..."
                  className="flex-1 p-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-asina-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-3 py-2 bg-asina-600 hover:bg-asina-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nouveau Ticket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-asina-600" />
                <span>Ouvrir une Demande d'Intervention / Ticket</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Intitulé du problème / Demande <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Tensiomètre électronique bloqué sur Erreur 03"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-asina-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="biomedical">Biomédical & Appareils</option>
                    <option value="informatique">Informatique & Réseau</option>
                    <option value="logistique">Logistique & Pharmacie</option>
                    <option value="locaux">Bâtiment & Locaux</option>
                    <option value="administratif">Administratif</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente (Bloquant)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigner à un technicien / personnel (Optionnel)
                </label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Non assigné (File commune) --</option>
                  {state.User_.map((u) => (
                    <option key={u.Id_User} value={u.Id_User}>
                      {u.nom} {u.prenom} ({u.role || "Personnel"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description détaillée <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Décrivez les symptômes, le service concerné, les étapes pour reproduire..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-asina-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-asina-600 hover:bg-asina-700 text-white rounded-lg font-bold shadow-sm transition"
                >
                  Enregistrer le Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketingPage;
