// =============================================================
// Sellix AI — Panel de acción para cajero (US-E2-02)
// Muestra frase accionable en lenguaje simple para Valentina
// Aparece cuando se selecciona un cliente en Venta Cruzada
// =============================================================

import { ShoppingCart, X } from "lucide-react";
import type { VentaCruzada } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface AccionCajaPanelProps {
  clienteNombre: string;
  productoBase: string;
  recomendaciones: VentaCruzada[];
  onClose: () => void;
}

export function AccionCajaPanel({
  clienteNombre,
  productoBase,
  recomendaciones,
  onClose,
}: AccionCajaPanelProps) {
  const topRecomendacion = recomendaciones[0];

  if (!topRecomendacion) return null;

  return (
    <div
      role="complementary"
      aria-label="Acción de venta cruzada"
      className="bg-brand-blue text-white rounded-xl p-5 relative"
    >
      <button
        onClick={onClose}
        aria-label="Cerrar panel"
        className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-1">
            Ofrecer al cliente
          </p>
          <p className="text-sm font-semibold leading-snug">
            {clienteNombre} compra{" "}
            <span className="underline decoration-white/50">{productoBase}</span>.
            Ofrézcale también:{" "}
            <span className="font-bold">
              {topRecomendacion.producto_recomendado}
            </span>
          </p>
          <p className="text-xs text-white/80 mt-2">
            Ticket promedio adicional:{" "}
            <span className="font-semibold">
              {formatCOP(topRecomendacion.incremento_ticket_estimado)}
            </span>
          </p>
        </div>
      </div>

      {/* Recomendaciones adicionales */}
      {recomendaciones.length > 1 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs font-medium text-white/70 mb-2">
            También puede ofrecer:
          </p>
          <ul className="space-y-1">
            {recomendaciones.slice(1, 3).map((rec, idx) => (
              <li key={idx} className="text-xs text-white/90">
                • {rec.producto_recomendado}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
