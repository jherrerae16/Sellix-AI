// =============================================================
// Sellix AI — Sales Agent (Auto-respuesta inteligente)
// Gemini 2.5 Flash con function calling para:
// - Buscar productos y precios
// - Venta cruzada
// - Comparación de precios vs competencia
// - Crear pedidos
// - Analizar recetas
// =============================================================

import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "output");

interface CatalogEntry {
  codigo: string;
  nombre: string;
  precio_unidad: number;
  precio_caja: number;
  transacciones: number;
}

interface CrossSellEntry {
  producto_base: string;
  producto_recomendado: string;
  veces_juntos: number;
  lift: number;
  confianza: number;
  incremento_ticket_estimado: number;
}

async function loadCatalog(): Promise<CatalogEntry[]> {
  try {
    const raw = await readFile(join(DATA_DIR, "precios_catalogo.json"), "utf-8");
    return JSON.parse(raw);
  } catch { return []; }
}

async function loadCrossSell(): Promise<CrossSellEntry[]> {
  try {
    const raw = await readFile(join(DATA_DIR, "ventas_cruzadas.json"), "utf-8");
    return JSON.parse(raw);
  } catch { return []; }
}

// ── Tools for Gemini ──────────────────────────────────────────

function getToolDeclarations(): FunctionDeclaration[] {
  return [
    {
      name: "buscar_producto",
      description: "Busca medicamentos o productos en el catálogo de la droguería por nombre. Retorna todas las presentaciones disponibles con precios reales. Usar cuando el cliente pregunta por un producto o precio.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          nombre: { type: SchemaType.STRING, description: "Nombre del medicamento o producto a buscar" },
        },
        required: ["nombre"],
      },
    },
    {
      name: "buscar_venta_cruzada",
      description: "Busca productos complementarios que se compran frecuentemente junto con un producto dado. Usar después de que el cliente confirma un producto para sugerir complementos.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          producto: { type: SchemaType.STRING, description: "Nombre del producto base" },
        },
        required: ["producto"],
      },
    },
    {
      name: "comparar_precios_competencia",
      description: "Busca precios reales del producto en farmacias competidoras (Cruz Verde, Farmatodo, La Rebaja, Olímpica) para demostrar que nuestro precio es mejor. Usar cuando el cliente duda, dice 'está caro', 'lo pienso', o cualquier objeción de precio.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          producto: { type: SchemaType.STRING, description: "Nombre del producto a comparar" },
          nuestro_precio: { type: SchemaType.NUMBER, description: "Nuestro precio para referencia" },
        },
        required: ["producto"],
      },
    },
  ];
}

// ── Tool execution ────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "buscar_producto": {
      const catalog = await loadCatalog();
      const query = (args.nombre as string).toLowerCase();
      const words = query.split(/\s+/).filter((w) => w.length > 2);

      const matches = catalog.filter((p) => {
        const pName = p.nombre.toLowerCase();
        return words.every((w) => pName.includes(w));
      });

      if (matches.length === 0) {
        // Try partial match with first word only
        const partial = catalog.filter((p) =>
          p.nombre.toLowerCase().includes(words[0] || query)
        );
        if (partial.length === 0) {
          return { encontrado: false, mensaje: "Producto no encontrado en catálogo" };
        }
        // Return top 5 by transactions
        partial.sort((a, b) => b.transacciones - a.transacciones);
        return {
          encontrado: true,
          productos: partial.slice(0, 5).map((p) => ({
            nombre: p.nombre,
            precio_unidad: p.precio_unidad,
            precio_caja: p.precio_caja,
          })),
        };
      }

      matches.sort((a, b) => b.transacciones - a.transacciones);
      return {
        encontrado: true,
        productos: matches.slice(0, 8).map((p) => ({
          nombre: p.nombre,
          precio_unidad: p.precio_unidad,
          precio_caja: p.precio_caja,
        })),
      };
    }

    case "buscar_venta_cruzada": {
      const crossSell = await loadCrossSell();
      const query = (args.producto as string).toLowerCase();

      const matches = crossSell
        .filter((c) => c.producto_base.toLowerCase().includes(query) && c.lift >= 1.5)
        .sort((a, b) => b.lift - a.lift)
        .slice(0, 3);

      if (matches.length === 0) {
        return { encontrado: false };
      }

      // Get prices for recommended products
      const catalog = await loadCatalog();
      return {
        encontrado: true,
        recomendaciones: matches.map((m) => {
          const prod = catalog.find((p) =>
            p.nombre.toLowerCase().includes(m.producto_recomendado.toLowerCase().split(" ")[0])
          );
          return {
            producto: m.producto_recomendado,
            veces_juntos: m.veces_juntos,
            precio_caja: prod?.precio_caja || 0,
            precio_unidad: prod?.precio_unidad || 0,
          };
        }),
      };
    }

    case "comparar_precios_competencia": {
      // Use Gemini Search to find real competitor prices
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return { error: "Sin API key para búsqueda" };

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const searchModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: [{ googleSearch: {} } as any],
        });

        const result = await searchModel.generateContent(
          `Busca el precio actual en pesos colombianos de "${args.producto}" en farmacias de Colombia: Cruz Verde, Farmatodo, La Rebaja. Responde SOLO JSON sin markdown: [{"farmacia":"nombre","precio":numero,"presentacion":"desc"}]`
        );

        const text = result.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const precios = JSON.parse(text);
        return {
          nuestro_precio: args.nuestro_precio,
          competencia: precios,
        };
      } catch {
        return { error: "No se pudieron obtener precios de competencia" };
      }
    }

    default:
      return { error: "Herramienta no encontrada" };
  }
}

