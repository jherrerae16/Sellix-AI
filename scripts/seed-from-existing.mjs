// =============================================================
// Sellix AI — Seed Postgres desde datos existentes
//
// Fuentes:
//   - data/uploads/*.xlsx           → tabla `ventas`
//   - data/output/productos_clasificados.json → `productos_master` + `productos_tenant`
//   - data/output/precios_catalogo.json       → precios en `productos_tenant`
//
// Idempotente: usa ON CONFLICT DO NOTHING / UPDATE.
// Ejecutar con: node scripts/seed-from-existing.mjs
// =============================================================

import postgres from "postgres";
import XLSX from "xlsx";
import { readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

loadEnv({ path: join(ROOT, ".env.local") });
loadEnv({ path: join(ROOT, ".env") });

const TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "superofertas";
const TENANT_NAME = "Droguería Superofertas";
const TENANT_SLUG = "superofertas";

const DATA_DIR = join(ROOT, "data", "output");
const UPLOADS_DIR = join(ROOT, "data", "uploads");

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 5 });

// ── Helpers ────────────────────────────────────────────────

const ANONYMOUS_IDS = new Set(["222222222222", "0", "", "SIN_CEDULA"]);

function norm(s) {
  return String(s ?? "").toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function findCol(headers, exact, containsAll) {
  const normed = headers.map((h) => [h, norm(h)]);
  for (const cand of exact) {
    const nc = norm(cand);
    const hit = normed.find(([, nh]) => nh === nc);
    if (hit) return hit[0];
  }
  if (containsAll) {
    for (const parts of containsAll) {
      const np = parts.map(norm);
      const hit = normed.find(([, nh]) => np.every((p) => nh.includes(p)));
      if (hit) return hit[0];
    }
  }
  return null;
}

function parseNum(val) {
  if (typeof val === "number") return val;
  if (typeof val !== "string") return 0;
  const cleaned = val.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val) {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseStr(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

// ── 1. Tenant ──────────────────────────────────────────────

async function ensureTenant() {
  await sql`
    INSERT INTO tenants (id, nombre, slug)
    VALUES (${TENANT_ID}, ${TENANT_NAME}, ${TENANT_SLUG})
    ON CONFLICT (id) DO NOTHING
  `;
  console.log(`✅ Tenant: ${TENANT_ID}`);
}

// ── 2. productos_master desde productos_clasificados.json ──

async function seedProductosMaster() {
  const path = join(DATA_DIR, "productos_clasificados.json");
  if (!existsSync(path)) {
    console.log("⏭  productos_clasificados.json no encontrado");
    return;
  }
  const productos = JSON.parse(await readFile(path, "utf-8"));
  console.log(`▶  Insertando ${productos.length} productos en productos_master...`);

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < productos.length; i += BATCH) {
    const batch = productos.slice(i, i + BATCH).map((p) => ({
      codigo: String(p.codigo ?? "").trim(),
      nombre_normalizado: String(p.nombre ?? "").trim(),
      principio_activo: p.principio_activo ?? null,
      categoria_atc: p.categoria_atc ?? null,
      categoria_terapeutica: p.categoria_terapeutica ?? null,
      subcategoria: p.subcategoria ?? null,
      tipo_tratamiento: p.tipo_tratamiento ?? null,
      tratamiento: p.tratamiento ?? null,
      es_cronico: !!p.es_cronico,
      es_receta: !!p.es_receta,
      classification_source: "gemini",
      classified_at: new Date(),
    })).filter((p) => p.codigo && p.nombre_normalizado);

    if (!batch.length) continue;

    await sql`
      INSERT INTO productos_master ${sql(batch)}
      ON CONFLICT (codigo) DO UPDATE SET
        nombre_normalizado = EXCLUDED.nombre_normalizado,
        categoria_terapeutica = EXCLUDED.categoria_terapeutica,
        tratamiento = EXCLUDED.tratamiento,
        es_cronico = EXCLUDED.es_cronico,
        es_receta = EXCLUDED.es_receta,
        updated_at = now()
    `;
    inserted += batch.length;
  }
  console.log(`✅ productos_master: ${inserted} registros`);
}

// ── 3. productos_tenant (precios) desde precios_catalogo.json + ventas ──

async function seedProductosTenant() {
  const path = join(DATA_DIR, "precios_catalogo.json");
  if (!existsSync(path)) {
    console.log("⏭  precios_catalogo.json no encontrado");
    return;
  }
  const catalogo = JSON.parse(await readFile(path, "utf-8"));
  console.log(`▶  Insertando productos_tenant desde catálogo...`);

  // El formato puede ser objeto o array — adaptamos
  const entries = Array.isArray(catalogo)
    ? catalogo
    : Object.entries(catalogo).map(([codigo, v]) => ({ codigo, ...v }));

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH).map((p) => ({
      tenant_id: TENANT_ID,
      codigo: String(p.codigo ?? "").trim(),
      nombre: String(p.nombre ?? p.descripcion ?? "").trim(),
      precio_unidad: p.precio_unidad ?? p.precio ?? null,
      precio_caja: p.precio_caja ?? null,
      unidades_caja: p.unidades_caja ?? null,
    })).filter((p) => p.codigo && p.nombre);

    if (!batch.length) continue;

    await sql`
      INSERT INTO productos_tenant ${sql(batch)}
      ON CONFLICT (tenant_id, codigo) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        precio_unidad = COALESCE(EXCLUDED.precio_unidad, productos_tenant.precio_unidad),
        precio_caja = COALESCE(EXCLUDED.precio_caja, productos_tenant.precio_caja),
        updated_at = now()
    `;
    inserted += batch.length;
  }
  console.log(`✅ productos_tenant: ${inserted} registros`);
}

