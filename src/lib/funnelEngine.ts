// =============================================================
// Sellix AI — Motor Automático del Embudo de Ventas
// Evalúa el estado de una conversación y determina la etapa
// correcta del embudo basado en reglas de negocio.
//
// REGLAS:
// 1. Mensaje nuevo de número desconocido → Lead inicial
// 2. Admin responde por primera vez     → Seguimiento
// 3. Se cotiza producto / menciona $    → Cliente potencial
// 4. Se crea pedido                     → Cliente potencial
// 5. Se genera link de pago             → Venta
// 6. Pago confirmado                    → Venta (pagado)
// 7. Pedido entregado                   → Postventa
// 8. Followup automático enviado        → Postventa
//
// El admin siempre puede mover manualmente con override.
// =============================================================

import type { Conversation, ConversationStage, ConversationStatus } from "./types";

interface FunnelUpdate {
  stage: ConversationStage;
  status: ConversationStatus;
  priority: "alta" | "media" | "baja";
  autoTags: string[];
  reason: string;
}

// Keywords that indicate pricing / product interest
const PRICE_KEYWORDS = [
  "cuánto", "cuanto", "precio", "cuesta", "vale", "cotiz",
  "valor", "cuanto sale", "cuanto cuesta", "cuanto vale",
  "descuento", "oferta", "promoción", "promocion",
];

const PRODUCT_KEYWORDS = [
  "necesito", "quiero", "mándame", "mandame", "envíame", "enviame",
  "sepárame", "separame", "reserv", "pedir", "pedido",
  "domicilio", "envío", "envio",
];

const PAYMENT_KEYWORDS = [
  "cómo pago", "como pago", "nequi", "daviplata", "transferencia",
  "pagar", "link de pago", "pago",
];

function hasKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Evalúa una conversación y retorna la etapa + estado recomendados.
 * Se ejecuta automáticamente después de cada acción del sistema.
 */
export function evaluateFunnel(conv: Conversation): FunnelUpdate {
  const msgs = conv.messages;
  const clienteMsgs = msgs.filter((m) => m.from === "cliente");
  const agenteMsgs = msgs.filter((m) => m.from === "agente");
  const allClienteText = clienteMsgs.map((m) => m.text).join(" ");
  const allAgenteText = agenteMsgs.map((m) => m.text).join(" ");

  // ── POSTVENTA: pedido entregado ─────────────────────────────
  if (conv.order?.status === "entregado") {
    return {
      stage: "postventa",
      status: "postventa",
      priority: "baja",
      autoTags: ["entregado"],
      reason: "Pedido entregado — en seguimiento postventa",
    };
  }

  // ── VENTA: tiene pago (pendiente o confirmado) ──────────────
  if (conv.order?.payment) {
    if (conv.order.payment.status === "pagado") {
      return {
        stage: "venta",
        status: "activo",
        priority: "media",
        autoTags: ["pagado"],
        reason: "Pago confirmado — preparar envío",
      };
    }
    // Payment link generated but not paid
    return {
      stage: "venta",
      status: "pendiente_pago",
      priority: "alta",
      autoTags: ["pago_pendiente"],
      reason: "Link de pago enviado — esperando pago",
    };
  }

  // ── CLIENTE POTENCIAL: tiene pedido sin link de pago ────────
  if (conv.order && !conv.order.payment) {
    return {
      stage: "potencial",
      status: "activo",
      priority: "alta",
      autoTags: ["pedido"],
      reason: "Pedido creado — falta generar link de pago",
    };
  }

  // ── CLIENTE POTENCIAL: menciona precios/productos con intención de compra
  if (agenteMsgs.length > 0) {
    const clienteWantsProduct = hasKeywords(allClienteText, PRODUCT_KEYWORDS);
    const clienteAsksPayment = hasKeywords(allClienteText, PAYMENT_KEYWORDS);
    const agenteQuotedPrice = allAgenteText.includes("$") || hasKeywords(allAgenteText, PRICE_KEYWORDS);

    if (clienteAsksPayment || (clienteWantsProduct && agenteQuotedPrice)) {
      return {
        stage: "potencial",
        status: "activo",
        priority: "alta",
        autoTags: ["cotización"],
        reason: "Cliente muestra intención de compra — cotización enviada",
      };
    }
  }

  // ── SEGUIMIENTO: admin ya respondió ─────────────────────────
  if (agenteMsgs.length > 0) {
    // Check if client has asked about products/prices
    const clienteAsksPrice = hasKeywords(allClienteText, PRICE_KEYWORDS);

    return {
      stage: "seguimiento",
      status: "activo",
      priority: clienteAsksPrice ? "media" : "baja",
      autoTags: clienteAsksPrice ? ["consulta"] : [],
      reason: "Conversación activa — en seguimiento",
    };
  }

  // ── LEAD INICIAL: solo mensajes del cliente, sin respuesta ──
  const lastClienteMsg = clienteMsgs[clienteMsgs.length - 1];
  const minutesSinceLastMsg = lastClienteMsg
    ? (Date.now() - new Date(lastClienteMsg.timestamp).getTime()) / 60000
    : 999;

  return {
    stage: "lead",
    status: "no_respondido",
    priority: minutesSinceLastMsg < 30 ? "alta" : minutesSinceLastMsg < 120 ? "media" : "baja",
    autoTags: ["nuevo"],
    reason: `Lead sin responder — ${Math.round(minutesSinceLastMsg)} min sin atender`,
  };
}

/**
 * Aplica la evaluación automática a una conversación.
 * Solo actualiza si la nueva etapa es "mayor" que la actual,
 * excepto que el admin la haya movido manualmente (override).
 */
export function applyFunnelRules(
  conv: Conversation,
  manualOverride = false
): { changed: boolean; reason: string } {
  if (manualOverride) {
    return { changed: false, reason: "Override manual — sin cambio automático" };
  }

  const update = evaluateFunnel(conv);
  const STAGE_ORDER: ConversationStage[] = ["lead", "seguimiento", "potencial", "venta", "postventa"];
  const currentIdx = STAGE_ORDER.indexOf(conv.stage);
  const newIdx = STAGE_ORDER.indexOf(update.stage);

  // Only move forward automatically (never backward)
  if (newIdx < currentIdx) {
    return { changed: false, reason: `Etapa actual (${conv.stage}) es posterior a la calculada (${update.stage})` };
  }

  const changed = conv.stage !== update.stage || conv.status !== update.status || conv.priority !== update.priority;

  conv.stage = update.stage;
  conv.status = update.status;
  conv.priority = update.priority;

  // Merge auto tags (don't remove existing)
  for (const tag of update.autoTags) {
    if (!conv.tags.includes(tag)) conv.tags.push(tag);
  }

  return { changed, reason: update.reason };
}
