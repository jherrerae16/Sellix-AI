"use client";

// =============================================================
// Sellix AI — Tabla de riesgo de churn (Módulo 1.3)
// TanStack Table v8 — filtro por nivel_riesgo, orden por score
// =============================================================

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown, Phone } from "lucide-react";
import type { ClienteChurn } from "@/lib/types";
import { formatDate, formatDays, formatScore } from "@/lib/formatters";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { FilterBar } from "@/components/ui/FilterBar";
import { ExportButton } from "@/components/ui/ExportButton";
import { ClienteDetailPanel } from "@/components/ui/ClienteDetailPanel";

interface ChurnTableProps {
  data: ClienteChurn[];
}

const col = createColumnHelper<ClienteChurn>();

const PAGE_SIZE = 20;

export function ChurnTable({ data }: ChurnTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "churn_score", desc: true },
  ]);
  const [riesgoFilter, setRiesgoFilter] = useState("");
  const [nombreFilter, setNombreFilter] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<ClienteChurn | null>(null);

  const filteredData = useMemo(() => {
    let d = data;
    if (riesgoFilter) d = d.filter((r) => r.nivel_riesgo === riesgoFilter);
    if (nombreFilter) {
      const q = nombreFilter.toLowerCase();
      d = d.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q) ||
          r.cedula.includes(q)
      );
    }
    return d;
  }, [data, riesgoFilter, nombreFilter]);

  const columns = useMemo(
    () => [
      col.accessor("nombre", {
        header: "Cliente",
        cell: (info) => (
          <div>
            <p className="font-medium text-gray-900 text-sm">{info.getValue()}</p>
            <p className="text-xs text-gray-400">{info.row.original.cedula}</p>
          </div>
        ),
      }),
      col.accessor("telefono", {
        header: "Teléfono",
        cell: (info) => (
          <span className="text-sm text-gray-600 flex items-center gap-1">
            {info.getValue() ? (
              <>
                <Phone className="w-3 h-3 text-gray-400" />
                {info.getValue()}
              </>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </span>
        ),
        enableSorting: false,
      }),
      col.accessor("ultima_compra", {
        header: "Última compra",
        cell: (info) => (
          <span className="text-sm text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      col.accessor("frecuencia_promedio_dias", {
        header: "Frecuencia",
        cell: (info) => (
          <span className="text-sm text-gray-600">{formatDays(info.getValue())}</span>
        ),
      }),
      col.accessor("dias_sin_comprar", {
        header: "Sin comprar",
        cell: (info) => (
          <span className="text-sm font-medium text-risk-high">
            {formatDays(info.getValue())}
          </span>
        ),
      }),
      col.accessor("churn_score", {
        header: "Score",
        cell: (info) => (
          <span className="text-sm font-semibold">{formatScore(info.getValue())}</span>
        ),
      }),
      col.accessor("nivel_riesgo", {
        header: "Riesgo",
        cell: (info) => <RiskBadge level={info.getValue()} />,
        enableSorting: false,
      }),
      col.accessor("accion_sugerida", {
        header: "Acción",
        cell: (info) => (
          <span className="text-sm text-gray-600">{info.getValue()}</span>
        ),
        enableSorting: false,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  // Conteos por nivel
  const alto = data.filter((r) => r.nivel_riesgo === "Alto").length;
  const medio = data.filter((r) => r.nivel_riesgo === "Medio").length;
  const bajo = data.filter((r) => r.nivel_riesgo === "Bajo").length;

  return (
    <div className="space-y-4">
      {/* Chips de conteo */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: "Alto riesgo", count: alto, color: "bg-red-100 text-red-700" },
          { label: "Riesgo medio", count: medio, color: "bg-orange-100 text-orange-700" },
          { label: "Bajo riesgo", count: bajo, color: "bg-green-100 text-green-700" },
        ].map((chip) => (
          <span
            key={chip.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${chip.color}`}
          >
            {chip.count} {chip.label}
          </span>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <FilterBar
          searchValue={nombreFilter}
          onSearchChange={setNombreFilter}
          searchPlaceholder="Buscar cliente o cédula..."
          dropdownLabel="Riesgo"
          dropdownOptions={[
            { value: "Alto", label: "Alto" },
            { value: "Medio", label: "Medio" },
            { value: "Bajo", label: "Bajo" },
          ]}
          dropdownValue={riesgoFilter}
          onDropdownChange={setRiesgoFilter}
          hasActiveFilters={!!riesgoFilter || !!nombreFilter}
          onClear={() => { setRiesgoFilter(""); setNombreFilter(""); }}
        />
        <ExportButton
          data={filteredData}
          filename="churn_clientes"
          label="Exportar CSV"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${
                      header.column.getCanSort()
                        ? "cursor-pointer select-none hover:text-gray-700"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-gray-400">
                          {header.column.getIsSorted() === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedCliente(row.original)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  Sin resultados para los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <Pagination table={table} total={filteredData.length} />

      {/* Drawer de detalle */}
      {selectedCliente && (
        <ClienteDetailPanel
          cliente={selectedCliente}
          onClose={() => setSelectedCliente(null)}
        />
      )}
    </div>
  );
}

function Pagination({
  table,
  total,
}: {
  table: ReturnType<typeof useReactTable<ClienteChurn>>;
  total: number;
}) {
  const page = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>
        {from}–{to} de {total} clientes
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40
                     hover:bg-gray-50 transition-colors"
        >
          Anterior
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40
                     hover:bg-gray-50 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
