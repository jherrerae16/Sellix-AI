// =============================================================
// Sellix AI — Búsqueda de productos + comparación de precios
// Estima precio unitario por tipo de producto y genera precios
// de competencia con markup del 10-25%
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { ProductPrice } from "@/lib/types";

const DATA_DIR = join(process.cwd(), "public", "data");

interface ProductRecord {
  nombre: string;
  codigo: string;
  categoria_gancho: string;
  ticket_promedio_en_sesion: number;
}

// ── Price estimation by product type ───────────────────────────
// Based on typical Colombian pharmacy pricing (COP)

function estimatePrice(nombre: string): number {
  const n = nombre.toUpperCase();

  // Expensive categories
  if (n.includes("TENSIOMETRO") || n.includes("GLUCOMETRO") || n.includes("NEBULIZADOR"))
    return 45000 + Math.round(Math.random() * 80000);
  if (n.includes("INSULINA") || n.includes("HUMIRA") || n.includes("ENBREL"))
    return 120000 + Math.round(Math.random() * 200000);

  // Medium-high: injectables, creams, specialized
  if (n.includes("INYECT") || n.includes("AMPOLLA") || n.includes("SOLUCION INYECTABLE"))
    return 15000 + Math.round(Math.random() * 35000);
  if (n.includes("CREMA") || n.includes("GEL") || n.includes("UNGÜENTO") || n.includes("POMADA"))
    return 12000 + Math.round(Math.random() * 28000);
  if (n.includes("JARABE") || n.includes("SUSPENSION") || n.includes("SOLUCION ORAL"))
    return 10000 + Math.round(Math.random() * 25000);
  if (n.includes("GOTAS") || n.includes("SPRAY") || n.includes("INHALADOR"))
    return 14000 + Math.round(Math.random() * 30000);

  // Supplements & vitamins
  if (n.includes("VITAMINA") || n.includes("CALCIO") || n.includes("OMEGA") || n.includes("COLAGENO"))
    return 18000 + Math.round(Math.random() * 40000);

  // Standard tablets/capsules — most common
  if (n.includes("TABLETA") || n.includes("TAB") || n.includes("CAPSULA") || n.includes("COMP"))  {
    // Parse quantity hints
    const match = n.match(/(\d+)\s*(TABLETA|TAB|CAPSULA|COMP)/i);
    const qty = match ? parseInt(match[1]) : 20;
    const basePerUnit = 400 + Math.round(Math.random() * 800);
    return Math.max(5000, basePerUnit * qty);
  }

  // Generic OTC
  if (n.includes("ACETAMINOFEN") || n.includes("IBUPROFENO") || n.includes("ASPIRINA"))
    return 3500 + Math.round(Math.random() * 6000);

  // Bandages, devices, misc
  if (n.includes("VENDA") || n.includes("GASA") || n.includes("CURITAS") || n.includes("ALCOHOL"))
    return 3000 + Math.round(Math.random() * 8000);

  // Default: mid-range pharma product
  return 8000 + Math.round(Math.random() * 25000);
}

// Use a seeded random so prices are consistent per product
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 10000) / 10000;
}

function getStablePrice(nombre: string, codigo: string): number {
  const seed = codigo + nombre;
  const r = seededRandom(seed);
  const n = nombre.toUpperCase();

  // Use category-based ranges with deterministic variation
  if (n.includes("TENSIOMETRO") || n.includes("GLUCOMETRO")) return 45000 + Math.round(r * 80000);
  if (n.includes("INSULINA")) return 120000 + Math.round(r * 200000);
  if (n.includes("INYECT") || n.includes("AMPOLLA")) return 15000 + Math.round(r * 35000);
  if (n.includes("CREMA") || n.includes("GEL") || n.includes("POMADA")) return 12000 + Math.round(r * 28000);
  if (n.includes("JARABE") || n.includes("SUSPENSION")) return 10000 + Math.round(r * 25000);
  if (n.includes("GOTAS") || n.includes("SPRAY")) return 14000 + Math.round(r * 30000);
  if (n.includes("VITAMINA") || n.includes("OMEGA") || n.includes("CALCIO")) return 18000 + Math.round(r * 40000);

  if (n.includes("TABLETA") || n.includes("TAB") || n.includes("CAPSULA") || n.includes("COMP")) {
    const match = n.match(/(\d+)\s*(TABLETA|TAB|CAPSULA|COMP)/i);
    const qty = match ? parseInt(match[1]) : 20;
    return Math.max(5000, Math.round((400 + r * 800) * qty));
  }

  if (n.includes("ACETAMINOFEN") || n.includes("IBUPROFENO")) return 3500 + Math.round(r * 6000);
  if (n.includes("VENDA") || n.includes("GASA") || n.includes("ALCOHOL")) return 3000 + Math.round(r * 8000);

  return 8000 + Math.round(r * 25000);
}

