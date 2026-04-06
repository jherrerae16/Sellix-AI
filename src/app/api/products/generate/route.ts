// =============================================================
// Sellix AI — Genera catálogo de precios reales desde Excel
// Usa MEDIANA (no promedio) para evitar outliers
// =============================================================

import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";

const UPLOADS_DIR = join(process.cwd(), "data", "uploads");
const OUTPUT_PATH = join(process.cwd(), "data", "output", "precios_catalogo.json");

interface ManifestFile { id: string; name: string; active: boolean; }

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function mostFrequent(arr: number[]): number {
  if (arr.length === 0) return 0;
  const freq = new Map<number, number>();
  for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
  let maxCount = 0, maxVal = arr[0];
  for (const [val, count] of freq) {
    if (count > maxCount) { maxCount = count; maxVal = val; }
  }
  return maxVal;
}

export async function POST() {
  try {
    const manifestRaw = await readFile(join(UPLOADS_DIR, "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    const ventasFile = manifest.files.find(
      (f: ManifestFile) => f.name.toLowerCase().includes("venta")
    );

    if (!ventasFile) {
      return NextResponse.json({ error: "No se encontró archivo de ventas" }, { status: 404 });
    }

    const filePath = join(UPLOADS_DIR, `${ventasFile.id}.xlsx`);
    const fileBuffer = await readFile(filePath);
    const wb = XLSX.read(fileBuffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    const productMap = new Map<string, {
      nombre: string;
      precios_unidad: number[];
      precios_caja: number[];
      transacciones: number;
      unidades: number;
      ingresos: number;
    }>();

    for (const row of rows) {
      const codigo = String(row["Código Producto"] || "").trim();
      const nombre = String(row["Nombre Producto"] || "").trim();
      const valorNeta = Number(row["Valor Venta Neta"]) || 0;
      const valorUnidad = Number(row["Valor Unidad"]) || 0;
      const valorCaja = Number(row["Valor Caja"]) || 0;
      const cantCaja = Number(row["Cantidad Caja"]) || 0;
      const cantBlister = Number(row["Cantidad Blister"]) || 0;
      const cantUnidad = Number(row["Cantidad Unidad"]) || 0;

      if (!codigo || !nombre || valorNeta <= 0) continue;

      const totalUnits = cantCaja + cantBlister + cantUnidad;

      if (!productMap.has(codigo)) {
        productMap.set(codigo, {
          nombre,
          precios_unidad: [],
          precios_caja: [],
          transacciones: 0,
          unidades: 0,
          ingresos: 0,
        });
      }

      const entry = productMap.get(codigo)!;
      entry.transacciones++;
      entry.unidades += totalUnits || 1;
      entry.ingresos += valorNeta;

      // Only add non-zero prices
      if (valorUnidad > 0) entry.precios_unidad.push(valorUnidad);
      if (valorCaja > 0) entry.precios_caja.push(valorCaja);
    }

    interface CatalogEntry {
      codigo: string;
      nombre: string;
      precio_unidad: number;
      precio_caja: number;
      precio_unidad_frecuente: number;
      precio_caja_frecuente: number;
      transacciones: number;
      unidades_vendidas: number;
      ingreso_total: number;
    }

    const catalog: CatalogEntry[] = [];

    for (const [codigo, data] of productMap) {
      // Use MEDIAN to avoid outliers (not average)
      const medUnidad = median(data.precios_unidad);
      const medCaja = median(data.precios_caja);

      // Also store most frequent price (mode)
      const freqUnidad = mostFrequent(data.precios_unidad);
      const freqCaja = mostFrequent(data.precios_caja);

      catalog.push({
        codigo,
        nombre: data.nombre,
        precio_unidad: medUnidad || Math.round(data.ingresos / Math.max(data.unidades, 1)),
        precio_caja: medCaja,
        precio_unidad_frecuente: freqUnidad,
        precio_caja_frecuente: freqCaja,
        transacciones: data.transacciones,
        unidades_vendidas: data.unidades,
        ingreso_total: data.ingresos,
      });
    }

    catalog.sort((a, b) => b.transacciones - a.transacciones);
    await writeFile(OUTPUT_PATH, JSON.stringify(catalog, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      productos: catalog.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando catálogo" },
      { status: 500 }
    );
  }
}
