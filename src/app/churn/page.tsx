// =============================================================
// Sellix AI — Riesgo de Abandono (Churn)
// Estilo: AI-Native UI + Minimalism
// =============================================================

export const dynamic = "force-dynamic";

import { getChurnV2, getChurnResumen } from "@/lib/dataService";
import { ChurnV2Table } from "@/components/tables/ChurnV2Table";
import {
  AlertTriangle, TrendingDown, Heart, Clock, XCircle, Sparkles, Activity,
} from "lucide-react";
import { AdminOnly } from "@/components/layout/AdminOnly";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

export default async function ChurnPage() {
  const [churnV2, resumen] = await Promise.all([
    getChurnV2(),
    getChurnResumen(),
  ]);

  const byTipo = resumen.por_tipo || {};
  const criticalCount = (byTipo.churn_cronico || 0) + (byTipo.churn_total || 0) + (byTipo.alto_valor_inactivo || 0);
  const activoCount = byTipo.activo || 0;
  const pctActivo = Math.round((activoCount / Math.max(churnV2.length, 1)) * 100);

  return (
    <AdminOnly>
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Riesgo de Abandono"
        subtitle={`${churnV2.length} clientes · seguimiento por tratamiento`}
        icon={<AlertTriangle className="w-5 h-5" />}
        badge={
          criticalCount > 0 ? (
            <span className="text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full animate-pulse">
              {criticalCount} urgentes
            </span>
          ) : (
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">
              Saludable
            </span>
          )
        }
      />

      {/* Hero insight */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-amber-50 rounded-3xl border border-red-100 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-start gap-4">
          <div className={`w-12 h-12 ${criticalCount > 0 ? "bg-red-600" : "bg-emerald-600"} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
            {criticalCount > 0 ? <AlertTriangle className="w-6 h-6" /> : <Heart className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-red-600">
              {criticalCount > 0 ? "Atención requerida" : "Todo bajo control"}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">
              {criticalCount > 0
                ? `${criticalCount} clientes necesitan acción inmediata`
                : `${pctActivo}% de clientes activos`}
            </h2>
            <p className="text-gray-600 mt-2 max-w-2xl">
              {byTipo.churn_cronico > 0 && (
                <>
                  <span className="font-semibold text-red-700">{byTipo.churn_cronico} abandonaron tratamientos crónicos</span> —
                  interrupción grave que requiere contacto urgente.{" "}
                </>
              )}
              {(byTipo.churn_tratamiento || 0) > 0 && (
                <>
                  Otros <span className="font-semibold">{byTipo.churn_tratamiento} dejaron de comprar sus tratamientos habituales</span>.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución</p>
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          <StatCard
            label="Activos"
            value={byTipo.activo || 0}
            icon={<Heart className="w-4 h-4" />}
            accent="emerald"
            size="sm"
          />
          <StatCard
            label="En riesgo"
            value={byTipo.churn_riesgo || 0}
            icon={<AlertTriangle className="w-4 h-4" />}
            accent="amber"
            size="sm"
          />
          <StatCard
            label="Abandonó trat."
            value={byTipo.churn_tratamiento || 0}
            icon={<Activity className="w-4 h-4" />}
            accent="orange"
            size="sm"
          />
          <StatCard
            label="Crónico"
            value={byTipo.churn_cronico || 0}
            icon={<AlertTriangle className="w-4 h-4" />}
            accent="red"
            size="sm"
          />
          <StatCard
            label="Churn total"
            value={byTipo.churn_total || 0}
            icon={<XCircle className="w-4 h-4" />}
            accent="red"
            size="sm"
          />
          <StatCard
            label="Downgrade"
            value={byTipo.downgrade || 0}
            icon={<TrendingDown className="w-4 h-4" />}
            accent="amber"
            size="sm"
          />
          <StatCard
            label="VIP inactivo"
            value={byTipo.alto_valor_inactivo || 0}
            icon={<Clock className="w-4 h-4" />}
            accent="violet"
            size="sm"
          />
        </div>
      </div>

      {/* Top abandoned treatments */}
      {resumen.top_tratamientos_abandonados.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-900">Top tratamientos abandonados</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {resumen.top_tratamientos_abandonados.slice(0, 8).map((t, i) => (
              <div
                key={t.tratamiento}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-50 to-transparent border border-red-100 hover:border-red-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-white border border-red-200 rounded-lg flex items-center justify-center text-xs font-bold text-red-700">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 font-medium">{t.tratamiento}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                  {t.clientes} clientes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-6">
        <ChurnV2Table data={churnV2} />
      </div>
    </div>
    </AdminOnly>
  );
}
