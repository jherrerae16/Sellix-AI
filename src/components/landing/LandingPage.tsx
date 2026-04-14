"use client";

// =============================================================
// Sellix AI — Landing Page
// Style: AI-Native UI + Minimalism (UI Pro Max recommendations)
// Colors: Indigo #6366F1 + Emerald #059669
// Typography: Plus Jakarta Sans
// Flow: Landing → Demo → Profile Select → Login
// =============================================================

import { useState } from "react";
import {
  MessageCircle, TrendingUp, Zap, BarChart3,
  ArrowRight, CheckCircle2, Play, ChevronRight,
  Shield, ShoppingCart, Users, Bot,
  Star, Clock, Globe,
} from "lucide-react";

// ── Hero Section ──────────────────────────────────────────────

function Hero({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#FAFAFE]" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[180px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[150px] translate-y-1/3 -translate-x-1/4" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#6366F1 1px, transparent 1px), linear-gradient(90deg, #6366F1 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full mb-8">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-indigo-700">Vendedor IA activo 24/7</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.05] tracking-tight max-w-4xl mx-auto">
          Tu próximo vendedor
          <br />
          <span className="text-indigo-600">no necesita sueldo</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Sellix AI convierte cada conversación de WhatsApp en una venta. Responde, recomienda, cotiza y cierra — automáticamente.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onCTA}
            className="group flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-lg"
          >
            <Play className="w-5 h-5" />
            Ver Demo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <span className="text-sm text-gray-400">Sin tarjeta de crédito · Setup en 5 min</span>
        </div>

        {/* Chat mockup */}
        <div className="mt-16 max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 p-6 text-left">
            {/* Incoming */}
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">JD</div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[75%]">
                <p className="text-sm text-gray-800">Hola, tienen acetaminofén?</p>
              </div>
            </div>
            {/* AI response */}
            <div className="flex gap-3 justify-end mb-4">
              <div className="bg-indigo-600 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-white">¡Claro! Tenemos Acetaminofén 500mg:</p>
                <p className="text-sm text-indigo-200 mt-1">• Caja x100: $13.848</p>
                <p className="text-sm text-indigo-200">• Unidad: $144</p>
                <p className="text-sm text-white mt-2">¿Te lo agrego al pedido? 🛒</p>
              </div>
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            {/* Typing indicator */}
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">JD</div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features Section ──────────────────────────────────────────

const features = [
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "Vende mientras duermes",
    desc: "Un asistente IA que atiende WhatsApp 24/7. Responde consultas, muestra precios y cierra ventas sin intervención humana.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "Del chat al pedido",
    desc: "El cliente escribe, la IA arma el pedido, genera el link de pago y confirma. Todo en una sola conversación.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Inteligencia de ventas",
    desc: "Dashboard con KPIs en tiempo real: churn, reposición, venta cruzada, segmentación VIP. Datos que se convierten en decisiones.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Embudo automático",
    desc: "Cada conversación se clasifica automáticamente: lead, seguimiento, potencial, venta, postventa. Sin mover un dedo.",
    color: "bg-rose-50 text-rose-600",
  },
];

