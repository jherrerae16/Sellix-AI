// =============================================================
// Sellix AI — Módulo 2.1: Segmentación VIP / RFM
// Server Component — scatter plot + tabla de clientes por segmento
// =============================================================

export const dynamic = "force-dynamic";

import { getClientesRFM } from "@/lib/dataService";
import { ScatterRFM } from "@/components/charts/ScatterRFM";
import { VIPTable } from "@/components/tables/VIPTable";
import { formatCOP } from "@/lib/formatters";
import { AdminOnly } from "@/components/layout/AdminOnly";

export default async function VIPPage() {
  const clientes = await getClientesRFM();

  // Estadísticas de segmentos
  const segmentos = {
    VIP: clientes.filter((c) => c.segmento === "VIP"),
    Leal: clientes.filter((c) => c.segmento === "Leal"),
    "En desarrollo": clientes.filter((c) => c.segmento === "En desarrollo"),
    "En riesgo": clientes.filter((c) => c.segmento === "En riesgo"),
  };

  const totalCLV = clientes.reduce((sum, c) => sum + c.clv_estimado_anual, 0);

  const segCards = [
    { label: "VIP",            data: segmentos.VIP,                color: "border-l-brand-blue bg-blue-50" },
    { label: "Leal",           data: segmentos.Leal,               color: "border-l-brand-green bg-green-50" },
    { label: "En desarrollo",  data: segmentos["En desarrollo"],   color: "border-l-risk-medium bg-orange-50" },
    { label: "En riesgo",      data: segmentos["En riesgo"],       color: "border-l-risk-high bg-red-50" },
  ];

  return (
    <AdminOnly>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Segmentación VIP / RFM
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {clientes.length} clientes segmentados · CLV total anual estimado:{" "}
          <span className="font-medium text-brand-blue">{formatCOP(totalCLV)}</span>
        </p>
      </div>

      {/* Cards de segmentos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {segCards.map((seg) => {
          const clv = seg.data.reduce((sum, c) => sum + c.clv_estimado_anual, 0);
          return (
            <div
              key={seg.label}
              className={`rounded-xl border border-gray-200 border-l-4 p-4 ${seg.color}`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {seg.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{seg.data.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                CLV: {formatCOP(clv)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Scatter plot */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            Mapa de clientes — Frecuencia vs. Valor
          </h2>
          <p className="text-xs text-gray-400">Haga clic en un punto para ver el detalle</p>
        </div>
        <ScatterRFM data={clientes} />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Directorio de clientes segmentados
        </h2>
        <VIPTable data={clientes} />
      </div>
    </div>
    </AdminOnly>
  );
}
