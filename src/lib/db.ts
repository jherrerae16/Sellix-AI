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

/** Default tenant id usado durante el piloto single-tenant. */
export const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "superofertas";
