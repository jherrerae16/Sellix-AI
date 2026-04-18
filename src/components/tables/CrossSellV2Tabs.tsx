"use client";

import { useState } from "react";
import { Package, Layers, Stethoscope, Search, TrendingUp } from "lucide-react";
import type { VentasCruzadasV2 } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface Props {
  data: VentasCruzadasV2;
}

type Tab = "producto" | "categoria" | "tratamiento";

export function CrossSellV2Tabs({ data }: Props) {
  const [tab, setTab] = useState<Tab>("producto");
  const [query, setQuery] = useState("");

  const tabs = [
    { key: "producto" as Tab,    label: "Por producto",    icon: <Package className="w-4 h-4" />,     count: data.por_producto.length },
    { key: "categoria" as Tab,   label: "Por categoría",   icon: <Layers className="w-4 h-4" />,      count: data.por_categoria.length },
    { key: "tratamiento" as Tab, label: "Por tratamiento", icon: <Stethoscope className="w-4 h-4" />, count: data.por_tratamiento.length },
  ];

  const filteredProducto = data.por_producto.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return p.item_a.nombre.toLowerCase().includes(q) || p.item_b.nombre.toLowerCase().includes(q);
  });

  const filteredCategoria = data.por_categoria.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return p.item_a.toLowerCase().includes(q) || p.item_b.toLowerCase().includes(q);
  });

  const filteredTratamiento = data.por_tratamiento.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return p.item_a.toLowerCase().includes(q) || p.item_b.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
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
          placeholder="Buscar..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        />
      </div>

      {/* Content per tab */}
      {tab === "producto" && (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto A</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto B</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Veces juntos</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Confianza A→B</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducto.slice(0, 50).map((p, i) => (
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

      {tab === "categoria" && (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría A</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría B</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Sesiones juntas</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategoria.slice(0, 50).map((p, i) => (
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

      {tab === "tratamiento" && (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tratamiento A</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tratamiento B</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Sesiones juntas</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTratamiento.slice(0, 50).map((p, i) => (
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
