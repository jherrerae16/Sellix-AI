// =============================================================
// Sellix AI — Enhanced Churn Analysis
// Segmentaciones:
//   - churn_total: dejó de comprar todo
//   - churn_tratamiento: abandonó un tratamiento específico
//   - churn_cronico: discontinuidad en productos crónicos (grave)
//   - downgrade: bajó ticket o frecuencia pero sigue activo
//   - alto_valor_inactivo: era VIP y bajó mucho
// =============================================================

import { readFile, writeFile, readdir, stat } from "fs/promises";
import XLSX from "xlsx";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REF_DATE = new Date("2025-10-31");
const ANONIMO_ID = "222222222222";

async function main() {
  console.log("📥 Cargando...");

  const clasificacionArr = JSON.parse(
    await readFile(join(ROOT, "data", "output", "productos_clasificados.json"), "utf-8")
  );
  const clasificacion = {};
  for (const p of clasificacionArr) clasificacion[p.codigo] = p;

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

  // Group by client — track tratamientos with history of purchases
  const clientes = new Map();

  for (const row of rows) {
    const cedula = String(row["Identificación Cliente"] || "").trim();
    if (!cedula || cedula === ANONIMO_ID) continue;

    const codigo = String(row["Código Producto"] || "").trim();
    const valorNeta = Number(row["Valor Venta Neta"]) || 0;
    const fechaRaw = row["Fecha Movimiento"];

    let fecha;
    if (fechaRaw instanceof Date) fecha = fechaRaw;
    else if (typeof fechaRaw === "number") fecha = new Date((fechaRaw - 25569) * 86400 * 1000);
    else if (typeof fechaRaw === "string") fecha = new Date(fechaRaw);
    else continue;
    if (isNaN(fecha.getTime()) || !codigo || valorNeta <= 0) continue;

    if (!clientes.has(cedula)) {
      clientes.set(cedula, {
        cedula,
        nombre: `${row["Nombre Cliente"] || ""} ${row["Apellido Cliente"] || ""}`.trim(),
        telefono: row["Teléfono Cliente"] || null,
        compras: [],
        tratamientos: new Map(), // tratamiento → [{fecha, valor}, ...]
        ingreso_total: 0,
      });
    }

    const cli = clientes.get(cedula);
    const cl = clasificacion[codigo] || {};
    const trat = cl.tratamiento || "Sin clasificar";

    const entry = { fecha, codigo, valor: valorNeta, es_cronico: cl.es_cronico || false };
    cli.compras.push(entry);
    cli.ingreso_total += valorNeta;

    if (!cli.tratamientos.has(trat)) cli.tratamientos.set(trat, []);
    cli.tratamientos.get(trat).push(entry);
  }

  console.log(`   Clientes: ${clientes.size}`);

  const resultados = [];
  const abandonosPorTratamiento = new Map();
  const abandonosPorProducto = new Map();

  for (const cli of clientes.values()) {
    const fechas = cli.compras.map((c) => c.fecha).sort((a, b) => a - b);
    const ultimaCompra = fechas[fechas.length - 1];
    const primeraCompra = fechas[0];
    const diasSinComprar = Math.floor((REF_DATE - ultimaCompra) / (1000 * 60 * 60 * 24));
    const totalCompras = fechas.length;

    // Calculate avg frequency
    const intervalos = [];
    for (let i = 1; i < fechas.length; i++) {
      const d = Math.floor((fechas[i] - fechas[i - 1]) / (1000 * 60 * 60 * 24));
      if (d > 0) intervalos.push(d);
    }
    const frecuencia_dias = intervalos.length > 0
      ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length
      : 0;

    const churn_ratio = frecuencia_dias > 0 ? diasSinComprar / frecuencia_dias : 0;

    // Split history in halves to detect downgrade
    const mid = Math.floor(cli.compras.length / 2);
    const primera_mitad = cli.compras.slice(0, mid);
    const segunda_mitad = cli.compras.slice(mid);
    const ticket_antes = primera_mitad.length > 0
      ? primera_mitad.reduce((s, c) => s + c.valor, 0) / primera_mitad.length
      : 0;
    const ticket_despues = segunda_mitad.length > 0
      ? segunda_mitad.reduce((s, c) => s + c.valor, 0) / segunda_mitad.length
      : 0;
    const ticket_cambio_pct = ticket_antes > 0
      ? Math.round(((ticket_despues - ticket_antes) / ticket_antes) * 100)
      : 0;

    // Analyze treatment abandonment
    const tratamientos_abandonados = [];
    const tratamientos_activos = [];
    for (const [trat, compras] of cli.tratamientos) {
      if (trat === "Sin clasificar") continue;
      const compras_sorted = compras.sort((a, b) => a.fecha - b.fecha);
      const ultima_trat = compras_sorted[compras_sorted.length - 1].fecha;
      const dias_sin_trat = Math.floor((REF_DATE - ultima_trat) / (1000 * 60 * 60 * 24));
      const tiene_cronico = compras_sorted.some((c) => c.es_cronico);

      // Calculate treatment-specific frequency
      const trat_intervals = [];
      for (let i = 1; i < compras_sorted.length; i++) {
        const d = Math.floor((compras_sorted[i].fecha - compras_sorted[i - 1].fecha) / (1000 * 60 * 60 * 24));
        if (d > 0) trat_intervals.push(d);
      }
      const freq_trat = trat_intervals.length > 0
        ? trat_intervals.reduce((a, b) => a + b, 0) / trat_intervals.length
        : 30;

      const abandonado = compras_sorted.length >= 2 && dias_sin_trat > freq_trat * 2;

      if (abandonado) {
        tratamientos_abandonados.push({
          tratamiento: trat,
          es_cronico: tiene_cronico,
          dias_sin_comprar: dias_sin_trat,
          compras_totales: compras_sorted.length,
        });
        abandonosPorTratamiento.set(trat, (abandonosPorTratamiento.get(trat) || 0) + 1);

        // Track abandoned chronic products
        if (tiene_cronico) {
          for (const c of compras_sorted) {
            if (c.es_cronico) {
              abandonosPorProducto.set(c.codigo, (abandonosPorProducto.get(c.codigo) || 0) + 1);
            }
          }
        }
      } else {
        tratamientos_activos.push(trat);
      }
    }

    const tiene_churn_cronico = tratamientos_abandonados.some((t) => t.es_cronico);
    const tratamientos_en_riesgo = tratamientos_abandonados.length;

    // CLASSIFICATION
    let tipo_churn = "activo";
    let riesgo = "bajo";
    let razon = "";

    if (churn_ratio >= 3 || diasSinComprar > 180) {
      tipo_churn = "churn_total";
      riesgo = "alto";
      razon = `No compra hace ${diasSinComprar} días (${(churn_ratio).toFixed(1)}x su frecuencia)`;
    } else if (tiene_churn_cronico) {
      tipo_churn = "churn_cronico";
      riesgo = "alto";
      razon = `Abandonó ${tratamientos_abandonados.filter((t) => t.es_cronico).length} tratamiento(s) crónico(s)`;
    } else if (tratamientos_en_riesgo >= 2) {
      tipo_churn = "churn_tratamiento";
      riesgo = "medio";
      razon = `Abandonó ${tratamientos_en_riesgo} tratamientos`;
    } else if (churn_ratio >= 1.5) {
      tipo_churn = "churn_riesgo";
      riesgo = "medio";
      razon = `Se acerca al abandono (${(churn_ratio).toFixed(1)}x frecuencia habitual)`;
    } else if (ticket_cambio_pct < -30 && totalCompras >= 3) {
      tipo_churn = "downgrade";
      riesgo = "medio";
      razon = `Ticket bajó ${Math.abs(ticket_cambio_pct)}%`;
    } else if (cli.ingreso_total > 500000 && diasSinComprar > 60) {
      tipo_churn = "alto_valor_inactivo";
      riesgo = "alto";
      razon = `Cliente alto valor sin actividad reciente`;
    } else {
      tipo_churn = "activo";
      riesgo = "bajo";
      razon = "Cliente regular";
    }

    resultados.push({
      cedula: cli.cedula,
      nombre: cli.nombre,
      telefono: cli.telefono,
      tipo_churn,
      nivel_riesgo: riesgo,
      razon,
      dias_sin_comprar: diasSinComprar,
      frecuencia_dias: Math.round(frecuencia_dias),
      churn_ratio: Math.round(churn_ratio * 100) / 100,
      total_compras: totalCompras,
      ingreso_total: Math.round(cli.ingreso_total),
      ticket_cambio_pct,
      ultima_compra: ultimaCompra.toISOString().split("T")[0],
      tratamientos_abandonados,
      tratamientos_activos,
      tiene_churn_cronico,
    });
  }

  resultados.sort((a, b) => b.ingreso_total - a.ingreso_total);

  await writeFile(
    join(ROOT, "data", "output", "churn_v2.json"),
    JSON.stringify(resultados, null, 2),
    "utf-8"
  );

  // Top abandoned treatments
  const topAbandonos = [...abandonosPorTratamiento.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const resumen = {
    total_clientes: resultados.length,
    por_tipo: {},
    por_riesgo: {},
    top_tratamientos_abandonados: topAbandonos.map(([t, n]) => ({ tratamiento: t, clientes: n })),
  };

  for (const r of resultados) {
    resumen.por_tipo[r.tipo_churn] = (resumen.por_tipo[r.tipo_churn] || 0) + 1;
    resumen.por_riesgo[r.nivel_riesgo] = (resumen.por_riesgo[r.nivel_riesgo] || 0) + 1;
  }

  await writeFile(
    join(ROOT, "data", "output", "churn_resumen.json"),
    JSON.stringify(resumen, null, 2),
    "utf-8"
  );

  console.log("\n✅ COMPLETADO");
  console.log(`   Archivo: data/output/churn_v2.json`);
  console.log(`\n📊 Por tipo de churn:`);
  Object.entries(resumen.por_tipo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => console.log(`   ${t.padEnd(28)} ${String(n).padStart(4)} (${Math.round(n/resultados.length*100)}%)`));
  console.log(`\n📊 Por riesgo:`);
  Object.entries(resumen.por_riesgo).forEach(([r, n]) => console.log(`   ${r.padEnd(10)} ${n}`));
  console.log(`\n🏥 Top tratamientos abandonados:`);
  topAbandonos.slice(0, 5).forEach(([t, n]) => console.log(`   ${t.slice(0, 40).padEnd(40)} ${n} clientes`));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
