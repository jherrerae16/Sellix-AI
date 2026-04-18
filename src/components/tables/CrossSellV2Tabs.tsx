"use client";

import { useState, useMemo } from "react";
import {
  Package, Layers, Search, TrendingUp,
  ChevronUp, ChevronDown, ChevronsUpDown, ShoppingBag,
} from "lucide-react";
import type { VentasCruzadasV2, Bundle } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface Props {
  data: VentasCruzadasV2;
  bundles: Bundle[];
}

type Tab = "producto" | "combos" | "categoria";
type SortDir = "desc" | "asc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
  return dir === "desc"
    ? <ChevronDown className="w-3 h-3 text-indigo-600" />
    : <ChevronUp className="w-3 h-3 text-indigo-600" />;
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
    { key: "producto" as Tab,  label: "Productos",  icon: <Package className="w-4 h-4" />,     count: data.por_producto.length },
    { key: "combos" as Tab,    label: "Combos",     icon: <ShoppingBag className="w-4 h-4" />,  count: bundles.length },
    { key: "categoria" as Tab, label: "Categorías", icon: <Layers className="w-4 h-4" />,       count: data.por_categoria.length },
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

  const filteredBundles = useMemo(() => {
    let rows = [...bundles];
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((b) => b.productos.some((p) => p.nombre.toLowerCase().includes(q)));
    }
    return rows;
  }, [bundles, query]);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              tab === t.key
                ? "bg-white text-indigo-600 shadow-soft"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}{t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === t.key ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto o categoría..."
          className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
        />
      </div>

      {/* Productos */}
      {tab === "producto" && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Producto A</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Producto B</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("veces")} className="inline-flex items-center gap-1 hover:text-indigo-600">
                    Veces <SortIcon active={sortBy === "veces"} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("confianza")} className="inline-flex items-center gap-1 hover:text-indigo-600">
                    Confianza <SortIcon active={sortBy === "confianza"} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("lift")} className="inline-flex items-center gap-1 hover:text-indigo-600">
                    Lift <SortIcon active={sortBy === "lift"} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducto.map((p, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.item_a.nombre}</p>
                    <p className="text-xs text-gray-400">{p.item_a.categoria}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.item_b.nombre}</p>
                    <p className="text-xs text-gray-400">{p.item_b.categoria}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{p.veces_juntos}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{Math.round(p.confianza_ab * 100)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      p.lift > 10 ? "bg-emerald-50 text-emerald-700" :
                      p.lift > 3  ? "bg-indigo-50 text-indigo-700" :
                                    "bg-gray-50 text-gray-600"
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

      {/* Combos */}
      {tab === "combos" && (
        <div className="space-y-3">
          {filteredBundles.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400 bg-gray-50 rounded-2xl">
              {query ? "Sin combos que coincidan" : "No se encontraron combos frecuentes"}
            </div>
          ) : (
            filteredBundles.map((b, i) => (
              <div key={i} className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-soft-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-violet-200">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Combo frecuente</p>
                      <p className="text-sm text-gray-500">{b.tamano} productos · {b.apariciones}x</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Ticket promedio</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCOP(b.ticket_promedio)}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {b.productos.map((p, j) => (
                    <div key={j} className="flex items-center justify-between text-sm py-2 px-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{p.nombre}</p>
                          <p className="text-xs text-gray-400">{p.tratamiento}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 ml-3 flex-shrink-0">
                        {p.precio_caja > 0 ? formatCOP(p.precio_caja) : formatCOP(p.precio_unidad)}
                      </span>
                    </div>
                  ))}
                </div>
                {b.tratamientos_involucrados.length > 1 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                    {b.tratamientos_involucrados.slice(0, 4).map((t) => (
                      <span key={t} className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
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

      {/* Categoría */}
      {tab === "categoria" && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoría A</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoría B</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("veces")} className="inline-flex items-center gap-1 hover:text-indigo-600">
                    Sesiones <SortIcon active={sortBy === "veces"} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                  <button onClick={() => handleSort("lift")} className="inline-flex items-center gap-1 hover:text-indigo-600">
                    Lift <SortIcon active={sortBy === "lift"} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCategoria.map((p, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-700">{p.item_a}</td>
                  <td className="px-4 py-3 text-sm font-medium text-indigo-700">{p.item_b}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{p.veces_juntos}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      p.lift > 10 ? "bg-emerald-50 text-emerald-700" :
                      p.lift > 3  ? "bg-indigo-50 text-indigo-700" :
                                    "bg-gray-50 text-gray-600"
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
