// =============================================================
// Sellix AI — Live conversational intelligence
//
// Body: { conversationId, customerCedula?, recentMessages: ChatMessage[] }
//
// Devuelve:
//   - sugerencia de cross-sell (basado en historial de compras real)
//   - alternativa rentable (productos similares + margen)
//   - sugerencia de urgencia ("últimas X unidades", "precio válido hoy")
//   - perfil dinámico del cliente: price_sensitivity, intent_score
//
// Cada llamada actualiza perfil_cliente_dinamico para retroalimentar
// NBA y campañas futuras.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Schema, SchemaType } from "@google/generative-ai";
import { sql, withTenant, hasDatabase, DEFAULT_TENANT_ID } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RecentMessage {
  from: "cliente" | "agente" | "sistema" | "ai";
  text: string;
}

interface RequestBody {
  conversationId: string;
  customerCedula?: string | null;
  recentMessages: RecentMessage[];
}

const INSIGHTS_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    cross_sell: {
      type: SchemaType.OBJECT,
      properties: {
        producto: { type: SchemaType.STRING },
        razon: { type: SchemaType.STRING },
        confianza: { type: SchemaType.NUMBER },
      },
      required: ["producto", "razon", "confianza"],
    },
    alternativa_rentable: {
      type: SchemaType.OBJECT,
      properties: {
        producto: { type: SchemaType.STRING },
        razon: { type: SchemaType.STRING },
      },
      required: ["producto", "razon"],
    },
    urgencia: {
      type: SchemaType.OBJECT,
      properties: {
        sugerir: { type: SchemaType.BOOLEAN },
        texto: { type: SchemaType.STRING },
      },
      required: ["sugerir", "texto"],
    },
    perfil: {
      type: SchemaType.OBJECT,
      properties: {
        price_sensitivity: {
          type: SchemaType.NUMBER,
          description: "0.00 (insensible a precio) a 1.00 (muy sensible). Si menciona precio, descuento, oferta = alto.",
        },
        intent_score: {
          type: SchemaType.NUMBER,
          description: "0.00 (solo preguntando) a 1.00 (listo para comprar). Si pregunta cómo pagar/cuándo llega = alto.",
        },
        rechaza_cross_sell: { type: SchemaType.BOOLEAN },
        responde_urgencia: { type: SchemaType.BOOLEAN },
        signals: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Bullets de señales detectadas (ej: 'pregunta por precio antes de producto', 'menciona competencia')",
        },
      },
      required: ["price_sensitivity", "intent_score", "rechaza_cross_sell", "responde_urgencia", "signals"],
    },
  },
  required: ["cross_sell", "alternativa_rentable", "urgencia", "perfil"],
};

// ── Compra histórica del cliente (para fundamentar sugerencias) ──

interface HistoricalPurchase {
  codigo: string;
  producto: string;
  veces: number;
  ultima_fecha: string;
  categoria_terapeutica: string | null;
  tratamiento: string | null;
}

async function getCustomerHistory(cedula: string): Promise<HistoricalPurchase[]> {
  const rows = await withTenant(DEFAULT_TENANT_ID, (tx) => tx<HistoricalPurchase[]>`
    SELECT
      v.codigo,
      MAX(v.producto) as producto,
      COUNT(*)::int as veces,
      MAX(v.fecha)::text as ultima_fecha,
      MAX(pm.categoria_terapeutica) as categoria_terapeutica,
      MAX(pm.tratamiento) as tratamiento
    FROM ventas v
    -- Vista de compatibilidad v3 — migrar en Fase B del PRD v4.0.
    LEFT JOIN productos_master_v3 pm ON pm.codigo = v.codigo
    LEFT JOIN uploads u ON u.id = v.upload_id
    WHERE v.tenant_id = ${DEFAULT_TENANT_ID}
      AND v.cedula = ${cedula}
      AND (u.active IS NULL OR u.active = true)
    GROUP BY v.codigo
    ORDER BY veces DESC, MAX(v.fecha) DESC
    LIMIT 10
  `);
  return rows;
}

// ── Cross-sell candidates (asociaciones reales) ─────────────

async function getCrossSellCandidates(productosComprados: string[]): Promise<string[]> {
  if (!productosComprados.length) return [];
  // Top productos co-comprados con los del historial
  const rows = await withTenant(DEFAULT_TENANT_ID, (tx) => tx<{ producto: string }[]>`
    WITH user_sesiones AS (
      SELECT DISTINCT v.sesion
      FROM ventas v
      LEFT JOIN uploads u ON u.id = v.upload_id
      WHERE v.tenant_id = ${DEFAULT_TENANT_ID}
        AND v.codigo = ANY(${productosComprados})
        AND (u.active IS NULL OR u.active = true)
      LIMIT 500
    )
    SELECT v.producto, COUNT(*)::int as veces
    FROM ventas v
    JOIN user_sesiones us ON us.sesion = v.sesion
    WHERE v.tenant_id = ${DEFAULT_TENANT_ID}
      AND NOT (v.codigo = ANY(${productosComprados}))
    GROUP BY v.producto
    ORDER BY veces DESC
    LIMIT 5
  `);
  return rows.map((r) => r.producto);
}

