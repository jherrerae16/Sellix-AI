// =============================================================
// Sellix AI — Segmentación de Clientes
// Dos vistas: Recurrencia (nueva) + RFM clásico
// =============================================================

export const dynamic = "force-dynamic";

import { getClientesRFM, getRecurrencia } from "@/lib/dataService";
import { ScatterRFM } from "@/components/charts/ScatterRFM";
import { VIPTable } from "@/components/tables/VIPTable";
import { RecurrenciaTable } from "@/components/tables/RecurrenciaTable";
import { formatCOP } from "@/lib/formatters";
import { AdminOnly } from "@/components/layout/AdminOnly";

export default async function VIPPage() {
  const [clientes, recurrencia] = await Promise.all([
    getClientesRFM(),
    getRecurrencia(),
  ]);

  // RFM segment stats
  const segmentos = {
    VIP: clientes.filter((c) => c.segmento === "VIP"),
    Leal: clientes.filter((c) => c.segmento === "Leal"),
    "En desarrollo": clientes.filter((c) => c.segmento === "En desarrollo"),
    "En riesgo": clientes.filter((c) => c.segmento === "En riesgo"),
  };

  const totalCLV = clientes.reduce((sum, c) => sum + c.clv_estimado_anual, 0);

  const segCards = [
    { label: "VIP",           data: segmentos.VIP,              color: "border-l-brand-blue bg-blue-50" },
    { label: "Leal",          data: segmentos.Leal,             color: "border-l-brand-green bg-green-50" },
    { label: "En desarrollo", data: segmentos["En desarrollo"], color: "border-l-risk-medium bg-orange-50" },
    { label: "En riesgo",     data: segmentos["En riesgo"],     color: "border-l-risk-high bg-red-50" },
  ];

  // Recurrence stats
  const recCounts = {
    recurrente_producto: recurrencia.filter((r) => r.tipo_cliente === "recurrente_producto").length,
    recurrente_categoria: recurrencia.filter((r) => r.tipo_cliente === "recurrente_categoria").length,
    recurrente_tratamiento: recurrencia.filter((r) => r.tipo_cliente === "recurrente_tratamiento").length,
    frecuente_multicomprador: recurrencia.filter((r) => r.tipo_cliente === "frecuente_multicomprador").length,
    ocasional: recurrencia.filter((r) => r.tipo_cliente === "ocasional").length,
    inactivo: recurrencia.filter((r) => r.tipo_cliente === "inactivo").length,
  };

  const conCronicos = recurrencia.filter((r) => r.tiene_cronicos).length;

  return (
    <AdminOnly>
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Segmentación de Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {clientes.length} clientes · CLV total anual estimado:{" "}
          <span className="font-medium text-brand-blue">{formatCOP(totalCLV)}</span>
        </p>
      </div>

      {/* ── Sección 1: Recurrencia de Compra ────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Recurrencia de Compra</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Clasificación basada en patrones de compra, categoría terapéutica y tratamiento
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-700 uppercase">Por producto</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{recCounts.recurrente_producto}</p>
            <p className="text-[10px] text-gray-500">mismo SKU</p>
          </div>
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-indigo-500 bg-indigo-50 p-3">
            <p className="text-xs font-semibold text-indigo-700 uppercase">Por categoría</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{recCounts.recurrente_categoria}</p>
            <p className="text-[10px] text-gray-500">rota marcas</p>
          </div>
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-700 uppercase">Crónico</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{recCounts.recurrente_tratamiento}</p>
            <p className="text-[10px] text-gray-500">tratamiento continuo</p>
          </div>
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-violet-500 bg-violet-50 p-3">
            <p className="text-xs font-semibold text-violet-700 uppercase">Multicomprador</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{recCounts.frecuente_multicomprador}</p>
            <p className="text-[10px] text-gray-500">alta frecuencia</p>
          </div>
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-gray-400 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600 uppercase">Ocasional</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{recCounts.ocasional}</p>
            <p className="text-[10px] text-gray-500">esporádicos</p>
          </div>
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-500 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 uppercase">Inactivo</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{recCounts.inactivo}</p>
            <p className="text-[10px] text-gray-500">{">"}90 días</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-xs text-emerald-700">
            <strong>{conCronicos} clientes</strong> ({Math.round((conCronicos / recurrencia.length) * 100)}%) tienen productos de tratamiento crónico — alto potencial de retención
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <RecurrenciaTable data={recurrencia} />
        </div>
      </div>

      {/* ── Sección 2: RFM clásico ──────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Segmentación RFM</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Segmentación clásica por Recencia × Frecuencia × Monetario
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {segCards.map((seg) => {
            const clv = seg.data.reduce((sum, c) => sum + c.clv_estimado_anual, 0);
            return (
              <div key={seg.label} className={`rounded-xl border border-gray-200 border-l-4 p-4 ${seg.color}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{seg.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{seg.data.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">CLV: {formatCOP(clv)}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Mapa RFM — Frecuencia vs. Valor</h3>
            <p className="text-xs text-gray-400">Click en un punto para ver detalle</p>
          </div>
          <ScatterRFM data={clientes} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Directorio RFM</h3>
          <VIPTable data={clientes} />
        </div>
      </div>
    </div>
    </AdminOnly>
  );
}
