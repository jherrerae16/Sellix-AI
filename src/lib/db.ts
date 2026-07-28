// =============================================================
// Sellix AI — Postgres client
// Usa `postgres` (Porsager) — driver ligero, serverless-friendly.
// Conexión pooled vía Neon. Una sola instancia compartida.
// =============================================================

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Solo loggeamos en server; en build de cliente nunca llegamos aquí
  if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
    console.warn("[db] DATABASE_URL no está definida — Postgres deshabilitado");
  }
}

// Reutilizar la instancia entre invocaciones serverless (HMR-safe en dev)
declare global {
  // eslint-disable-next-line no-var
  var __sellix_sql: ReturnType<typeof postgres> | undefined;
}

function makeSql() {
  if (!connectionString) {
    throw new Error("DATABASE_URL no configurada");
  }
  return postgres(connectionString, {
    ssl: "require",
    max: 5,                 // pool pequeño — Neon tiene límites en free tier
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,         // requerido para Neon pooled
  });
}

export const sql = global.__sellix_sql ?? makeSql();
if (process.env.NODE_ENV !== "production") global.__sellix_sql = sql;

/** True si la app tiene Postgres configurado y disponible. */
export const hasDatabase = !!connectionString;

/**
 * Tenant por defecto. Se usa solo como fallback mientras quedan sesiones
 * emitidas antes de que el JWT transportara `tenantId`, y en scripts de
 * mantenimiento. El código de aplicación debe tomarlo de la sesión
 * (ver src/lib/tenantContext.ts).
 */
export const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "superofertas";

/**
 * Ejecuta queries dentro de una transacción que declara su tenant, de
 * modo que las políticas RLS lo apliquen (migración 006).
 *
 * El `true` de set_config hace el ajuste local a la transacción: en
 * serverless el pool reutiliza conexiones entre peticiones, y un ajuste
 * de sesión se filtraría de un tenant al siguiente.
 *
 *   const filas = await withTenant(ctx.tenantId, (tx) =>
 *     tx`SELECT * FROM ventas`   // RLS ya filtra por tenant
 *   );
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: typeof sql) => Promise<T> | T,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx as unknown as typeof sql);
  }) as Promise<T>;
}

/**
 * Transacción con permiso explícito para operar cross-tenant. Solo para
 * procesos de fondo que por diseño abarcan varios tenants: el worker de
 * clasificación, el ETL y las migraciones.
 *
 * No usar en código que atienda una petición de usuario.
 */
export async function withBypassRls<T>(
  fn: (tx: typeof sql) => Promise<T> | T,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.bypass_rls', 'on', true)`;
    return fn(tx as unknown as typeof sql);
  }) as Promise<T>;
}
