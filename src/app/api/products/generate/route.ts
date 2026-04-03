// =============================================================
// Sellix AI — Genera catálogo de precios reales desde Excel
// Lee los archivos subidos, calcula precio promedio por producto
// y genera public/data/precios_catalogo.json
// =============================================================

import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";

const UPLOADS_DIR = join(process.cwd(), "data", "uploads");
const OUTPUT_PATH = join(process.cwd(), "public", "data", "precios_catalogo.json");

interface ManifestFile {
  id: string;
  name: string;
  active: boolean;
}

interface PriceEntry {
  codigo: string;
  nombre: string;
  precio_unidad: number;
  precio_caja: number;
  transacciones: number;
  unidades_vendidas: number;
  ingreso_total: number;
}

export async function POST() {
  try {
    // Read manifest to find uploaded files
    const manifestRaw = await readFile(join(UPLOADS_DIR, "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);

    // Find the ventas file (largest one, or the one with "Venta" in name)
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

    // Aggregate prices per product
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

      if (valorUnidad > 0) entry.precios_unidad.push(valorUnidad);
      if (valorCaja > 0) entry.precios_caja.push(valorCaja);
    }

    // Calculate average prices
    const catalog: PriceEntry[] = [];

    for (const [codigo, data] of productMap) {
      // Best price: use unit price if available, otherwise derive from total
      const avgUnidad = data.precios_unidad.length > 0
        ? Math.round(data.precios_unidad.reduce((a, b) => a + b, 0) / data.precios_unidad.length)
        : Math.round(data.ingresos / data.unidades);

      const avgCaja = data.precios_caja.length > 0
        ? Math.round(data.precios_caja.reduce((a, b) => a + b, 0) / data.precios_caja.length)
        : 0;

      catalog.push({
        codigo,
        nombre: data.nombre,
        precio_unidad: avgUnidad,
        precio_caja: avgCaja,
        transacciones: data.transacciones,
        unidades_vendidas: data.unidades,
        ingreso_total: data.ingresos,
      });
    }

    // Sort by most sold
    catalog.sort((a, b) => b.transacciones - a.transacciones);

    await writeFile(OUTPUT_PATH, JSON.stringify(catalog, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      productos: catalog.length,
      archivo: "public/data/precios_catalogo.json",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando catálogo" },
      { status: 500 }
    );
  }
}
