"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, AlertTriangle,
  RefreshCcw, Users, Zap, Upload, Search,
  DollarSign, BarChart3, Target, TrendingDown, MessageCircle,
} from "lucide-react";
import { useRole } from "@/lib/RoleContext";

const adminNav = [
  { label: "Resumen",          href: "/",          icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { label: "Next Best Action", href: "/acciones",  icon: <Target className="w-[18px] h-[18px]" /> },
  { label: "Cotizador",        href: "/cotizador", icon: <TrendingDown className="w-[18px] h-[18px]" /> },
  { label: "Inbox WhatsApp",   href: "/inbox",     icon: <MessageCircle className="w-[18px] h-[18px]" /> },
  { label: "Venta Cruzada",    href: "/cruzada",   icon: <ShoppingCart className="w-[18px] h-[18px]" /> },
  { label: "Churn",            href: "/churn",     icon: <AlertTriangle className="w-[18px] h-[18px]" /> },
  { label: "Reposición",       href: "/reposicion",icon: <RefreshCcw className="w-[18px] h-[18px]" /> },
  { label: "Clientes",         href: "/vip",       icon: <Users className="w-[18px] h-[18px]" /> },
  { label: "Productos Gancho", href: "/gancho",    icon: <Zap className="w-[18px] h-[18px]" /> },
];

const cajeroNav = [
  { label: "Buscar cliente",   href: "/",          icon: <Search className="w-[18px] h-[18px]" /> },
  { label: "Venta Cruzada",    href: "/cruzada",   icon: <ShoppingCart className="w-[18px] h-[18px]" /> },
  { label: "Reposición",       href: "/reposicion",icon: <RefreshCcw className="w-[18px] h-[18px]" /> },
];

const nextaitechNav = [
  { label: "Comisiones",       href: "/comisiones", icon: <DollarSign className="w-[18px] h-[18px]" /> },
];

const roleBadge: Record<string, { label: string; color: string }> = {
  cajero: { label: "Cajero", color: "bg-emerald-50 text-emerald-600" },
  nextaitech: { label: "Next AI Tech", color: "bg-violet-50 text-violet-600" },
};

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useRole();

  const navItems = role === "cajero"
    ? cajeroNav
    : role === "nextaitech"
    ? nextaitechNav
    : adminNav;

  const badge = role ? roleBadge[role] : null;

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Sellix AI</span>
        </div>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Navegación principal">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={isActive ? "text-indigo-600" : "text-gray-400"}>{item.icon}</span>
              {item.label}
              {isActive && (
                <span className="ml-auto w-1 h-1 bg-indigo-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {role === "admin" && (
        <div className="px-3 py-3 border-t border-gray-100">
          <Link
            href="/upload"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === "/upload"
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Upload className="w-[18px] h-[18px]" />
            Cargar datos
          </Link>
        </div>
      )}
    </aside>
  );
}
