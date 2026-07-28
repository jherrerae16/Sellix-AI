// =============================================================
// Sellix AI — Provider de credenciales (Node runtime únicamente)
//
// Importa Postgres y bcryptjs, así que NO puede cargarse desde el
// middleware (Edge Runtime). Solo lo usa el route handler de NextAuth,
// que corre en Node.
//
// Autentica contra la tabla `users` y devuelve `tenantId` y `rol`, que
// viajan firmados en el JWT. A partir de ahí el servidor confía en el
// claim, no en lo que diga el cliente.
//
// Fallback de emergencia: si la tabla `users` está vacía o Postgres no
// responde, acepta APP_USER / APP_PASSWORD del entorno. Existe para que
// un despliegue no deje al cliente fuera de su propia aplicación si el
// seed no corrió. Cuando se usa, lo registra como advertencia.
// =============================================================

import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { withTenant, withBypassRls, hasDatabase, DEFAULT_TENANT_ID } from "@/lib/db";
import { isRol, type Rol } from "@/lib/authConfig";

interface UserRow {
  id: string;
  tenant_id: string;
  username: string;
  password_hash: string;
  nombre: string | null;
  rol: string;
}

export interface AuthedUser {
  id: string;
  name: string;
  tenantId: string;
  rol: Rol;
}

/**
 * Credenciales del entorno. Solo se aceptan si la base de datos no
 * tiene ningún usuario para ese nombre — nunca como atajo silencioso
 * frente a un hash existente.
 */
function checkEnvFallback(username: string, password: string): AuthedUser | null {
  const envUser = process.env.APP_USER;
  const envPassword = process.env.APP_PASSWORD;
  if (!envUser || !envPassword) return null;
  if (username !== envUser || password !== envPassword) return null;

  console.warn(
    "[auth] Login vía APP_USER/APP_PASSWORD (fallback). " +
      "Ejecutar scripts/seed-admin.mjs para migrar este usuario a la tabla users.",
  );
  return {
    id: "env-admin",
    name: envUser,
    tenantId: DEFAULT_TENANT_ID,
    rol: "admin",
  };
}

export const credentialsProvider = Credentials({
  name: "Credenciales",
  credentials: {
    username: { label: "Usuario", type: "text" },
    password: { label: "Contraseña", type: "password" },
  },
  async authorize(credentials) {
    const username = (credentials?.username as string | undefined)?.trim();
    const password = credentials?.password as string | undefined;

    if (!username || !password) return null;

    if (!hasDatabase) {
      return checkEnvFallback(username, password);
    }

    try {
      // withBypassRls: el login es previo a conocer el tenant — es
      // justamente la query que lo determina. Sin bypass, RLS no
      // devolvería ninguna fila y nadie podría autenticarse.
      const rows = await withBypassRls((tx) => tx<UserRow[]>`
        SELECT id, tenant_id, username, password_hash, nombre, rol
        FROM users
        WHERE lower(username) = lower(${username}) AND activo = true
        LIMIT 1
      `);
      const user = rows[0];

      // Sin usuario en base: puede ser un despliegue donde el seed aún
      // no corrió, así que se permite el fallback del entorno.
      if (!user) return checkEnvFallback(username, password);

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return null;

      // No bloquea el login si falla: es telemetría, no autenticación.
      withTenant(user.tenant_id, (tx) =>
        tx`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`,
      ).catch(() => {});

      return {
        id: user.id,
        name: user.nombre ?? user.username,
        tenantId: user.tenant_id,
        rol: isRol(user.rol) ? user.rol : "agente",
      } satisfies AuthedUser;
    } catch (err) {
      console.error("[auth] error consultando users:", err);
      // Si la base falla, el fallback evita dejar al cliente fuera.
      return checkEnvFallback(username, password);
    }
  },
});
