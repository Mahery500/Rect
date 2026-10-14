/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  children,
  className = "",
  id,
  ...props
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 disabled:bg-slate-100 disabled:cursor-not-allowed ${
          error ? "border-rose-400 focus:ring-rose-500" : "border-stone-300"
        } ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-500">{helperText}</p>}
    </div>
  );
};

export default Select;
