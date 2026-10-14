/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "flat" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  className = "",
  ...props
}) => {
  const variantStyles = {
    default: "bg-white rounded-xl border border-stone-200 shadow-xs",
    flat: "bg-slate-50 rounded-xl border border-slate-200/80",
    bordered: "bg-white rounded-xl border-2 border-stone-300",
  };

  const paddingStyles = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-6 sm:p-8",
  };

  return (
    <div className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
