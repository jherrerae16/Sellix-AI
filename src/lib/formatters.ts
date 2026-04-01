// =============================================================
// Sellix AI — Funciones de formateo para la UI
// Convención Colombia: COP ($1.500.000), fechas DD/MM/YYYY
// =============================================================

/**
 * Formatea un valor numérico como peso colombiano.
 * Ejemplo: 1500000 → "$1.500.000"
 */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatea una fecha ISO a DD/MM/YYYY.
 * Ejemplo: "2025-10-31" → "31/10/2025"
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate + "T00:00:00Z");
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Formatea un número como porcentaje con 1 decimal.
 * Ejemplo: 0.875 → "87.5%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formatea un score numérico con N decimales.
 * Ejemplo: 2.4567 → "2.46"
 */
export function formatScore(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Formatea días como entero con sufijo "d".
 * Ejemplo: 14 → "14 d"
 */
export function formatDays(days: number): string {
  return `${Math.round(days)} d`;
}

/**
 * Formatea un número entero con separadores de miles (es-CO).
 * Ejemplo: 1234567 → "1.234.567"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}
