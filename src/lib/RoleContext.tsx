"use client";

// =============================================================
// Sellix AI — Rol en el cliente (solo presentación)
//
// El rol lo inyecta el layout del servidor desde la sesión firmada.
// Antes se leía de localStorage, donde el usuario podía escribirlo a
// mano y entrar a módulos que no le correspondían (PRD v4.0 §4).
//
// IMPORTANTE: este contexto sirve para decidir QUÉ SE MUESTRA, nunca
// para autorizar. Cada página y cada endpoint validan el rol contra la
// sesión por su cuenta. Si alguien falsea este valor en memoria, lo
// único que consigue es una interfaz rota: el servidor sigue negando.
// =============================================================

import { createContext, useContext, type ReactNode } from "react";
import type { Rol } from "@/lib/authConfig";

/** Alias histórico. El vocabulario canónico es `Rol` (PRD §5). */
export type Role = Rol;

interface RoleContextType {
  role: Rol | null;
  /** Nombre del tenant activo, para mostrar en la interfaz. */
  tenantId: string | null;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  tenantId: null,
});

export function RoleProvider({
  children,
  role = null,
  tenantId = null,
}: {
  children: ReactNode;
  role?: Rol | null;
  tenantId?: string | null;
}) {
  return (
    <RoleContext.Provider value={{ role, tenantId }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
