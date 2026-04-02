"use client";

import { User, Shield, ShoppingBag, Building2, LogOut } from "lucide-react";
import { useRole, type Role } from "@/lib/RoleContext";

const roleConfig: Record<Role, { label: string; icon: React.ReactNode; color: string }> = {
  admin: {
    label: "Administrador",
    icon: <Shield className="w-3.5 h-3.5" />,
    color: "bg-blue-100 text-blue-700",
  },
  cajero: {
    label: "Cajero",
    icon: <ShoppingBag className="w-3.5 h-3.5" />,
    color: "bg-emerald-100 text-emerald-700",
  },
  nextaitech: {
    label: "Next AI Tech",
    icon: <Building2 className="w-3.5 h-3.5" />,
    color: "bg-violet-100 text-violet-700",
  },
};

export function TopBar() {
  const { role, logout } = useRole();

  if (!role) return null;
  const config = roleConfig[role];

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-4">
        {/* Role badge */}
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${config.color}`}>
          {config.icon}
          {config.label}
        </span>

        {/* User avatar */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium">{config.label}</span>
        </div>

        {/* Logout / Change role */}
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
