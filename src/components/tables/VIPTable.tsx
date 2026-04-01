"use client";

// =============================================================
// Sellix AI — Tabla de clientes VIP / RFM (Módulo 2.1)
// TanStack Table v8 — filtro por segmento, drawer de detalle
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
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { ClienteRFM } from "@/lib/types";
import { formatCOP, formatDate, formatScore } from "@/lib/formatters";
import { ClienteDetailPanel } from "@/components/ui/ClienteDetailPanel";

interface VIPTableProps {
  data: ClienteRFM[];
}

type Segmento = "VIP" | "Leal" | "En desarrollo" | "En riesgo";

const SEGMENT_CLASSES: Record<Segmento, string> = {
  VIP: "bg-blue-100 text-blue-700 border-blue-200",
  Leal: "bg-green-100 text-green-700 border-green-200",
  "En desarrollo": "bg-orange-100 text-orange-700 border-orange-200",
  "En riesgo": "bg-red-100 text-red-700 border-red-200",
};

const col = createColumnHelper<ClienteRFM>();
const PAGE_SIZE = 20;

export function VIPTable({ data }: VIPTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "clv_estimado_anual", desc: true },
  ]);
  const [segmentoFilter, setSegmentoFilter] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<ClienteRFM | null>(null);

  const filteredData = useMemo(() => {
    if (!segmentoFilter) return data;
    return data.filter((r) => r.segmento === segmentoFilter);
  }, [data, segmentoFilter]);

  const conteos = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => {
      map[d.segmento] = (map[d.segmento] ?? 0) + 1;
    });
    return map;
  }, [data]);

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
      col.accessor("segmento", {
        header: "Segmento",
        cell: (info) => {
          const seg = info.getValue() as Segmento;
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${SEGMENT_CLASSES[seg]}`}
            >
              {seg}
            </span>
          );
        },
        enableSorting: false,
      }),
      col.accessor("clv_estimado_anual", {
        header: "CLV anual est.",
        cell: (info) => (
          <span className="text-sm font-semibold text-brand-blue">
            {formatCOP(info.getValue())}
          </span>
        ),
      }),
      col.accessor("ticket_promedio", {
        header: "Ticket prom.",
        cell: (info) => (
          <span className="text-sm text-gray-700">{formatCOP(info.getValue())}</span>
        ),
      }),
      col.accessor("frequency", {
        header: "Compras",
        cell: (info) => (
          <span className="text-sm text-gray-600">{info.getValue()}</span>
        ),
      }),
      col.accessor("score_r", {
        header: "R",
        cell: (info) => (
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              info.getValue() >= 4
                ? "bg-blue-100 text-blue-700"
                : info.getValue() >= 3
                ? "bg-gray-100 text-gray-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("score_f", {
        header: "F",
        cell: (info) => (
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              info.getValue() >= 4
                ? "bg-green-100 text-green-700"
                : info.getValue() >= 3
                ? "bg-gray-100 text-gray-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("score_m", {
        header: "M",
        cell: (info) => (
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              info.getValue() >= 4
                ? "bg-green-100 text-green-700"
                : info.getValue() >= 3
                ? "bg-gray-100 text-gray-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("churn_score", {
        header: "Churn",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={`text-sm font-medium ${
                v >= 2.0
                  ? "text-risk-high"
                  : v >= 1.3
                  ? "text-risk-medium"
                  : "text-risk-low"
              }`}
            >
              {formatScore(v)}
            </span>
          );
        },
      }),
      col.accessor("ultima_compra", {
        header: "Última compra",
        cell: (info) => (
          <span className="text-sm text-gray-600">{formatDate(info.getValue())}</span>
        ),
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

  const SEGMENTOS: Segmento[] = ["VIP", "Leal", "En desarrollo", "En riesgo"];

  return (
    <div className="space-y-4">
      {/* Chips de segmento como filtro */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSegmentoFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !segmentoFilter
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Todos ({data.length})
        </button>
        {SEGMENTOS.map((seg) => (
          <button
            key={seg}
            onClick={() => setSegmentoFilter(seg === segmentoFilter ? "" : seg)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              segmentoFilter === seg
                ? `${SEGMENT_CLASSES[seg]} !border-current`
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {seg} ({conteos[seg] ?? 0})
          </button>
        ))}
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
                  Sin clientes para el segmento seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{filteredData.length} clientes</span>
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

      {selectedCliente && (
        <ClienteDetailPanel
          cliente={selectedCliente}
          onClose={() => setSelectedCliente(null)}
        />
      )}
    </div>
  );
}
