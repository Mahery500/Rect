// src/briques/actes-realisation/ui/SelecteurActe.tsx
import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { ModeAffichage } from "@/cerveau/permissions/types";
import { useNotifier } from "@/noyau/notifications";
import { extraireMessageErreur } from "@/noyau/utils/erreur";
import { useActeRealisation } from "../hooks/useActeRealisation";
import { ActeEnregistre } from "../modele/acte.types";
export interface SelecteurActeProps {
  mode?: ModeAffichage;
  encounterId?: number | null;
  patientId?: number | null;
  /** Optionnel : n'afficher que certaines catégories d'actes. */
  filtreCategorieCodes?: string[];
  onEnregistre?: (acte: ActeEnregistre) => void;
}
const BADGE: Record<string, string> = {
  realise: "bg-emerald-50 text-emerald-800 border-emerald-200",
  en_cours: "bg-blue-50 text-blue-800 border-blue-200",
  planifie: "bg-amber-50 text-amber-800 border-amber-200",
  annule: "bg-slate-100 text-slate-500 border-slate-200 line-through",
  saisi_par_erreur: "bg-slate-100 text-slate-500 border-slate-200 line-through",
};
export const SelecteurActe: React.FC<SelecteurActeProps> = ({
  mode = "edition",
  encounterId,
  patientId,
  filtreCategorieCodes,
  onEnregistre,
}) => {
  const h = useActeRealisation(encounterId, patientId, filtreCategorieCodes);
  const { notifierSucces, notifierErreur } = useNotifier();
  const modifiable = mode === "edition";
  if (mode === "masque") {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Vous n'avez pas les droits pour accéder aux actes.
      </div>
    );
  }
  if (!encounterId) {
    return (
      <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500">
        Aucun patient en cours de soins.
      </div>
    );
  }
  const statutDe = (acteDefinitionId: number) =>
    h.actes.find(
      (a) =>
        a.acteDefinitionId === acteDefinitionId &&
        a.statut !== "annule" &&
        a.statut !== "saisi_par_erreur",
    )?.statut;
  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifiable) return;
    try {
      const acte = await h.enregistrer();
      notifierSucces(
        acte.statut === "realise"
          ? "Acte enregistré et terminé."
          : "Acte enregistré (en cours : il reste des obligatoires).",
      );
      onEnregistre?.(acte);
    } catch (err) {
      notifierErreur(extraireMessageErreur(err));
    }
  };
  const libelleBouton = h.acteExistant ? "Compléter l'acte" : "Enregistrer l'acte";
  const peutEnvoyer =
    modifiable &&
    !!h.selectionId &&
    !h.enCours &&
    !h.chargementMoule &&
    (h.moule.length === 0
      ? !h.acteExistant
      : h.nombreSaisis > 0 || (!!h.acteExistant && h.obligatoiresManquantes.length === 0));
  const optionsActes = (() => {
    const d = h.demandeActive;
    if (d && !h.realisables.some((a) => a.id === d.acteDefinitionId)) {
      return [{ id: d.acteDefinitionId, code: d.code, libelle: d.libelle }, ...h.realisables];
    }
    return h.realisables;
  })();
  return (
    <div className="space-y-6">
      {h.demandes.length > 0 && (
        <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Actes prescrits à exécuter ({h.demandes.length})
            </h3>
            <p className="text-xs text-slate-500">Demandes en attente pour ce patient</p>
          </div>
          {h.demandes.map((d) => (
            <div
              key={d.id}
              className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                h.ligneDemandeId === d.id
                  ? "border-rose-400 bg-rose-50/40"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 text-sm">{d.libelle}</strong>
                  <span className="font-mono text-[10px] text-slate-400">({d.code})</span>
                  {d.urgente && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded font-bold text-[10px]">
                      URGENT
                    </span>
                  )}
                </div>
                {d.commentaire && (
                  <p className="text-slate-600 italic">Instruction : « {d.commentaire} »</p>
                )}
              </div>
              {modifiable && (
                <button
                  type="button"
                  disabled={h.enCours}
                  onClick={() => h.choisirDemande(d)}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Réaliser
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne principale : sélection + formulaire */}
      <form
        onSubmit={soumettre}
        className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-2xs"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Acte à enregistrer
          </label>
          <select
            value={h.selectionId ?? ""}
            disabled={!modifiable || h.enCours || h.chargement}
            onChange={(e) => h.choisirActe(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-rose-500"
          >
            <option value="">
              {h.chargement ? "Chargement…" : "— Choisir un acte —"}
            </option>
            {optionsActes.map((a) => {
              const st = statutDe(a.id);
              return (
                <option key={a.id} value={a.id} disabled={st === "realise"}>
                  {a.libelle} ({a.code})
                  {st === "realise" ? " — déjà réalisé" : st === "en_cours" ? " — à compléter" : ""}
                </option>
              );
            })}
          </select>
          {h.demandeActive && (
            <p className="text-[11px] text-slate-500">
              Répond à la prescription n° <span className="font-mono">{h.demandeActive.id}</span>
            </p>
          )}
          {!h.chargement && h.realisables.length === 0 && (
            <p className="text-[11px] text-amber-700">
              Aucun acte réalisable pour votre profil dans ce service.
            </p>
          )}
        </div>
        {h.erreur && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{h.erreur}</span>
          </div>
        )}
        {h.selectionId && h.chargementMoule && (
          <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Chargement des champs…</span>
          </div>
        )}
        {h.selectionId && !h.chargementMoule && h.moule.length === 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
            <span>Cet acte n'attend aucune observation : il sera marqué « Réalisé » directement.</span>
          </div>
        )}
        {h.selectionId && !h.chargementMoule && h.moule.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {h.moule.map((c) => {
              const dejaValeur = h.dejaSaisies.get(c.observationId);
              const val = h.valeurs[c.observationId] ?? "";
              const manquant = c.obligatoire && dejaValeur === undefined && val.trim() === "";
              return (
                <div
                  key={c.observationId}
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    dejaValeur !== undefined
                      ? "bg-emerald-50/50 border-emerald-200"
                      : manquant
                        ? "bg-amber-50/40 border-amber-300"
                        : val.trim()
                          ? "bg-rose-50/30 border-rose-200"
                          : "bg-slate-50/60 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`obs-${c.observationId}`}
                      className="text-xs font-bold text-slate-800 truncate"
                    >
                      {c.libelle}
                      {c.obligatoire && <span className="text-rose-600 ml-1">*</span>}
                    </label>
                    {c.unite && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {c.unite}
                      </span>
                    )}
                  </div>
                  {dejaValeur !== undefined ? (
                    <p className="text-sm font-black font-mono text-slate-900">
                      {dejaValeur}{" "}
                      <span className="text-[10px] font-semibold text-emerald-700">déjà saisi</span>
                    </p>
                  ) : (
                    <>
                      <input
                        id={`obs-${c.observationId}`}
                        type="text"
                        inputMode={c.typeValeur === "numerique" ? "decimal" : "text"}
                        disabled={!modifiable || h.enCours}
                        value={val}
                        onChange={(e) => h.setValeur(c.observationId, e.target.value)}
                        placeholder={c.unite ? `Valeur en ${c.unite}` : "Valeur"}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        disabled={!modifiable || h.enCours}
                        value={h.interpretations[c.observationId] ?? ""}
                        onChange={(e) => h.setInterpretation(c.observationId, e.target.value)}
                        placeholder="Interprétation (facultatif)"
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] italic focus:outline-hidden"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {h.selectionId && !h.chargementMoule && h.obligatoiresManquantes.length > 0 && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {h.obligatoiresManquantes.length} champ(s) obligatoire(s) vide(s) : l'acte restera «
              En cours » et vous pourrez le compléter plus tard.
            </span>
          </p>
        )}
        {h.selectionId && (
          <input
            type="text"
            disabled={!modifiable || h.enCours || !!h.acteExistant}
            value={h.commentaire}
            onChange={(e) => h.setCommentaire(e.target.value)}
            placeholder="Commentaire (optionnel)"
            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-rose-500"
          />
        )}
        {modifiable && (
          <button
            type="submit"
            disabled={!peutEnvoyer}
            className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {h.enCours ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Enregistrement…</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>{libelleBouton}</span>
              </>
            )}
          </button>
        )}
      </form>
      {/* Colonne latérale : actes déjà enregistrés */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs h-fit">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Actes de ce dossier</h3>
          <p className="text-xs text-slate-500">{h.actes.length} enregistré(s)</p>
        </div>
        {h.actes.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Aucun acte pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto pr-1">
            {h.actes.map((a) => (
              <li key={a.id} className="py-3 text-xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-800">{a.libelle}</span>
                  <span
                    className={`px-2 py-0.5 rounded border font-bold text-[10px] shrink-0 ${BADGE[a.statut] ?? ""}`}
                  >
                    {a.statut.replace("_", " ")}
                  </span>
                </div>
                {a.observations
                  .filter((o) => o.statut === "preliminaire" || o.statut === "final")
                  .map((o) => (
                    <p key={o.id} className="font-mono text-[11px] text-slate-700">
                      {o.libelle || o.code} : <strong>{o.valeur}</strong> {o.unite ?? ""}
                    </p>
                  ))}
                {modifiable && a.statut === "en_cours" && (
                  <button
                    type="button"
                    onClick={() => h.choisirActe(a.acteDefinitionId)}
                    className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                  >
                    Compléter →
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>
  );
};
export default SelecteurActe;