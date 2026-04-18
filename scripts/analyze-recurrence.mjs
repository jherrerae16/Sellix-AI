// =============================================================
// Sellix AI — Recurrence Analysis
// Cruza Excel de ventas con productos_clasificados.json
// Genera 6 tipos de cliente:
//   1. Recurrente por producto (mismo SKU repetido)
//   2. Recurrente por categoría terapéutica (rota marcas)
//   3. Recurrente por tratamiento (crónicos cruzados)
//   4. Frecuente multicomprador (alta frecuencia, productos variados)
//   5. Ocasional (compras esporádicas)
//   6. Inactivo (no compra hace >3 ciclos)
// =============================================================

import { readFile, writeFile } from "fs/promises";
import XLSX from "xlsx";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REF_DATE = new Date("2025-10-31");

const ANONIMO_ID = "222222222222";

async function main() {
  console.log("📥 Cargando archivos...");

  // Load classification
  const clasificacionArr = JSON.parse(
    await readFile(join(ROOT, "data", "output", "productos_clasificados.json"), "utf-8")
  );
  const clasificacion = {};
  for (const p of clasificacionArr) clasificacion[p.codigo] = p;
  console.log(`   Clasificación: ${clasificacionArr.length} productos`);

  // Find ventas file (largest xlsx in uploads/)
  const { readdir, stat } = await import("fs/promises");
  const files = await readdir(join(ROOT, "data", "uploads"));
  const xlsxFiles = files.filter((f) => f.endsWith(".xlsx"));
  if (xlsxFiles.length === 0) throw new Error("No xlsx files in data/uploads/");

  let ventasFileName = xlsxFiles[0];
  let maxSize = 0;
  for (const f of xlsxFiles) {
    const s = await stat(join(ROOT, "data", "uploads", f));
    if (s.size > maxSize) { maxSize = s.size; ventasFileName = f; }
  }

  const wb = XLSX.readFile(join(ROOT, "data", "uploads", ventasFileName));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`   Transacciones: ${rows.length}`);

  // Group by client
  const clientes = new Map();

  for (const row of rows) {
    const cedula = String(row["Identificación Cliente"] || "").trim();
    if (!cedula || cedula === ANONIMO_ID) continue;

    const codigo = String(row["Código Producto"] || "").trim();
    const nombre = String(row["Nombre Producto"] || "").trim();
    const valorNeta = Number(row["Valor Venta Neta"]) || 0;
    const cantCaja = Number(row["Cantidad Caja"]) || 0;
    const cantBlister = Number(row["Cantidad Blister"]) || 0;
    const cantUnidad = Number(row["Cantidad Unidad"]) || 0;
    const fechaRaw = row["Fecha Movimiento"];
    const sesion = String(row["Consecutivo Movimiento"] || "");

    if (!codigo || valorNeta <= 0) continue;

    // Parse date (Excel serial, Date, or string)
    let fecha;
    if (fechaRaw instanceof Date) {
      fecha = fechaRaw;
    } else if (typeof fechaRaw === "number") {
      // Excel serial date → JS date (Excel epoch: 1900-01-01, offset 25569 days)
      fecha = new Date((fechaRaw - 25569) * 86400 * 1000);
    } else if (typeof fechaRaw === "string") {
      fecha = new Date(fechaRaw);
    } else continue;
    if (isNaN(fecha.getTime())) continue;

    if (!clientes.has(cedula)) {
      clientes.set(cedula, {
        cedula,
        nombre: `${row["Nombre Cliente"] || ""} ${row["Apellido Cliente"] || ""}`.trim(),
        telefono: row["Teléfono Cliente"] || null,
        transacciones: [],
        productos: new Map(),
        categorias: new Map(),
        tratamientos: new Map(),
        sesiones: new Set(),
        ingreso_total: 0,
        cantidad_total: 0,
      });
    }

    const cli = clientes.get(cedula);
    const cl = clasificacion[codigo] || {};

    cli.transacciones.push({
      fecha: fecha.toISOString().split("T")[0],
      codigo,
      nombre,
      valor: valorNeta,
      sesion,
      categoria: cl.categoria_terapeutica || "Sin clasificar",
      tratamiento: cl.tratamiento || "Sin clasificar",
      principio: cl.principio_activo || "N/A",
      es_cronico: cl.es_cronico || false,
      formato: cantCaja > 0 ? "caja" : cantBlister > 0 ? "blister" : "unidad",
    });

    cli.sesiones.add(sesion);
    cli.ingreso_total += valorNeta;
    cli.cantidad_total += cantCaja + cantBlister + cantUnidad || 1;

    // Product count
    cli.productos.set(codigo, (cli.productos.get(codigo) || 0) + 1);
    // Category count
    const cat = cl.categoria_terapeutica || "Sin clasificar";
    cli.categorias.set(cat, (cli.categorias.get(cat) || 0) + 1);
    // Treatment count
    const trat = cl.tratamiento || "Sin clasificar";
    cli.tratamientos.set(trat, (cli.tratamientos.get(trat) || 0) + 1);
  }

  console.log(`   Clientes únicos: ${clientes.size}`);

  // Analyze each client
  const resultados = [];

  for (const cli of clientes.values()) {
    const fechas = cli.transacciones
      .map((t) => new Date(t.fecha))
      .sort((a, b) => a.getTime() - b.getTime());

    const numSesiones = cli.sesiones.size;
    const ultimaCompra = fechas[fechas.length - 1];
    const primeraCompra = fechas[0];
    const diasSinComprar = Math.floor((REF_DATE - ultimaCompra) / (1000 * 60 * 60 * 24));
    const diasActivos = Math.floor((ultimaCompra - primeraCompra) / (1000 * 60 * 60 * 24)) || 1;

    // Calculate intervals between purchases (by session)
    const sesionesMap = new Map();
    for (const t of cli.transacciones) {
      if (!sesionesMap.has(t.sesion)) sesionesMap.set(t.sesion, new Date(t.fecha));
    }
    const fechasSesiones = [...sesionesMap.values()].sort((a, b) => a.getTime() - b.getTime());

    const intervalos = [];
    for (let i = 1; i < fechasSesiones.length; i++) {
      const d = Math.floor((fechasSesiones[i] - fechasSesiones[i - 1]) / (1000 * 60 * 60 * 24));
      if (d > 0) intervalos.push(d);
    }
    const frecuencia_dias = intervalos.length > 0
      ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length
      : 0;

    const ticket_promedio = cli.ingreso_total / numSesiones;

    // Format preference
    const formatos = { caja: 0, blister: 0, unidad: 0 };
    for (const t of cli.transacciones) formatos[t.formato]++;
    const formato_preferido = Object.entries(formatos).sort((a, b) => b[1] - a[1])[0][0];

    // Day of month pattern
    const diasMes = fechasSesiones.map((f) => f.getDate());
    const promDiaMes = Math.round(diasMes.reduce((a, b) => a + b, 0) / diasMes.length);

    // Top products / categories / treatments
    const topProductos = [...cli.productos.entries()].sort((a, b) => b[1] - a[1]);
    const topCategorias = [...cli.categorias.entries()].sort((a, b) => b[1] - a[1]);
    const topTratamientos = [...cli.tratamientos.entries()].sort((a, b) => b[1] - a[1]);

    const productosCronicos = cli.transacciones.filter((t) => t.es_cronico);
    const tieneCronicos = productosCronicos.length > 0;

    // CLASSIFICATION
    let tipo_cliente = "ocasional";
    let razon = "";

    const maxProductoRepeticiones = topProductos[0]?.[1] || 0;
    const maxCategoriaRepeticiones = topCategorias[0]?.[1] || 0;
    const maxTratamientoRepeticiones = topTratamientos[0]?.[1] || 0;

    if (diasSinComprar > 90) {
      tipo_cliente = "inactivo";
      razon = `No compra hace ${diasSinComprar} días`;
    } else if (maxProductoRepeticiones >= 3) {
      tipo_cliente = "recurrente_producto";
      razon = `Compró ${topProductos[0][0]} ${maxProductoRepeticiones} veces`;
    } else if (maxCategoriaRepeticiones >= 3 && topCategorias[0][0] !== "Sin clasificar") {
      tipo_cliente = "recurrente_categoria";
      razon = `Rota productos pero siempre compra ${topCategorias[0][0]}`;
    } else if (tieneCronicos && maxTratamientoRepeticiones >= 2) {
      tipo_cliente = "recurrente_tratamiento";
      razon = `Compra continua para ${topTratamientos[0][0]}`;
    } else if (numSesiones >= 5 && cli.productos.size >= 5) {
      tipo_cliente = "frecuente_multicomprador";
      razon = `${numSesiones} compras, ${cli.productos.size} productos diferentes`;
    } else {
      tipo_cliente = "ocasional";
      razon = `Solo ${numSesiones} compra(s)`;
    }

    resultados.push({
      cedula: cli.cedula,
      nombre: cli.nombre,
      telefono: cli.telefono,
      tipo_cliente,
      razon,
      num_sesiones: numSesiones,
      num_productos_diferentes: cli.productos.size,
      num_categorias_diferentes: cli.categorias.size,
      num_tratamientos_diferentes: cli.tratamientos.size,
      ingreso_total: Math.round(cli.ingreso_total),
      ticket_promedio: Math.round(ticket_promedio),
      frecuencia_dias: Math.round(frecuencia_dias),
      dias_sin_comprar: diasSinComprar,
      ultima_compra: ultimaCompra.toISOString().split("T")[0],
      primera_compra: primeraCompra.toISOString().split("T")[0],
      formato_preferido,
      dia_mes_promedio: promDiaMes,
      tiene_cronicos: tieneCronicos,
      top_productos: topProductos.slice(0, 3).map(([cod, n]) => {
        const prod = cli.transacciones.find((t) => t.codigo === cod);
        return { codigo: cod, nombre: prod?.nombre || "", veces: n };
      }),
      top_categorias: topCategorias.slice(0, 3).map(([cat, n]) => ({ categoria: cat, veces: n })),
      top_tratamientos: topTratamientos.slice(0, 3).map(([t, n]) => ({ tratamiento: t, veces: n })),
    });
  }

  // Sort by ingreso_total
  resultados.sort((a, b) => b.ingreso_total - a.ingreso_total);

  // Save
  await writeFile(
    join(ROOT, "data", "output", "recurrencia_clientes.json"),
    JSON.stringify(resultados, null, 2),
    "utf-8"
  );

  // Stats
  const tipos = {};
  for (const r of resultados) tipos[r.tipo_cliente] = (tipos[r.tipo_cliente] || 0) + 1;

  console.log("\n✅ COMPLETADO");
  console.log(`   Archivo: data/output/recurrencia_clientes.json`);
  console.log(`   Total clientes: ${resultados.length}`);
  console.log(`\n📊 Segmentación:`);
  Object.entries(tipos)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => {
      const pct = Math.round((n / resultados.length) * 100);
      console.log(`   ${t.padEnd(32)} ${String(n).padStart(4)} (${pct}%)`);
    });

  const conCronicos = resultados.filter((r) => r.tiene_cronicos).length;
  console.log(`\n🔄 Con productos crónicos: ${conCronicos} (${Math.round((conCronicos / resultados.length) * 100)}%)`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
