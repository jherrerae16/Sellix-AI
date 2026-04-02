"use client";

// =============================================================
// Sellix AI — Dashboard de Comisiones (Next AI Tech)
// Muestra atribución de campañas, conversiones e ingresos
// =============================================================

import { useState, useEffect } from "react";
import {
  DollarSign, Users, TrendingUp, Percent,
  Send, Target, ArrowUpRight, Loader2,
  Mail, MessageCircle, RefreshCcw, AlertTriangle,
} from "lucide-react";
import type { CommissionSummary } from "@/lib/types";
import { formatCOP, formatPercent, formatDate } from "@/lib/formatters";
import { useRole } from "@/lib/RoleContext";
import { useRouter } from "next/navigation";

function KPICardCommission({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ComisionesPage() {
  const { role } = useRole();
  const router = useRouter();
  const [data, setData] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState(7);

  useEffect(() => {
    if (role !== "nextaitech") {
      router.replace("/");
      return;
    }
  }, [role, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/campaigns/attribution?window=${window}`);
        if (!res.ok) throw new Error("Error cargando datos");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    if (role === "nextaitech") load();
  }, [window, role]);

  if (role !== "nextaitech") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const channelIcon = (ch: string) => {
    if (ch === "email") return <Mail className="w-4 h-4 text-blue-500" />;
    if (ch === "whatsapp") return <MessageCircle className="w-4 h-4 text-emerald-500" />;
    return <Send className="w-4 h-4 text-violet-500" />;
  };

  const typeLabel = (t: string) => t === "churn" ? "Recuperación" : "Reposición";
  const typeIcon = (t: string) => t === "churn"
    ? <AlertTriangle className="w-4 h-4 text-orange-500" />
    : <RefreshCcw className="w-4 h-4 text-blue-500" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Panel de Comisiones
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
              Next AI Tech
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Atribución de campañas y cálculo de comisiones
          </p>
        </div>

        {/* Attribution window selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Target className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">Ventana:</span>
          <select
            value={window}
            onChange={(e) => setWindow(Number(e.target.value))}
            className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none"
          >
            <option value={3}>3 días</option>
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICardCommission
          label="Mensajes enviados"
          value={String(data.total_mensajes)}
          icon={<Send className="w-5 h-5 text-violet-500" />}
          color="text-violet-700"
        />
        <KPICardCommission
          label="Clientes contactados"
          value={String(data.total_contactados)}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          color="text-blue-700"
        />
        <KPICardCommission
          label="Conversiones"
          value={String(data.total_conversiones)}
          icon={<Target className="w-5 h-5 text-emerald-500" />}
          color="text-emerald-700"
        />
        <KPICardCommission
          label="Tasa de conversión"
          value={formatPercent(data.tasa_conversion)}
          icon={<Percent className="w-5 h-5 text-orange-500" />}
          color="text-orange-700"
        />
        <KPICardCommission
          label="Ingresos atribuidos"
          value={formatCOP(data.ingresos_atribuidos)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          color="text-emerald-700"
        />
        <KPICardCommission
          label="Comisión estimada"
          value={formatCOP(data.comision_estimada)}
          icon={<DollarSign className="w-5 h-5 text-violet-600" />}
          color="text-violet-700"
          subtitle={`${(data.comision_rate * 100).toFixed(0)}% de ingresos atribuidos`}
        />
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By campaign type */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Por tipo de campaña</h2>
          {data.por_tipo.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {data.por_tipo.map((t) => (
                <div key={t.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {typeIcon(t.type)}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{typeLabel(t.type)}</p>
                      <p className="text-xs text-gray-400">{t.mensajes} mensajes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{formatCOP(t.ingresos)}</p>
                    <p className="text-xs text-gray-400">{t.conversiones} conversiones</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By channel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Por canal de envío</h2>
          {data.por_canal.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {data.por_canal.map((c) => (
                <div key={c.channel} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {channelIcon(c.channel)}
                    <div>
                      <p className="text-sm font-semibold text-gray-800 capitalize">{c.channel}</p>
                      <p className="text-xs text-gray-400">{c.mensajes} mensajes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{formatCOP(c.ingresos)}</p>
                    <p className="text-xs text-gray-400">{c.conversiones} conversiones</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attribution detail table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            Detalle de atribuciones ({data.atribuciones.length})
          </h2>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Ventana de {window} días
          </div>
        </div>

        {data.atribuciones.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Sin atribuciones todavía</p>
            <p className="text-xs text-gray-400 mt-1">
              Las atribuciones aparecerán cuando se envíen campañas y los clientes realicen compras
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Campaña</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mensaje</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Compra</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Días</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.atribuciones.slice(0, 50).map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{a.nombre}</p>
                      <p className="text-xs text-gray-400">{a.cedula}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.campaign_type === "churn"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {typeLabel(a.campaign_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(a.fecha_mensaje)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(a.fecha_compra)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${
                        a.dias_despues <= 2 ? "text-emerald-600" : a.dias_despues <= 5 ? "text-orange-600" : "text-gray-600"
                      }`}>
                        {a.dias_despues}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCOP(a.valor_venta)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.match_exacto
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {a.match_exacto ? "Exacto" : "Parcial"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commission formula */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-violet-800 mb-2">Fórmula de comisión</h3>
        <p className="text-sm text-violet-700">
          <strong>Comisión = Ingresos atribuidos × {(data.comision_rate * 100).toFixed(0)}%</strong>
        </p>
        <p className="text-xs text-violet-500 mt-1">
          Se atribuye una venta cuando el cliente contactado realiza una compra dentro de {window} días después del mensaje.
          Modelo last-touch: si recibió múltiples mensajes, se atribuye al más reciente.
        </p>
      </div>
    </div>
  );
}
