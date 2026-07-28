// =============================================================
// Sellix AI — Búsqueda de productos con PRECIOS REALES
// Nuestros precios: del Excel de ventas
// Competencia: búsqueda en Google via Gemini Search Grounding
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sql, withTenant, hasDatabase, DEFAULT_TENANT_ID } from "@/lib/db";
import type { ProductPrice } from "@/lib/types";

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

    // 1. Search Postgres catalog: productos_tenant + counts from ventas
    if (!hasDatabase) {
      return NextResponse.json({ results: [], total: 0, source: "catalog" });
    }

    const words = query.split(/\s+/).filter(Boolean);
    if (!words.length) {
      return NextResponse.json({ results: [], total: 0, source: "catalog" });
    }

    // ILIKE pattern por palabra: todos los términos deben aparecer en el nombre.
    const ilikeConditions = words.map((w) => `pt.nombre ILIKE '%' || ${`'${w.replace(/'/g, "''")}'`} || '%'`).join(" AND ");
    const rawRows = await withTenant(DEFAULT_TENANT_ID, (tx) => tx<{
      codigo: string; nombre: string;
      precio_unidad: string | null; precio_caja: string | null;
      transacciones: number;
    }[]>`
      SELECT
        pt.codigo,
        pt.nombre,
        pt.precio_unidad,
        pt.precio_caja,
        COALESCE((
          SELECT COUNT(*)::int FROM ventas v
          LEFT JOIN uploads u ON u.id = v.upload_id
          WHERE v.tenant_id = pt.tenant_id
            AND v.codigo = pt.codigo
            AND (u.active IS NULL OR u.active = true)
        ), 0) AS transacciones
      FROM productos_tenant pt
      WHERE pt.tenant_id = ${DEFAULT_TENANT_ID}
        AND ${tx.unsafe(ilikeConditions)}
      ORDER BY transacciones DESC
      LIMIT ${limit * 3}
    `);

    const matches: CatalogEntry[] = rawRows.map((r) => ({
      codigo: r.codigo,
      nombre: r.nombre,
      precio_unidad: Number(r.precio_unidad) || 0,
      precio_caja: Number(r.precio_caja) || 0,
      transacciones: Number(r.transacciones) || 0,
    }));
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error buscando productos" },
      { status: 500 }
    );
  }
}
