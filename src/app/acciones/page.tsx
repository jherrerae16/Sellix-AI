"use client";

// =============================================================
// Sellix AI — Next Best Action Dashboard
// Acciones priorizadas basadas en datos existentes
// =============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, AlertTriangle, ArrowRight, Target,
  DollarSign, Users, Flame, TrendingUp,
  RefreshCcw, ShoppingCart, Star, Zap,
} from "lucide-react";
import type { NextAction, ActionPriority, ActionCategory } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

const priorityConfig: Record<ActionPriority, { label: string; color: string; bg: string; border: string }> = {
  critica: { label: "Crítica", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  alta:    { label: "Alta",    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  media:   { label: "Media",   color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  baja:    { label: "Baja",    color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
};

const categoryConfig: Record<ActionCategory, { icon: React.ReactNode; color: string }> = {
  churn:         { icon: <AlertTriangle className="w-5 h-5" />, color: "text-red-500" },
  reposicion:    { icon: <RefreshCcw className="w-5 h-5" />,    color: "text-blue-500" },
  venta_cruzada: { icon: <ShoppingCart className="w-5 h-5" />,  color: "text-emerald-500" },
  vip:           { icon: <Star className="w-5 h-5" />,          color: "text-amber-500" },
  gancho:        { icon: <Zap className="w-5 h-5" />,           color: "text-violet-500" },
};

interface ActionResponse {
  actions: NextAction[];
  summary: {
    total_acciones: number;
    total_clientes_impactados: number;
    ingreso_potencial_total: number;
    acciones_criticas: number;
  };
}

export default function AccionesPage() {
  const [data, setData] = useState<ActionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/actions")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Analizando datos y generando acciones...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { actions, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-blue" />
          Next Best Action
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Acciones recomendadas basadas en el análisis de sus datos — ordenadas por impacto
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Flame className="w-4 h-4 text-red-500" />
            Acciones críticas
          </div>
          <p className="text-3xl font-bold text-red-600">{summary.acciones_criticas}</p>
          <p className="text-xs text-gray-400 mt-1">requieren atención hoy</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Target className="w-4 h-4 text-brand-blue" />
            Total acciones
          </div>
          <p className="text-3xl font-bold text-brand-blue">{summary.total_acciones}</p>
          <p className="text-xs text-gray-400 mt-1">recomendaciones generadas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Users className="w-4 h-4 text-emerald-500" />
            Clientes impactados
          </div>
          <p className="text-3xl font-bold text-emerald-700">{summary.total_clientes_impactados}</p>
          <p className="text-xs text-gray-400 mt-1">clientes únicos involucrados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Ingreso potencial
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCOP(summary.ingreso_potencial_total)}</p>
          <p className="text-xs text-gray-400 mt-1">si se ejecutan todas las acciones</p>
        </div>
      </div>

      {/* Urgency banner */}
      {summary.acciones_criticas > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <Flame className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{summary.acciones_criticas} acciones críticas</strong> requieren su atención hoy.
            Cada día sin actuar aumenta el riesgo de pérdida de clientes e ingresos.
          </p>
        </div>
      )}

      {/* Action cards */}
      <div className="space-y-4">
        {actions.map((action, i) => {
          const priority = priorityConfig[action.priority];
          const category = categoryConfig[action.category];

          return (
            <div
              key={action.id}
              className={`bg-white rounded-xl border ${
                action.priority === "critica" ? "border-red-200 shadow-sm shadow-red-100" : "border-gray-200"
              } overflow-hidden transition-all hover:shadow-md`}
            >
              <div className="flex">
                {/* Priority stripe */}
                <div className={`w-1.5 flex-shrink-0 ${
                  action.priority === "critica" ? "bg-red-500" :
                  action.priority === "alta" ? "bg-orange-500" :
                  action.priority === "media" ? "bg-blue-500" : "bg-gray-400"
                }`} />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Top line: number + category + priority */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-300">#{i + 1}</span>
                        <span className={`flex items-center gap-1 ${category.color}`}>
                          {category.icon}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priority.bg} ${priority.color} ${priority.border} border`}>
                          {priority.label}
                        </span>
                      </div>

                      {/* Title + description */}
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-2xl">
                        {action.description}
                      </p>

                      {/* Metrics */}
                      <div className="flex items-center gap-5 mt-3">
                        {action.clientes > 0 && (
                          <span className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Users className="w-3.5 h-3.5" />
                            <strong className="text-gray-700">{action.clientes}</strong> clientes
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <strong className="text-emerald-700">{formatCOP(action.ingreso_estimado)}</strong> potencial
                        </span>
                      </div>
                    </div>

                    {/* CTA button */}
                    <Link
                      href={action.href}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        action.priority === "critica"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-brand-blue text-white hover:bg-blue-800"
                      }`}
                    >
                      {action.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-700">
          <strong>¿Cómo se calculan los ingresos potenciales?</strong> Los estimados se basan en el ticket promedio histórico,
          la tasa de recuperación esperada por tipo de acción y el número de clientes involucrados. Son proyecciones conservadoras
          basadas en benchmarks del sector farmacéutico.
        </p>
      </div>
    </div>
  );
}
