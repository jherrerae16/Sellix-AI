// =============================================================
// Sellix AI — Segmentación por Recurrencia de Compra
// =============================================================

export const dynamic = "force-dynamic";

import { getRecurrencia } from "@/lib/dataService";
import { RecurrenciaTable } from "@/components/tables/RecurrenciaTable";
import { formatCOP } from "@/lib/formatters";
import { AdminOnly } from "@/components/layout/AdminOnly";
import { Clock } from "lucide-react";

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

  return (
    <AdminOnly>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Segmentación de Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {recurrencia.length} clientes analizados · Ingreso total:{" "}
          <span className="font-medium text-brand-blue">{formatCOP(ingresoTotal)}</span>
        </p>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-700 uppercase">Por producto</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{recCounts.recurrente_producto}</p>
          <p className="text-[11px] text-gray-500">mismo SKU repetido</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-indigo-500 bg-indigo-50 p-3">
          <p className="text-xs font-semibold text-indigo-700 uppercase">Por categoría</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{recCounts.recurrente_categoria}</p>
          <p className="text-[11px] text-gray-500">rota marcas</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-700 uppercase">Crónico</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{recCounts.recurrente_tratamiento}</p>
          <p className="text-[11px] text-gray-500">tratamiento continuo</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-violet-500 bg-violet-50 p-3">
          <p className="text-xs font-semibold text-violet-700 uppercase">Multicomprador</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{recCounts.frecuente_multicomprador}</p>
          <p className="text-[11px] text-gray-500">alta frecuencia</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-gray-400 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600 uppercase">Ocasional</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{recCounts.ocasional}</p>
          <p className="text-[11px] text-gray-500">compras esporádicas</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-500 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700 uppercase">Inactivo</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{recCounts.inactivo}</p>
          <p className="text-[11px] text-gray-500">{">"}90 días</p>
        </div>
      </div>

      {/* Chronic highlight */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {conCronicos} clientes ({Math.round((conCronicos / recurrencia.length) * 100)}%) tienen productos de tratamiento crónico
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Alto potencial de retención y recompra predecible
          </p>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <RecurrenciaTable data={recurrencia} />
      </div>
    </div>
    </AdminOnly>
  );
}