// ── Update perfil_cliente_dinamico ──────────────────────────

interface PerfilUpdate {
  price_sensitivity: number;
  intent_score: number;
  rechaza_cross_sell: boolean;
  responde_urgencia: boolean;
  signals: string[];
}

async function upsertPerfil(cedula: string, perfil: PerfilUpdate): Promise<void> {
  await withTenant(DEFAULT_TENANT_ID, (tx) => tx`
    INSERT INTO perfil_cliente_dinamico (
      tenant_id, cedula, price_sensitivity, intent_score,
      rechaza_cross_sell, responde_urgencia,
      ultima_conversacion, num_conversaciones, insights, updated_at
    ) VALUES (
      ${DEFAULT_TENANT_ID}, ${cedula},
      ${perfil.price_sensitivity}, ${perfil.intent_score},
      ${perfil.rechaza_cross_sell}, ${perfil.responde_urgencia},
      now(), 1,
      ${sql.json({ last_signals: perfil.signals })},
      now()
    )
    ON CONFLICT (tenant_id, cedula) DO UPDATE SET
      price_sensitivity =
        (perfil_cliente_dinamico.price_sensitivity * perfil_cliente_dinamico.num_conversaciones
         + EXCLUDED.price_sensitivity) /
        (perfil_cliente_dinamico.num_conversaciones + 1),
      intent_score = EXCLUDED.intent_score,
      rechaza_cross_sell = perfil_cliente_dinamico.rechaza_cross_sell OR EXCLUDED.rechaza_cross_sell,
      responde_urgencia = COALESCE(EXCLUDED.responde_urgencia, perfil_cliente_dinamico.responde_urgencia),
      ultima_conversacion = now(),
      num_conversaciones = perfil_cliente_dinamico.num_conversaciones + 1,
      insights = EXCLUDED.insights,
      updated_at = now()
  `);
}

// ── Handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { conversationId, customerCedula, recentMessages } = body;
  if (!conversationId || !Array.isArray(recentMessages)) {
    return NextResponse.json({ error: "conversationId + recentMessages requeridos" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
  }

  // Historial real del cliente (si tiene cedula)
  let history: HistoricalPurchase[] = [];
  let crossSellCandidates: string[] = [];
  if (hasDatabase && customerCedula) {
    history = await getCustomerHistory(customerCedula);
    if (history.length) {
      crossSellCandidates = await getCrossSellCandidates(history.map((h) => h.codigo));
    }
  }

  // Conversación reciente
  const convText = recentMessages
    .slice(-12)
    .map((m) => `${m.from === "cliente" ? "Cliente" : "Asesor"}: ${m.text}`)
    .join("\n");

  const historyText = history.length
    ? history.slice(0, 8).map((h) => `- ${h.producto} (${h.veces}x, última: ${h.ultima_fecha?.slice(0, 10)})`).join("\n")
    : "Cliente nuevo o sin historial registrado";

  const candidatesText = crossSellCandidates.length
    ? crossSellCandidates.join(", ")
    : "ninguno detectado";

  const prompt = `Eres asistente comercial de droguería en Colombia. Analiza esta conversación activa y devuelve sugerencias en tiempo real para el asesor humano.

CONVERSACIÓN (últimos mensajes):
${convText}

HISTORIAL DE COMPRAS DEL CLIENTE:
${historyText}

CANDIDATOS DE CROSS-SELL (productos que clientes similares compran juntos):
${candidatesText}

Reglas críticas:
- NO inventes precios. Si no hay info de precio, no incluyas precios.
- Cross-sell: usa SOLO productos del historial real o de candidatos. Si no hay base, indica "ninguno" en producto.
- Alternativa: sugiere si hay producto similar más rentable; si no, "ninguna".
- Urgencia: solo sugiere si la conversación muestra duda activa (cliente está pidiendo precios o comparando).
- Perfil: leer la conversación e inferir señales reales. Si cliente menciona "barato/competencia/precio" → price_sensitivity alto.
- Intent: 0.9 si pide datos de pago/envío, 0.5 si pregunta detalles, 0.2 si solo "consulta general".

Responde JSON según el schema.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: INSIGHTS_SCHEMA,
    },
  });

  let parsed;
  try {
    const result = await model.generateContent(prompt);
    parsed = JSON.parse(result.response.text().trim());
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Gemini error",
    }, { status: 502 });
  }

  // Persistir perfil si hay cedula
  if (hasDatabase && customerCedula && parsed.perfil) {
    try {
      await upsertPerfil(customerCedula, parsed.perfil);
    } catch {
      // continuar aunque persistencia falle
    }
  }

  return NextResponse.json({
    insights: parsed,
    history_count: history.length,
  });
}
