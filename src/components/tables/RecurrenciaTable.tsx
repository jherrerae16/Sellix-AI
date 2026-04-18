"use client";

import { useState, useMemo } from "react";
import {
  Search, Phone, Package, Repeat, Users, Clock, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Calendar, ShoppingBag,
} from "lucide-react";
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

type SortField = "ingreso_total" | "num_sesiones" | "ticket_promedio" | "frecuencia_dias" | "dias_sin_comprar";
type SortDir = "desc" | "asc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
  return dir === "desc"
    ? <ChevronDown className="w-3 h-3 text-brand-blue" />
    : <ChevronUp className="w-3 h-3 text-brand-blue" />;
}

// ── Detail Drawer ─────────────────────────────────────────────

function ClientDetailDrawer({ cliente, onClose }: { cliente: ClienteRecurrencia; onClose: () => void }) {
  const cfg = TIPO_CONFIG[cliente.tipo_cliente];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-5 text-white relative flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <p className="text-indigo-200 text-xs uppercase tracking-wide">Ficha del cliente</p>
          <h2 className="text-xl font-bold mt-1">{cliente.nombre}</h2>
          <p className="text-indigo-200 text-sm mt-0.5">
            CC {cliente.cedula}
            {cliente.telefono && ` · ${cliente.telefono}`}
          </p>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border bg-white/90 ${cfg.color.replace(/bg-\w+-\d+/, "")}`}>
              {cfg.icon}{cfg.label}
            </span>
          </div>
          <p className="text-indigo-100 text-xs mt-2 italic">{cliente.razon}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-700 uppercase">Ingreso total</p>
              <p className="text-lg font-bold text-emerald-800">{formatCOP(cliente.ingreso_total)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700 uppercase">Ticket promedio</p>
              <p className="text-lg font-bold text-blue-800">{formatCOP(cliente.ticket_promedio)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-600 uppercase">Sesiones</p>
              <p className="text-lg font-bold text-gray-900">{cliente.num_sesiones}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-600 uppercase">Frecuencia</p>
              <p className="text-lg font-bold text-gray-900">
                {cliente.frecuencia_dias > 0 ? `${cliente.frecuencia_dias}d` : "—"}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Actividad
            </h3>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Primera compra</span><span className="font-medium">{formatDate(cliente.primera_compra)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Última compra</span><span className="font-medium">{formatDate(cliente.ultima_compra)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sin comprar hace</span><span className="font-medium">{cliente.dias_sin_comprar} días</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Formato preferido</span><span className="font-medium capitalize">{cliente.formato_preferido}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Día del mes habitual</span><span className="font-medium">{cliente.dia_mes_promedio}</span></div>
            </div>
          </div>

          {/* Diversity */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" /> Diversidad de compra
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-lg font-bold text-blue-700">{cliente.num_productos_diferentes}</p>
                <p className="text-[10px] text-gray-500">productos</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-2">
                <p className="text-lg font-bold text-indigo-700">{cliente.num_categorias_diferentes}</p>
                <p className="text-[10px] text-gray-500">categorías</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2">
                <p className="text-lg font-bold text-emerald-700">{cliente.num_tratamientos_diferentes}</p>
                <p className="text-[10px] text-gray-500">tratamientos</p>
              </div>
            </div>
          </div>

          {/* Top productos */}
          {cliente.top_productos.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Productos más comprados</h3>
              <div className="space-y-1.5">
                {cliente.top_productos.map((p) => (
                  <div key={p.codigo} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-800 truncate flex-1">{p.nombre}</span>
                    <span className="ml-2 text-xs font-semibold text-blue-700">{p.veces}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top tratamientos */}
          {cliente.top_tratamientos.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Tratamientos más frecuentes</h3>
              <div className="space-y-1.5">
                {cliente.top_tratamientos.map((t) => (
                  <div key={t.tratamiento} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg text-sm">
                    <span className="text-emerald-800 truncate flex-1">{t.tratamiento}</span>
                    <span className="ml-2 text-xs font-semibold text-emerald-700">{t.veces}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top categorías */}
          {cliente.top_categorias.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Categorías terapéuticas</h3>
              <div className="flex flex-wrap gap-1.5">
                {cliente.top_categorias.map((c) => (
                  <span key={c.categoria} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                    {c.categoria} <span className="text-indigo-400">·{c.veces}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {cliente.tiene_cronicos && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Cliente con tratamientos crónicos — alto potencial de recompra
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Table ────────────────────────────────────────────────

export function RecurrenciaTable({ data }: Props) {
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<TipoClienteRecurrencia | "todos">("todos");
  const [sortField, setSortField] = useState<SortField>("ingreso_total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<ClienteRecurrencia | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

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
    rows = [...rows].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return rows.slice(0, 100);
  }, [data, query, tipo, sortField, sortDir]);

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
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("num_sesiones")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Compras <SortIcon active={sortField === "num_sesiones"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("frecuencia_dias")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Frecuencia <SortIcon active={sortField === "frecuencia_dias"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("ticket_promedio")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Ticket prom. <SortIcon active={sortField === "ticket_promedio"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("ingreso_total")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Ingreso total <SortIcon active={sortField === "ingreso_total"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("dias_sin_comprar")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Sin comprar <SortIcon active={sortField === "dias_sin_comprar"} dir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const cfg = TIPO_CONFIG[r.tipo_cliente];
              return (
                <tr
                  key={r.cedula}
                  onClick={() => setSelected(r)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{r.nombre || "(sin nombre)"}</p>
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
                  <td className="px-4 py-3 text-right text-sm font-semibold">{r.num_sesiones}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{r.frecuencia_dias > 0 ? `${r.frecuencia_dias}d` : "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCOP(r.ticket_promedio)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-brand-blue">{formatCOP(r.ingreso_total)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${
                      r.dias_sin_comprar > 90 ? "text-red-600" :
                      r.dias_sin_comprar > 30 ? "text-amber-600" : "text-gray-600"
                    }`}>
                      {r.dias_sin_comprar}d
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 text-right">
        Mostrando {filtered.length} de {data.length} · <span className="text-gray-500">Click en un cliente para ver detalle</span>
      </p>

      {selected && <ClientDetailDrawer cliente={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
