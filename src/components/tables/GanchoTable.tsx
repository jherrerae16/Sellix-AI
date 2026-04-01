"use client";

// =============================================================
// Sellix AI — Tabla de Productos Gancho (Módulo 2.2)
// TanStack Table v8 — filtro por categoría, orden por arrastre
// =============================================================

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown, Check, X } from "lucide-react";
import type { ProductoGancho } from "@/lib/types";
import { formatCOP, formatScore } from "@/lib/formatters";

interface GanchoTableProps {
  data: ProductoGancho[];
}

type CategoriaGancho =
  | "Gancho Primario"
  | "Gancho Secundario"
  | "Volumen puro"
  | "Nicho estratégico";

const CAT_CLASSES: Record<CategoriaGancho, string> = {
  "Gancho Primario": "bg-blue-100 text-blue-700 border-blue-200",
  "Gancho Secundario": "bg-green-100 text-green-700 border-green-200",
  "Volumen puro": "bg-orange-100 text-orange-700 border-orange-200",
  "Nicho estratégico": "bg-purple-100 text-purple-700 border-purple-200",
};

const col = createColumnHelper<ProductoGancho>();
const PAGE_SIZE = 20;
const CATEGORIAS: CategoriaGancho[] = [
  "Gancho Primario",
  "Gancho Secundario",
  "Volumen puro",
  "Nicho estratégico",
];

export function GanchoTable({ data }: GanchoTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "poder_arrastre", desc: true },
  ]);
  const [catFilter, setCatFilter] = useState<string>("");

  const filteredData = useMemo(() => {
    if (!catFilter) return data;
    return data.filter((r) => r.categoria_gancho === catFilter);
  }, [data, catFilter]);

  const conteos = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => {
      map[d.categoria_gancho] = (map[d.categoria_gancho] ?? 0) + 1;
    });
    return map;
  }, [data]);

  const columns = useMemo(
    () => [
      col.accessor("nombre", {
        header: "Producto",
        cell: (info) => (
          <div>
            <p className="font-medium text-gray-900 text-sm">{info.getValue()}</p>
            <p className="text-xs text-gray-400">{info.row.original.codigo}</p>
          </div>
        ),
      }),
      col.accessor("categoria_gancho", {
        header: "Categoría",
        cell: (info) => {
          const cat = info.getValue() as CategoriaGancho;
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${CAT_CLASSES[cat]}`}
            >
              {cat}
            </span>
          );
        },
        enableSorting: false,
      }),
      col.accessor("indice_atraccion", {
        header: "Frec. aparición",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-blue rounded-full"
                style={{ width: `${Math.min(info.getValue() * 100 * 5, 100)}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {formatScore(info.getValue() * 100, 1)}%
            </span>
          </div>
        ),
      }),
      col.accessor("poder_arrastre", {
        header: "Poder arrastre",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full"
                style={{ width: `${Math.min((info.getValue() / 5) * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {formatScore(info.getValue())}
            </span>
          </div>
        ),
      }),
      col.accessor("tiene_descuento_frecuente", {
        header: "Descuento freq.",
        cell: (info) =>
          info.getValue() ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" /> Sí
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              <X className="w-3 h-3" /> No
            </span>
          ),
        enableSorting: false,
      }),
      col.accessor("ticket_promedio_en_sesion", {
        header: "Ticket prom. sesión",
        cell: (info) => (
          <span className="text-sm font-medium text-gray-800">
            {formatCOP(info.getValue())}
          </span>
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
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  return (
    <div className="space-y-4">
      {/* Filtro por categoría */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCatFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !catFilter
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Todos ({data.length})
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat === catFilter ? "" : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              catFilter === cat
                ? `${CAT_CLASSES[cat]} !border-current`
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {cat} ({conteos[cat] ?? 0})
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
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
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
                  Sin productos para la categoría seleccionada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{filteredData.length} productos</span>
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
    </div>
  );
}
