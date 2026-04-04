// =============================================================
// Sellix AI — Copilot API
// Recibe mensaje en lenguaje natural, usa Gemini (gratis) para
// interpretar la intención, ejecuta funciones del sistema
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "output");

async function loadJSON<T>(filename: string): Promise<T> {
  const raw = await readFile(join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

// ── Tool definitions for Gemini ────────────────────────────────

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_churn_clients",
    description: "Obtener clientes con riesgo de abandono (churn). Puede filtrar por nivel de riesgo: Alto, Medio, Bajo. Devuelve nombre, cédula, días sin comprar, score y nivel de riesgo.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        nivel_riesgo: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["Alto", "Medio", "Bajo", "Todos"],
          description: "Filtrar por nivel de riesgo. Por defecto Todos.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Máximo de resultados. Por defecto 10.",
        },
      },
    },
  },
  {
    name: "get_reposiciones",
    description: "Obtener reposiciones pendientes de medicamentos. Puede filtrar por estado: Vencido, Esta semana, Próximo mes. Devuelve cliente, producto, estado y días para reposición.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        estado: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["Vencido", "Esta semana", "Próximo mes", "Todos"],
          description: "Filtrar por estado. Por defecto Todos.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Máximo de resultados. Por defecto 10.",
        },
      },
    },
  },
  {
    name: "get_vip_clients",
    description: "Obtener clientes segmentados por RFM. Segmentos: VIP, Leal, En desarrollo, En riesgo. Incluye CLV estimado anual y scores RFM.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        segmento: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["VIP", "Leal", "En desarrollo", "En riesgo", "Todos"],
          description: "Filtrar por segmento. Por defecto Todos.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Máximo de resultados. Por defecto 10.",
        },
      },
    },
  },
  {
    name: "get_cross_sell",
    description: "Obtener oportunidades de venta cruzada. Pares de productos que se compran juntos con métricas de lift y confianza. Puede buscar por nombre de producto.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        producto: {
          type: SchemaType.STRING,
          description: "Buscar recomendaciones para este producto.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Máximo de resultados. Por defecto 10.",
        },
      },
    },
  },
  {
    name: "get_kpis",
    description: "Obtener los KPIs del resumen ejecutivo: total transacciones, clientes únicos, ingresos totales, ticket promedio, clientes en riesgo alto, oportunidades de venta cruzada.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_campaign_preview",
    description: "Generar instrucciones para enviar una campaña a clientes. Útil cuando el usuario quiere enviar mensajes de WhatsApp o email.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tipo: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["churn", "reposicion"],
          description: "Tipo de campaña.",
        },
      },
      required: ["tipo"],
    },
  },
];

// ── Tool execution ─────────────────────────────────────────────

interface ChurnRecord { cedula: string; nombre: string; telefono: string | null; nivel_riesgo: string; dias_sin_comprar: number; churn_score: number; accion_sugerida: string; }
interface RepoRecord { cedula: string; nombre: string; producto: string; estado: string; dias_para_reposicion: number; proxima_reposicion: string; }
interface RFMRecord { cedula: string; nombre: string; segmento: string; clv_estimado_anual: number; score_r: number; score_f: number; score_m: number; }
interface CruzadaRecord { producto_base: string; producto_recomendado: string; lift: number; confianza: number; incremento_ticket_estimado: number; veces_juntos: number; }
interface KPIRecord { total_transacciones: number; clientes_unicos: number; ingresos_totales: number; ticket_promedio: number; clientes_en_riesgo_alto: number; oportunidades_cruzada: number; periodo: string; }

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_churn_clients": {
      const data = await loadJSON<ChurnRecord[]>("churn_clientes.json");
      let filtered = data;
      if (args.nivel_riesgo && args.nivel_riesgo !== "Todos") {
        filtered = data.filter((c) => c.nivel_riesgo === args.nivel_riesgo);
      }
      filtered.sort((a, b) => b.churn_score - a.churn_score);
      const limit = (args.limit as number) || 10;
      return {
        total: filtered.length,
        clientes: filtered.slice(0, limit).map((c) => ({
          nombre: c.nombre,
          cedula: c.cedula,
          dias_sin_comprar: c.dias_sin_comprar,
          churn_score: Math.round(c.churn_score * 100) / 100,
          nivel_riesgo: c.nivel_riesgo,
          accion: c.accion_sugerida,
        })),
      };
    }
    case "get_reposiciones": {
      const data = await loadJSON<RepoRecord[]>("reposicion_pendiente.json");
      let filtered = data;
      if (args.estado && args.estado !== "Todos") {
        filtered = data.filter((r) => r.estado === args.estado);
      }
      filtered.sort((a, b) => a.dias_para_reposicion - b.dias_para_reposicion);
      const limit = (args.limit as number) || 10;
      return {
        total: filtered.length,
        reposiciones: filtered.slice(0, limit).map((r) => ({
          nombre: r.nombre,
          producto: r.producto,
          estado: r.estado,
          dias: r.dias_para_reposicion,
          proxima: r.proxima_reposicion,
        })),
      };
    }
    case "get_vip_clients": {
      const data = await loadJSON<RFMRecord[]>("clientes_rfm.json");
      let filtered = data;
      if (args.segmento && args.segmento !== "Todos") {
        filtered = data.filter((c) => c.segmento === args.segmento);
      }
      filtered.sort((a, b) => b.clv_estimado_anual - a.clv_estimado_anual);
      const limit = (args.limit as number) || 10;
      return {
        total: filtered.length,
        clientes: filtered.slice(0, limit).map((c) => ({
          nombre: c.nombre,
          segmento: c.segmento,
          clv_anual: c.clv_estimado_anual,
          rfm: `R${c.score_r} F${c.score_f} M${c.score_m}`,
        })),
      };
    }
    case "get_cross_sell": {
      const data = await loadJSON<CruzadaRecord[]>("ventas_cruzadas.json");
      let filtered = data;
      if (args.producto) {
        const q = (args.producto as string).toLowerCase();
        filtered = data.filter((c) => c.producto_base.toLowerCase().includes(q));
      }
      filtered.sort((a, b) => b.lift - a.lift);
      const limit = (args.limit as number) || 10;
      return {
        total: filtered.length,
        pares: filtered.slice(0, limit).map((c) => ({
          base: c.producto_base,
          recomendado: c.producto_recomendado,
          lift: Math.round(c.lift * 100) / 100,
          confianza: `${Math.round(c.confianza * 100)}%`,
          incremento: c.incremento_ticket_estimado,
        })),
      };
    }
    case "get_kpis": {
      return await loadJSON<KPIRecord>("kpis_resumen.json");
    }
    case "get_campaign_preview": {
      return {
        tipo: args.tipo,
        instrucciones: `Para enviar esta campaña, ve a la sección de ${args.tipo === "churn" ? "Churn" : "Reposición"}, selecciona los clientes con los checkboxes y haz clic en "Crear Campaña". Podrás elegir entre Email, WhatsApp o ambos, y editar el mensaje antes de enviarlo.`,
        enlace: args.tipo === "churn" ? "/churn" : "/reposicion",
      };
    }
    default:
      return { error: "Función no encontrada" };
  }
}

