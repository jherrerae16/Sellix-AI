"use client";

import { useState, useMemo } from "react";
import {
  Package, Layers, Stethoscope, Search, TrendingUp,
  ChevronUp, ChevronDown, ChevronsUpDown, ShoppingBag,
} from "lucide-react";
import type { VentasCruzadasV2, Bundle } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface Props {
  data: VentasCruzadasV2;
  bundles: Bundle[];
}

type Tab = "producto" | "categoria" | "tratamiento" | "combos";
type SortDir = "desc" | "asc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
  return dir === "desc"
    ? <ChevronDown className="w-3 h-3 text-brand-blue" />
    : <ChevronUp className="w-3 h-3 text-brand-blue" />;
}

export function CrossSellV2Tabs({ data, bundles }: Props) {
  const [tab, setTab] = useState<Tab>("producto");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"lift" | "veces" | "confianza">("lift");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (col: "lift" | "veces" | "confianza") => {
    if (sortBy === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const tabs = [
    { key: "producto" as Tab,    label: "Productos",    icon: <Package className="w-4 h-4" />,     count: data.por_producto.length },
    { key: "combos" as Tab,      label: "Combos",       icon: <ShoppingBag className="w-4 h-4" />,  count: bundles.length },
    { key: "categoria" as Tab,   label: "Categorías",   icon: <Layers className="w-4 h-4" />,       count: data.por_categoria.length },
    { key: "tratamiento" as Tab, label: "Tratamientos", icon: <Stethoscope className="w-4 h-4" />,  count: data.por_tratamiento.length },
  ];

  const filteredProducto = useMemo(() => {
    let rows = [...data.por_producto];
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((p) =>
        p.item_a.nombre.toLowerCase().includes(q) || p.item_b.nombre.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const va = sortBy === "lift" ? a.lift : sortBy === "veces" ? a.veces_juntos : a.confianza_ab;
      const vb = sortBy === "lift" ? b.lift : sortBy === "veces" ? b.veces_juntos : b.confianza_ab;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return rows.slice(0, 50);
  }, [data.por_producto, query, sortBy, sortDir]);

  const filteredCategoria = useMemo(() => {
    let rows = [...data.por_categoria];
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((p) => p.item_a.toLowerCase().includes(q) || p.item_b.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const va = sortBy === "lift" ? a.lift : a.veces_juntos;
      const vb = sortBy === "lift" ? b.lift : b.veces_juntos;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return rows.slice(0, 50);
  }, [data.por_categoria, query, sortBy, sortDir]);

  const filteredTratamiento = useMemo(() => {
    let rows = [...data.por_tratamiento];
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((p) => p.item_a.toLowerCase().includes(q) || p.item_b.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const va = sortBy === "lift" ? a.lift : a.veces_juntos;
      const vb = sortBy === "lift" ? b.lift : b.veces_juntos;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return rows.slice(0, 50);
  }, [data.por_tratamiento, query, sortBy, sortDir]);

  const filteredBundles = useMemo(() => {
    let rows = [...bundles];
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((b) =>
        b.productos.some((p) => p.nombre.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [bundles, query]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}{t.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${tab === t.key ? "bg-blue-100 text-brand-blue" : "bg-gray-100 text-gray-500"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "combos" ? "Buscar combo..." : "Buscar..."}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        />
      </div>

      {/* ── Producto ───────────────────────────────────── */}
      {tab === "producto" && (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto A</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto B</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("veces")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Veces juntos <SortIcon active={sortBy === "veces"} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("confianza")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Confianza <SortIcon active={sortBy === "confianza"} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("lift")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Lift <SortIcon active={sortBy === "lift"} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducto.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.item_a.nombre}</p>
                    <p className="text-xs text-gray-400">{p.item_a.categoria}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.item_b.nombre}</p>
                    <p className="text-xs text-gray-400">{p.item_b.categoria}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{p.veces_juntos}</td>
                  <td className="px-4 py-3 text-right text-sm">{Math.round(p.confianza_ab * 100)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.lift > 10 ? "bg-green-100 text-green-700" :
                      p.lift > 3  ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-600"
                    }`}>
                      <TrendingUp className="w-3 h-3" />×{p.lift.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Combos (Bundles) ──────────────────────────── */}
      {tab === "combos" && (
        <div className="space-y-3">
          {filteredBundles.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              {query ? "Sin combos que coincidan con la búsqueda" : "No se encontraron combos frecuentes en los datos"}
            </div>
          ) : (
            filteredBundles.map((b, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                      Combo · {b.tamano} productos
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Ticket promedio</p>
                    <p className="text-lg font-bold text-emerald-700">{formatCOP(b.ticket_promedio)}</p>
                    <p className="text-xs text-gray-500">Aparece {b.apariciones}x</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {b.productos.map((p, j) => (
                    <div key={j} className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{p.nombre}</p>
                        <p className="text-xs text-gray-400">{p.tratamiento}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-600 ml-2">
                        {p.precio_caja > 0 ? formatCOP(p.precio_caja) : formatCOP(p.precio_unidad)}
                      </span>
                    </div>
                  ))}
                </div>
                {b.tratamientos_involucrados.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1">
                    {b.tratamientos_involucrados.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Categoría ──────────────────────────────────── */}
      {tab === "categoria" && (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría A</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría B</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("veces")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Sesiones juntas <SortIcon active={sortBy === "veces"} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("lift")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Lift <SortIcon active={sortBy === "lift"} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategoria.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-700">{p.item_a}</td>
                  <td className="px-4 py-3 text-sm font-medium text-indigo-700">{p.item_b}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{p.veces_juntos}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.lift > 10 ? "bg-green-100 text-green-700" :
                      p.lift > 3  ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-600"
                    }`}>
                      ×{p.lift.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tratamiento ───────────────────────────────── */}
      {tab === "tratamiento" && (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tratamiento A</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tratamiento B</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("veces")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Sesiones juntas <SortIcon active={sortBy === "veces"} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <button onClick={() => handleSort("lift")} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                    Lift <SortIcon active={sortBy === "lift"} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTratamiento.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-emerald-700">{p.item_a}</td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-700">{p.item_b}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{p.veces_juntos}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.lift > 10 ? "bg-green-100 text-green-700" :
                      p.lift > 3  ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-600"
                    }`}>
                      ×{p.lift.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
