"use client";

import { User, Shield, ShoppingBag } from "lucide-react";
import { useRole, type Role } from "@/lib/RoleContext";

const roles: { key: Role; label: string; icon: React.ReactNode }[] = [
  { key: "admin",  label: "Administrador", icon: <Shield className="w-3.5 h-3.5" /> },
  { key: "cajero", label: "Cajero",        icon: <ShoppingBag className="w-3.5 h-3.5" /> },
];

export function TopBar() {
  const { role, setRole } = useRole();

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-4">
        {/* Role switcher */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setRole(r.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                role === r.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium">{role === "admin" ? "Admin" : "Cajero"}</span>
        </div>
      </div>
    </header>
  );
}
