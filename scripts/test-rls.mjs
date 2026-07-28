#!/usr/bin/env node
// =============================================================
// Sellix AI — Prueba de aislamiento multi-tenant (RLS)
//
// Levanta un Postgres desechable en Docker, aplica toda la cadena de
// migraciones incluida la de RLS, y ejecuta las queries reales de la
// aplicación contra dos tenants para comprobar que ninguno ve los datos
// del otro.
//
//   node scripts/test-rls.mjs
//
// Requiere Docker. No toca la base de producción: usa su propio
// contenedor en el puerto 55435 y lo destruye al terminar.
//
// IMPORTANTE: las pruebas corren con un rol SIN privilegios. Postgres
// ignora RLS para superusuarios y para roles con rolbypassrls, así que
// probar como `postgres` daría un falso verde — el aislamiento parecería
// roto (o intacto) por razones equivocadas.
// =============================================================

import { execSync } from "node:child_process";
import postgres from "postgres";

const PORT = 55435;
const CONTAINER = "sellix-rls-test";
const OWNER_URL = `postgresql://postgres:test@localhost:${PORT}/sellix`;
const APP_URL = `postgresql://sellix_app:apppass@localhost:${PORT}/sellix`;

const MIGRATIONS = [
  "db/migrations/001_initial_schema.sql",
  "db/migrations/002_generic_ontology.sql",
  "db/migrations/003_seed_packs.sql",
  "db/migrations/005_users.sql",
  "db/migrations/006_rls.sql.pending",
];

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts });
}

function startContainer() {
  try { sh(`docker rm -f ${CONTAINER}`); } catch { /* no existía */ }
  sh(`docker run -d --rm --name ${CONTAINER} -e POSTGRES_PASSWORD=test -e POSTGRES_DB=sellix -p ${PORT}:5432 postgres:16-alpine`);
  for (let i = 0; i < 60; i++) {
    try {
      sh(`docker exec ${CONTAINER} pg_isready -U postgres`);
      return;
    } catch {
      sh("sleep 1");
    }
  }
  throw new Error("Postgres no respondió a tiempo");
}

function applyMigrations() {
  for (const file of MIGRATIONS) {
    sh(`PGPASSWORD=test psql -h localhost -p ${PORT} -U postgres -d sellix -v ON_ERROR_STOP=1 -q -f ${file}`);
  }
}

async function seed(sql) {
  await sql.unsafe(`
    CREATE ROLE sellix_app LOGIN PASSWORD 'apppass';
    GRANT USAGE ON SCHEMA public TO sellix_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sellix_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sellix_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sellix_app;
  `);
  await sql`INSERT INTO tenants (id,nombre,slug,pack_id) VALUES ('farma','Droguería','farma','001'),('pet','Pet Shop','pet','002')`;
  await sql`INSERT INTO users (id,tenant_id,username,password_hash,rol) VALUES ('uf','farma','admin','h','admin'),('up','pet','admin','h','owner')`;
  await sql`INSERT INTO clientes (tenant_id,cedula,nombre,telefono) VALUES ('farma','111','Ana','3001'),('pet','222','Beto','3002')`;
  await sql`INSERT INTO ventas (tenant_id,cedula,fecha,codigo,producto,cantidad,total,sesion) VALUES
    ('farma','111',now(),'P1','LOSARTAN',1,25000,'s1'),
    ('pet','222',now(),'P9','ALIMENTO PERRO',1,89000,'s2')`;
}

