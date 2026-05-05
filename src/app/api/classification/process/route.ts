// =============================================================
// Sellix AI — Classification Worker
//
// Procesa productos pendientes en classification_queue:
//   1. Fuzzy match contra productos_master ya clasificados (gratis)
//   2. Si no hay match, batch de 30 a Gemini con structured output
//   3. Escribe resultado a productos_master + marca queue como done
//
// Idempotente, segura para correr en cron cada 5 min o manual.
// Auth: protegida con CRON_SECRET via Authorization: Bearer header.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { sql, hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// 60s permite 2 batches de 30 con margen. Cron cada 5 min limpia la cola
// gradualmente: 60 items/5min = 720/h. Suficiente para uploads normales.

const BATCH_SIZE = 30;
const MAX_BATCHES_PER_RUN = 2; // 2×30 = 60 items, ~50s para caber en maxDuration=60s
const FUZZY_MIN_LEN = 6;       // mínimo para considerar match por nombre
const RETRY_DELAY_MS = 1500;

// ── Schema (idéntico al script de bootstrap) ────────────────

const CLASSIFICATION_SCHEMA: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      codigo: { type: SchemaType.STRING },
      principio_activo: { type: SchemaType.STRING },
      categoria_atc: { type: SchemaType.STRING },
      categoria_terapeutica: { type: SchemaType.STRING },
      subcategoria: { type: SchemaType.STRING },
      tipo_tratamiento: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["cronico", "agudo", "ocasional", "preventivo", "no_aplica"],
      },
      tratamiento: { type: SchemaType.STRING },
      es_cronico: { type: SchemaType.BOOLEAN },
      es_receta: { type: SchemaType.BOOLEAN },
    },
    required: [
      "codigo", "principio_activo", "categoria_terapeutica",
      "tipo_tratamiento", "tratamiento", "es_cronico", "es_receta",
    ],
  },
};

interface QueueItem {
  id: number;
  codigo: string;
  nombre: string;
  attempts: number;
}

interface Classified {
  codigo: string;
  principio_activo: string;
  categoria_atc?: string;
  categoria_terapeutica: string;
  subcategoria?: string;
  tipo_tratamiento: string;
  tratamiento: string;
  es_cronico: boolean;
  es_receta: boolean;
}

// ── Fuzzy match local ────────────────────────────────────────