function Features() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Funcionalidades</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">
            Todo lo que necesitas para vender más
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Una sola plataforma que conecta WhatsApp, inteligencia artificial y analítica comercial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-8 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300"
            >
              <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-5`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                {f.title}
              </h3>
              <p className="mt-2 text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────

const steps = [
  {
    num: "01",
    title: "Conecta tu WhatsApp",
    desc: "Vincula tu número de WhatsApp Business en menos de 5 minutos. Sin código, sin complicaciones.",
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    num: "02",
    title: "La IA aprende tu negocio",
    desc: "Sube tu catálogo de productos y la IA empieza a vender con tus precios, tu tono y tus reglas.",
    icon: <Bot className="w-5 h-5" />,
  },
  {
    num: "03",
    title: "Vende en automático",
    desc: "Cada mensaje se convierte en una oportunidad. La IA responde, recomienda, cotiza y cierra ventas 24/7.",
    icon: <TrendingUp className="w-5 h-5" />,
  },
];

function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Cómo funciona</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">
            Listo para vender en 3 pasos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="relative">
              <div className="text-6xl font-black text-indigo-100 mb-4">{step.num}</div>
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-4">
                {step.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Social Proof ──────────────────────────────────────────────

function SocialProof() {
  return (
    <section className="py-16 px-6 bg-white border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "24/7", label: "Disponibilidad", icon: <Clock className="w-5 h-5 text-indigo-400" /> },
            { value: "< 3s", label: "Tiempo de respuesta", icon: <Zap className="w-5 h-5 text-amber-400" /> },
            { value: "LATAM", label: "Diseñado para la región", icon: <Globe className="w-5 h-5 text-emerald-400" /> },
            { value: "100%", label: "Español nativo", icon: <Star className="w-5 h-5 text-rose-400" /> },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {stat.icon}
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Profile Selector (Demo) ──────────────────────────────────

const profiles = [
  {
    key: "admin" as const,
    title: "Dueño de Negocio",
    desc: "Dashboard completo: ventas, clientes, campañas, inbox WhatsApp, analítica.",
    icon: <BarChart3 className="w-7 h-7" />,
    features: ["Dashboard de ventas", "CRM WhatsApp", "Embudo automático", "Campañas"],
    color: "from-indigo-600 to-indigo-700",
    hoverBorder: "hover:border-indigo-300",
  },
  {
    key: "cajero" as const,
    title: "Agente de Ventas",
    desc: "Vista simplificada para atención rápida en punto de venta.",
    icon: <Users className="w-7 h-7" />,
    features: ["Búsqueda de clientes", "Venta cruzada", "Reposiciones"],
    color: "from-emerald-600 to-emerald-700",
    hoverBorder: "hover:border-emerald-300",
  },
  {
    key: "nextaitech" as const,
    title: "Administrador Plataforma",
    desc: "Control de comisiones, atribución y rendimiento de la plataforma.",
    icon: <Shield className="w-7 h-7" />,
    features: ["Comisiones en tiempo real", "Atribución de campañas", "Revenue analytics"],
    color: "from-gray-700 to-gray-900",
    hoverBorder: "hover:border-gray-400",
  },
];

function ProfileSelector({ onSelect }: { onSelect: (p: "admin" | "cajero" | "nextaitech") => void }) {
  return (
    <section id="demo" className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Demo interactivo</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">
            Elige tu perfil para explorar
          </h2>
          <p className="mt-4 text-gray-500">
            Cada rol tiene una experiencia diseñada para sus necesidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profiles.map((p) => (
            <button
              key={p.key}
              onClick={() => onSelect(p.key)}
              className={`group text-left bg-white rounded-2xl border border-gray-200 ${p.hoverBorder} hover:shadow-xl transition-all duration-300 overflow-hidden`}
            >
              <div className={`bg-gradient-to-r ${p.color} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  {p.icon}
                  <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-xl font-bold mt-4">{p.title}</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">{p.desc}</p>
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-12 px-6 bg-gray-900 text-gray-400">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Sellix AI</span>
        </div>
        <p className="text-sm">Next AI Tech LLC · Miami, Florida · 2026</p>
      </div>
    </footer>
  );
}

// ── Main Landing Page ─────────────────────────────────────────

export function LandingPage() {
  const [showProfiles, setShowProfiles] = useState(false);

  const handleSelectProfile = (profile: "admin" | "cajero" | "nextaitech") => {
    localStorage.setItem("sellix-role", profile);
    window.location.href = "/auth/signin";
  };

  const scrollToDemo = () => {
    setShowProfiles(true);
    setTimeout(() => {
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Sellix AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={scrollToDemo}
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Demo
            </button>
            <a
              href="/auth/signin"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Ingresar
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      <Hero onCTA={scrollToDemo} />
      <Features />
      <SocialProof />
      <HowItWorks />
      {showProfiles && <ProfileSelector onSelect={handleSelectProfile} />}
      {!showProfiles && (
        <section className="py-24 px-6 bg-indigo-600 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Empieza a vender más hoy
          </h2>
          <p className="mt-4 text-indigo-200 max-w-lg mx-auto">
            Configura tu asistente en menos de 5 minutos. Sin código, sin complicaciones.
          </p>
          <button
            onClick={scrollToDemo}
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-700 font-semibold rounded-2xl hover:bg-indigo-50 transition-colors text-lg shadow-lg"
          >
            <Play className="w-5 h-5" />
            Probar Demo Gratis
          </button>
        </section>
      )}
      <Footer />
    </div>
  );
}
