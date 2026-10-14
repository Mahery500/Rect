/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  Filter,
  Layers,
  Loader2,
  Printer,
  Search,
  User,
} from "lucide-react";
import { ASINAState, Patient } from "@/core/types";
import { patientsRepository } from "../infrastructure/patients.repository";

type PatientId = Patient["Id_Patient"];
type Mode = "patient" | "entreprise";

interface ReceptionAdherentCardTabProps {
  state: ASINAState;
  selectedPatientId?: PatientId | null;
  triggerNotification?: (type: "success" | "error", text: string) => void;
}

interface LoadedPdf {
  url: string;
  filename: string;
  label: string;
}

const PAGE_SIZE = 8;

const hasId = (id: unknown): id is NonNullable<PatientId> =>
  id !== undefined && id !== null && String(id).trim() !== "";

const slug = (value: string) =>
  value.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "carte";

const statusLabel = (p: Patient) =>
  p.Statut === "Agent" ? "Salarié" : p.Statut ? "Ayant droit" : "Patient";

/**
 * Affiche les VRAIES cartes d'adhérent : le PDF généré par le backend
 * (MemberCardPdfGenerator), pour un adhérent ou pour toute une entreprise.
 * Le modèle (La Sérénité / ASINA) est déduit par le serveur de la SMIE de l'entreprise.
 */
