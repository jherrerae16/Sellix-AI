#!/usr/bin/env node
// =============================================================
// Sellix AI — Runner de migraciones
//
// Aplica los .sql de db/migrations/ en orden y registra cada uno en
// la tabla `schema_migrations` para no repetirlos.
//
//   node scripts/migrate.mjs            → aplica pendientes
//   node scripts/migrate.mjs --status   → solo muestra el estado
//   node scripts/migrate.mjs --dry-run  → imprime lo que aplicaría
//
// Los archivos .sql.pending se ignoran a propósito: son migraciones
// destructivas que requieren verificación manual antes de habilitarse.
//
// Cada archivo trae su propio BEGIN/COMMIT, así que se envía como un
// solo bloque con sql.unsafe(). Si falla, Postgres revierte entero.
// =============================================================

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");

dotenv.config({ path: join(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✖ DATABASE_URL no configurada");
  process.exit(1);
}

const statusOnly = process.argv.includes("--status");
const dryRun = process.argv.includes("--dry-run");

const sql = postgres(DATABASE_URL, {
  ssl: "require",
  max: 1,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 15,
});

async function main() {
  const host = DATABASE_URL.match(/@([^/]+)\//)?.[1] ?? "desconocido";
  console.log(`▶  Base de datos: ${host}\n`);

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const applied = new Set(
    (await sql`SELECT filename FROM schema_migrations`).map((r) => r.filename),
  );

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pendingFiles = (await readdir(MIGRATIONS_DIR)).filter((f) =>
    f.endsWith(".sql.pending"),
  );

  console.log("Estado:");
  for (const f of files) {
    console.log(`  ${applied.has(f) ? "✔ aplicada " : "· pendiente"}  ${f}`);
  }
  for (const f of pendingFiles) {
    console.log(`  ⏸ bloqueada  ${f}  (renombrar a .sql para habilitar)`);
  }
  console.log();

  const toApply = files.filter((f) => !applied.has(f));

  if (statusOnly) return;

  if (!toApply.length) {
    console.log("✔ Sin migraciones pendientes.");
    return;
  }

  if (dryRun) {
    console.log(`Aplicaría ${toApply.length}: ${toApply.join(", ")}`);
    return;
  }

  for (const filename of toApply) {
    const contents = await readFile(join(MIGRATIONS_DIR, filename), "utf-8");
    process.stdout.write(`▶  Aplicando ${filename} ... `);
    const start = Date.now();
    try {
      await sql.unsafe(contents);
      await sql`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
      console.log(`✔ ${Date.now() - start}ms`);
    } catch (err) {
      console.log("✖");
      console.error(`\n   ${err.message}\n`);
      if (err.position) console.error(`   posición: ${err.position}`);
      console.error("   La transacción fue revertida. Nada se aplicó de este archivo.");
      process.exitCode = 1;
      return;
    }
  }

  console.log("\n✔ Migraciones aplicadas.");
}

main()
  .catch((err) => {
    console.error("✖ Error:", err.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