// ── 4. Ventas desde Excels en data/uploads/ ────────────────

async function seedVentas() {
  if (!existsSync(UPLOADS_DIR)) {
    console.log("⏭  data/uploads/ no existe");
    return;
  }
  const files = (await readdir(UPLOADS_DIR)).filter((f) => f.endsWith(".xlsx"));
  if (!files.length) {
    console.log("⏭  No hay xlsx en data/uploads/");
    return;
  }

  // Si ya hay ventas, skip (este script es solo para bootstrap inicial)
  const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM ventas WHERE tenant_id = ${TENANT_ID}`;
  if (count > 0) {
    console.log(`⏭  ventas: ya hay ${count} registros, skipping`);
    return;
  }

  // Leer manifest si existe para preservar nombres originales
  let manifest = { files: [] };
  const manifestPath = join(UPLOADS_DIR, "manifest.json");
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  }

  for (const filename of files) {
    const fp = join(UPLOADS_DIR, filename);
    const id = filename.replace(/\.xlsx$/, "");
    const manEntry = manifest.files?.find((f) => f.id === id);
    const displayName = manEntry?.name ?? filename;

    console.log(`▶  Leyendo ${displayName}...`);
    const buf = await readFile(fp);
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });

    if (!rows.length) continue;

    // Detectar columnas (sinónimos amplios para Excel reales)
    const headers = Object.keys(rows[0]);
    const cedCol = findCol(headers,
      ["CEDULA", "DOCUMENTO", "ID_CLIENTE", "IDENT_CLIENTE", "IDENTIFICACION_CLIENTE"],
      [["IDENT", "CLIENTE"], ["IDENTIFICACION", "CLIENTE"], ["DOCUMENTO"], ["CEDULA"]]);
    const nomCol = findCol(headers,
      ["CLIENTE", "NOMBRE", "NOMBRE_CLIENTE"],
      [["NOMBRE", "CLIENTE"]]);
    const telCol = findCol(headers,
      ["TELEFONO", "CELULAR", "TEL", "TELEFONO_CLIENTE"],
      [["TELEFONO"], ["CELULAR"]]);
    const fecCol = findCol(headers,
      ["FECHA", "FECHA_VENTA", "FECHA_REMISION", "FECHA_MOVIMIENTO"],
      [["FECHA", "MOVIMIENTO"], ["FECHA"]]);
    const codCol = findCol(headers,
      ["CODIGO", "COD_PROD", "ITEM", "COD_PRODUCTO", "CODIGO_PRODUCTO"],
      [["CODIGO", "PRODUCTO"], ["COD", "PRODUCTO"]]);
    const prodCol = findCol(headers,
      ["PRODUCTO", "DESCRIPCION", "NOMBRE_PROD", "NOMBRE_PRODUCTO"],
      [["NOMBRE", "PRODUCTO"], ["DESCRIPCION"]]);
    const cantCol = findCol(headers,
      ["CANTIDAD", "UNIDADES", "QTY", "CANTIDAD_UNIDAD"],
      [["CANTIDAD", "UNIDAD"], ["CANTIDAD"]]);
    const totCol = findCol(headers,
      ["TOTAL", "VALOR_TOTAL", "VENTA", "VALOR_VENTA_NETA"],
      [["VALOR", "TOTAL"], ["VALOR", "VENTA", "NETA"], ["TOTAL"]]);
    const sesCol = findCol(headers,
      ["SESION", "TICKET", "FACTURA", "REMISION", "CONSECUTIVO_MOVIMIENTO"],
      [["CONSECUTIVO"], ["FACTURA"], ["TICKET"], ["REMISION"]]);

    console.log(`   Columnas detectadas: cedula=${cedCol}, fecha=${fecCol}, producto=${prodCol}, total=${totCol}`);

    // Insertar upload row
    await sql`
      INSERT INTO uploads (id, tenant_id, filename, file_type, row_count, active, processed_at)
      VALUES (${id}, ${TENANT_ID}, ${displayName}, ${"ventas"}, ${rows.length}, true, now())
      ON CONFLICT (id) DO NOTHING
    `;

    // Mapear ventas
    const clientesSet = new Map();
    const ventasRows = [];
    for (const r of rows) {
      const cedula = parseStr(r[cedCol]);
      if (!cedula || ANONYMOUS_IDS.has(cedula)) continue;

      const fecha = parseDate(r[fecCol]);
      if (!fecha) continue;

      const codigo = parseStr(r[codCol]);
      const producto = parseStr(r[prodCol]);
      if (!codigo && !producto) continue;

      const cantidad = parseNum(r[cantCol]) || 1;
      const total = parseNum(r[totCol]);
      const sesion = parseStr(r[sesCol]) || `${cedula}_${fecha.toISOString().slice(0, 10)}`;

      ventasRows.push({
        tenant_id: TENANT_ID,
        upload_id: id,
        cedula,
        fecha,
        codigo: codigo || `SIN_CODIGO_${producto.slice(0, 20)}`,
        producto,
        cantidad,
        total,
        sesion,
      });

      if (!clientesSet.has(cedula)) {
        clientesSet.set(cedula, {
          tenant_id: TENANT_ID,
          cedula,
          nombre: parseStr(r[nomCol]) || null,
          telefono: parseStr(r[telCol]) || null,
          primera_compra: fecha,
          ultima_compra: fecha,
        });
      } else {
        const c = clientesSet.get(cedula);
        if (fecha < c.primera_compra) c.primera_compra = fecha;
        if (fecha > c.ultima_compra) c.ultima_compra = fecha;
        if (!c.telefono && r[telCol]) c.telefono = parseStr(r[telCol]);
        if (!c.nombre && r[nomCol]) c.nombre = parseStr(r[nomCol]);
      }
    }

    // Insert clientes
    const clientesArr = Array.from(clientesSet.values()).map((c) => ({
      ...c,
      primera_compra: c.primera_compra.toISOString().slice(0, 10),
      ultima_compra: c.ultima_compra.toISOString().slice(0, 10),
    }));
    if (clientesArr.length) {
      const CB = 500;
      for (let i = 0; i < clientesArr.length; i += CB) {
        await sql`
          INSERT INTO clientes ${sql(clientesArr.slice(i, i + CB))}
          ON CONFLICT (tenant_id, cedula) DO UPDATE SET
            nombre = COALESCE(EXCLUDED.nombre, clientes.nombre),
            telefono = COALESCE(EXCLUDED.telefono, clientes.telefono),
            primera_compra = LEAST(clientes.primera_compra, EXCLUDED.primera_compra),
            ultima_compra = GREATEST(clientes.ultima_compra, EXCLUDED.ultima_compra),
            updated_at = now()
        `;
      }
      console.log(`   ✅ ${clientesArr.length} clientes`);
    }

    // Insert ventas en batches
    const VB = 1000;
    let vIns = 0;
    for (let i = 0; i < ventasRows.length; i += VB) {
      const slice = ventasRows.slice(i, i + VB);
      await sql`INSERT INTO ventas ${sql(slice)}`;
      vIns += slice.length;
      if (vIns % 5000 === 0) console.log(`   ... ${vIns}/${ventasRows.length} ventas`);
    }
    console.log(`   ✅ ${vIns} ventas insertadas`);
  }
}

// ── Run ────────────────────────────────────────────────────

async function main() {
  console.log(`🌱 Seeding tenant=${TENANT_ID}...\n`);
  await ensureTenant();
  await seedProductosMaster();
  await seedProductosTenant();
  await seedVentas();
  console.log("\n✨ Seed completo");

  // Stats
  const [{ count: nProductos }] = await sql`SELECT COUNT(*)::int as count FROM productos_master`;
  const [{ count: nTenantProds }] = await sql`SELECT COUNT(*)::int as count FROM productos_tenant WHERE tenant_id = ${TENANT_ID}`;
  const [{ count: nClientes }] = await sql`SELECT COUNT(*)::int as count FROM clientes WHERE tenant_id = ${TENANT_ID}`;
  const [{ count: nVentas }] = await sql`SELECT COUNT(*)::int as count FROM ventas WHERE tenant_id = ${TENANT_ID}`;
  console.log(`\n📊 Stats:`);
  console.log(`   productos_master:  ${nProductos}`);
  console.log(`   productos_tenant:  ${nTenantProds}`);
  console.log(`   clientes:          ${nClientes}`);
  console.log(`   ventas:            ${nVentas}`);

  await sql.end();
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
