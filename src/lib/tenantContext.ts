// =============================================================
// Sellix AI — Contexto de tenant y autorización por rol
//
// Origen único de verdad para "¿de qué tenant es esta petición?" y
// "¿este usuario puede hacer esto?".
//
// Regla dura (PRD v4.0 §4): el tenant_id se obtiene SIEMPRE de la
// sesión autenticada. Nunca de un query string, header ni body. Si
// algún día aparece código que lo tome del request, es un bug de
// seguridad crítico.
//
// Uso típico en un route handler:
//
//   const ctx = await requireTenant();
//   if (!ctx.ok) return ctx.response;
//   const rows = await sql`SELECT ... WHERE tenant_id = ${ctx.tenantId}`;
//
// Y cuando la ruta es de un rol concreto:
//
//   const ctx = await requireRole("nextaitech");
//   if (!ctx.ok) return ctx.response;
// =============================================================

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEFAULT_TENANT_ID } from "@/lib/db";
import type { Rol } from "@/lib/authConfig";

export interface TenantContext {
  ok: true;
  tenantId: string;
  rol: Rol;
  userId: string;
  userName: string;
}

export interface TenantContextError {
  ok: false;
  response: NextResponse;
}

export type TenantContextResult = TenantContext | TenantContextError;

/**
 * Jerarquía de permisos. Un rol superior puede hacer lo de los
 * inferiores dentro de su tenant.
 *
 * `nextaitech` queda fuera de la jerarquía a propósito: su alcance es
 * cross-tenant (comisiones, salud de la plataforma) y no debe heredarse
 * por ser "el rol más alto" de un tenant cualquiera.
 */
const JERARQUIA: Record<Rol, number> = {
  analista: 1,
  agente: 2,
  admin: 3,
  owner: 4,
  nextaitech: 0,
};

/**
 * Resuelve el contexto de la petición desde la sesión.
 *
 * Compatibilidad: si la sesión no trae `tenantId` (token emitido antes
 * de este cambio, todavía vigente por las 8h de vida del JWT), cae al
 * tenant por defecto. Esa rama desaparece cuando expiren los tokens
 * viejos; hasta entonces evita desloguear a todo el mundo en el deploy.
 */
export async function requireTenant(): Promise<TenantContextResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const tenantId = session.user.tenantId ?? DEFAULT_TENANT_ID;
  const rol = session.user.rol ?? "admin";

  return {
    ok: true,
    tenantId,
    rol,
    userId: session.user.id,
    userName: session.user.name ?? "desconocido",
  };
}

/**
 * Como `requireTenant`, pero exige un rol mínimo (o uno exacto si el
 * rol pedido está fuera de la jerarquía, como `nextaitech`).
 */
export async function requireRole(...permitidos: Rol[]): Promise<TenantContextResult> {
  const ctx = await requireTenant();
  if (!ctx.ok) return ctx;

  const autorizado = permitidos.some((permitido) => {
    // Roles fuera de la jerarquía se comparan por igualdad exacta.
    if (JERARQUIA[permitido] === 0) return ctx.rol === permitido;
    return JERARQUIA[ctx.rol] >= JERARQUIA[permitido] && JERARQUIA[ctx.rol] > 0;
  });

  if (!autorizado) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No autorizado para esta operación" },
        { status: 403 },
      ),
    };
  }

  return ctx;
}

/** True si el rol puede ver datos de todos los tenants. */
export function esCrossTenant(rol: Rol): boolean {
  return rol === "nextaitech";
}