async function run() {
  const app = postgres(APP_URL, { prepare: false, max: 2 });

  const withTenant = (tenantId, fn) =>
    app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });

  const withBypassRls = (fn) =>
    app.begin(async (tx) => {
      await tx`SELECT set_config('app.bypass_rls', 'on', true)`;
      return fn(tx);
    });

  let failed = 0;
  const check = (name, ok, extra = "") => {
    console.log(`  ${ok ? "✔" : "✖"} ${name}${extra ? ` → ${extra}` : ""}`);
    if (!ok) failed++;
  };

  // El rol de prueba no debe poder saltarse RLS, o el resultado no vale.
  const [rol] = await app`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  check("el rol de prueba no puede saltarse RLS", !rol.rolsuper && !rol.rolbypassrls);
  if (rol.rolsuper || rol.rolbypassrls) {
    console.log("\n✖ Prueba inválida: el rol ignora RLS.");
    await app.end();
    return 1;
  }

  // Query real de getAllVentas
  for (const [tenant, esperado] of [["farma", "LOSARTAN"], ["pet", "ALIMENTO PERRO"]]) {
    const rows = await withTenant(tenant, (tx) => tx`
      SELECT v.cedula, c.nombre, v.producto
      FROM ventas v
      LEFT JOIN clientes c ON c.tenant_id = v.tenant_id AND c.cedula = v.cedula
      LEFT JOIN productos_master_v3 pm ON pm.codigo = v.codigo
      LEFT JOIN uploads u ON u.id = v.upload_id
      WHERE v.tenant_id = ${tenant} AND (u.active IS NULL OR u.active = true)
    `);
    check(`getAllVentas(${tenant}) ve solo lo suyo`, rows.length === 1 && rows[0].producto === esperado,
      rows.map((r) => r.producto).join(", ") || "vacío");
  }

  const fuga = await withTenant("farma", (tx) => tx`SELECT * FROM ventas WHERE tenant_id = ${"pet"}`);
  check("farma no puede leer ventas de pet", fuga.length === 0, `${fuga.length} filas`);

  const sinCtx = await app`SELECT COUNT(*)::int n FROM clientes`;
  check("sin tenant declarado no se ve nada", sinCtx[0].n === 0, `${sinCtx[0].n} filas`);

  for (const tenant of ["farma", "pet"]) {
    const u = await withBypassRls((tx) => tx`
      SELECT tenant_id, rol FROM users WHERE lower(username) = lower(${"admin"}) AND tenant_id = ${tenant}
    `);
    check(`el login encuentra admin@${tenant}`, u.length === 1, u[0]?.rol);
  }

  const cola = await withBypassRls((tx) => tx`SELECT COUNT(*)::int n FROM clientes`);
  check("el worker con bypass ve ambos tenants", cola[0].n === 2, `${cola[0].n} filas`);

  const packCross = await withBypassRls((tx) => tx`SELECT pack_id FROM tenants WHERE id = ${"pet"}`);
  check("el worker resuelve el pack de otro tenant", packCross[0]?.pack_id === "002", packCross[0]?.pack_id);

  const packPropio = await withTenant("farma", (tx) => tx`SELECT pack_id FROM tenants WHERE id = ${"farma"}`);
  check("cada tenant resuelve su propio pack", packPropio[0]?.pack_id === "001", packPropio[0]?.pack_id);

  try {
    await withTenant("farma", (tx) => tx`
      INSERT INTO clientes (tenant_id, cedula, nombre) VALUES (${"pet"}, ${"999"}, ${"Intruso"})
    `);
    check("la escritura cruzada se rechaza", false, "fue permitida");
  } catch (err) {
    check("la escritura cruzada se rechaza", /row-level security/.test(err.message));
  }

  const packs = await app`SELECT COUNT(*)::int n FROM vertical_packs`;
  check("vertical_packs se lee sin tenant (tabla exenta)", packs[0].n === 3, `${packs[0].n} packs`);

  await app.end();
  return failed;
}

async function main() {
  console.log("▶  Levantando Postgres de prueba…");
  startContainer();

  console.log("▶  Aplicando migraciones…");
  applyMigrations();

  const owner = postgres(OWNER_URL, { prepare: false, max: 1 });
  await seed(owner);
  await owner.end();

  console.log("▶  Probando aislamiento con rol restringido:\n");
  const failed = await run();

  console.log(failed === 0
    ? "\n✔ Aislamiento multi-tenant verificado."
    : `\n✖ ${failed} comprobaciones fallaron.`);
  return failed;
}

let code = 1;
try {
  code = await main();
} catch (err) {
  console.error("✖ Error:", err.message);
} finally {
  try { sh(`docker rm -f ${CONTAINER}`); } catch { /* ya no existe */ }
}
process.exit(code === 0 ? 0 : 1);
