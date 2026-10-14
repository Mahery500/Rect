// stock-commun/ui.tsx
import React from "react";
import { X } from "lucide-react";

const tons = {
  gris: "bg-gray-100 text-gray-700",
  bleu: "bg-blue-50 text-blue-700",
  vert: "bg-green-50 text-green-700",
  orange: "bg-amber-50 text-amber-700",
  rouge: "bg-red-50 text-red-700",
};

export const Badge: React.FC<{ texte: string; ton?: keyof typeof tons }> = ({
  texte,
  ton = "gris",
}) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tons[ton]}`}>
    {texte}
  </span>
);

export const Modal: React.FC<{
  titre: string;
  onFermer: () => void;
  large?: boolean;
  children: React.ReactNode;
}> = ({ titre, onFermer, large, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div
      className={`bg-white rounded-xl shadow-xl w-full ${large ? "max-w-4xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{titre}</h3>
        <button onClick={onFermer} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

export const Erreur: React.FC<{ message?: string | null }> = ({ message }) =>
  message ? <p className="text-sm text-red-600">{message}</p> : null;

export const Bouton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primaire" | "neutre" | "danger" }
> = ({ variante = "neutre", className = "", ...p }) => {
  const v = {
    primaire: "bg-blue-600 text-white hover:bg-blue-700",
    neutre: "border hover:bg-gray-50",
    danger: "border border-red-300 text-red-700 hover:bg-red-50",
  }[variante];
  return (
    <button
      {...p}
      className={`px-3 py-2 rounded-lg text-sm disabled:opacity-50 ${v} ${className}`}
    />
  );
};

export const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";
