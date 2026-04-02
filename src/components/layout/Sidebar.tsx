"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, AlertTriangle,
  RefreshCcw, Star, Zap, Upload, Search,
  DollarSign, BarChart3,
} from "lucide-react";
import { useRole } from "@/lib/RoleContext";

const adminNav = [
  { label: "Resumen",          href: "/",          icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "Venta Cruzada",    href: "/cruzada",   icon: <ShoppingCart className="w-5 h-5" /> },
  { label: "Churn",            href: "/churn",     icon: <AlertTriangle className="w-5 h-5" /> },
  { label: "Reposición",       href: "/reposicion",icon: <RefreshCcw className="w-5 h-5" /> },
  { label: "VIP / RFM",        href: "/vip",       icon: <Star className="w-5 h-5" /> },
  { label: "Productos Gancho", href: "/gancho",     icon: <Zap className="w-5 h-5" /> },
];

const cajeroNav = [
  { label: "Buscar cliente",   href: "/",          icon: <Search className="w-5 h-5" /> },
  { label: "Venta Cruzada",    href: "/cruzada",   icon: <ShoppingCart className="w-5 h-5" /> },
  { label: "Reposición",       href: "/reposicion",icon: <RefreshCcw className="w-5 h-5" /> },
];

const nextaitechNav = [
  { label: "Comisiones",       href: "/comisiones", icon: <DollarSign className="w-5 h-5" /> },
];

const roleBadge: Record<string, { label: string; color: string }> = {
  cajero: { label: "Cajero", color: "bg-emerald-100 text-emerald-700" },
  nextaitech: { label: "Next AI Tech", color: "bg-violet-100 text-violet-700" },
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
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-lg font-bold text-brand-blue">Sellix AI</span>
        </div>
        {badge && (
          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navegación principal">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-blue text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {role === "admin" && (
        <div className="px-3 py-4 border-t border-gray-200">
          <Link
            href="/upload"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/upload"
                ? "bg-brand-blue text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Upload className="w-5 h-5" />
            Cargar datos
          </Link>
        </div>
      )}
    </aside>
  );
}