// ── Main handler ───────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el copiloto inteligente de Sellix AI, una plataforma de inteligencia de ventas para droguerías en Colombia.

Tu rol:
- Responder en español colombiano, tono profesional pero cercano
- Interpretar lo que el usuario necesita y usar las herramientas disponibles para obtener datos
- Presentar los resultados de forma clara y accionable
- Cuando el usuario pida enviar mensajes o campañas, usa get_campaign_preview y explica cómo hacerlo desde la interfaz
- Siempre incluye números concretos y recomendaciones prácticas
- Sé conciso — máximo 3-4 párrafos por respuesta
- Si el usuario pregunta algo fuera del alcance de la plataforma, dilo amablemente

Datos disponibles: churn (abandono), reposición de medicamentos, segmentación VIP/RFM, venta cruzada, KPIs generales.
Moneda: COP (peso colombiano). Formato: $1.500.000
Fechas: DD/MM/YYYY`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        response: "El copiloto requiere una API key de Google Gemini. Agrega `GEMINI_API_KEY` en tu archivo `.env.local`. Es gratis en https://aistudio.google.com/apikey",
        data: null,
      });
    }

    const { message, history } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    // Build chat history
    const chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        chatHistory.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }
    }

    const chat = model.startChat({ history: chatHistory });

    // Send message
    let result = await chat.sendMessage(message);
    let response = result.response;

    // Process function calls
    const collectedData: Record<string, unknown>[] = [];
    const MAX_ITERATIONS = 5;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const functionResponses = [];

      for (const call of functionCalls) {
        const toolResult = await executeTool(call.name, call.args as Record<string, unknown>);
        collectedData.push({ tool: call.name, result: toolResult });
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult as object,
          },
        });
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
      iteration++;
    }

    // Extract text response
    const responseText = response.text() || "No pude procesar tu consulta.";

    // Build structured data for the UI
    let structuredData = null;
    if (collectedData.length > 0) {
      const lastResult = collectedData[collectedData.length - 1];
      const toolName = lastResult.tool as string;
      const toolResult = lastResult.result as Record<string, unknown>;

      if (toolName === "get_kpis") {
        structuredData = {
          type: "kpi",
          title: "KPIs del Resumen Ejecutivo",
          kpis: [
            { label: "Transacciones", value: String(toolResult.total_transacciones) },
            { label: "Clientes", value: String(toolResult.clientes_unicos) },
            { label: "Ingresos", value: `$${Number(toolResult.ingresos_totales).toLocaleString("es-CO")}` },
            { label: "Ticket promedio", value: `$${Number(toolResult.ticket_promedio).toLocaleString("es-CO")}` },
            { label: "En riesgo", value: String(toolResult.clientes_en_riesgo_alto) },
          ],
        };
      } else if (toolName === "get_campaign_preview") {
        structuredData = {
          type: "actions",
          title: "Enviar campaña",
          actions: [{ label: "Ir a la sección", href: toolResult.enlace as string }],
        };
      } else if (toolResult && Array.isArray(Object.values(toolResult)[1])) {
        const rows = Object.values(toolResult)[1] as Record<string, string | number>[];
        if (rows.length > 0) {
          structuredData = {
            type: "table",
            title: `${Object.values(toolResult)[0]} resultados encontrados`,
            columns: Object.keys(rows[0]),
            rows: rows.slice(0, 15),
          };
        }
      }
    }

    return NextResponse.json({
      response: responseText,
      data: structuredData,
    });
  } catch (err) {
    return NextResponse.json(
      { response: `Error: ${err instanceof Error ? err.message : "Error interno"}`, data: null },
      { status: 500 }
    );
  }
}
