// =============================================================
// Sellix AI — Product Bundles (3-4 productos que se compran juntos)
// Extiende la venta cruzada: no solo pares, sino combos completos
// que maximizan el ticket
// =============================================================

import { readFile, writeFile, readdir, stat } from "fs/promises";
import XLSX from "xlsx";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MIN_BUNDLE_SIZE = 3;
const MAX_BUNDLE_SIZE = 5;
const MIN_APPEARANCES = 3;

async function main() {
  console.log("📥 Cargando...");

  const clasificacionArr = JSON.parse(
    await readFile(join(ROOT, "data", "output", "productos_clasificados.json"), "utf-8")
  );
  const clasificacion = {};
  for (const p of clasificacionArr) clasificacion[p.codigo] = p;

  const catalog = JSON.parse(
    await readFile(join(ROOT, "data", "output", "precios_catalogo.json"), "utf-8")
  );
  const precios = {};
  for (const p of catalog) precios[p.codigo] = p;

  const files = await readdir(join(ROOT, "data", "uploads"));
  const xlsxFiles = files.filter((f) => f.endsWith(".xlsx"));
  let ventasFile = xlsxFiles[0];
  let maxSize = 0;
  for (const f of xlsxFiles) {
    const s = await stat(join(ROOT, "data", "uploads", f));
    if (s.size > maxSize) { maxSize = s.size; ventasFile = f; }
  }

  const wb = XLSX.readFile(join(ROOT, "data", "uploads", ventasFile));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  // Group into sessions with valores
  const sesiones = new Map();
  const productoNombre = {};

  for (const row of rows) {
    const sesion = String(row["Consecutivo Movimiento"] || "").trim();
    const codigo = String(row["Código Producto"] || "").trim();
    const nombre = String(row["Nombre Producto"] || "").trim();
    const valor = Number(row["Valor Venta Neta"]) || 0;
    if (!sesion || !codigo || valor <= 0) continue;

    productoNombre[codigo] = nombre;

    if (!sesiones.has(sesion)) sesiones.set(sesion, new Map());
    const s = sesiones.get(sesion);
    s.set(codigo, (s.get(codigo) || 0) + valor);
  }

  console.log(`   Sesiones: ${sesiones.size}`);

  // Find frequent bundles using Apriori-style approach
  // For efficiency, we use a simpler method: find frequent itemsets from multi-product sessions
  const multiProductSessions = [...sesiones.values()]
    .filter((s) => s.size >= MIN_BUNDLE_SIZE && s.size <= MAX_BUNDLE_SIZE)
    .map((s) => ({
      productos: [...s.keys()].sort(),
      valor: [...s.values()].reduce((a, b) => a + b, 0),
    }));

  console.log(`   Sesiones con ${MIN_BUNDLE_SIZE}-${MAX_BUNDLE_SIZE} productos: ${multiProductSessions.length}`);

  // Count bundle frequencies
  const bundleMap = new Map();

  for (const sess of multiProductSessions) {
    const key = sess.productos.join("||");
    if (!bundleMap.has(key)) {
      bundleMap.set(key, {
        productos: sess.productos,
        apariciones: 0,
        valor_total_suma: 0,
      });
    }
    const entry = bundleMap.get(key);
    entry.apariciones++;
    entry.valor_total_suma += sess.valor;
  }

  const bundles = [];

  for (const entry of bundleMap.values()) {
    if (entry.apariciones < MIN_APPEARANCES) continue;

    const productos = entry.productos.map((cod) => {
      const cl = clasificacion[cod];
      const pr = precios[cod];
      return {
        codigo: cod,
        nombre: productoNombre[cod] || cod,
        categoria: cl?.categoria_terapeutica || "Sin clasificar",
        tratamiento: cl?.tratamiento || "Sin clasificar",
        precio_unidad: pr?.precio_unidad || 0,
        precio_caja: pr?.precio_caja || 0,
      };
    });

    const ticket_promedio = Math.round(entry.valor_total_suma / entry.apariciones);
    const categorias = [...new Set(productos.map((p) => p.categoria))];
    const tratamientos = [...new Set(productos.map((p) => p.tratamiento))];

    bundles.push({
      productos,
      tamano: productos.length,
      apariciones: entry.apariciones,
      ticket_promedio,
      ticket_suma: Math.round(entry.valor_total_suma),
      categorias_involucradas: categorias,
      tratamientos_involucrados: tratamientos,
    });
  }

  // Sort by appearances × avg ticket (commercial impact)
  bundles.sort((a, b) => {
    const impactA = a.apariciones * a.ticket_promedio;
    const impactB = b.apariciones * b.ticket_promedio;
    return impactB - impactA;
  });

  const topBundles = bundles.slice(0, 100);

  await writeFile(
    join(ROOT, "data", "output", "bundles.json"),
    JSON.stringify(topBundles, null, 2),
    "utf-8"
  );

  console.log("\n✅ COMPLETADO");
  console.log(`   Archivo: data/output/bundles.json`);
  console.log(`   Bundles encontrados: ${bundles.length}`);
  console.log(`\n📊 Top 5 bundles (por impacto comercial):`);
  topBundles.slice(0, 5).forEach((b, i) => {
    console.log(`\n   #${i + 1} — ${b.apariciones}x · Ticket: $${b.ticket_promedio.toLocaleString("es-CO")} (${b.tamano} productos)`);
    b.productos.forEach((p) => console.log(`      • ${p.nombre.slice(0, 50)}`));
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
