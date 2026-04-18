// =============================================================
// Sellix AI — Riesgo de Abandono (Churn)
// =============================================================

export const dynamic = "force-dynamic";

import { getChurnV2, getChurnResumen } from "@/lib/dataService";
import { ChurnV2Table } from "@/components/tables/ChurnV2Table";
import { AlertTriangle, TrendingDown, Heart, Clock, XCircle } from "lucide-react";
import { AdminOnly } from "@/components/layout/AdminOnly";

export default async function ChurnPage() {
  const [churnV2, resumen] = await Promise.all([
    getChurnV2(),
    getChurnResumen(),
  ]);

  const byTipo = resumen.por_tipo || {};
  const totalRiesgo = (byTipo.churn_cronico || 0) + (byTipo.churn_total || 0) + (byTipo.alto_valor_inactivo || 0);

  return (
    <AdminOnly>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Riesgo de Abandono</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {churnV2.length} clientes clasificados con seguimiento de tratamientos
          </p>
        </div>
        {totalRiesgo > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {totalRiesgo} clientes requieren atención urgente
            </p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-green-500 bg-green-50 p-3">
          <Heart className="w-4 h-4 text-green-600 mb-1" />
          <p className="text-[10px] text-green-700 font-semibold uppercase">Activos</p>
          <p className="text-xl font-bold text-gray-900">{byTipo.activo || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-yellow-500 bg-yellow-50 p-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mb-1" />
          <p className="text-[10px] text-yellow-700 font-semibold uppercase">En riesgo</p>
          <p className="text-xl font-bold text-gray-900">{byTipo.churn_riesgo || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-orange-500 bg-orange-50 p-3">
          <AlertTriangle className="w-4 h-4 text-orange-600 mb-1" />
          <p className="text-[10px] text-orange-700 font-semibold uppercase">Abandonó trat.</p>
          <p className="text-xl font-bold text-gray-900">{byTipo.churn_tratamiento || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-500 bg-red-50 p-3">
          <AlertTriangle className="w-4 h-4 text-red-600 mb-1" />
          <p className="text-[10px] text-red-700 font-semibold uppercase">Crónico</p>
          <p className="text-xl font-bold text-gray-900">{byTipo.churn_cronico || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-700 bg-red-50 p-3">
          <XCircle className="w-4 h-4 text-red-700 mb-1" />
          <p className="text-[10px] text-red-800 font-semibold uppercase">Total</p>
          <p className="text-xl font-bold text-gray-900">{byTipo.churn_total || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-amber-500 bg-amber-50 p-3">
          <TrendingDown className="w-4 h-4 text-amber-600 mb-1" />
          <p className="text-[10px] text-amber-700 font-semibold uppercase">Downgrade</p>
          <p className="text-xl font-bold text-gray-900">{byTipo.downgrade || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-purple-500 bg-purple-50 p-3">
          <Clock className="w-4 h-4 text-purple-600 mb-1" />
          <p className="text-[10px] text-purple-700 font-semibold uppercase">VIP inactivo</p>
          <p className="text-xl font-bold text-gray-900">{byTipo.alto_valor_inactivo || 0}</p>
        </div>
      </div>

      {/* Top abandoned treatments */}
      {resumen.top_tratamientos_abandonados.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Top tratamientos abandonados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {resumen.top_tratamientos_abandonados.slice(0, 8).map((t) => (
              <div key={t.tratamiento} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-700">{t.tratamiento}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                  <AlertTriangle className="w-3 h-3" />{t.clientes}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <ChurnV2Table data={churnV2} />
      </div>
    </div>
    </AdminOnly>
  );
}
