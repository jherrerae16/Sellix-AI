// =============================================================
// Sellix AI — Enhanced Cross-Sell Analysis
// 3 niveles de asociación:
//   1. Por producto (SKU + SKU)
//   2. Por categoría terapéutica
//   3. Por tratamiento (cruzado)
// =============================================================

import { readFile, writeFile, readdir, stat } from "fs/promises";
import XLSX from "xlsx";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MIN_VECES_JUNTOS = 3;
const MIN_LIFT = 1.5;

async function main() {
  console.log("📥 Cargando datos...");

  // Load classification
  const clasificacionArr = JSON.parse(
    await readFile(join(ROOT, "data", "output", "productos_clasificados.json"), "utf-8")
  );
  const clasificacion = {};
  for (const p of clasificacionArr) clasificacion[p.codigo] = p;

  // Find ventas file
  const files = await readdir(join(ROOT, "data", "uploads"));
  const xlsxFiles = files.filter((f) => f.endsWith(".xlsx"));
  let ventasFileName = xlsxFiles[0];
  let maxSize = 0;
  for (const f of xlsxFiles) {
    const s = await stat(join(ROOT, "data", "uploads", f));
    if (s.size > maxSize) { maxSize = s.size; ventasFileName = f; }
  }

  const wb = XLSX.readFile(join(ROOT, "data", "uploads", ventasFileName));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  // Group products by session
  const sesiones = new Map(); // sesionId → Set of product codes
  const sesionesCat = new Map(); // sesionId → Set of categories
  const sesionesTrat = new Map(); // sesionId → Set of treatments

  for (const row of rows) {
    const sesion = String(row["Consecutivo Movimiento"] || "").trim();
    const codigo = String(row["Código Producto"] || "").trim();
    const valorNeta = Number(row["Valor Venta Neta"]) || 0;
    if (!sesion || !codigo || valorNeta <= 0) continue;

    const cl = clasificacion[codigo];
    const cat = cl?.categoria_terapeutica || "Sin clasificar";
    const trat = cl?.tratamiento || "Sin clasificar";

    if (!sesiones.has(sesion)) sesiones.set(sesion, new Set());
    if (!sesionesCat.has(sesion)) sesionesCat.set(sesion, new Set());
    if (!sesionesTrat.has(sesion)) sesionesTrat.set(sesion, new Set());

    sesiones.get(sesion).add(codigo);
    if (cat !== "Sin clasificar") sesionesCat.get(sesion).add(cat);
    if (trat !== "Sin clasificar") sesionesTrat.get(sesion).add(trat);
  }

  const totalSesiones = sesiones.size;
  console.log(`   Sesiones de venta: ${totalSesiones}`);

  // ── Association analysis helper ─────────────────────────────
  function analyzeAssociations(sesionesMap, itemNameFn = (x) => x) {
    const itemCount = new Map(); // item → count of sessions containing it
    const pairCount = new Map(); // "A||B" → count of sessions with both

    for (const items of sesionesMap.values()) {
      const arr = [...items];
      for (const item of arr) {
        itemCount.set(item, (itemCount.get(item) || 0) + 1);
      }
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const [a, b] = [arr[i], arr[j]].sort();
          const key = `${a}||${b}`;
          pairCount.set(key, (pairCount.get(key) || 0) + 1);
        }
      }
    }

    const pairs = [];
    for (const [key, veces_juntos] of pairCount) {
      if (veces_juntos < MIN_VECES_JUNTOS) continue;
      const [a, b] = key.split("||");
      const countA = itemCount.get(a);
      const countB = itemCount.get(b);
      const support = veces_juntos / totalSesiones;
      const confianzaAB = veces_juntos / countA;
      const confianzaBA = veces_juntos / countB;
      const expected = (countA / totalSesiones) * (countB / totalSesiones);
      const lift = expected > 0 ? support / expected : 0;

      if (lift < MIN_LIFT) continue;

      pairs.push({
        item_a: itemNameFn(a),
        item_b: itemNameFn(b),
        veces_juntos,
        count_a: countA,
        count_b: countB,
        support: Math.round(support * 10000) / 10000,
        confianza_ab: Math.round(confianzaAB * 100) / 100,
        confianza_ba: Math.round(confianzaBA * 100) / 100,
        lift: Math.round(lift * 100) / 100,
      });
    }

    pairs.sort((a, b) => b.lift - a.lift);
    return pairs;
  }

  // 1. Product-level (with readable names)
  const productoNombre = {};
  for (const row of rows) {
    const codigo = String(row["Código Producto"] || "").trim();
    const nombre = String(row["Nombre Producto"] || "").trim();
    if (codigo && nombre && !productoNombre[codigo]) productoNombre[codigo] = nombre;
  }

  console.log("🔍 Analizando asociaciones por producto...");
  const porProducto = analyzeAssociations(sesiones, (cod) => ({
    codigo: cod,
    nombre: productoNombre[cod] || cod,
    categoria: clasificacion[cod]?.categoria_terapeutica || "Sin clasificar",
    tratamiento: clasificacion[cod]?.tratamiento || "Sin clasificar",
  }));
  console.log(`   Pares encontrados: ${porProducto.length}`);

  console.log("🔍 Analizando asociaciones por categoría...");
  const porCategoria = analyzeAssociations(sesionesCat);
  console.log(`   Pares encontrados: ${porCategoria.length}`);

  console.log("🔍 Analizando asociaciones por tratamiento...");
  const porTratamiento = analyzeAssociations(sesionesTrat);
  console.log(`   Pares encontrados: ${porTratamiento.length}`);

  // Save combined file
  const result = {
    total_sesiones: totalSesiones,
    por_producto: porProducto.slice(0, 300),
    por_categoria: porCategoria.slice(0, 100),
    por_tratamiento: porTratamiento.slice(0, 100),
  };

  await writeFile(
    join(ROOT, "data", "output", "ventas_cruzadas_v2.json"),
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log("\n✅ COMPLETADO");
  console.log(`   Archivo: data/output/ventas_cruzadas_v2.json`);
  console.log(`\n📊 Top asociaciones:`);
  console.log(`\n   Por producto (top 5):`);
  porProducto.slice(0, 5).forEach((p) => {
    console.log(`     ${p.item_a.nombre.slice(0,35).padEnd(35)} + ${p.item_b.nombre.slice(0,35).padEnd(35)} Lift: ${p.lift}`);
  });
  console.log(`\n   Por categoría (top 5):`);
  porCategoria.slice(0, 5).forEach((p) => {
    console.log(`     ${p.item_a.padEnd(30)} + ${p.item_b.padEnd(30)} Lift: ${p.lift} (${p.veces_juntos}x)`);
  });
  console.log(`\n   Por tratamiento (top 5):`);
  porTratamiento.slice(0, 5).forEach((p) => {
    console.log(`     ${p.item_a.padEnd(30)} + ${p.item_b.padEnd(30)} Lift: ${p.lift} (${p.veces_juntos}x)`);
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
