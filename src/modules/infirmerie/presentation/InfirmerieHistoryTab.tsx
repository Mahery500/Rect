/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Gauge, CheckCircle2 } from "lucide-react";
import { ASINAState } from "@/core/types";

export interface InfirmerieHistoryTabProps {
  state: ASINAState;
}

export const InfirmerieHistoryTab: React.FC<InfirmerieHistoryTabProps> = ({ state }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
        Dernières Constantes & Soins Enregistrés (24h)
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Realtime Observations history */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Gauge className="h-4 w-4 text-slate-400" /> Prises Récentes de Signes Vitaux
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
            {state.Observation.slice()
              .reverse()
              .map((obs, idx) => {
                const pat = state.Patient.find((p) => p.Id_Patient === obs.Id_Patient);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/20 hover:bg-slate-50 transition flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {pat ? `${pat.Nom} ${pat.Prenom}` : "Patient inconnu"}
                      </span>
                      <span className="text-[10px] text-cyan-700 font-semibold">{obs.Type}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-slate-900 text-xs">
                        {obs.valeur} {obs.unite}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {obs.Recorded_at}
                      </span>
                    </div>
                  </div>
                );
              })}
            {state.Observation.length === 0 && (
              <p className="p-4 text-slate-400 text-center italic">
                Aucune observation enregistrée.
              </p>
            )}
          </div>
        </div>

        {/* Actes executed history */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-slate-400" /> Historique des Soins Paramédicaux
            Administrés
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
            {state.Actes.slice()
              .reverse()
              .map((act, idx) => {
                const pat = state.Patient.find((p) => p.Id_Patient === act.Id_Patient);
                const actDef = state.Acte_Def.find((ad) => ad.Id_Acte_Def === act.Id_Acte_Def);
                const result = state.Act_Result.find((r) => r.Id_Actes === act.Id_Actes);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/20 hover:bg-slate-50 transition space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        {pat ? `${pat.Nom} ${pat.Prenom}` : "Patient"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          result?.Type === "SUCCES"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {result?.Type || "ADMINISTRE"}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-slate-700 block">
                        Soin: {actDef?.Libelle || "Soin paramédical"}
                      </span>
                      <p className="text-[11px] text-slate-500 italic mt-0.5">"{act.note}"</p>
                    </div>
                  </div>
                );
              })}
            {state.Actes.length === 0 && (
              <p className="p-4 text-slate-400 text-center italic">
                Aucun acte administré archivé.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfirmerieHistoryTab;
