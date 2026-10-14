/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 pointer-events-none text-slate-400">{leftIcon}</div>
        )}
        <input
          id={inputId}
          className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            leftIcon ? "pl-9" : ""
          } ${rightIcon ? "pr-9" : ""} ${
            error ? "border-rose-400 focus:ring-rose-500" : "border-stone-300"
          } ${className}`}
          {...props}
        />
        {rightIcon && <div className="absolute right-3 text-slate-400">{rightIcon}</div>}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-500">{helperText}</p>}
    </div>
  );
};

export default Input;
