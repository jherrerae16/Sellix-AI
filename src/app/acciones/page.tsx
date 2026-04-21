"use client";

// =============================================================
// Sellix AI — Next Best Action Dashboard (v2)
// + Botón "Generar oferta" para crear promociones dirigidas
// + Cifras realistas (contactables vs totales)
// =============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, AlertTriangle, ArrowRight, Target,
  Users, Flame, TrendingUp, Phone, PhoneOff,
  RefreshCcw, ShoppingCart, Star, Zap, Sparkles,
} from "lucide-react";
import type { NextAction, ActionPriority, ActionCategory } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { PromotionModal } from "@/components/ui/PromotionModal";

const priorityConfig: Record<ActionPriority, { label: string; pill: string; stripe: string }> = {
  critica: { label: "Crítica", pill: "bg-red-50 text-red-700 border-red-200", stripe: "bg-red-500" },
  alta:    { label: "Alta",    pill: "bg-orange-50 text-orange-700 border-orange-200", stripe: "bg-orange-500" },
  media:   { label: "Media",   pill: "bg-indigo-50 text-indigo-700 border-indigo-200", stripe: "bg-indigo-500" },
  baja:    { label: "Baja",    pill: "bg-gray-50 text-gray-600 border-gray-200", stripe: "bg-gray-400" },
};

const categoryConfig: Record<ActionCategory, { icon: React.ReactNode; bg: string; text: string }> = {
  churn:         { icon: <AlertTriangle className="w-4 h-4" />, bg: "bg-red-50", text: "text-red-600" },
  reposicion:    { icon: <RefreshCcw className="w-4 h-4" />,    bg: "bg-blue-50", text: "text-blue-600" },
  venta_cruzada: { icon: <ShoppingCart className="w-4 h-4" />,  bg: "bg-emerald-50", text: "text-emerald-600" },
  vip:           { icon: <Star className="w-4 h-4" />,          bg: "bg-amber-50", text: "text-amber-600" },
  gancho:        { icon: <Zap className="w-4 h-4" />,           bg: "bg-violet-50", text: "text-violet-600" },
};

interface Summary {
  total_acciones: number;
  total_clientes: number;
  total_contactables: number;
  ingreso_potencial: number;
  ingreso_realista: number;
  acciones_criticas: number;
  pct_contactable: number;
}

interface ActionResponse {
  actions: NextAction[];
  summary: Summary;
}

export default function AccionesPage() {
  const [data, setData] = useState<ActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotionOpen, setPromotionOpen] = useState(false);

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
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Analizando datos y generando acciones...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { actions, summary } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Next Best Action"
        subtitle="Acciones priorizadas con impacto realista basado en clientes contactables"
        icon={<Target className="w-5 h-5" />}
        badge={
          summary.acciones_criticas > 0 && (
            <span className="text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full animate-pulse">
              {summary.acciones_criticas} críticas
            </span>
          )
        }
        action={
          <button
            onClick={() => setPromotionOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generar oferta
          </button>
        }
      />

      {/* Hero insight */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-emerald-50 rounded-3xl border border-indigo-100 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Impacto realista</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">
              {formatCOP(summary.ingreso_realista)} recuperables
            </h2>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Considerando solo los{" "}
              <span className="font-semibold text-emerald-700">{summary.total_contactables} clientes contactables</span>
              {" "}de{" "}
              <span className="font-semibold">{summary.total_clientes} totales</span>
              {" "}({summary.pct_contactable}% del total). Los clientes sin teléfono dependen de visitas presenciales.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Acciones críticas"
          value={summary.acciones_criticas}
          sublabel="requieren atención hoy"
          icon={<Flame className="w-4 h-4" />}
          accent="red"
        />
        <StatCard
          label="Total acciones"
          value={summary.total_acciones}
          sublabel="recomendaciones"
          icon={<Target className="w-4 h-4" />}
          accent="indigo"
        />
        <StatCard
          label="Clientes contactables"
          value={summary.total_contactables}
          sublabel={`de ${summary.total_clientes} totales`}
          icon={<Phone className="w-4 h-4" />}
          accent="emerald"
        />
        <StatCard
          label="Ingreso realista"
          value={formatCOP(summary.ingreso_realista)}
          sublabel={`vs ${formatCOP(summary.ingreso_potencial)} teórico`}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="emerald"
        />
      </div>

      {/* Critical banner */}
      {summary.acciones_criticas > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
          <Flame className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{summary.acciones_criticas} acciones críticas</strong> requieren atención hoy.
            Cada día sin actuar aumenta el riesgo de pérdida de clientes e ingresos.
          </p>
        </div>
      )}

      {/* Action cards */}
      <div className="space-y-3">
        {actions.map((action, i) => {
          const priority = priorityConfig[action.priority];
          const category = categoryConfig[action.category];
          const pctContactable = action.clientes > 0
            ? Math.round((action.clientes_contactables / action.clientes) * 100)
            : 0;

          return (
            <div
              key={action.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-soft-lg ${
                action.priority === "critica" ? "border-red-200" : "border-gray-100 hover:border-indigo-200"
              }`}
            >
              <div className="flex">
                <div className={`w-1 flex-shrink-0 ${priority.stripe}`} />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-300">#{i + 1}</span>
                        <span className={`w-7 h-7 ${category.bg} ${category.text} rounded-lg flex items-center justify-center`}>
                          {category.icon}
                        </span>
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priority.pill}`}>
                          {priority.label}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 tracking-tight">{action.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-2xl">
                        {action.description}
                      </p>

                      {/* Metrics row */}
                      <div className="flex items-center gap-5 mt-3 flex-wrap">
                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Users className="w-3.5 h-3.5" />
                          <strong className="text-gray-700">{action.clientes}</strong> total
                        </span>
                        <span className="flex items-center gap-1.5 text-sm">
                          {action.clientes_contactables > 0 ? (
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <PhoneOff className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <strong className={action.clientes_contactables > 0 ? "text-emerald-700" : "text-red-600"}>
                            {action.clientes_contactables}
                          </strong>
                          <span className="text-gray-500">contactables ({pctContactable}%)</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <strong className="text-emerald-700">{formatCOP(action.ingreso_realista)}</strong>
                          <span className="text-xs text-gray-400">
                            realista / {formatCOP(action.ingreso_estimado)} teórico
                          </span>
                        </span>
                      </div>
                    </div>

                    <Link
                      href={action.href}
                      className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        action.priority === "critica"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
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
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">¿Cómo se calculan las cifras?</p>
            <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
              El <strong>ingreso realista</strong> considera solo los clientes con teléfono válido (contactables via WhatsApp)
              multiplicado por una tasa de conversión esperada del sector farmacéutico.
              El <strong>ingreso teórico</strong> asume contacto al 100% de los clientes (incluyendo los que no tienen teléfono y dependen de visita presencial).
            </p>
          </div>
        </div>
      </div>

      {/* Promotion Modal */}
      <PromotionModal isOpen={promotionOpen} onClose={() => setPromotionOpen(false)} />
    </div>
  );
}