// ── System prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el asistente virtual de ventas de Droguería Super Ofertas, una farmacia en Barranquilla, Colombia.

TU PERSONALIDAD:
- Tono colombiano profesional, cálido, amable, de farmacia de confianza
- Tuteas al cliente de forma respetuosa
- Conciso pero completo — máximo 3-4 líneas por respuesta normal
- Usas emojis con moderación (1-2 por mensaje)

INFORMACIÓN DEL NEGOCIO:
- Horario: Lunes a Sábado 8am-8pm, Domingos 9am-8pm
- Domicilio: $7.500 en Barranquilla
- Métodos de pago: Transferencia bancaria, efectivo, llave Bancolombia
- Dirección: Barranquilla, Colombia

REGLAS ESTRICTAS:
1. NUNCA inventar precios — SIEMPRE usa buscar_producto para obtener precios reales del catálogo
2. NUNCA inventar productos que no estén en el catálogo
3. Si no encuentras un producto, dilo honestamente: "No lo tengo en sistema, déjame verificar con el equipo"
4. Muestra precios con formato COP: $7.500, $15.000, etc.
5. Cuando muestres un producto, muestra precio por unidad Y por caja si ambos existen

FLUJO DE VENTA:
1. SALUDO: Si es primera vez, saluda y pregunta en qué puedes ayudar
2. CONSULTA: Cuando pregunten por un producto, usa buscar_producto y muestra presentaciones disponibles
3. OBJECIÓN: Si el cliente duda o dice "está caro/lo pienso", usa comparar_precios_competencia para mostrar que somos la mejor opción
4. VENTA CRUZADA: Cuando el cliente confirme un producto, usa buscar_venta_cruzada para sugerir complementos. Ejemplo: "Los clientes que llevan [X] también suelen llevar [Y]"
5. PEDIDO: Cuando confirme, resume el pedido con precios y ofrece generar link de pago
6. CIERRE: Confirma método de pago y domicilio

IMPORTANTE: Nunca presiones al cliente. Si no quiere comprar, despídete amablemente.`;

// ── Main function ─────────────────────────────────────────────

export interface SalesAgentResult {
  response: string;
  toolsUsed: string[];
  error?: string;
}

export async function generateSalesResponse(
  clientMessage: string,
  conversationHistory: { from: string; text: string }[],
  clientName: string,
): Promise<SalesAgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      response: "¡Hola! Gracias por escribirnos. Un momento, te atenderá uno de nuestros asesores. 😊",
      toolsUsed: [],
      error: "GEMINI_API_KEY not set",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: getToolDeclarations() }],
    });

    // Build chat history
    const history: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    for (const msg of conversationHistory.slice(-10)) {
      history.push({
        role: msg.from === "cliente" ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    }

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(
      `[Cliente: ${clientName}] ${clientMessage}`
    );
    let response = result.response;

    // Process function calls
    const toolsUsed: string[] = [];
    let iterations = 0;

    while (iterations < 5) {
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const functionResponses = [];
      for (const call of functionCalls) {
        toolsUsed.push(call.name);
        const toolResult = await executeTool(call.name, call.args as Record<string, unknown>);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult as object,
          },
        });
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
      iterations++;
    }

    const responseText = response.text() || "¡Gracias por escribirnos! Un asesor te atenderá pronto.";

    return { response: responseText, toolsUsed };
  } catch (err) {
    console.error("Sales agent error:", err);
    return {
      response: "¡Hola! Gracias por escribirnos a Droguería Super Ofertas. Un momento, te atenderá uno de nuestros asesores. 😊",
      toolsUsed: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
