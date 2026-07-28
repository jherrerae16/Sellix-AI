// =============================================================
// Sellix AI — Configuración NextAuth.js v5 (Edge-safe)
//
// Este archivo lo importa el middleware, que corre en Edge Runtime.
// NO puede importar Postgres ni bcryptjs: ninguno funciona en Edge.
//
// Por eso el provider de credenciales (que consulta la base de datos)
// vive en src/auth.ts, que solo se ejecuta en Node runtime. Aquí queda
// lo que el middleware necesita: cookies, callbacks de sesión y la
// forma del token.
//
// El claim del JWT transporta `tenantId` y `rol`. Ambos se leen SIEMPRE
// de aquí, nunca de localStorage ni de un parámetro de request
// (PRD v4.0 §4, §7.2).
// =============================================================

import type { NextAuthConfig } from "next-auth";

/** Roles del sistema (PRD v4.0 §7.3). */
export type Rol = "owner" | "admin" | "agente" | "analista" | "nextaitech";

export const ROLES: readonly Rol[] = [
  "owner",
  "admin",
  "agente",
  "analista",
  "nextaitech",
] as const;

export function isRol(value: unknown): value is Rol {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const authConfig: NextAuthConfig = {
  // Los providers se añaden en src/auth.ts — requieren Node runtime.
  providers: [],

  pages: {
    signIn: "/auth/signin",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      // `user` solo llega en el login; después el token ya viaja completo.
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.tenantId = (user as { tenantId?: string }).tenantId;
        token.rol = (user as { rol?: string }).rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.tenantId = token.tenantId as string;
        session.user.rol = token.rol as Rol;
      }
      return session;
    },
  },
};
