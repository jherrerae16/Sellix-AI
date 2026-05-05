"use client";

// =============================================================
// Sellix AI — Live Insights Panel (Vendedor IA)
// Lateral del Inbox: muestra cross-sell, alternativa, urgencia,
// perfil dinámico del cliente. Refresca tras cada mensaje.
// =============================================================

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, ShoppingCart, TrendingUp, AlertTriangle,
  User, Loader2, RefreshCw, Brain,
} from "lucide-react";
import type { Conversation } from "@/lib/types";

interface Insights {
  cross_sell: { producto: string; razon: string; confianza: number };
  alternativa_rentable: { producto: string; razon: string };
  urgencia: { sugerir: boolean; texto: string };
  perfil: {
    price_sensitivity: number;
    intent_score: number;
    rechaza_cross_sell: boolean;
    responde_urgencia: boolean;
    signals: string[];
  };
}

interface InsightsResponse {
  insights: Insights;
  history_count: number;
}

interface InsightsPanelProps {
  conversation: Conversation;
}

export function InsightsPanel({ conversation: conv }: InsightsPanelProps) {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastMessageCountRef = useRef(0);

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conv.id,
          customerCedula: conv.cliente.cedula,
          recentMessages: conv.messages.slice(-12).map((m) => ({
            from: m.from,
            text: m.text,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  // Auto-refresh cuando cliente envía mensaje nuevo
  useEffect(() => {
    const clientMsgs = conv.messages.filter((m) => m.from === "cliente").length;
    if (clientMsgs > lastMessageCountRef.current && clientMsgs > 0) {
      lastMessageCountRef.current = clientMsgs;
      fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.messages.length]);

  const i = data?.insights;
  const priceSens = i ? Math.round(i.perfil.price_sensitivity * 100) : 0;
  const intent = i ? Math.round(i.perfil.intent_score * 100) : 0;

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-gray-900">Inteligencia en vivo</h3>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          title="Refrescar"
          className="text-gray-400 hover:text-violet-600 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {!data && !loading && !error && (
          <button
            onClick={fetchInsights}
            className="w-full py-3 text-xs font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analizar conversación
          </button>
        )}

        {loading && !data && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Analizando con IA…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {i && (
          <>
            {/* Perfil dinámico */}
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-2">
                <User className="w-3 h-3" /> Perfil dinámico
              </h4>
              <div className="space-y-2">
                <Meter label="Sensibilidad a precio" value={priceSens} color="amber" />
                <Meter label="Intención de compra" value={intent} color="emerald" />
              </div>
              {i.perfil.signals.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {i.perfil.signals.slice(0, 3).map((s, idx) => (
                    <li key={idx} className="text-[11px] text-gray-600 flex items-start gap-1">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Cross-sell */}
            {i.cross_sell?.producto && i.cross_sell.producto.toLowerCase() !== "ninguno" && (
              <section className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1 mb-1.5">
                  <ShoppingCart className="w-3 h-3" /> Sugerir producto
                </h4>
                <p className="text-sm font-semibold text-gray-900">{i.cross_sell.producto}</p>
                <p className="text-xs text-emerald-700 mt-1">{i.cross_sell.razon}</p>
                <p className="text-[11px] text-emerald-600/70 mt-1">
                  Confianza: {Math.round(i.cross_sell.confianza * 100)}%
                </p>
              </section>
            )}

            {/* Alternativa rentable */}
            {i.alternativa_rentable?.producto && i.alternativa_rentable.producto.toLowerCase() !== "ninguna" && (
              <section className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1 mb-1.5">
                  <TrendingUp className="w-3 h-3" /> Alternativa rentable
                </h4>
                <p className="text-sm font-semibold text-gray-900">{i.alternativa_rentable.producto}</p>
                <p className="text-xs text-blue-700 mt-1">{i.alternativa_rentable.razon}</p>
              </section>
            )}

            {/* Urgencia */}
            {i.urgencia.sugerir && (
              <section className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="w-3 h-3" /> Activar urgencia
                </h4>
                <p className="text-xs text-amber-800">{i.urgencia.texto}</p>
              </section>
            )}

            <div className="pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400">
                Sellix AI analiza la conversación y el historial real del cliente.
                {data.history_count > 0 && ` Basado en ${data.history_count} compras previas.`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: "amber" | "emerald" }) {
  const bgClass = color === "amber" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-gray-700">
        <span>{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${bgClass} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
