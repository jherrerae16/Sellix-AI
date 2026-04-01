"use client";

// =============================================================
// Sellix AI — Panel lateral de detalle de cliente
// Drawer deslizante con historial y métricas del cliente
// Usado en: Churn, Reposición, VIP/RFM
// =============================================================

import { X, Phone, Calendar, TrendingDown, RefreshCcw } from "lucide-react";
import type { ClienteChurn, ClienteRFM, ReposicionPendiente } from "@/lib/types";
import { formatDate, formatDays, formatScore, formatCOP } from "@/lib/formatters";
import { RiskBadge } from "./RiskBadge";

type ClienteData = ClienteChurn | ClienteRFM;

interface ClienteDetailPanelProps {
  cliente: ClienteData | null;
  reposiciones?: ReposicionPendiente[];
  onClose: () => void;
}

function isChurn(c: ClienteData): c is ClienteChurn {
  return "nivel_riesgo" in c && "churn_score" in c && "accion_sugerida" in c;
}

function isRFM(c: ClienteData): c is ClienteRFM {
  return "segmento" in c && "score_r" in c;
}

export function ClienteDetailPanel({
  cliente,
  reposiciones = [],
  onClose,
}: ClienteDetailPanelProps) {
  if (!cliente) return null;

  const clienteReposiciones = reposiciones.filter(
    (r) => r.cedula === cliente.cedula
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="complementary"
        aria-label={`Detalle de ${cliente.nombre}`}
        className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50
                   flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {cliente.nombre}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              CC {cliente.cedula}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-6 space-y-6">
          {/* Datos básicos */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Información de contacto
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {cliente.telefono || "Sin teléfono"}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Última compra: {formatDate(cliente.ultima_compra)}
              </div>
            </div>
          </section>

          {/* Métricas churn */}
          {isChurn(cliente) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Riesgo de abandono
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nivel de riesgo</span>
                  <RiskBadge level={cliente.nivel_riesgo} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Score churn</span>
                  <span className="text-sm font-medium">
                    {formatScore(cliente.churn_score)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Días sin comprar</span>
                  <span className="text-sm font-medium text-risk-high">
                    {formatDays(cliente.dias_sin_comprar)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Frecuencia promedio</span>
                  <span className="text-sm font-medium">
                    {formatDays(cliente.frecuencia_promedio_dias)}
                  </span>
                </div>
                <div className="p-3 bg-brand-blue/5 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingDown className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      {cliente.accion_sugerida}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Métricas RFM */}
          {isRFM(cliente) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Segmentación RFM
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Segmento</span>
                  <span className="text-sm font-semibold text-brand-blue">
                    {cliente.segmento}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "R", value: cliente.score_r, title: "Recency" },
                    { label: "F", value: cliente.score_f, title: "Frequency" },
                    { label: "M", value: cliente.score_m, title: "Monetary" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      title={s.title}
                      className="bg-gray-50 rounded-lg p-2 text-center"
                    >
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-lg font-bold text-brand-blue">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CLV anual est.</span>
                  <span className="text-sm font-medium text-brand-green">
                    {formatCOP(cliente.clv_estimado_anual)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ticket promedio</span>
                  <span className="text-sm font-medium">
                    {formatCOP(cliente.ticket_promedio)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Reposiciones pendientes */}
          {clienteReposiciones.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Reposiciones pendientes
              </h3>
              <ul className="space-y-2">
                {clienteReposiciones.map((rep, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <RefreshCcw className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{rep.producto}</p>
                      <p className="text-xs text-gray-500">
                        Próxima: {formatDate(rep.proxima_reposicion)} •{" "}
                        {rep.estado}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
