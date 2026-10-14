/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { ASINAState } from "@/core/types";
import {
  patientsImportRepository,
  ImportPatientsResult,
} from "../infrastructure/patients-import.repository";
import { companiesRepository } from "../../companies/infrastructure/companies.repository"; // à adapter

interface ReceptionImportTabProps {
  state: ASINAState;
  updateState: (newState: Partial<ASINAState>) => void;
  triggerNotification: (type: "success" | "error", text: string) => void;
}

const EMPTY_ENTREPRISE = {
  nom: "",
  matriculeAsina: "",
  raisonSociale: "",
  numeroCnaps: "",
  adresse: "",
  contact: "",
};

/**
 * Onglet "Import en masse".
 *
 * Upload réel d'un fichier Excel (.xlsx) en `multipart/form-data` vers
 * `POST /api/import-patients`. Règle métier imposée par le backend : chaque
 * agent doit précéder ses ayants droit dans le fichier ; tout-ou-rien à la
 * moindre erreur.
 *
 * Gestion des entreprises depuis cet onglet : liste, création (POST),
 * modification (PUT) et suppression (DELETE) sur /api/entreprises.
 */
export default function ReceptionImportTab({
  state,
  updateState,
  triggerNotification,
}: ReceptionImportTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number>(
    state.Entreprise[0]?.Id_Entreprise || 0,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportPatientsResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Création / modification d'entreprise ---
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // null = création
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newEntreprise, setNewEntreprise] = useState(EMPTY_ENTREPRISE);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setResult(null);
    setErrorMessage(null);
  };

  const openCreate = () => {
    if (showForm && editingId === null) {
      setShowForm(false);
      return;
    }
    setEditingId(null);
    setNewEntreprise(EMPTY_ENTREPRISE);
    setShowForm(true);
  };

  const openEdit = (ent: ASINAState["Entreprise"][number]) => {
    setEditingId(ent.Id_Entreprise);
    setNewEntreprise({
      nom: ent.Nom ?? "",
      matriculeAsina: ent.MatriculeAsina ?? "",
      raisonSociale: ent.RaisonSociale ?? "",
      numeroCnaps: ent.NumeroCnaps ?? "",
      adresse: ent.Adresse ?? "",
      contact: ent.Contact ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setNewEntreprise(EMPTY_ENTREPRISE);
  };

  const reloadEntreprises = async () => {
    const entreprises = await companiesRepository.findAll();
    updateState({ Entreprise: entreprises });
    return entreprises;
  };

  const handleSubmitEntreprise = async () => {
    const nom = newEntreprise.nom.trim();
    const matriculeAsina = newEntreprise.matriculeAsina.trim();
    if (!nom || !matriculeAsina) {
      triggerNotification("error", "Le nom et le matricule Asina (sigle) sont obligatoires.");
      return;
    }

    const orNull = (v: string) => v.trim() || null;
    const payload = {
      nom,
      matriculeAsina,
      raisonSociale: orNull(newEntreprise.raisonSociale),
      numeroCnaps: orNull(newEntreprise.numeroCnaps),
      adresse: orNull(newEntreprise.adresse),
      contact: orNull(newEntreprise.contact),
    };

    setIsSaving(true);
    try {
      if (editingId !== null) {
        await companiesRepository.save(editingId, payload);
        await reloadEntreprises();
        triggerNotification("success", `Entreprise « ${nom} » modifiée.`);
      } else {
        await companiesRepository.create(payload);
        // On recharge la liste : plus fiable que de se fier à l'id renvoyé par le POST.
        const entreprises = await reloadEntreprises();
        const creee = entreprises.find((e) => e.Nom === nom && e.MatriculeAsina === matriculeAsina);
        if (creee) setSelectedEntreprise(creee.Id_Entreprise);
        triggerNotification("success", `Entreprise « ${nom} » créée.`);
      }
      closeForm();
    } catch (err) {
      triggerNotification(
        "error",
        err instanceof Error ? err.message : "Échec de l'enregistrement de l'entreprise.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntreprise = async (ent: ASINAState["Entreprise"][number]) => {
    if (!window.confirm(`Supprimer l'entreprise « ${ent.Nom} » ? Cette action est définitive.`))
      return;

    setDeletingId(ent.Id_Entreprise);
    try {
      await companiesRepository.remove(ent.Id_Entreprise);
      await reloadEntreprises();
      if (selectedEntreprise === ent.Id_Entreprise) setSelectedEntreprise(0);
      if (editingId === ent.Id_Entreprise) closeForm();
      triggerNotification("success", `Entreprise « ${ent.Nom} » supprimée.`);
    } catch (err) {
      // Ex. 409 : des patients sont encore rattachés à cette entreprise
      triggerNotification(
        "error",
        err instanceof Error ? err.message : "Échec de la suppression de l'entreprise.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      triggerNotification("error", "Veuillez sélectionner un fichier Excel (.xlsx).");
      return;
    }
    if (!selectedEntreprise) {
      triggerNotification("error", "Veuillez sélectionner une entreprise.");
      return;
    }

    setIsUploading(true);
    setResult(null);
    setErrorMessage(null);
    try {
      // POST /api/import-patients — multipart/form-data réel.
      const response = await patientsImportRepository.uploadFile(selectedFile, selectedEntreprise);
      setResult(response);
      triggerNotification("success", "Fichier envoyé et traité par POST /api/import-patients.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'import.";
      setErrorMessage(message);
      triggerNotification("error", message);
    } finally {
      setIsUploading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <form
        onSubmit={handleUpload}
        className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-6"
      >
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <UploadCloud className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Import Excel de salariés</h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-xs text-blue-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Règle imposée par le backend : chaque <strong>Agent</strong> doit être placé{" "}
            <strong>avant</strong> ses ayants droit dans le fichier, avec une colonne
            "Agent/Conjoint/Enfant" indiquant le rôle de chaque ligne. À la moindre erreur, rien
            n'est enregistré et toutes les erreurs sont listées.
          </span>
        </div>

        {/* ===== Entreprise concernée + création / modification ===== */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Entreprise concernée
            </label>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Nouvelle entreprise
            </button>
          </div>

          <select
            required
            value={selectedEntreprise}
            onChange={(e) => setSelectedEntreprise(Number(e.target.value))}
            className={inputClass}
          >
            <option value={0}>Sélectionner une entreprise</option>
            {state.Entreprise.map((ent) => (
              <option key={ent.Id_Entreprise} value={ent.Id_Entreprise}>
                {ent.Nom}
              </option>
            ))}
          </select>

          {showForm && (
            <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {editingId !== null ? "Modifier l'entreprise" : "Nouvelle entreprise"}
              </div>
              {editingId !== null && (
                <p className="text-xs text-amber-700">
                  Modifier le matricule Asina ne change pas les matricules déjà générés pour les
                  patients.
                </p>
              )}
              <input
                type="text"
                maxLength={100}
                placeholder="Nom *"
                value={newEntreprise.nom}
                onChange={(e) => setNewEntreprise((s) => ({ ...s, nom: e.target.value }))}
                className={inputClass}
              />
              <input
                type="text"
                maxLength={100}
                placeholder="Matricule Asina / sigle * (ex. 1234546)"
                value={newEntreprise.matriculeAsina}
                onChange={(e) =>
                  setNewEntreprise((s) => ({ ...s, matriculeAsina: e.target.value }))
                }
                className={inputClass}
              />
              <input
                type="text"
                maxLength={100}
                placeholder="Raison sociale"
                value={newEntreprise.raisonSociale}
                onChange={(e) => setNewEntreprise((s) => ({ ...s, raisonSociale: e.target.value }))}
                className={inputClass}
              />
              <input
                type="text"
                maxLength={100}
                placeholder="Numéro CNaPS"
                value={newEntreprise.numeroCnaps}
                onChange={(e) => setNewEntreprise((s) => ({ ...s, numeroCnaps: e.target.value }))}
                className={inputClass}
              />
              <input
                type="text"
                maxLength={255}
                placeholder="Adresse"
                value={newEntreprise.adresse}
                onChange={(e) => setNewEntreprise((s) => ({ ...s, adresse: e.target.value }))}
                className={inputClass}
              />
              <input
                type="text"
                maxLength={100}
                placeholder="Contact"
                value={newEntreprise.contact}
                onChange={(e) => setNewEntreprise((s) => ({ ...s, contact: e.target.value }))}
                className={inputClass}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="text-xs px-3 py-1.5 text-gray-600 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmitEntreprise}
                  disabled={isSaving}
                  className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Enregistrement..." : editingId !== null ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Fichier Excel (.xlsx)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:opacity-90 file:cursor-pointer cursor-pointer"
            />
            {selectedFile && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-600">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} Ko)
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="btn-primary flex items-center gap-2 text-sm justify-center py-2 px-6 hover:cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" />
            {isUploading ? "Envoi en cours..." : "Envoyer (POST /api/import-patients)"}
          </button>
        </div>

        {result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Import traité par le backend.</div>
              <pre className="text-xs mt-1 whitespace-pre-wrap font-mono">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex gap-2 text-sm text-rose-800">
            <XCircle className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Import refusé.</div>
              <p className="text-xs mt-1">{errorMessage}</p>
            </div>
          </div>
        )}
      </form>

      {/* ===== Colonne de droite : entreprises enregistrées + format attendu ===== */}
      <div className="space-y-6 self-start">
        <div className="bg-gray-50/50 rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Entreprises enregistrées
            </h4>
            <span className="text-xs text-gray-500">{state.Entreprise.length}</span>
          </div>

          {state.Entreprise.length === 0 ? (
            <p className="text-xs text-gray-500">Aucune entreprise enregistrée.</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {state.Entreprise.map((ent) => (
                <li
                  key={ent.Id_Entreprise}
                  className={`flex items-stretch gap-1 rounded-lg border bg-white transition ${
                    selectedEntreprise === ent.Id_Entreprise
                      ? "border-primary shadow-xs"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedEntreprise(ent.Id_Entreprise)}
                    className="flex-1 min-w-0 text-left px-3 py-2 text-sm cursor-pointer"
                  >
                    <div className="font-semibold text-gray-900 truncate">{ent.Nom}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ent.MatriculeAsina
                        ? `Asina : ${ent.MatriculeAsina}`
                        : "Sans matricule Asina"}
                      {typeof ent.NombreAgents === "number" && ` · ${ent.NombreAgents} agent(s)`}
                    </div>
                    {!ent.MatriculeAsina && (
                      <div className="text-xs text-rose-600 mt-0.5">
                        Import impossible sans matricule Asina
                      </div>
                    )}
                  </button>

                  <div className="flex items-center gap-1 pr-2">
                    <button
                      type="button"
                      title="Modifier"
                      aria-label={`Modifier ${ent.Nom}`}
                      onClick={() => openEdit(ent)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Supprimer"
                      aria-label={`Supprimer ${ent.Nom}`}
                      onClick={() => handleDeleteEntreprise(ent)}
                      disabled={deletingId === ent.Id_Entreprise}
                      className="p-1.5 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-50/50 rounded-xl border border-gray-200 p-6 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Format attendu
          </h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Une ligne par personne. Une colonne indique le rôle ("Agent", "Conjoint" ou "Enfant").
            Colonnes obligatoires : statut, nom, prénom. Colonnes facultatives : date de naissance,
            lieu de naissance, sexe, adresse, téléphone, email, groupe sanguin, NIR, CNaPS, fonction
            et matricule employeur. L'ordre importe : chaque agent doit précéder les lignes de ses
            ayants droit.
          </p>
        </div>
      </div>
    </div>
  );
}
