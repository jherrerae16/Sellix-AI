#!/usr/bin/env node
// =============================================================
// Sellix AI — Seed del usuario administrador
//
// Crea (o actualiza) un usuario en la tabla `users` a partir de las
// credenciales que hoy viven en variables de entorno. Guarda la
// contraseña como hash bcrypt: nunca en texto plano, nunca en el repo.
//
// Uso:
//   node scripts/seed-admin.mjs
//     → toma APP_USER / APP_PASSWORD de .env.local
//
//   node scripts/seed-admin.mjs --user juan --rol owner --tenant superofertas
//     → crea un usuario concreto; pide la contraseña por stdin sin eco
//
// Ejecutar ANTES de desplegar el cambio de autenticación, para que el
// login siga funcionando cuando deje de leer las variables de entorno.
// =============================================================

import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const BCRYPT_ROUNDS = 12;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Lee una contraseña por stdin sin mostrarla en pantalla. */
function promptPassword(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      if (["\n", "\r", ""].includes(char.toString())) {
        process.stdin.removeListener("data", onData);
      } else {
        process.stdout.write("\x1B[2K\x1B[200D" + prompt + "*".repeat(rl.line.length));
      }
    };
    process.stdin.on("data", onData);
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const { DATABASE_URL, APP_USER, APP_PASSWORD, DEFAULT_TENANT_ID } = process.env;

  if (!DATABASE_URL) {
    console.error("✖ DATABASE_URL no configurada");
    process.exit(1);
  }

  const tenantId = arg("tenant", DEFAULT_TENANT_ID ?? "superofertas");
  const username = arg("user", APP_USER);
  const rol = arg("rol", "admin");

  if (!username) {
    console.error("✖ Falta usuario: define APP_USER o pasa --user <nombre>");
    process.exit(1);
  }

  const rolesValidos = ["owner", "admin", "agente", "analista", "nextaitech"];
  if (!rolesValidos.includes(rol)) {
    console.error(`✖ Rol inválido "${rol}". Válidos: ${rolesValidos.join(", ")}`);
    process.exit(1);
  }

  // La contraseña viene del entorno si coincide con el usuario actual;
  // si no, se pide por stdin para no exponerla en el historial del shell.
  let password = arg("user", null) === null ? APP_PASSWORD : null;
  if (!password) {
    password = await promptPassword(`Contraseña para "${username}": `);
  }

  if (!password || password.length < 8) {
    console.error("✖ La contraseña debe tener al menos 8 caracteres");
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { ssl: "require", max: 1, prepare: false });

  try {
    const [tenant] = await sql`SELECT id, nombre FROM tenants WHERE id = ${tenantId}`;
    if (!tenant) {
      console.error(`✖ El tenant "${tenantId}" no existe`);
      process.exitCode = 1;
      return;
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [existing] = await sql`
      SELECT id FROM users WHERE tenant_id = ${tenantId} AND lower(username) = lower(${username})
    `;

    if (existing) {
      await sql`
        UPDATE users
        SET password_hash = ${hash}, rol = ${rol}, activo = true, updated_at = now()
        WHERE id = ${existing.id}
      `;
      console.log(`✔ Usuario "${username}" actualizado (tenant ${tenantId}, rol ${rol})`);
    } else {
      await sql`
        INSERT INTO users (id, tenant_id, username, password_hash, nombre, rol)
        VALUES (${randomUUID()}, ${tenantId}, ${username}, ${hash}, ${username}, ${rol})
      `;
      console.log(`✔ Usuario "${username}" creado (tenant ${tenantId}, rol ${rol})`);
    }

    const users = await sql`
      SELECT username, rol, activo FROM users WHERE tenant_id = ${tenantId} ORDER BY username
    `;
    console.log(`\nUsuarios del tenant ${tenantId} (${tenant.nombre}):`);
    for (const u of users) {
      console.log(`  ${u.activo ? "●" : "○"} ${u.username.padEnd(20)} ${u.rol}`);
    }
  } catch (err) {
    console.error("✖ Error:", err.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
