// =============================================================
// Sellix AI — Búsqueda de productos con PRECIOS REALES
// Nuestros precios: del Excel de ventas
// Competencia: búsqueda en Google via Gemini Search Grounding
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
}

interface CompetitorResult {
  farmacia: string;
  producto: string;
  precio: number;
  presentacion: string;
}

// ── Cache de precios de competencia (evita buscar lo mismo dos veces) ──
const priceCache = new Map<string, { data: CompetitorResult[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

async function searchCompetitorPrices(productName: string): Promise<CompetitorResult[]> {
  const cacheKey = productName.toLowerCase().trim();
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ googleSearch: {} } as any],
    });

    const prompt = `Busca en Google los precios actuales en pesos colombianos (COP) del medicamento "${productName}" en farmacias de Colombia: Cruz Verde, Farmatodo, La Rebaja, Olímpica. Incluye cualquier presentación que encuentres. Responde SOLO con JSON válido sin markdown ni backticks, con este formato exacto: [{"farmacia":"nombre","producto":"nombre completo","precio":numero_entero,"presentacion":"descripción"}]. Si no encuentras precio para una farmacia, omítela.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed: CompetitorResult[] = JSON.parse(text);

    // Cache the result
    priceCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
    return parsed;
  } catch {
    return [];
  }
}

function categorize(nombre: string): string {
  const n = nombre.toUpperCase();
  if (n.includes("TABLETA") || n.includes("TBS") || n.includes("TAB") || n.includes("CAPSULA")) return "Tabletas / Cápsulas";
  if (n.includes("JARABE") || n.includes("SUSPENSION") || n.includes("SOLUCION")) return "Jarabes / Soluciones";
  if (n.includes("CREMA") || n.includes("GEL") || n.includes("POMADA")) return "Cremas / Geles";
  if (n.includes("GOTAS") || n.includes("SPRAY")) return "Gotas / Sprays";
  if (n.includes("INYECT") || n.includes("AMPOLLA") || n.includes("JERINGA")) return "Inyectables";
  if (n.includes("VITAMINA") || n.includes("OMEGA") || n.includes("CALCIO")) return "Suplementos";
  if (n.includes("VENDA") || n.includes("GASA") || n.includes("GUANTE")) return "Dispositivos médicos";
  return "Medicamentos generales";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.toLowerCase() || "";
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const searchOnline = url.searchParams.get("online") !== "false";

    if (query.length < 2) {
      return NextResponse.json({ results: [], total: 0, source: "catalog" });
    }

    // 1. Search our catalog
    const raw = await readFile(CATALOG_PATH, "utf-8");
    const catalog: CatalogEntry[] = JSON.parse(raw);

    const words = query.split(/\s+/).filter(Boolean);
    const matches = catalog.filter((p) => {
      const nombre = p.nombre.toLowerCase();
      return words.every((w) => nombre.includes(w));
    });

    // Sort by most transactions (popular = relevant)
    matches.sort((a, b) => b.transacciones - a.transacciones);
    const topMatches = matches.slice(0, limit);

    // 2. Search competitor prices via Gemini (for the top product only, to save API calls)
    let competitorPrices: CompetitorResult[] = [];
    if (searchOnline && topMatches.length > 0) {
      // Use a simplified product name for better search results
      const searchName = topMatches[0].nombre
        .replace(/\b(IC|LP|MK|GF|PC|TBS|UDS|ICOM)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      competitorPrices = await searchCompetitorPrices(searchName);
    }

    // 3. Build results
    const results: ProductPrice[] = topMatches.map((p) => {
      // Match competitor prices to this product
      const prodWords = p.nombre.toLowerCase().split(/\s+/);
      const relevantComps = competitorPrices.filter((c) => {
        // Check if competitor product is similar to ours
        const compWords = c.producto.toLowerCase().split(/\s+/);
        const commonWords = prodWords.filter((w) =>
          w.length > 3 && compWords.some((cw) => cw.includes(w) || w.includes(cw))
        );
        return commonWords.length >= 2;
      });

      // Dedupe by farmacia (keep cheapest per pharmacy)
      const byFarmacia = new Map<string, CompetitorResult>();
      for (const comp of relevantComps) {
        const existing = byFarmacia.get(comp.farmacia);
        if (!existing || comp.precio < existing.precio) {
          byFarmacia.set(comp.farmacia, comp);
        }
      }

      const competidores = Array.from(byFarmacia.values())
        .filter((c) => c.precio > 0)
        .map((c) => {
          const diff = p.precio_caja > 0
            ? Math.round(((c.precio - p.precio_caja) / p.precio_caja) * 100)
            : 0;
          return {
            nombre: c.farmacia,
            precio: c.precio,
            diferencia_pct: diff,
            presentacion: c.presentacion,
            fuente: "google" as const,
          };
        })
        .sort((a, b) => a.precio - b.precio);

      const nuestroPrecio = p.precio_caja > 0 ? p.precio_caja : p.precio_unidad;
      const maxComp = competidores.length > 0 ? Math.max(...competidores.map((c) => c.precio)) : 0;
      const ahorro = maxComp > nuestroPrecio ? maxComp - nuestroPrecio : 0;

      return {
        codigo: p.codigo,
        nombre: p.nombre,
        precio_nuestro: nuestroPrecio,
        precio_unidad: p.precio_unidad,
        precio_caja: p.precio_caja,
        transacciones: p.transacciones,
        competidores,
        ahorro_max: ahorro,
        ahorro_max_pct: maxComp > 0 ? Math.round((ahorro / maxComp) * 100) : 0,
        categoria: categorize(p.nombre),
      };
    });

    return NextResponse.json({
      results,
      total: matches.length,
      source: competitorPrices.length > 0 ? "google" : "catalog",
      competitor_count: competitorPrices.length,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({
        error: "Catálogo no generado. Suba ventas y ejecute POST /api/products/generate",
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
