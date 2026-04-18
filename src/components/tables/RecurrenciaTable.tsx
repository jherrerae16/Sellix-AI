"use client";

import { useState, useMemo } from "react";
import { Search, Phone, Package, Repeat, Users, Clock } from "lucide-react";
import type { ClienteRecurrencia, TipoClienteRecurrencia } from "@/lib/types";
import { formatCOP, formatDate } from "@/lib/formatters";

interface Props {
  data: ClienteRecurrencia[];
}

const TIPO_CONFIG: Record<TipoClienteRecurrencia, { label: string; color: string; icon: React.ReactNode }> = {
  recurrente_producto:       { label: "Recurrente por producto",  color: "bg-blue-100 text-blue-700 border-blue-200",       icon: <Repeat className="w-3 h-3" /> },
  recurrente_categoria:      { label: "Recurrente por categoría", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: <Package className="w-3 h-3" /> },
  recurrente_tratamiento:    { label: "Recurrente crónico",       color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <Clock className="w-3 h-3" /> },
  frecuente_multicomprador:  { label: "Multicomprador frecuente", color: "bg-violet-100 text-violet-700 border-violet-200", icon: <Users className="w-3 h-3" /> },
  ocasional:                 { label: "Ocasional",                color: "bg-gray-100 text-gray-600 border-gray-200",       icon: <Clock className="w-3 h-3" /> },
  inactivo:                  { label: "Inactivo",                 color: "bg-red-100 text-red-700 border-red-200",          icon: <Clock className="w-3 h-3" /> },
};

const TIPOS = Object.keys(TIPO_CONFIG) as TipoClienteRecurrencia[];

export function RecurrenciaTable({ data }: Props) {
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<TipoClienteRecurrencia | "todos">("todos");

  const filtered = useMemo(() => {
    let rows = data;
    if (tipo !== "todos") rows = rows.filter((r) => r.tipo_cliente === tipo);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        r.nombre.toLowerCase().includes(q) ||
        r.cedula.includes(q) ||
        r.top_tratamientos.some((t) => t.tratamiento.toLowerCase().includes(q))
      );
    }
    return rows.slice(0, 100);
  }, [data, query, tipo]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, cédula o tratamiento..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
        </div>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoClienteRecurrencia | "todos")}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
        >
          <option value="todos">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Top tratamiento</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Compras</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Frecuencia</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Ticket prom.</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Ingreso total</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Última compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const cfg = TIPO_CONFIG[r.tipo_cliente];
              return (
                <tr key={r.cedula} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{r.nombre}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                      <span>{r.cedula}</span>
                      {r.telefono && (<span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.telefono}</span>)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{r.top_tratamientos[0]?.tratamiento || "—"}</p>
                    <p className="text-xs text-gray-400">{r.razon}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{r.num_sesiones}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{r.frecuencia_dias > 0 ? `${r.frecuencia_dias} d` : "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCOP(r.ticket_promedio)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-brand-blue">{formatCOP(r.ingreso_total)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(r.ultima_compra)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 text-right">Mostrando {filtered.length} de {data.length}</p>
    </div>
  );
}
