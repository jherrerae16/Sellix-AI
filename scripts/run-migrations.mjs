// =============================================================
// Sellix AI — Run SQL migrations
// Ejecuta todos los .sql en db/migrations/ en orden.
// Idempotente: cada migration debe usar IF NOT EXISTS.
// =============================================================

import postgres from "postgres";
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Carga .env.local primero, luego .env
loadEnv({ path: join(ROOT, ".env.local") });
loadEnv({ path: join(ROOT, ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL no configurada. Pégala en .env.local primero.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", prepare: false });

async function main() {
  const dir = join(ROOT, "db", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  // Tabla de control de migraciones
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  for (const filename of files) {
    const already = await sql`SELECT 1 FROM schema_migrations WHERE filename = ${filename}`;
    if (already.length > 0) {
      console.log(`⏭  ${filename} ya aplicada`);
      continue;
    }

    const content = await readFile(join(dir, filename), "utf-8");
    console.log(`▶  Aplicando ${filename}...`);
    try {
      await sql.unsafe(content);
      await sql`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
      console.log(`✅ ${filename} aplicada`);
    } catch (err) {
      console.error(`❌ Error en ${filename}:`, err.message);
      process.exit(1);
    }
  }

  console.log("✨ Todas las migraciones aplicadas");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
