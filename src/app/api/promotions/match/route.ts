// =============================================================
// Sellix AI — Promotion Match Engine
// Recibe un producto en promoción y encuentra los clientes con
// mayor probabilidad de comprarlo, priorizando contactables.
//
// Score de probabilidad (0-100):
//   + 50  si el cliente ha comprado EXACTAMENTE ese producto antes
//   +  5  por cada compra adicional (cap 25)
//   + 30  si tiene reposición pendiente de ese producto
//   + 20  si compra productos de la MISMA categoría terapéutica
//   +  2  por cada compra de la categoría (cap 15)
//   + 15  si es cliente recurrente (no ocasional/inactivo)
//   +  5  si compra productos del mismo tratamiento
//   - 10  si es cliente inactivo
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getRecurrencia, getProductosClasificados, getReposicionesPendientes,
} from "@/lib/dataService";
import type { PromotionMatch, ReposicionPendiente } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Scoring constants (tune here, not in code) ─────────────────
const SCORE = {
  EXACT_PRODUCT_BASE: 50,
  EXACT_PRODUCT_PER_REPEAT: 5,
  EXACT_PRODUCT_REPEAT_CAP: 25,
  PENDING_REPLENISHMENT: 30,
  CATEGORY_BASE: 20,
  CATEGORY_PER_TIME: 2,
  CATEGORY_TIME_CAP: 15,
  TREATMENT_BASE: 5,
  TREATMENT_TIME_CAP: 10,
  RECURRENT_BONUS: 15,
  INACTIVE_PENALTY: -10,
  MIN_INCLUSION: 11,        // exclude clients with score ≤ 10
} as const;

const MIN_FUZZY_MATCH_LEN = 5; // require at least 5-char tokens for fuzzy match

interface MatchRequest {
  codigo?: string;
  nombre?: string;
}

function isValidRequest(body: unknown): body is MatchRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  if (b.codigo !== undefined && typeof b.codigo !== "string") return false;
  if (b.nombre !== undefined && typeof b.nombre !== "string") return false;
  return !!(b.codigo || b.nombre);
}

/**
 * Normalize a product name for fuzzy matching.
 * Returns first significant token (length >= MIN_FUZZY_MATCH_LEN).
 */
function getFuzzyToken(nombre: string): string | null {
  const tokens = nombre.toLowerCase().split(/\s+/).filter(Boolean);
  const significant = tokens.find((t) => t.length >= MIN_FUZZY_MATCH_LEN);
  return significant ?? null;
}

/**
 * Match by codigo first (exact), then by significant fuzzy token.
 * Prevents matching against trivial tokens like "10" or single letters.
 */
function productMatches(
  itemCodigo: string | undefined,
  itemNombre: string,
  searchCodigo: string | undefined,
  fuzzyToken: string | null,
): boolean {
  if (searchCodigo && itemCodigo === searchCodigo) return true;
  if (fuzzyToken && itemNombre.toLowerCase().includes(fuzzyToken)) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
    }

    if (!isValidRequest(body)) {
      return NextResponse.json(
        { error: "Falta código o nombre del producto, o tipo inválido" },
        { status: 400 },
      );
    }

    const { codigo, nombre: nombreProducto } = body;
    const fuzzyToken = nombreProducto ? getFuzzyToken(nombreProducto) : null;

    const [recurrencia, clasificados, reposicion] = await Promise.all([
      getRecurrencia(),
      getProductosClasificados(),
      getReposicionesPendientes(),
    ]);

    // Find product classification
    const producto = codigo ? clasificados.find((p) => p.codigo === codigo) : undefined;
    const categoriaPromo = producto?.categoria_terapeutica;
    const tratamientoPromo = producto?.tratamiento;

    // Index reposiciones by cedula
    const reposMap = new Map<string, ReposicionPendiente[]>();
    for (const r of reposicion) {
      if (!reposMap.has(r.cedula)) reposMap.set(r.cedula, []);
      reposMap.get(r.cedula)!.push(r);
    }

    const matches: PromotionMatch[] = [];

    for (const cli of recurrencia) {
      let score = 0;
      const razones: string[] = [];

      // Check if bought this exact product (codigo first, fuzzy fallback)
      const productoMatch = cli.top_productos.find((p) =>
        productMatches(p.codigo, p.nombre, codigo, fuzzyToken),
      );
      const vecesProducto = productoMatch?.veces || 0;
      if (vecesProducto > 0) {
        score += SCORE.EXACT_PRODUCT_BASE +
          Math.min(vecesProducto * SCORE.EXACT_PRODUCT_PER_REPEAT, SCORE.EXACT_PRODUCT_REPEAT_CAP);
        razones.push(`Compró este producto ${vecesProducto}x`);
      }

      // Check pending replenishment (codigo first, fuzzy fallback)
      const misRepos = reposMap.get(cli.cedula) || [];
      const reposicionMatch = misRepos.find((r) =>
        productMatches(r.codigo, r.producto, codigo, fuzzyToken),
      );
      if (reposicionMatch) {
        score += SCORE.PENDING_REPLENISHMENT;
        razones.push("Tiene reposición pendiente");
      }

      // Check category match
      let vecesCategoria = 0;
      if (categoriaPromo && cli.top_categorias) {
        const catMatch = cli.top_categorias.find((c) => c.categoria === categoriaPromo);
        if (catMatch) {
          vecesCategoria = catMatch.veces;
          score += SCORE.CATEGORY_BASE +
            Math.min(vecesCategoria * SCORE.CATEGORY_PER_TIME, SCORE.CATEGORY_TIME_CAP);
          razones.push(`Compra de ${categoriaPromo}`);
        }
      }

      // Check treatment match
      if (tratamientoPromo && cli.top_tratamientos) {
        const tratMatch = cli.top_tratamientos.find((t) => t.tratamiento === tratamientoPromo);
        if (tratMatch) {
          score += SCORE.TREATMENT_BASE + Math.min(tratMatch.veces, SCORE.TREATMENT_TIME_CAP);
          if (razones.length < 3) razones.push(`Tratamiento: ${tratamientoPromo}`);
        }
      }

      // Recurrent client bonus / inactive penalty
      if (cli.tipo_cliente.startsWith("recurrente_") || cli.tipo_cliente === "frecuente_multicomprador") {
        score += SCORE.RECURRENT_BONUS;
      }
      if (cli.tipo_cliente === "inactivo") score += SCORE.INACTIVE_PENALTY;

      // Only include clients with meaningful score
      if (score < SCORE.MIN_INCLUSION) continue;

      const contactable = !!cli.telefono && String(cli.telefono).trim().length >= 7;

      matches.push({
        cedula: cli.cedula,
        nombre: cli.nombre,
        telefono: cli.telefono,
        contactable,
        score: Math.min(100, Math.round(score)),
        razones,
        tipo_cliente: cli.tipo_cliente,
        ultima_compra: cli.ultima_compra,
        ingreso_total: cli.ingreso_total,
        ticket_promedio: cli.ticket_promedio,
        veces_producto: vecesProducto,
        veces_categoria: vecesCategoria,
      });
    }

    // Sort: contactables first, then by score
    matches.sort((a, b) => {
      if (a.contactable !== b.contactable) return a.contactable ? -1 : 1;
      return b.score - a.score;
    });

    const contactablesCount = matches.filter((m) => m.contactable).length;

    return NextResponse.json({
      total: matches.length,
      contactables_count: contactablesCount,
      no_contactables_count: matches.length - contactablesCount,
      categoria: categoriaPromo || null,
      tratamiento: tratamientoPromo || null,
      matches: matches.slice(0, 200),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 },
    );
  }
}
