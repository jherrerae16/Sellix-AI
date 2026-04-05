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
    <div className="min-h-screen flex bg-gradient-to-br from-[#0a1929] via-[#0d2847] to-[#0a1929]">
      {/* Left side — Hero */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-20 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-sky-600/10 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Sellix AI</span>
          </div>

          {/* Hero text */}
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tight">
            Potencia las ventas
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
              de tu droguería
            </span>
          </h1>

          <p className="mt-5 text-base xl:text-lg text-gray-300/80 leading-relaxed max-w-md">
            La plataforma todo-en-uno para gestionar clientes, cerrar ventas más rápido y crecer tu negocio con inteligencia artificial.
          </p>

          {/* Feature cards */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white/[0.06] backdrop-blur border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.1] transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center text-blue-300 mb-3">
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
      <div className="flex-1 lg:flex-none lg:w-[520px] xl:w-[580px] flex items-center justify-center p-6 lg:p-10">
        <div className="w-full h-full max-h-[700px] flex flex-col">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Sellix AI</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 p-10 xl:p-12 flex-1 flex flex-col justify-center">
            <h2 className="text-2xl xl:text-3xl font-bold text-gray-900 text-center">Bienvenido</h2>
            <p className="text-sm xl:text-base text-gray-500 text-center mt-2 mb-10">
              Inicie sesión para acceder al dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Usuario
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    required
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm xl:text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm xl:text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white text-base font-semibold rounded-xl hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>
            </form>

            {/* Footer inside card */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span>Términos</span>
              <span>Privacidad</span>
              <span>Soporte</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
