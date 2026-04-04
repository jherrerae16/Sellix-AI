"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3, Loader2, AlertCircle, Shield,
  TrendingUp, Users, MessageCircle,
} from "lucide-react";

const ROLES = [
  { key: "admin", label: "ADMINISTRADOR", sublabel: "admin", icon: <Shield className="w-3.5 h-3.5 text-emerald-400" /> },
  { key: "nextaitech", label: "NEXT AI TECH", sublabel: "platform", icon: <BarChart3 className="w-3.5 h-3.5 text-violet-400" /> },
];

export function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      // Force full page reload to pick up session
      window.location.replace("/");
    }
  };

  const fillDemo = (role: string) => {
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0e1a]">
      {/* Left side — Hero */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[180px]" />
        <div className="absolute top-10 right-10 w-64 h-64 bg-violet-600/10 rounded-full blur-[120px]" />

        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 max-w-lg">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs font-semibold tracking-wider uppercase">
              AI Engine Online
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
            Sellix AI.
          </h1>

          <p className="mt-5 text-lg text-gray-400 leading-relaxed max-w-md">
            Inteligencia comercial y ventas por WhatsApp para droguerías.
          </p>

          {/* Feature card */}
          <div className="mt-10 bg-white/[0.04] backdrop-blur border border-white/[0.06] rounded-2xl p-5 max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="h-2 bg-white/10 rounded-full w-3/4">
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full w-[85%]" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Análisis de ventas</span>
              <span className="text-xs font-bold text-emerald-400">957 clientes</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 flex gap-8">
            <div>
              <p className="text-2xl font-bold text-white">6</p>
              <p className="text-xs text-gray-500">Módulos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">20.3K</p>
              <p className="text-xs text-gray-500">Transacciones</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white flex items-center gap-1">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                Live
              </p>
              <p className="text-xs text-gray-500">WhatsApp CRM</p>
            </div>
          </div>
        </div>

        {/* Bottom left — Powered by */}
        <div className="absolute bottom-8 left-16">
          <p className="text-xs text-gray-600">
            Powered by Next AI Tech LLC
          </p>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex items-center justify-center px-8 lg:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-3">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Sellix AI.</h1>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Bienvenido</h2>
          <p className="text-sm text-gray-500 mb-8">
            Acceda al panel de inteligencia comercial.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Credential ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter workspace username"
                required
                autoFocus
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Security Key
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all outline-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
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

          {/* Quick access */}
          <div className="mt-8">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              Quick Access Demo
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.key}
                  onClick={() => fillDemo(role.key)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left group"
                >
                  {role.icon}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-gray-300">
                      {role.label}
                    </p>
                    <p className="text-xs text-gray-600">{role.sublabel}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
