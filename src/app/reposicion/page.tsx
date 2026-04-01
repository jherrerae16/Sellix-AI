// =============================================================
// Sellix AI — Módulo 1.4: Retención Activa / Predicción de Reposición
// Server Component — tabla con tabs por estado urgencia
// =============================================================

import { getReposicionesPendientes } from "@/lib/dataService";
import { ReposicionTable } from "@/components/tables/ReposicionTable";
import { RefreshCcw } from "lucide-react";

export default async function ReposicionPage() {
  const reposiciones = await getReposicionesPendientes();

  const vencidas = reposiciones.filter((r) => r.estado === "Vencido").length;
  const estaSemana = reposiciones.filter(
    (r) => r.estado === "Esta semana"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Predicción de Reposición
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {reposiciones.length} reposiciones urgentes detectadas
          </p>
        </div>
      </div>

      {/* Resumen de urgencia */}
      {(vencidas > 0 || estaSemana > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vencidas > 0 && (
            <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl">
              <RefreshCcw className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {vencidas} {vencidas === 1 ? "reposición vencida" : "reposiciones vencidas"}
                </p>
                <p className="text-xs text-red-500">Contactar de inmediato</p>
              </div>
            </div>
          )}
          {estaSemana > 0 && (
            <div className="flex items-center gap-3 px-5 py-4 bg-orange-50 border border-orange-200 rounded-xl">
              <RefreshCcw className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-700">
                  {estaSemana} {estaSemana === 1 ? "reposición" : "reposiciones"} esta semana
                </p>
                <p className="text-xs text-orange-500">Contactar en los próximos 7 días</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instrucción */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          Use el número de teléfono para contactar al cliente por WhatsApp o
          llamada antes de que agote su medicamento.
        </p>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <ReposicionTable data={reposiciones} />
      </div>
    </div>
  );
}
