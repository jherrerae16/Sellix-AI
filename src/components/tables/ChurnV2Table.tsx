"use client";

import { useState, useMemo } from "react";
import { Search, Phone, AlertTriangle, TrendingDown, Clock, Heart } from "lucide-react";
import type { ClienteChurnV2, TipoChurnV2 } from "@/lib/types";
import { formatCOP, formatDate } from "@/lib/formatters";

interface Props {
  data: ClienteChurnV2[];
}

const TIPO_CONFIG: Record<TipoChurnV2, { label: string; color: string; icon: React.ReactNode }> = {
  activo:                { label: "Activo",                color: "bg-green-100 text-green-700 border-green-200",     icon: <Heart className="w-3 h-3" /> },
  churn_riesgo:          { label: "En riesgo",             color: "bg-yellow-100 text-yellow-700 border-yellow-200",  icon: <AlertTriangle className="w-3 h-3" /> },
  churn_tratamiento:     { label: "Abandonó tratamientos", color: "bg-orange-100 text-orange-700 border-orange-200",  icon: <AlertTriangle className="w-3 h-3" /> },
  churn_cronico:         { label: "Abandono crónico",      color: "bg-red-100 text-red-700 border-red-200",           icon: <AlertTriangle className="w-3 h-3" /> },
  churn_total:           { label: "Churn total",           color: "bg-red-200 text-red-900 border-red-300",           icon: <TrendingDown className="w-3 h-3" /> },
  downgrade:             { label: "Downgrade",             color: "bg-amber-100 text-amber-700 border-amber-200",     icon: <TrendingDown className="w-3 h-3" /> },
  alto_valor_inactivo:   { label: "VIP inactivo",          color: "bg-purple-100 text-purple-700 border-purple-200",  icon: <Clock className="w-3 h-3" /> },
};

const TIPOS = Object.keys(TIPO_CONFIG) as TipoChurnV2[];

export function ChurnV2Table({ data }: Props) {
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<TipoChurnV2 | "todos">("todos");
  const [riesgo, setRiesgo] = useState<"todos" | "alto" | "medio" | "bajo">("todos");

  const filtered = useMemo(() => {
    let rows = data;
    if (tipo !== "todos") rows = rows.filter((r) => r.tipo_churn === tipo);
    if (riesgo !== "todos") rows = rows.filter((r) => r.nivel_riesgo === riesgo);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        r.nombre.toLowerCase().includes(q) ||
        r.cedula.includes(q) ||
        r.tratamientos_abandonados.some((t) => t.tratamiento.toLowerCase().includes(q))
      );
    }
    return rows.slice(0, 100);
  }, [data, query, tipo, riesgo]);

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
            placeholder="Buscar cliente, cédula o tratamiento..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
        </div>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoChurnV2 | "todos")}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
        >
          <option value="todos">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
          ))}
        </select>
        <select
          value={riesgo}
          onChange={(e) => setRiesgo(e.target.value as "todos" | "alto" | "medio" | "bajo")}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue"
        >
          <option value="todos">Todo riesgo</option>
          <option value="alto">Alto</option>
          <option value="medio">Medio</option>
          <option value="bajo">Bajo</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Razón</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tratamientos abandonados</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Sin comprar</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Cambio ticket</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Ingreso total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const cfg = TIPO_CONFIG[r.tipo_churn];
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
                    <p className="text-xs text-gray-600 max-w-[240px]">{r.razon}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.tratamientos_abandonados.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {r.tratamientos_abandonados.slice(0, 2).map((t, i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            t.es_cronico ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}>
                            {t.es_cronico && "⚠️ "}{t.tratamiento}
                          </span>
                        ))}
                        {r.tratamientos_abandonados.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{r.tratamientos_abandonados.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${
                      r.dias_sin_comprar > 180 ? "text-red-600" :
                      r.dias_sin_comprar > 90 ? "text-orange-600" :
                      r.dias_sin_comprar > 30 ? "text-amber-600" : "text-gray-600"
                    }`}>
                      {r.dias_sin_comprar}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.ticket_cambio_pct !== 0 ? (
                      <span className={`text-xs font-semibold ${r.ticket_cambio_pct < 0 ? "text-red-600" : "text-green-600"}`}>
                        {r.ticket_cambio_pct > 0 ? "+" : ""}{r.ticket_cambio_pct}%
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-brand-blue">{formatCOP(r.ingreso_total)}</td>
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
      <p className="text-xs text-gray-400 text-right">Mostrando {filtered.length} de {data.length}</p>
    </div>
  );
}
