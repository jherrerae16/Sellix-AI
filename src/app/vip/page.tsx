// =============================================================
// Sellix AI — Segmentación por Recurrencia
// Estilo: AI-Native UI + Minimalism
// =============================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { getRecurrencia } from "@/lib/dataService";
import { RecurrenciaTable } from "@/components/tables/RecurrenciaTable";
import { formatCOP } from "@/lib/formatters";
import { AdminOnly } from "@/components/layout/AdminOnly";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  Users, Repeat, Package, Clock, ShoppingBag, TrendingDown, Sparkles,
} from "lucide-react";

export default async function VIPPage() {
  const recurrencia = await getRecurrencia();

  const recCounts = {
    recurrente_producto: recurrencia.filter((r) => r.tipo_cliente === "recurrente_producto").length,
    recurrente_categoria: recurrencia.filter((r) => r.tipo_cliente === "recurrente_categoria").length,
    recurrente_tratamiento: recurrencia.filter((r) => r.tipo_cliente === "recurrente_tratamiento").length,
    frecuente_multicomprador: recurrencia.filter((r) => r.tipo_cliente === "frecuente_multicomprador").length,
    ocasional: recurrencia.filter((r) => r.tipo_cliente === "ocasional").length,
    inactivo: recurrencia.filter((r) => r.tipo_cliente === "inactivo").length,
  };

  const conCronicos = recurrencia.filter((r) => r.tiene_cronicos).length;
  const ingresoTotal = recurrencia.reduce((sum, r) => sum + r.ingreso_total, 0);
  const totalRecurrentes = recCounts.recurrente_producto + recCounts.recurrente_categoria + recCounts.recurrente_tratamiento;
  const pctRecurrentes = Math.round((totalRecurrentes / recurrencia.length) * 100);

  return (
    <AdminOnly>
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Segmentación de Clientes"
        subtitle={`${recurrencia.length} clientes · ${formatCOP(ingresoTotal)} en ingresos`}
        icon={<Users className="w-5 h-5" />}
        badge={
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
            Recurrencia
          </span>
        }
      />

      {/* Hero insight */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-emerald-50 rounded-3xl border border-indigo-100 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Insight principal</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">
              {pctRecurrentes}% de tus clientes son recurrentes
            </h2>
            <p className="text-gray-600 mt-2 max-w-2xl">
              <span className="font-semibold text-gray-900">{totalRecurrentes} clientes</span> regresan consistentemente ·{" "}
              <span className="font-semibold text-emerald-700">{conCronicos} tienen tratamientos crónicos</span> con alto potencial de recompra predecible.
            </p>
          </div>
        </div>
      </div>

      {/* Segment cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución por tipo</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard
            label="Por producto"
            value={recCounts.recurrente_producto}
            sublabel="mismo SKU"
            icon={<Repeat className="w-4 h-4" />}
            accent="indigo"
            size="sm"
          />
          <StatCard
            label="Por categoría"
            value={recCounts.recurrente_categoria}
            sublabel="rota marcas"
            icon={<Package className="w-4 h-4" />}
            accent="blue"
            size="sm"
          />
          <StatCard
            label="Crónico"
            value={recCounts.recurrente_tratamiento}
            sublabel="continuo"
            icon={<Clock className="w-4 h-4" />}
            accent="emerald"
            size="sm"
          />
          <StatCard
            label="Multicomprador"
            value={recCounts.frecuente_multicomprador}
            sublabel="alta frec."
            icon={<ShoppingBag className="w-4 h-4" />}
            accent="violet"
            size="sm"
          />
          <StatCard
            label="Ocasional"
            value={recCounts.ocasional}
            sublabel="esporádico"
            icon={<Users className="w-4 h-4" />}
            accent="gray"
            size="sm"
          />
          <StatCard
            label="Inactivo"
            value={recCounts.inactivo}
            sublabel=">90 días"
            icon={<TrendingDown className="w-4 h-4" />}
            accent="red"
            size="sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-6">
        <RecurrenciaTable data={recurrencia} />
      </div>
    </div>
    </AdminOnly>
  );
}
