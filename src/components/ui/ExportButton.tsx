"use client";

// =============================================================
// Sellix AI — Botón de exportación a CSV con UTF-8 BOM
// BOM necesario para que Excel abra correctamente tildes y ñ
// Genera descarga automática sin servidor
// =============================================================

import { Download } from "lucide-react";

interface ExportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  filename: string;
  label?: string;
  disabled?: boolean;
}

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escapar comillas dobles y envolver si contiene comas, saltos o comillas
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSVValue).join(",");

  const rows = data.map((row) =>
    headers.map((header) => escapeCSVValue(row[header])).join(",")
  );

  return [headerRow, ...rows].join("\r\n");
}

export function ExportButton({
  data,
  filename,
  label = "Exportar CSV",
  disabled = false,
}: ExportButtonProps) {
  function handleExport() {
    if (data.length === 0) return;

    const csv = generateCSV(data);

    // UTF-8 BOM (\uFEFF) para compatibilidad con Excel en español
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      data-testid="export-button"
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                 border border-gray-300 rounded-lg text-gray-700
                 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
