// stock-dispensation/PanneauStockDispensation.tsx
import React, { useMemo, useState } from "react";
import {
  Check,
  X,
  Search,
  Pill,
  Clock,
  ClipboardList,
  UserRound,
  CalendarDays,
} from "lucide-react";
import type { ModeAffichage } from "@/cerveau/permissions";
import { stockApi, messageErreur } from "../stock-commun/api";
import { useListe } from "../stock-commun/useListe";
import { Badge, Bouton, Erreur, formatDate } from "../stock-commun/ui";
import type { Prescription, StatutPrescription } from "../stock-commun/types";

const libelles: Record<StatutPrescription, { t: string; ton: "orange" | "vert" | "rouge" }> = {
  en_attente: { t: "En attente", ton: "orange" },
  dispensee: { t: "Dispensée", ton: "vert" },
  annulee: { t: "Annulée", ton: "rouge" },
};

// Classes complètes (pas de concaténation) pour que Tailwind les détecte
const pastilleAvatar: Record<StatutPrescription, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  dispensee: "bg-emerald-100 text-emerald-700",
  annulee: "bg-rose-100 text-rose-700",
};

const onglets = ["en_attente", "dispensee", "annulee", "tous"] as const;

const initiales = (p: Prescription) =>
  `${p.patientPrenom?.[0] ?? ""}${p.patientNom?.[0] ?? ""}`.toUpperCase() || "?";

export const PanneauStockDispensation: React.FC<{ mode: ModeAffichage; siteActifId?: number }> = ({
  mode,
  siteActifId,
}) => {
  const { items, erreur, recharger } = useListe<Prescription>(stockApi.prescriptions);
  const [filtre, setFiltre] = useState<StatutPrescription | "tous">("en_attente");
  const [recherche, setRecherche] = useState("");
  const [selId, setSelId] = useState<number | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = mode === "edition";

  const compteurs = useMemo(() => {
    const c: Record<string, number> = {
      tous: items.length,
      en_attente: 0,
      dispensee: 0,
      annulee: 0,
    };
    items.forEach((p) => {
      c[p.statut] = (c[p.statut] ?? 0) + 1;
    });
    return c;
  }, [items]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return items.filter((p) => {
      if (filtre !== "tous" && p.statut !== filtre) return false;
      if (!q) return true;
      return `${p.patientNom} ${p.patientPrenom} ${p.patientMatricule}`.toLowerCase().includes(q);
    });
  }, [items, filtre, recherche]);

  const selection = items.find((p) => p.id === selId) ?? null;

  const agir = async (action: "dispenser" | "annuler") => {
    if (!selection) return;
    if (action === "dispenser" && !siteActifId)
      return setMessage("Sélectionnez un site avant de dispenser.");
    if (action === "annuler" && !window.confirm("Annuler cette prescription ?")) return;
    setOccupe(true);
    setMessage(null);
    try {
      if (action === "dispenser") await stockApi.dispenser(selection.id, siteActifId!);
      else await stockApi.annulerPrescription(selection.id);
      await recharger();
    } catch (e) {
      setMessage(messageErreur(e));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Dispensation</h2>
            <p className="text-sm text-gray-500">
              {compteurs.en_attente} prescription{compteurs.en_attente > 1 ? "s" : ""} en attente
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un patient ou matricule…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2">
        {onglets.map((f) => {
          const actif = filtre === f;
          return (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                actif
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f === "tous" ? "Toutes" : libelles[f].t}
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  actif ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {compteurs[f] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <Erreur message={erreur} />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Liste */}
        <ul className="max-h-[34rem] space-y-2 overflow-y-auto pr-1 lg:col-span-2">
          {visibles.map((p) => {
            const actif = selId === p.id;
            return (
              <li
                key={p.id}
                onClick={() => {
                  setSelId(p.id);
                  setMessage(null);
                }}
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  actif
                    ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      pastilleAvatar[p.statut] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {initiales(p)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate font-medium text-gray-900">
                        {p.patientNom} {p.patientPrenom}
                      </div>
                      <Badge
                        texte={libelles[p.statut]?.t ?? p.statut}
                        ton={libelles[p.statut]?.ton}
                      />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="truncate">{p.patientMatricule}</span>
                      <span>·</span>
                      <span className="whitespace-nowrap">{formatDate(p.datePrescription)}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}

          {visibles.length === 0 && (
            <li className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
              <ClipboardList className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Aucune prescription</p>
            </li>
          )}
        </ul>

        {/* Détail */}
        <div className="lg:col-span-3">
          {!selection ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <UserRound className="h-9 w-9 text-gray-300" />
              <p className="text-sm text-gray-500">
                Sélectionnez une prescription pour voir son détail.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* En-tête patient */}
              <div className="flex items-center gap-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white p-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold ${
                    pastilleAvatar[selection.statut] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {initiales(selection)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-gray-900">
                    {selection.patientNom} {selection.patientPrenom}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{selection.patientMatricule}</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(selection.datePrescription)}
                    </span>
                  </div>
                </div>
                <Badge
                  texte={libelles[selection.statut]?.t ?? selection.statut}
                  ton={libelles[selection.statut]?.ton}
                />
              </div>

              {/* Médicaments */}
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Médicaments prescrits</h4>
                  <span className="text-xs text-gray-400">
                    {selection.details.length} ligne{selection.details.length > 1 ? "s" : ""}
                  </span>
                </div>

                <ul className="space-y-2">
                  {selection.details.map((d, i) => (
                    <li
                      key={d.id ?? i}
                      className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-gray-100">
                        <Pill className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900">{d.produitNom}</div>
                        {(d.posologie || d.dureeJours) && (
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {d.posologie}
                              {d.dureeJours ? ` · ${d.dureeJours} j` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="rounded-md bg-blue-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-blue-700">
                        × {d.qtePrescrite}
                      </span>
                    </li>
                  ))}
                </ul>

                {message && (
                  <div className="mt-3">
                    <Erreur message={message} />
                  </div>
                )}
              </div>

              {/* Actions */}
              {editable && selection.statut === "en_attente" && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <Bouton disabled={occupe} onClick={() => agir("annuler")}>
                    <X className="mr-1 inline h-4 w-4" />
                    Annuler
                  </Bouton>
                  <Bouton variante="primaire" disabled={occupe} onClick={() => agir("dispenser")}>
                    <Check className="mr-1 inline h-4 w-4" />
                    {occupe ? "Traitement…" : "Dispenser"}
                  </Bouton>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default PanneauStockDispensation;
