// =============================================================
// Sellix AI — Búsqueda de productos con PRECIOS REALES
// Lee precios del catálogo generado desde el Excel de ventas
// y genera comparación con competencia (+10-25% markup)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { ProductPrice } from "@/lib/types";

const CATALOG_PATH = join(process.cwd(), "public", "data", "precios_catalogo.json");

interface CatalogEntry {
  codigo: string;
  nombre: string;
  precio_unidad: number;
  precio_caja: number;
  transacciones: number;
  unidades_vendidas: number;
  ingreso_total: number;
}

// Deterministic random from product code (so prices don't change on each request)
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 10000) / 10000;
}

const COMPETITOR_NAMES = [
  "Droguería Cruz Verde",
  "Farmatodo",
  "Droguería Alemana",
  "La Rebaja",
];

function generateCompetitors(ourPrice: number, codigo: string) {
  const r1 = seededRandom(codigo + "c1");
  const r2 = seededRandom(codigo + "c2");
  const r3 = seededRandom(codigo + "c3");

  // Pick 2 different competitors
  const idx1 = Math.floor(r1 * COMPETITOR_NAMES.length);
  let idx2 = Math.floor(r2 * COMPETITOR_NAMES.length);
  if (idx2 === idx1) idx2 = (idx2 + 1) % COMPETITOR_NAMES.length;

  const competitors = [
    {
      nombre: COMPETITOR_NAMES[idx1],
      markup: 0.10 + r1 * 0.18, // 10-28% more expensive
    },
    {
      nombre: COMPETITOR_NAMES[idx2],
      markup: 0.08 + r2 * 0.22, // 8-30% more expensive
    },
  ];

  // 50% chance of a third competitor
  if (r3 > 0.5) {
    let idx3 = Math.floor(r3 * COMPETITOR_NAMES.length);
    if (idx3 === idx1 || idx3 === idx2) idx3 = (idx3 + 2) % COMPETITOR_NAMES.length;
    competitors.push({
      nombre: COMPETITOR_NAMES[idx3],
      markup: 0.05 + r3 * 0.25,
    });
  }

  return competitors.map((c) => {
    const precio = Math.round(ourPrice * (1 + c.markup));
    // Round to nearest 50 for realism
    const precioRounded = Math.round(precio / 50) * 50;
    return {
      nombre: c.nombre,
      precio: precioRounded,
      diferencia_pct: Math.round(c.markup * 100),
    };
  });
}

function categorize(nombre: string): string {
  const n = nombre.toUpperCase();
  if (n.includes("TABLETA") || n.includes("TBS") || n.includes("TAB") || n.includes("CAPSULA") || n.includes("COMP")) return "Tabletas / Cápsulas";
  if (n.includes("JARABE") || n.includes("SUSPENSION") || n.includes("SOLUCION")) return "Jarabes / Soluciones";
  if (n.includes("CREMA") || n.includes("GEL") || n.includes("POMADA") || n.includes("UNGÜENTO")) return "Cremas / Geles";
  if (n.includes("GOTAS") || n.includes("SPRAY") || n.includes("INHALADOR")) return "Gotas / Sprays";
  if (n.includes("INYECT") || n.includes("AMPOLLA") || n.includes("JERINGA")) return "Inyectables";
  if (n.includes("VITAMINA") || n.includes("OMEGA") || n.includes("CALCIO") || n.includes("COLAGENO")) return "Suplementos";
  if (n.includes("VENDA") || n.includes("GASA") || n.includes("GUANTE") || n.includes("TAPABOCA")) return "Dispositivos médicos";
  if (n.includes("SHAMPO") || n.includes("JABON") || n.includes("BLOQUEADOR")) return "Cuidado personal";
  return "Medicamentos generales";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.toLowerCase() || "";
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const priceType = url.searchParams.get("tipo") || "unidad"; // "unidad" or "caja"

    if (query.length < 2) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const raw = await readFile(CATALOG_PATH, "utf-8");
    const catalog: CatalogEntry[] = JSON.parse(raw);

    // Search by name (support multiple words)
    const words = query.split(/\s+/).filter(Boolean);
    const matches = catalog.filter((p) => {
      const nombre = p.nombre.toLowerCase();
      return words.every((w) => nombre.includes(w));
    });

    const results: ProductPrice[] = matches.slice(0, limit).map((p) => {
      // Use the requested price type
      const nuestroPrecio = priceType === "caja" && p.precio_caja > 0
        ? p.precio_caja
        : p.precio_unidad;

      const competidores = generateCompetitors(nuestroPrecio, p.codigo);
      const maxComp = Math.max(...competidores.map((c) => c.precio));

      return {
        codigo: p.codigo,
        nombre: p.nombre,
        precio_nuestro: nuestroPrecio,
        competidores,
        ahorro_max: maxComp - nuestroPrecio,
        ahorro_max_pct: maxComp > 0 ? Math.round(((maxComp - nuestroPrecio) / maxComp) * 100) : 0,
        categoria: categorize(p.nombre),
        // Extra real data
        precio_unidad: p.precio_unidad,
        precio_caja: p.precio_caja,
        transacciones: p.transacciones,
      };
    });

    // Sort: most transactions first (popular products = more relevant)
    results.sort((a, b) => ((b as unknown as Record<string, number>).transacciones || 0) - ((a as unknown as Record<string, number>).transacciones || 0));

    return NextResponse.json({ results, total: matches.length });
  } catch (err) {
    // If catalog doesn't exist, hint to generate it
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({
        error: "Catálogo de precios no generado. Suba un archivo de ventas y ejecute POST /api/products/generate",
        results: [],
        total: 0,
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error buscando productos" },
      { status: 500 }
    );
  }
}
