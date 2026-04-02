"use client";

// =============================================================
// Sellix AI — Landing Page
// Hero animado + selección de rol (Admin, Cajero, Next AI Tech)
// =============================================================

import { useRole, type Role } from "@/lib/RoleContext";
import {
  BarChart3, Shield, ShoppingBag, Building2,
  TrendingUp, Users, RefreshCcw, Zap,
  ArrowRight, CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Inteligencia de Ventas",
    desc: "KPIs en tiempo real, tendencias y top productos",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Detección de Churn",
    desc: "Identifica clientes en riesgo antes de perderlos",
  },
  {
    icon: <RefreshCcw className="w-6 h-6" />,
    title: "Predicción de Reposición",
    desc: "Anticipa cuándo cada cliente necesita su medicamento",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Venta Cruzada",
    desc: "Recomendaciones inteligentes en el punto de venta",
  },
];

const roles: {
  key: Role;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  desc: string;
  color: string;
  bgGradient: string;
  features: string[];
}[] = [
  {
    key: "admin",
    icon: <Shield className="w-8 h-8" />,
    title: "Administrador",
    subtitle: "Droguería",
    desc: "Dashboard completo con todos los módulos de análisis, campañas y gestión de datos.",
    color: "from-blue-600 to-blue-800",
    bgGradient: "from-blue-50 to-blue-100",
    features: [
      "6 módulos de análisis",
      "Motor de campañas",
      "Exportar a CSV",
      "Gestión de datos",
    ],
  },
  {
    key: "cajero",
    icon: <ShoppingBag className="w-8 h-8" />,
    title: "Cajero",
    subtitle: "Punto de venta",
    desc: "Vista simplificada para consultar recomendaciones y reposiciones en caja.",
    color: "from-emerald-600 to-emerald-800",
    bgGradient: "from-emerald-50 to-emerald-100",
    features: [
      "Búsqueda por cédula",
      "Venta cruzada rápida",
      "Reposiciones urgentes",
      "Sin distracciones",
    ],
  },
  {
    key: "nextaitech",
    icon: <Building2 className="w-8 h-8" />,
    title: "Next AI Tech",
    subtitle: "Administrador de plataforma",
    desc: "Panel de comisiones, métricas de atribución y rendimiento de campañas.",
    color: "from-violet-600 to-violet-800",
    bgGradient: "from-violet-50 to-violet-100",
    features: [
      "Comisiones en tiempo real",
      "Atribución de campañas",
      "ROI por canal",
      "Métricas de conversión",
    ],
  },
];

export function LandingPage() {
  const { setRole } = useRole();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#112240] to-[#1a365d]" />

        {/* Animated dots pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-[150px]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-20">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-xl tracking-tight">Sellix AI</span>
                <span className="text-blue-300 text-xs ml-2 font-medium">v1.1</span>
              </div>
            </div>
            <span className="text-blue-300/60 text-sm hidden sm:block">
              by Next AI Tech LLC
            </span>
          </nav>

          {/* Hero content */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-400/20 rounded-full mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-blue-200 text-sm font-medium">
                Plataforma activa — Droguería Super Ofertas
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Inteligencia comercial
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                para tu droguería
              </span>
            </h1>

            <p className="mt-6 text-lg text-blue-200/80 max-w-2xl mx-auto leading-relaxed">
              Transforma tus datos de ventas en decisiones que generan ingresos.
              Detecta clientes en riesgo, anticipa reposiciones y aumenta el ticket
              promedio — todo desde un solo dashboard.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 max-w-2xl mx-auto">
              {[
                { value: "957", label: "Clientes analizados" },
                { value: "20.3K", label: "Transacciones" },
                { value: "6", label: "Módulos activos" },
                { value: "100%", label: "Español colombiano" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-blue-300/60 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 80L60 73.3C120 66.7 240 53.3 360 46.7C480 40 600 40 720 46.7C840 53.3 960 66.7 1080 66.7C1200 66.7 1320 53.3 1380 46.7L1440 40V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z"
              fill="#f9fafb"
            />
          </svg>
        </div>
      </div>

      {/* Features grid */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-brand-blue mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role selection */}
      <div className="bg-gray-50 pb-20 pt-4">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Seleccione su perfil para continuar
            </h2>
            <p className="text-gray-500 mt-2">
              Cada perfil tiene una experiencia optimizada para su rol
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {roles.map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden text-left transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 hover:border-gray-300"
              >
                {/* Card header gradient */}
                <div className={`bg-gradient-to-r ${r.color} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
                      {r.icon}
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold">{r.title}</h3>
                  <p className="text-white/70 text-sm">{r.subtitle}</p>
                </div>

                {/* Card body */}
                <div className="p-6">
                  <p className="text-sm text-gray-600 leading-relaxed mb-5">
                    {r.desc}
                  </p>
                  <ul className="space-y-2.5">
                    {r.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <div className={`mt-6 py-2.5 rounded-xl bg-gradient-to-r ${r.bgGradient} text-center`}>
                    <span className={`text-sm font-semibold bg-gradient-to-r ${r.color} bg-clip-text text-transparent`}>
                      Ingresar como {r.title}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-blue" />
            <span className="text-sm font-semibold text-gray-700">Sellix AI</span>
          </div>
          <p className="text-xs text-gray-400">
            Next AI Tech LLC · Miami, Florida · 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
