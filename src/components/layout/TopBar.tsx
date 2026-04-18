"use client";

import { User, Shield, ShoppingBag, Building2, LogOut } from "lucide-react";
import { useRole, type Role } from "@/lib/RoleContext";

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string }> = {
  admin: {
    label: "Administrador",
    icon: <Shield className="w-3.5 h-3.5" />,
    color: "bg-indigo-50 text-indigo-600",
  },
  cajero: {
    label: "Cajero",
    icon: <ShoppingBag className="w-3.5 h-3.5" />,
    color: "bg-emerald-50 text-emerald-600",
  },
  nextaitech: {
    label: "Next AI Tech",
    icon: <Building2 className="w-3.5 h-3.5" />,
    color: "bg-violet-50 text-violet-600",
  },
};

export function TopBar() {
  const { role, logout } = useRole();

  if (!role) return null;
  const config = roleConfig[role];

  return (
    <header className="h-16 flex-shrink-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 flex items-center justify-end px-6">
      <div className="flex items-center gap-3">
        {/* Role badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${config.color}`}>
          {config.icon}
          {config.label}
        </span>

        {/* User avatar */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium">{config.label}</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Cambiar de perfil"
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir
        </button>
      </div>
    </header>
  );
}
