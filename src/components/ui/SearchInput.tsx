"use client";

// =============================================================
// Sellix AI — Input de búsqueda con debounce 300ms
// Uso principal: búsqueda de clientes por nombre/cédula (US-E2-02)
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  "data-testid"?: string;
}

export function SearchInput({
  value: externalValue,
  onChange,
  placeholder = "Buscar...",
  debounceMs = 300,
  className = "",
  "data-testid": testId,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue ?? "");

  // Sincronizar si el valor externo cambia (ej: reset)
  useEffect(() => {
    setInternalValue(externalValue ?? "");
  }, [externalValue]);

  const debouncedOnChange = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (val: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => onChange(val), debounceMs);
      };
    })(),
    [onChange, debounceMs]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInternalValue(val);
    debouncedOnChange(val);
  }

  function handleClear() {
    setInternalValue("");
    onChange("");
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        data-testid={testId}
        className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-300 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
                   transition-colors"
      />
      {internalValue && (
        <button
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                     hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