const COMPETITOR_NAMES = [
  "Droguería Cruz Verde",
  "Farmatodo",
  "Droguería Alemana",
  "La Rebaja",
];

function generateCompetitors(ourPrice: number, seed: string) {
  // Pick 2-3 competitors
  const r1 = seededRandom(seed + "c1");
  const r2 = seededRandom(seed + "c2");
  const r3 = seededRandom(seed + "c3");

  const competitors = [
    {
      nombre: COMPETITOR_NAMES[Math.floor(r1 * COMPETITOR_NAMES.length)],
      markup: 0.10 + r1 * 0.18, // 10-28% more expensive
    },
    {
      nombre: COMPETITOR_NAMES[Math.floor(r2 * COMPETITOR_NAMES.length) === Math.floor(r1 * COMPETITOR_NAMES.length)
        ? (Math.floor(r2 * COMPETITOR_NAMES.length) + 1) % COMPETITOR_NAMES.length
        : Math.floor(r2 * COMPETITOR_NAMES.length)],
      markup: 0.08 + r2 * 0.22, // 8-30% more expensive
    },
  ];

  // Occasionally add a third competitor
  if (r3 > 0.5) {
    competitors.push({
      nombre: COMPETITOR_NAMES[Math.floor(r3 * COMPETITOR_NAMES.length)],
      markup: 0.05 + r3 * 0.25,
    });
  }

  return competitors.map((c) => {
    const precio = Math.round(ourPrice * (1 + c.markup));
    // Round to nearest 100 for realism
    const precioRounded = Math.round(precio / 100) * 100;
    return {
      nombre: c.nombre,
      precio: precioRounded,
      diferencia_pct: Math.round(c.markup * 100),
    };
  });
}

function categorize(nombre: string): string {
  const n = nombre.toUpperCase();
  if (n.includes("TABLETA") || n.includes("TAB") || n.includes("CAPSULA") || n.includes("COMP")) return "Tabletas / Cápsulas";
  if (n.includes("JARABE") || n.includes("SUSPENSION")) return "Jarabes / Suspensiones";
  if (n.includes("CREMA") || n.includes("GEL") || n.includes("POMADA")) return "Cremas / Geles";
  if (n.includes("GOTAS") || n.includes("SPRAY")) return "Gotas / Sprays";
  if (n.includes("INYECT") || n.includes("AMPOLLA")) return "Inyectables";
  if (n.includes("VITAMINA") || n.includes("OMEGA")) return "Suplementos";
  if (n.includes("VENDA") || n.includes("GASA")) return "Dispositivos médicos";
  return "Medicamentos generales";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.toLowerCase() || "";
    const limit = parseInt(url.searchParams.get("limit") || "20");

    if (query.length < 2) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const raw = await readFile(join(DATA_DIR, "productos_gancho.json"), "utf-8");
    const products: ProductRecord[] = JSON.parse(raw);

    // Search by name
    const matches = products.filter((p) =>
      p.nombre.toLowerCase().includes(query)
    );

    const results: ProductPrice[] = matches.slice(0, limit).map((p) => {
      const precio = getStablePrice(p.nombre, p.codigo);
      const competidores = generateCompetitors(precio, p.codigo);
      const maxComp = Math.max(...competidores.map((c) => c.precio));

      return {
        codigo: p.codigo,
        nombre: p.nombre,
        precio_nuestro: precio,
        competidores,
        ahorro_max: maxComp - precio,
        ahorro_max_pct: Math.round(((maxComp - precio) / maxComp) * 100),
        categoria: categorize(p.nombre),
      };
    });

    // Sort by best match (shortest name that contains query = most relevant)
    results.sort((a, b) => a.nombre.length - b.nombre.length);

    return NextResponse.json({ results, total: matches.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error buscando productos" },
      { status: 500 }
    );
  }
}
