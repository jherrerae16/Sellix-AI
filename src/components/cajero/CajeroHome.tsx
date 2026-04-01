"use client";

import { useState, useMemo } from "react";
import { Search, User, ShoppingBag, RefreshCcw, ArrowRight } from "lucide-react";
import type { VentaCruzada, ReposicionPendiente, ClienteChurn } from "@/lib/types";
import { formatDate, formatDays, formatScore } from "@/lib/formatters";
import Link from "next/link";

interface CajeroHomeProps {
  ventasCruzadas: VentaCruzada[];
  reposiciones: ReposicionPendiente[];
  churn: ClienteChurn[];
}

export function CajeroHome({ ventasCruzadas, reposiciones, churn }: CajeroHomeProps) {
  const [query, setQuery] = useState("");
  const isCedula = /^\d{5,}$/.test(query.trim());

  // Client lookup by cedula
  const cliente = useMemo(() => {
    if (!isCedula) return null;
    const cedula = query.trim();
    const ch = churn.find((c) => c.cedula === cedula);
    const reps = reposiciones.filter((r) => r.cedula === cedula);
    if (!ch && !reps.length) return null;
    return {
      nombre: ch?.nombre ?? reps[0]?.nombre ?? "",
      cedula,
      telefono: ch?.telefono ?? reps[0]?.telefono ?? null,
      ultima_compra: ch?.ultima_compra ?? null,
      reposiciones: reps,
    };
  }, [query, isCedula, churn, reposiciones]);

  // Product search for cross-sell
  const crossResults = useMemo(() => {
    if (isCedula || query.length < 2) return [];
    const q = query.toLowerCase();
    return ventasCruzadas
      .filter((v) => v.producto_base.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, isCedula, ventasCruzadas]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Search */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Punto de venta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Busca por cédula del cliente o nombre del producto
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cédula del cliente o nombre del producto…"
          className="w-full pl-12 pr-4 py-4 text-base border border-gray-300 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
                     bg-white shadow-sm"
          autoFocus
        />
      </div>

      {/* Client found */}
      {isCedula && cliente && (
        <div className="space-y-4">
          {/* Client card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <User className="w-5 h-5 text-brand-blue" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{cliente.nombre}</h2>
                <p className="text-xs text-gray-400">CC {cliente.cedula}
                  {cliente.ultima_compra && ` · Última compra: ${formatDate(cliente.ultima_compra)}`}
                </p>
              </div>
            </div>

            {/* Reposiciones del cliente */}
            {cliente.reposiciones.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Productos para reponer ({cliente.reposiciones.length})
                </h3>
                <div className="space-y-2">
                  {cliente.reposiciones.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        r.estado === "Vencido"
                          ? "bg-red-50 border-red-200"
                          : r.estado === "Esta semana"
                          ? "bg-orange-50 border-orange-200"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.producto}</p>
                        <p className="text-xs text-gray-500">
                          Ciclo: {formatDays(r.ciclo_dias)} · Última: {formatDate(r.ultima_compra)}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        r.estado === "Vencido" ? "bg-red-100 text-red-700"
                        : r.estado === "Esta semana" ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                      }`}>
                        {r.estado === "Vencido"
                          ? `Vencido hace ${Math.abs(r.dias_para_reposicion)}d`
                          : `En ${r.dias_para_reposicion}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cliente.reposiciones.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Este cliente no tiene reposiciones pendientes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cedula not found */}
      {isCedula && !cliente && query.length >= 5 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No se encontró cliente con cédula <strong>{query}</strong></p>
        </div>
      )}

      {/* Cross-sell results */}
      {!isCedula && crossResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-brand-blue" />
            Recomendar junto con &quot;{query}&quot;
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {crossResults.map((v, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-blue transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{v.producto_recomendado}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Se compran juntos {v.veces_juntos} veces
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    v.lift >= 3 ? "text-green-700 bg-green-100"
                    : v.lift >= 2 ? "text-brand-blue bg-blue-100"
                    : "text-orange-700 bg-orange-100"
                  }`}>
                    {formatScore(v.lift)}×
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!query && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Link
            href="/cruzada"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-blue transition-colors group"
          >
            <ShoppingBag className="w-8 h-8 text-brand-blue mb-3" />
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-blue transition-colors">
              Venta Cruzada
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Busca un producto y ve qué recomendar al cliente
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-brand-blue font-medium mt-3">
              Ver tabla completa <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <Link
            href="/reposicion"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-blue transition-colors group"
          >
            <RefreshCcw className="w-8 h-8 text-brand-blue mb-3" />
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-blue transition-colors">
              Reposición
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Productos que los clientes necesitan reponer pronto
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-brand-blue font-medium mt-3">
              Ver tabla completa <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