export const ReceptionAdherentCardTab: React.FC<ReceptionAdherentCardTabProps> = ({
  state,
  selectedPatientId,
  triggerNotification,
}) => {
  const [mode, setMode] = useState<Mode>("patient");
  const [searchQuery, setSearchQuery] = useState("");
  const [listCompany, setListCompany] = useState(""); // filtre entreprise de la liste ('' = toutes)
  const [currentPage, setCurrentPage] = useState(1);
  const [activePatientId, setActivePatientId] = useState<PatientId | null>(
    selectedPatientId ?? state.Patient[0]?.Id_Patient ?? null,
  );
  const [companyId, setCompanyId] = useState<number>(0);

  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlRef = useRef<string | null>(null); // URL blob courante, à libérer quand elle est remplacée
  const requestSeq = useRef(0); // ignore les réponses d'une demande dépassée
  const notifyRef = useRef(triggerNotification);

  useEffect(() => {
    notifyRef.current = triggerNotification;
  }, [triggerNotification]);

  /* ---------- Gestion du PDF affiché ---------- */
  const replacePdf = useCallback((next: LoadedPdf | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next?.url ?? null;
    setPdf(next);
  }, []);

  useEffect(
    () => () => {
      requestSeq.current++;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const loadPdf = useCallback(
    async (fetchBlob: () => Promise<Blob>, filename: string, label: string) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const blob = await fetchBlob();
        if (seq !== requestSeq.current) return;
        const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        replacePdf({ url, filename, label });
      } catch (err) {
        if (seq !== requestSeq.current) return;
        replacePdf(null);
        const message = err instanceof Error ? err.message : "Échec de la génération de la carte.";
        setError(message);
        notifyRef.current?.("error", message);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [replacePdf],
  );

  /* ---------- Données ---------- */
  const patient = useMemo(
    () =>
      hasId(activePatientId)
        ? (state.Patient.find((p) => p.Id_Patient === activePatientId) ?? null)
        : null,
    [state.Patient, activePatientId],
  );

  const companies = useMemo(
    () =>
      [...(state.Entreprise || [])].sort((a, b) => (a.Nom ?? "").localeCompare(b.Nom ?? "", "fr")),
    [state.Entreprise],
  );

  const selectedCompany = useMemo(
    () => companies.find((c) => c.Id_Entreprise === companyId) ?? null,
    [companies, companyId],
  );

  // Entreprises présentes dans la liste des adhérents (pour le filtre de la liste)
  const listCompanies = useMemo(
    () =>
      Array.from(
        new Set(state.Patient.map((p) => p.Entreprise).filter((e): e is string => !!e)),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [state.Patient],
  );

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.Patient.filter((p) => {
      if (listCompany && p.Entreprise !== listCompany) return false;
      if (!q) return true;
      return (
        `${p.Nom} ${p.Prenom}`.toLowerCase().includes(q) ||
        (p.Matricule && p.Matricule.toLowerCase().includes(q))
      );
    });
  }, [state.Patient, searchQuery, listCompany]);

  // Pagination de la liste
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPatients = filteredPatients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Sélection par défaut quand les patients arrivent après le montage
  useEffect(() => {
    if (!hasId(activePatientId) && state.Patient.length > 0 && hasId(state.Patient[0].Id_Patient)) {
      setActivePatientId(state.Patient[0].Id_Patient);
    }
  }, [state.Patient, activePatientId]);

  // Navigation depuis l'onglet de recherche vers un patient précis
  useEffect(() => {
    if (hasId(selectedPatientId)) {
      setActivePatientId(selectedPatientId);
      setMode("patient");
    }
  }, [selectedPatientId]);

  /* ---------- Carte individuelle : chargée automatiquement à la sélection ---------- */
  useEffect(() => {
    if (mode !== "patient") return;
    if (!patient) {
      replacePdf(null);
      return;
    }
    if (!hasId(patient.Id_Patient)) {
      requestSeq.current++;
      replacePdf(null);
      setLoading(false);
      setError(`Identifiant manquant pour [${patient.Matricule}] : carte impossible.`);
      return;
    }
    loadPdf(
      () => patientsRepository.downloadCard(patient.Id_Patient),
      `carte-${slug(patient.Matricule || String(patient.Id_Patient))}.pdf`,
      `${patient.Nom} ${patient.Prenom}`.trim(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, patient?.Id_Patient]);

  /* ---------- Cartes d'une entreprise : générées à la demande (PDF potentiellement volumineux) ---------- */
  const handleGenerateCompany = () => {
    if (!selectedCompany) return;
    loadPdf(
      () => patientsRepository.downloadCompanyCards(selectedCompany.Id_Entreprise),
      `cartes-${slug(selectedCompany.Nom)}.pdf`,
      `Toutes les cartes — ${selectedCompany.Nom}`,
    );
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    requestSeq.current++; // annule toute génération en cours
    replacePdf(null);
    setError(null);
    setLoading(false);
    setMode(next);
  };

  /* ---------- Actions sur le PDF ---------- */
  const handlePrint = () => {
    if (!pdf) return;
    try {
      const frame = iframeRef.current?.contentWindow;
      if (!frame) throw new Error("Aperçu indisponible");
      frame.focus();
      frame.print();
    } catch {
      // Certains navigateurs refusent d'imprimer un PDF intégré : on l'ouvre dans un onglet.
      window.open(pdf.url, "_blank");
    }
  };

  const handleDownload = () => {
    if (!pdf) return;
    const a = document.createElement("a");
    a.href = pdf.url;
    a.download = pdf.filename;
    a.click();
    notifyRef.current?.("success", "PDF téléchargé.");
  };

  const handleOpenTab = () => {
    if (pdf) window.open(pdf.url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-asina-600" />
            <span>Cartes d'Adhérents</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aperçu, impression et téléchargement des cartes officielles (PDF généré par le serveur)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenTab}
            disabled={!pdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Ouvrir le PDF dans un nouvel onglet"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Ouvrir</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!pdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Télécharger le PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Télécharger</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!pdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-asina-600 hover:bg-asina-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Imprimer le PDF affiché"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche : choix de la carte */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            {/* Mode */}
            <div
              className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold"
              role="tablist"
              aria-label="Type d'impression"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "patient"}
                onClick={() => switchMode("patient")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition cursor-pointer ${
                  mode === "patient"
                    ? "bg-white text-asina-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                Un adhérent
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "entreprise"}
                onClick={() => switchMode("entreprise")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition cursor-pointer ${
                  mode === "entreprise"
                    ? "bg-white text-asina-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Une entreprise
              </button>
            </div>

            {mode === "patient" ? (
              <>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Rechercher nom, prénom, matricule..."
                    aria-label="Rechercher un adhérent"
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-asina-500 focus:ring-1 focus:ring-asina-500"
                  />
                </div>

                <div className="relative">
                  <Filter className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={listCompany}
                    onChange={(e) => {
                      setListCompany(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filtrer par entreprise"
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-asina-500 focus:ring-1 focus:ring-asina-500"
                  >
                    <option value="">Toutes les entreprises</option>
                    {listCompanies.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {paginatedPatients.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic">
                      {state.Patient.length === 0
                        ? "Aucun patient chargé. Ouvrez d'abord l'onglet de recherche."
                        : "Aucun adhérent trouvé"}
                    </div>
                  ) : (
                    paginatedPatients.map((p, index) => {
                      const idOk = hasId(p.Id_Patient);
                      const isSelected = idOk && p.Id_Patient === activePatientId;
                      return (
                        <button
                          key={idOk ? p.Id_Patient : `${p.Matricule}-${index}`}
                          type="button"
                          disabled={!idOk}
                          onClick={() => setActivePatientId(p.Id_Patient)}
                          className={`w-full text-left p-2.5 text-xs transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelected
                              ? "bg-asina-50 text-asina-900 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                          title={idOk ? undefined : "Identifiant manquant"}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              {p.Nom} {p.Prenom}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              Mat: <span className="font-mono">{p.Matricule}</span>
                              {p.Entreprise ? ` • ${p.Entreprise}` : ""}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ${
                              p.Statut === "Agent"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {statusLabel(p)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {filteredPatients.length} adhérent{filteredPatients.length > 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                      disabled={safePage === 1}
                      className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Page précédente"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2 font-semibold text-slate-700">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage === totalPages}
                      className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Page suivante"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="card-company"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Entreprise
                  </label>
                  <div className="relative">
                    <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      id="card-company"
                      value={companyId}
                      onChange={(e) => setCompanyId(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:border-asina-500 focus:ring-1 focus:ring-asina-500"
                    >
                      <option value={0}>Sélectionner une entreprise…</option>
                      {companies.map((c) => (
                        <option key={c.Id_Entreprise} value={c.Id_Entreprise}>
                          {c.Nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedCompany?.Smie && (
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Modèle de carte : {selectedCompany.Smie === "asina" ? "ASINA" : "La Sérénité"}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCompany}
                  disabled={!companyId || loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                  {loading ? "Génération…" : "Générer toutes les cartes"}
                </button>
                <p className="text-[11px] text-slate-400">
                  Un seul PDF avec les cartes de tous les adhérents de l'entreprise (agents et
                  ayants droit).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : le vrai PDF */}
        <div className="lg:col-span-8">
          <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300/80 shadow-inner">
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 truncate">
                {pdf ? pdf.label : "Aperçu de la carte"}
              </span>
              {loading && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Génération en cours…
                </span>
              )}
            </div>

            <div className="relative h-[70vh] min-h-[420px] rounded-xl overflow-hidden bg-white border border-slate-200">
              {pdf && (
                <iframe
                  ref={iframeRef}
                  key={pdf.url}
                  src={pdf.url}
                  title={`Carte d'adhérent — ${pdf.label}`}
                  className="absolute inset-0 w-full h-full"
                />
              )}

              {!pdf && !loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-slate-400 p-6">
                  <CreditCard className="h-8 w-8" />
                  <p className="text-sm">
                    {mode === "patient"
                      ? "Sélectionnez un adhérent pour afficher sa carte."
                      : "Choisissez une entreprise puis générez ses cartes."}
                  </p>
                </div>
              )}

              {loading && !pdf && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Génération de la carte…
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div
                    role="alert"
                    className="max-w-md flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              Document officiel généré par le serveur. Compatible imprimantes badges PVC (Zebra,
              Evolis) et impression papier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionAdherentCardTab;
