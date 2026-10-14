/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export type BadgeVariant =
  "default" | "success" | "warning" | "danger" | "info" | "purple" | "neutral";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "sm",
  className = "",
  icon,
}) => {
  const baseStyles =
    "inline-flex items-center gap-1 font-semibold rounded-full select-none whitespace-nowrap";

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    neutral: "bg-stone-100 text-stone-600 border border-stone-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    info: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    purple: "bg-purple-50 text-purple-700 border border-purple-200",
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {icon}
      {children}
    </span>
  );
};

export default Badge;
