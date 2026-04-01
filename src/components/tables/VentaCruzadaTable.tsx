"use client";

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
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  X, ShoppingBag, TrendingUp, Zap, ArrowRight,
} from "lucide-react";
import type { VentaCruzada } from "@/lib/types";
import { formatCOP, formatPercent, formatScore } from "@/lib/formatters";
import { SearchInput } from "@/components/ui/SearchInput";

interface VentaCruzadaTableProps {
  data: VentaCruzada[];
}

const col = createColumnHelper<VentaCruzada>();
const PAGE_SIZE = 20;

// ── Popup de recomendación ──────────────────────────────────

function RecomendacionPopup({
  item,
  onClose,
}: {
  item: VentaCruzada;
  onClose: () => void;
}) {
  const liftColor =
    item.lift >= 3 ? "text-green-600 bg-green-50" :
    item.lift >= 2 ? "text-brand-blue bg-blue-50" :
    "text-brand-orange bg-orange-50";

  const confianzaPct = Math.round(item.confianza * 100);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-brand-blue px-6 py-5 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">
              Cuando el cliente compra
            </p>
            <h2 className="text-lg font-bold leading-snug">
              {item.producto_base}
            </h2>
          </div>

          {/* Recomendación */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide mb-2">
              <Zap className="w-3.5 h-3.5" />
              Recomendar también
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-base">
                    {item.producto_recomendado}
                  </p>
                  <p className="text-sm text-brand-green font-medium mt-0.5">
                    +{formatCOP(item.incremento_ticket_estimado)} al ticket
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className={`text-xl font-bold ${liftColor} inline-block px-2 py-0.5 rounded-md`}>
                  {formatScore(item.lift)}×
                </p>
                <p className="text-xs text-gray-500 mt-1">Lift</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-gray-900">
                  {confianzaPct}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Confianza</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-gray-900">
                  {item.veces_juntos.toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-gray-500 mt-1">Veces juntos</p>
              </div>
            </div>

            {/* Barra de confianza visual */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Probabilidad de compra conjunta</span>
                <span className="font-semibold text-gray-700">{confianzaPct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-blue rounded-full transition-all duration-500"
                  style={{ width: `${confianzaPct}%` }}
                />
              </div>
            </div>

            {/* Explicación */}
            <div className="mt-4 flex items-start gap-2 bg-blue-50 rounded-lg p-3">
              <TrendingUp className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Los clientes que compran <span className="font-semibold">{item.producto_base}</span> tienen{" "}
                <span className="font-semibold text-brand-blue">{formatScore(item.lift)}× más probabilidad</span> de
                comprar <span className="font-semibold">{item.producto_recomendado}</span> que el cliente promedio.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
            >
              Entendido <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Tabla principal ─────────────────────────────────────────

export function VentaCruzadaTable({ data }: VentaCruzadaTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "lift", desc: true },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<VentaCruzada | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (r) =>
        r.producto_base.toLowerCase().includes(q) ||
        r.producto_recomendado.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const columns = useMemo(
    () => [
      col.accessor("producto_base", {
        header: "Producto base",
        cell: (info) => (
          <span className="text-sm font-medium text-gray-800">{info.getValue()}</span>
        ),
      }),
      col.display({
        id: "arrow",
        header: "",
        cell: () => (
          <ArrowRight className="w-4 h-4 text-gray-300" />
        ),
        size: 32,
      }),
      col.accessor("producto_recomendado", {
        header: "Recomendar también",
        cell: (info) => (
          <span className="text-sm text-brand-blue font-medium">{info.getValue()}</span>
        ),
        enableSorting: false,
      }),
      col.accessor("veces_juntos", {
        header: "Veces juntos",
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {info.getValue().toLocaleString("es-CO")}
          </span>
        ),
      }),
      col.accessor("lift", {
        header: "Lift",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={`text-sm font-bold px-2 py-0.5 rounded-md ${
                v >= 3 ? "text-green-700 bg-green-100"
                : v >= 2 ? "text-brand-blue bg-blue-100"
                : "text-orange-700 bg-orange-100"
              }`}
            >
              {formatScore(v)}×
            </span>
          );
        },
      }),
      col.accessor("confianza", {
        header: "Confianza",
        cell: (info) => {
          const pct = Math.round(info.getValue() * 100);
          return (
            <div className="flex items-center gap-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-blue rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{pct}%</span>
            </div>
          );
        },
      }),
      col.accessor("incremento_ticket_estimado", {
        header: "Incremento ticket",
        cell: (info) => (
          <span className="text-sm font-semibold text-brand-green">
            +{formatCOP(info.getValue())}
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
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  return (
    <div className="space-y-4">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar producto base o recomendado..."
        className="w-full max-w-md"
      />

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
                onClick={() => setSelected(row.original)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
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
                  {searchQuery
                    ? `Sin recomendaciones para "${searchQuery}"`
                    : "Sin pares de venta cruzada disponibles"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{filteredData.length} pares de productos</span>
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

      {/* Popup de recomendación */}
      {selected && (
        <RecomendacionPopup
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
