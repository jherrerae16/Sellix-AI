// =============================================================
// Sellix AI — Módulo 1.3: Riesgo de Abandono (Churn)
// Server Component — tabla filtrable client-side, drawer de detalle
// =============================================================

import { getClientesChurn } from "@/lib/dataService";
import { ChurnCampaignView } from "@/components/campaigns/ChurnCampaignView";
import { AlertTriangle } from "lucide-react";
import { AdminOnly } from "@/components/layout/AdminOnly";

export default async function ChurnPage() {
  const clientes = await getClientesChurn();

  const alto = clientes.filter((c) => c.nivel_riesgo === "Alto").length;
  const medio = clientes.filter((c) => c.nivel_riesgo === "Medio").length;

  return (
    <AdminOnly>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Riesgo de Abandono
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientes.length} clientes analizados
          </p>
        </div>

        {/* Alerta si hay clientes en riesgo alto */}
        {alto > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {alto} {alto === 1 ? "cliente requiere" : "clientes requieren"} atención inmediata
            </p>
          </div>
        )}
      </div>

      {/* Instrucción de uso */}
      {(alto > 0 || medio > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            Haga clic en un cliente para ver su historial detallado y la acción
            sugerida. Los clientes en riesgo <strong>Alto</strong> deben ser
            contactados esta semana.
          </p>
        </div>
      )}

      {/* Tabla principal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <ChurnCampaignView data={clientes} />
      </div>
    </div>
    </AdminOnly>
  );
}