function normalize(s: string): string {
  return s.toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSignificantToken(name: string): string | null {
  const tokens = normalize(name).split(" ").filter((t) => t.length >= FUZZY_MIN_LEN);
  return tokens[0] ?? null;
}

interface MasterRow {
  codigo: string;
  nombre_normalizado: string;
  principio_activo: string | null;
  categoria_atc: string | null;
  categoria_terapeutica: string | null;
  subcategoria: string | null;
  tipo_tratamiento: string | null;
  tratamiento: string | null;
  es_cronico: boolean | null;
  es_receta: boolean | null;
}

/**
 * Busca en productos_master un producto ya clasificado cuyo nombre
 * empiece con el mismo token significativo. Si encuentra, copia
 * la clasificación. Ahorra una llamada a Gemini.
 */
async function tryFuzzyMatch(item: QueueItem): Promise<Classified | null> {
  const token = getSignificantToken(item.nombre);
  if (!token) return null;

  const matches = await sql<MasterRow[]>`
    SELECT codigo, nombre_normalizado, principio_activo, categoria_atc,
           categoria_terapeutica, subcategoria, tipo_tratamiento,
           tratamiento, es_cronico, es_receta
    FROM productos_master
    WHERE classification_source IS NOT NULL
      AND UPPER(nombre_normalizado) LIKE ${"%" + token + "%"}
    LIMIT 5
  `;

  if (!matches.length) return null;

  // Tomar el match con principio_activo más confiable
  const best = matches.find((m) => m.principio_activo && m.principio_activo !== "N/A") ?? matches[0];
  if (!best.categoria_terapeutica) return null;

  return {
    codigo: item.codigo,
    principio_activo: best.principio_activo ?? "N/A",
    categoria_atc: best.categoria_atc ?? undefined,
    categoria_terapeutica: best.categoria_terapeutica,
    subcategoria: best.subcategoria ?? undefined,
    tipo_tratamiento: best.tipo_tratamiento ?? "no_aplica",
    tratamiento: best.tratamiento ?? "",
    es_cronico: !!best.es_cronico,
    es_receta: !!best.es_receta,
  };
}

// ── Gemini batch ─────────────────────────────────────────────

async function classifyWithGemini(
  items: QueueItem[],
  attempt = 1,
): Promise<Classified[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CLASSIFICATION_SCHEMA,
    },
  });

  const prompt = `Clasifica estos productos farmacéuticos colombianos. Responde SOLO JSON según el schema.

Productos:
${items.map((p) => `- ${p.codigo}: ${p.nombre}`).join("\n")}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text) as Classified[];
    return parsed;
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return classifyWithGemini(items, attempt + 1);
    }
    throw err;
  }
}

// ── Persistir ────────────────────────────────────────────────

async function persistClassified(c: Classified, source: "fuzzy_match" | "gemini"): Promise<void> {
  await sql`
    UPDATE productos_master SET
      principio_activo = ${c.principio_activo},
      categoria_atc = ${c.categoria_atc ?? null},
      categoria_terapeutica = ${c.categoria_terapeutica},
      subcategoria = ${c.subcategoria ?? null},
      tipo_tratamiento = ${c.tipo_tratamiento},
      tratamiento = ${c.tratamiento},
      es_cronico = ${c.es_cronico},
      es_receta = ${c.es_receta},
      classification_source = ${source},
      classified_at = now(),
      updated_at = now()
    WHERE codigo = ${c.codigo}
  `;
}

async function markQueueDone(ids: number[]): Promise<void> {
  if (!ids.length) return;
  await sql`
    UPDATE classification_queue
    SET status = 'done', processed_at = now()
    WHERE id = ANY(${ids})
  `;
}

async function markQueueFailed(ids: number[], errorMsg: string): Promise<void> {
  if (!ids.length) return;
  await sql`
    UPDATE classification_queue
    SET status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'pending' END,
        attempts = attempts + 1,
        error = ${errorMsg.slice(0, 500)},
        processed_at = now()
    WHERE id = ANY(${ids})
  `;
}

// ── Auth ─────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sin secret = abierto (dev)
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// ── Handler ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!hasDatabase) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = {
    fetched: 0,
    fuzzy_matched: 0,
    gemini_classified: 0,
    failed: 0,
    batches: 0,
    duration_ms: 0,
  };
  const start = Date.now();

  try {
    for (let b = 0; b < MAX_BATCHES_PER_RUN; b++) {
      // Lock + fetch de N pendientes
      const items = await sql<QueueItem[]>`
        UPDATE classification_queue
        SET status = 'processing'
        WHERE id IN (
          SELECT id FROM classification_queue
          WHERE status = 'pending' AND attempts < 3
          ORDER BY enqueued_at
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, codigo, nombre, attempts
      `;

      if (!items.length) break;
      stats.fetched += items.length;
      stats.batches += 1;

      // 1. Fuzzy match local
      const needGemini: QueueItem[] = [];
      const fuzzyDone: number[] = [];

      for (const item of items) {
        const match = await tryFuzzyMatch(item);
        if (match) {
          await persistClassified(match, "fuzzy_match");
          fuzzyDone.push(item.id);
          stats.fuzzy_matched += 1;
        } else {
          needGemini.push(item);
        }
      }
      await markQueueDone(fuzzyDone);

      // 2. Gemini para el resto
      if (needGemini.length) {
        try {
          const classified = await classifyWithGemini(needGemini);
          const classifiedCodigos = new Set(classified.map((c) => c.codigo));
          for (const c of classified) {
            await persistClassified(c, "gemini");
          }
          const okIds = needGemini
            .filter((i) => classifiedCodigos.has(i.codigo))
            .map((i) => i.id);
          await markQueueDone(okIds);
          stats.gemini_classified += okIds.length;

          const missingIds = needGemini
            .filter((i) => !classifiedCodigos.has(i.codigo))
            .map((i) => i.id);
          if (missingIds.length) {
            await markQueueFailed(missingIds, "Gemini omitted item");
            stats.failed += missingIds.length;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Gemini error";
          await markQueueFailed(needGemini.map((i) => i.id), msg);
          stats.failed += needGemini.length;
        }
      }
    }

    stats.duration_ms = Date.now() - start;
    return NextResponse.json({ success: true, stats });
  } catch (err) {
    stats.duration_ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg, stats }, { status: 500 });
  }
}
