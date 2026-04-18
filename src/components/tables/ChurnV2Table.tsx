"use client";

import { useState, useMemo } from "react";
import {
  Search, Phone, AlertTriangle, TrendingDown, Clock, Heart, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Calendar, PhoneOff,
} from "lucide-react";
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

type SortField = "ingreso_total" | "dias_sin_comprar" | "frecuencia_dias" | "total_compras" | "churn_ratio";
type SortDir = "desc" | "asc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
  return dir === "desc"
    ? <ChevronDown className="w-3 h-3 text-brand-blue" />
    : <ChevronUp className="w-3 h-3 text-brand-blue" />;
}

// ── Detail Drawer ─────────────────────────────────────────────

function ChurnDetailDrawer({ cliente, onClose }: { cliente: ClienteChurnV2; onClose: () => void }) {
  const cfg = TIPO_CONFIG[cliente.tipo_churn];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 text-white relative flex-shrink-0 ${
          cliente.nivel_riesgo === "alto" ? "bg-gradient-to-br from-red-600 to-red-700" :
          cliente.nivel_riesgo === "medio" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
          "bg-gradient-to-br from-emerald-600 to-emerald-700"
        }`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <p className="text-white/80 text-xs uppercase tracking-wide">Análisis de abandono</p>
          <h2 className="text-xl font-bold mt-1">{cliente.nombre}</h2>
          <p className="text-white/80 text-sm mt-0.5">
            CC {cliente.cedula}
            {cliente.telefono && ` · ${cliente.telefono}`}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/90 text-gray-800">
              {cfg.icon}{cfg.label}
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/20 text-white capitalize">
              Riesgo {cliente.nivel_riesgo}
            </span>
          </div>
          <p className="text-white/90 text-xs mt-2 italic">{cliente.razon}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700 uppercase">Sin comprar hace</p>
              <p className="text-xl font-bold text-red-800">{cliente.dias_sin_comprar}d</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-600 uppercase">Frecuencia habitual</p>
              <p className="text-xl font-bold text-gray-900">{cliente.frecuencia_dias}d</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700 uppercase">Compras totales</p>
              <p className="text-xl font-bold text-blue-800">{cliente.total_compras}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-700 uppercase">Ingreso total</p>
              <p className="text-lg font-bold text-emerald-800">{formatCOP(cliente.ingreso_total)}</p>
            </div>
          </div>

          {/* Churn ratio */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase mb-2">Indicador de abandono</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${
                cliente.churn_ratio >= 3 ? "text-red-600" :
                cliente.churn_ratio >= 1.5 ? "text-orange-500" : "text-emerald-600"
              }`}>
                {cliente.churn_ratio.toFixed(1)}x
              </span>
              <span className="text-xs text-gray-500">su frecuencia normal</span>
            </div>
            {cliente.ticket_cambio_pct !== 0 && (
              <p className={`mt-2 text-sm ${cliente.ticket_cambio_pct < 0 ? "text-red-600" : "text-emerald-600"}`}>
                Ticket cambió {cliente.ticket_cambio_pct > 0 ? "+" : ""}{cliente.ticket_cambio_pct}%
              </p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Última actividad
            </h3>
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Última compra</span>
                <span className="font-medium">{formatDate(cliente.ultima_compra)}</span>
              </div>
            </div>
          </div>

          {/* Tratamientos abandonados */}
          {cliente.tratamientos_abandonados.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Tratamientos abandonados
              </h3>
              <div className="space-y-2">
                {cliente.tratamientos_abandonados.map((t, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      t.es_cronico ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${t.es_cronico ? "text-red-800" : "text-gray-800"}`}>
                          {t.es_cronico && "⚠️ "}{t.tratamiento}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t.compras_totales} compras previas · sin comprar hace {t.dias_sin_comprar}d
                        </p>
                      </div>
                      {t.es_cronico && (
                        <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">CRÓNICO</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tratamientos activos */}
          {cliente.tratamientos_activos.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-emerald-500" /> Tratamientos activos
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {cliente.tratamientos_activos.map((t) => (
                  <span key={t} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {cliente.tiene_churn_cronico && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-3">
              <p className="text-xs text-red-800 font-semibold">🚨 Abandono de tratamiento crónico</p>
              <p className="text-xs text-red-700 mt-1">
                Este cliente interrumpió medicación crónica. Contactar urgentemente para retener y/o verificar continuidad del tratamiento.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Table ────────────────────────────────────────────────

export function ChurnV2Table({ data }: Props) {
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<TipoChurnV2 | "todos">("todos");
  const [riesgo, setRiesgo] = useState<"todos" | "alto" | "medio" | "bajo">("todos");
  const [contactableOnly, setContactableOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("ingreso_total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<ClienteChurnV2 | null>(null);

  const contactableCount = useMemo(
    () => data.filter((r) => r.telefono && String(r.telefono).trim().length >= 7).length,
    [data]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let rows = data;
    if (contactableOnly) {
      rows = rows.filter((r) => r.telefono && String(r.telefono).trim().length >= 7);
    }
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
    rows = [...rows].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return rows.slice(0, 100);
  }, [data, query, tipo, riesgo, contactableOnly, sortField, sortDir]);

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
          {TIPOS.map((t) => (<option key={t} value={t}>{TIPO_CONFIG[t].label}</option>))}
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

        <button
          onClick={() => setContactableOnly(!contactableOnly)}
          title={contactableOnly ? "Mostrando solo contactables" : "Filtrar solo contactables"}
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            contactableOnly
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {contactableOnly ? <Phone className="w-4 h-4" /> : <PhoneOff className="w-4 h-4" />}
          Contactables
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            contactableOnly ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}>
            {contactableCount}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tratamientos abandonados</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("dias_sin_comprar")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Sin comprar <SortIcon active={sortField === "dias_sin_comprar"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("churn_ratio")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Churn ratio <SortIcon active={sortField === "churn_ratio"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("total_compras")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Compras <SortIcon active={sortField === "total_compras"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <button onClick={() => handleSort("ingreso_total")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                  Ingreso total <SortIcon active={sortField === "ingreso_total"} dir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const cfg = TIPO_CONFIG[r.tipo_churn];
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
                  <td className="px-4 py-3">
                    {r.tratamientos_abandonados.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {r.tratamientos_abandonados.slice(0, 2).map((t, i) => (
                          <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              t.es_cronico ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-600"
                            }`}
                          >
                            {t.es_cronico && "⚠️ "}{t.tratamiento.slice(0, 25)}
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
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.churn_ratio >= 3 ? "bg-red-100 text-red-700" :
                      r.churn_ratio >= 1.5 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {r.churn_ratio.toFixed(1)}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{r.total_compras}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-brand-blue">{formatCOP(r.ingreso_total)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 text-right">
        Mostrando {filtered.length} de {data.length} · <span className="text-gray-500">Click en un cliente para detalle completo</span>
      </p>

      {selected && <ChurnDetailDrawer cliente={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
