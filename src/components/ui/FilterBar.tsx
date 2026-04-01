"use client";

// =============================================================
// Sellix AI — Barra de filtros composable
// Soporta: date range, dropdowns multi-valor, botón de reset
// =============================================================

import { X } from "lucide-react";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface FilterBarProps {
  /** Filtro por texto de búsqueda (opcional) */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Dropdown único (opcional) */
  dropdownLabel?: string;
  dropdownOptions?: DropdownOption[];
  dropdownValue?: string;
  onDropdownChange?: (value: string) => void;

  /** Filtro fecha desde (opcional) */
  dateFrom?: string;
  onDateFromChange?: (value: string) => void;

  /** Filtro fecha hasta (opcional) */
  dateTo?: string;
  onDateToChange?: (value: string) => void;

  /** Callback cuando se limpian todos los filtros */
  onClear?: () => void;

  /** True cuando algún filtro está activo */
  hasActiveFilters?: boolean;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  dropdownLabel,
  dropdownOptions,
  dropdownValue,
  onDropdownChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Campo de búsqueda */}
      {onSearchChange !== undefined && (
        <input
          type="text"
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand-blue
                     focus:border-transparent min-w-[200px]"
        />
      )}

      {/* Dropdown */}
      {dropdownOptions && onDropdownChange && (
        <div className="flex flex-col gap-0.5">
          {dropdownLabel && (
            <span className="text-xs text-gray-500 font-medium">
              {dropdownLabel}
            </span>
          )}
          <select
            value={dropdownValue ?? ""}
            onChange={(e) => onDropdownChange(e.target.value)}
            className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg
                       bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue
                       focus:border-transparent"
          >
            <option value="">Todos</option>
            {dropdownOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date From */}
      {onDateFromChange !== undefined && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500 font-medium">Desde</span>
          <input
            type="date"
            value={dateFrom ?? ""}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand-blue
                       focus:border-transparent"
          />
        </div>
      )}

      {/* Date To */}
      {onDateToChange !== undefined && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500 font-medium">Hasta</span>
          <input
            type="date"
            value={dateTo ?? ""}
            onChange={(e) => onDateToChange(e.target.value)}
            className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand-blue
                       focus:border-transparent"
          />
        </div>
      )}

      {/* Botón limpiar filtros */}
      {hasActiveFilters && onClear && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600
                     border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Limpiar
        </button>
      )}
    </div>
  );
}
