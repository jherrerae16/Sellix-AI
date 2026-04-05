"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3, Loader2, AlertCircle, Mail, Lock,
  MessageCircle, TrendingUp, Zap, GitBranch,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "WhatsApp CRM",
    desc: "Gestiona pedidos y clientes directo desde WhatsApp",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Analítica Inteligente",
    desc: "Insights en tiempo real sobre ventas y clientes",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Automatización",
    desc: "Campañas, reposiciones y seguimiento automático",
  },
  {
    icon: <GitBranch className="w-5 h-5" />,
    title: "Embudo de Ventas",
    desc: "Seguimiento de cada oportunidad de lead a postventa",
  },
];

export function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Credenciales inválidas. Verifique e intente de nuevo.");
      setLoading(false);
    } else if (result?.ok) {
      localStorage.setItem("sellix-role", "admin");
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#1a1040] via-[#2d1b69] to-[#1a1040]">
      {/* Left side — Hero */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-pink-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Sellix AI</span>
          </div>

          {/* Hero text */}
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight">
            Potencia las ventas
            <br />
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              de tu droguería
            </span>
          </h1>

          <p className="mt-5 text-base text-gray-300/80 leading-relaxed max-w-md">
            La plataforma todo-en-uno para gestionar clientes, cerrar ventas más rápido y crecer tu negocio con inteligencia artificial.
          </p>

          {/* Feature cards */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white/[0.06] backdrop-blur border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.1] transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center text-purple-300 mb-3">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-white">{f.title}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Seguridad enterprise
            </span>
            <span>Powered by Next AI Tech LLC</span>
          </div>
        </div>
      </div>

      {/* Right side — Login card */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex items-center justify-center px-6 lg:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Sellix AI</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8">
            <h2 className="text-xl font-bold text-gray-900 text-center">Bienvenido</h2>
            <p className="text-sm text-gray-500 text-center mt-1 mb-8">
              Inicie sesión para acceder al dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-500 hover:via-purple-400 hover:to-pink-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
