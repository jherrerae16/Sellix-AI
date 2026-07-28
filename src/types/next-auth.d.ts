// =============================================================
// Sellix AI — Extensión de tipos de NextAuth
//
// Añade `tenantId` y `rol` a la sesión y al JWT. Sin esto, TypeScript
// no sabe que el claim los transporta y cada acceso requeriría un cast.
// =============================================================

import type { Rol } from "@/lib/authConfig";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** Tenant al que pertenece el usuario. Origen único de verdad. */
      tenantId: string;
      /** Rol dentro del tenant (PRD v4.0 §7.3). */
      rol: Rol;
    };
  }

  interface User {
    tenantId?: string;
    rol?: Rol;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tenantId?: string;
    rol?: Rol;
  }
}

export {};
