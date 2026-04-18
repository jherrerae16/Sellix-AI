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
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Phone,
  X, Calendar, Clock, ArrowRight, RefreshCcw, AlertTriangle,
} from "lucide-react";
import type { ReposicionPendiente } from "@/lib/types";
import { formatDate, formatDays } from "@/lib/formatters";
import { SearchInput } from "@/components/ui/SearchInput";
import { ExportButton } from "@/components/ui/ExportButton";

interface ReposicionTableProps {
  data: ReposicionPendiente[];
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  enableSelection?: boolean;
}

type EstadoFilter = "Todos" | "Vencido" | "Esta semana" | "Próximo mes";

const estadoBadgeClasses: Record<string, string> = {
  Vencido: "bg-red-100 text-red-700 border-red-200",
  "Esta semana": "bg-orange-100 text-orange-700 border-orange-200",
  "Próximo mes": "bg-green-100 text-green-700 border-green-200",
};

const col = createColumnHelper<ReposicionPendiente>();
const PAGE_SIZE = 20;

// ── Popup de historial ──────────────────────────────────────

function HistorialPopup({
  item,
  onClose,
}: {
  item: ReposicionPendiente;
  onClose: () => void;
}) {
  const fechas = item.historial_compras ?? [];
  const intervalos = item.intervalos_dias ?? [];
  const estadoColor =
    item.estado === "Vencido" ? "bg-red-500" :
    item.estado === "Esta semana" ? "bg-orange-500" : "bg-green-500";
  const estadoTextColor =
    item.estado === "Vencido" ? "text-red-700" :
    item.estado === "Esta semana" ? "text-orange-700" : "text-green-700";

  // Stats
  const minIntervalo = intervalos.length ? Math.min(...intervalos) : 0;
  const maxIntervalo = intervalos.length ? Math.max(...intervalos) : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
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
              Historial de compras
            </p>
            <h2 className="text-lg font-bold leading-snug">{item.nombre}</h2>
            <p className="text-blue-200 text-sm mt-0.5">{item.producto}</p>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Timeline de compras */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Compras registradas ({fechas.length})
              </h3>
              <div className="relative pl-5">
                {/* Línea vertical */}
                <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200" />

                {fechas.map((fecha, i) => {
                  const isLast = i === fechas.length - 1;
                  const intervalo = i > 0 ? intervalos[i - 1] : null;

                  return (
                    <div key={fecha}>
                      {/* Intervalo entre compras */}
                      {intervalo !== null && (
                        <div className="relative flex items-center ml-4 py-1">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {intervalo} días
                          </span>
                        </div>
                      )}
                      {/* Punto + fecha */}
                      <div className="relative flex items-center gap-3 py-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 z-10 ${
                          isLast
                            ? "bg-brand-blue border-brand-blue"
                            : "bg-white border-gray-400"
                        }`} />
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isLast ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                            {formatDate(fecha)}
                          </span>
                          {isLast && (
                            <span className="text-xs bg-blue-100 text-brand-blue px-1.5 py-0.5 rounded font-medium">
                              Última compra
                            </span>
                          )}
                          {i === 0 && fechas.length > 1 && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              Primera compra
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Predicción */}
                <div className="relative flex items-center ml-4 py-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{Math.round(item.ciclo_dias)} días (ciclo promedio)
                  </span>
                </div>
                <div className="relative flex items-center gap-3 py-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 z-10 border-dashed ${estadoColor} border-white`}
                    style={{ borderStyle: "dashed", borderColor: undefined }}
                  />
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${estadoTextColor}`}>
                      {formatDate(item.proxima_reposicion)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${estadoBadgeClasses[item.estado]}`}>
                      {item.estado === "Vencido"
                        ? `${Math.abs(item.dias_para_reposicion)} días vencido`
                        : `En ${item.dias_para_reposicion} días`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen del ciclo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-brand-blue">{Math.round(item.ciclo_dias)}d</p>
                <p className="text-xs text-gray-500 mt-0.5">Ciclo promedio</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-gray-900">{minIntervalo}d</p>
                <p className="text-xs text-gray-500 mt-0.5">Mínimo</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xl font-bold text-gray-900">{maxIntervalo}d</p>
                <p className="text-xs text-gray-500 mt-0.5">Máximo</p>
              </div>
            </div>

            {/* Explicación */}
            <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
              <RefreshCcw className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">{item.nombre}</span> compra{" "}
                <span className="font-semibold">{item.producto}</span> en promedio cada{" "}
                <span className="font-semibold text-brand-blue">{Math.round(item.ciclo_dias)} días</span>.
                {" "}Basado en {fechas.length} compras registradas, la próxima reposición estimada es{" "}
                <span className={`font-semibold ${estadoTextColor}`}>{formatDate(item.proxima_reposicion)}</span>.
              </p>
            </div>

            {/* Contacto */}
            {item.telefono && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{item.telefono}</span>
                {item.estado === "Vencido" && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Contactar urgente
                  </span>
                )}
              </div>
            )}
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

export function ReposicionTable({
  data,
  rowSelection: controlledSelection,
  onRowSelectionChange,
  enableSelection = false,
}: ReposicionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dias_para_reposicion", desc: false },
  ]);
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactableOnly, setContactableOnly] = useState(false);
  const [selected, setSelected] = useState<ReposicionPendiente | null>(null);
  const [localSelection, setLocalSelection] = useState<RowSelectionState>({});

  const contactableCount = useMemo(
    () => data.filter((r) => r.telefono && String(r.telefono).trim().length >= 7).length,
    [data]
  );

  const rowSelection = controlledSelection ?? localSelection;
  const setRowSelection = (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
    const next = typeof updater === "function" ? updater(rowSelection) : updater;
    if (onRowSelectionChange) onRowSelectionChange(next);
    else setLocalSelection(next);
  };

  const conteos = useMemo(() => ({
    Vencido: data.filter((r) => r.estado === "Vencido").length,
    "Esta semana": data.filter((r) => r.estado === "Esta semana").length,
    "Próximo mes": data.filter((r) => r.estado === "Próximo mes").length,
  }), [data]);

  const filteredData = useMemo(() => {
    let d = data;
    if (contactableOnly) {
      d = d.filter((r) => r.telefono && String(r.telefono).trim().length >= 7);
    }
    if (estadoFilter !== "Todos") d = d.filter((r) => r.estado === estadoFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      d = d.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q) ||
          r.producto.toLowerCase().includes(q) ||
          r.cedula.includes(q)
      );
    }
    return d;
  }, [data, estadoFilter, searchQuery, contactableOnly]);

  const columns = useMemo(
    () => [
      ...(enableSelection
        ? [
            col.display({
              id: "select",
              header: ({ table }) => (
                <input
                  type="checkbox"
                  checked={table.getIsAllPageRowsSelected()}
                  onChange={table.getToggleAllPageRowsSelectedHandler()}
                  className="w-4 h-4 rounded border-gray-300 accent-[#185FA5]"
                />
              ),
              cell: ({ row }) => (
                <input
                  type="checkbox"
                  checked={row.getIsSelected()}
                  onChange={row.getToggleSelectedHandler()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 accent-[#185FA5]"
                />
              ),
              enableSorting: false,
            }),
          ]
        : []),
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
      col.accessor("producto", {
        header: "Producto",
        cell: (info) => (
          <span className="text-sm text-brand-blue font-medium max-w-[200px] truncate block">
            {info.getValue()}
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
      col.accessor("ciclo_dias", {
        header: "Ciclo",
        cell: (info) => (
          <span className="text-sm text-gray-600">{formatDays(info.getValue())}</span>
        ),
      }),
      col.accessor("proxima_reposicion", {
        header: "Próxima reposición",
        cell: (info) => (
          <span className="text-sm font-medium text-gray-800">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      col.accessor("dias_para_reposicion", {
        header: "Días",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={`text-sm font-semibold ${
                v < 0 ? "text-risk-high" : v <= 7 ? "text-risk-medium" : "text-risk-low"
              }`}
            >
              {v < 0 ? `${Math.abs(v)} vencido` : formatDays(v)}
            </span>
          );
        },
      }),
      col.accessor("estado", {
        header: "Estado",
        cell: (info) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              estadoBadgeClasses[info.getValue()] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {info.getValue()}
          </span>
        ),
        enableSorting: false,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
    getRowId: (row) => `${row.cedula}_${row.producto}`,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const tabs: EstadoFilter[] = ["Todos", "Vencido", "Esta semana", "Próximo mes"];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setEstadoFilter(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              estadoFilter === tab
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            {tab !== "Todos" && conteos[tab as keyof typeof conteos] > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  tab === "Vencido" ? "bg-red-100 text-red-600"
                  : tab === "Esta semana" ? "bg-orange-100 text-orange-600"
                  : "bg-green-100 text-green-600"
                }`}
              >
                {conteos[tab as keyof typeof conteos]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Búsqueda + filtros + export */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar cliente o producto..."
            className="w-72"
          />
          <button
            onClick={() => setContactableOnly(!contactableOnly)}
            title={contactableOnly ? "Mostrando solo contactables" : "Filtrar solo contactables"}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              contactableOnly
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {contactableOnly ? <Phone className="w-4 h-4" /> : <Phone className="w-4 h-4 opacity-40" />}
            Contactables
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              contactableOnly ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
            }`}>
              {contactableCount}
            </span>
          </button>
        </div>
        <ExportButton data={filteredData} filename="reposicion_pendiente" />
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
                onClick={() => setSelected(row.original)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
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
                  Sin reposiciones para los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {filteredData.length === 0
            ? "0 registros"
            : `${table.getState().pagination.pageIndex * PAGE_SIZE + 1}–${Math.min(
                (table.getState().pagination.pageIndex + 1) * PAGE_SIZE,
                filteredData.length
              )} de ${filteredData.length} reposiciones`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Popup de historial */}
      {selected && (
        <HistorialPopup item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
