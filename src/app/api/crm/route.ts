// =============================================================
// Sellix AI — CRM API
// GET: load conversations from Redis
// PUT: update conversation + send WhatsApp messages via Twilio
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { loadConversations, saveConversations } from "@/lib/crmStore";
import { applyFunnelRules } from "@/lib/funnelEngine";
import twilio from "twilio";
import type { Conversation, ChatMessage, Order, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Twilio WhatsApp sender ────────────────────────────────────

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from || !phone) return false;

  try {
    const client = twilio(sid, token);
    const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
    await client.messages.create({ from, to, body: message });
    return true;
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return false;
  }
}

// ── GET ───────────────────────────────────────────────────────

export async function GET() {
  const convs = await loadConversations();

  const summary = {
    total_conversaciones: convs.length,
    no_respondidos: convs.filter((c) => c.status === "no_respondido").length,
    pendientes_pago: convs.filter((c) => c.status === "pendiente_pago").length,
    ventas_hoy: convs.filter((c) => c.order?.payment?.status === "pagado").length,
    ingresos_hoy: convs.filter((c) => c.order?.payment?.status === "pagado")
      .reduce((s, c) => s + (c.order?.total || 0), 0),
    por_etapa: {
      lead: convs.filter((c) => c.stage === "lead").length,
      seguimiento: convs.filter((c) => c.stage === "seguimiento").length,
      potencial: convs.filter((c) => c.stage === "potencial").length,
      venta: convs.filter((c) => c.stage === "venta").length,
      postventa: convs.filter((c) => c.stage === "postventa").length,
    },
  };

  return NextResponse.json({ conversations: convs, summary });
}

// ── PUT ───────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...data } = body;

    const convs = await loadConversations();
    const idx = convs.findIndex((c) => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const conv = convs[idx];
    const phone = conv.cliente.telefono;
    const nombre = conv.cliente.nombre.split(" ")[0];

    switch (action) {
      case "update_stage":
        conv.stage = data.stage;
        break;

      case "update_status":
        conv.status = data.status;
        break;

      case "add_tag":
        if (!conv.tags.includes(data.tag)) conv.tags.push(data.tag);
        break;

      case "remove_tag":
        conv.tags = conv.tags.filter((t: string) => t !== data.tag);
        break;

      case "update_notes":
        conv.notes = data.notes;
        break;

      // ── Agent sends message → also sends via WhatsApp ──────
      case "send_message": {
        const msg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          from: "agente",
          text: data.text,
          type: "text",
        };
        conv.messages.push(msg);
        conv.lastMessageAt = msg.timestamp;
        conv.unread = 0;

        // Send via WhatsApp
        await sendWhatsApp(phone, data.text);
        break;
      }

      // ── Create order ───────────────────────────────────────
      case "create_order": {
        const orderId = `ord_${Date.now()}`;
        const order: Order = {
          id: orderId,
          conversationId: conv.id,
          items: data.items,
          total: data.items.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0),
          status: "borrador",
          payment: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        conv.order = order;

        const orderText = `📦 Hola ${nombre}! Su pedido ha sido creado:\n\n${
          order.items.map((i: { cantidad: number; nombre: string; subtotal: number }) =>
            `• ${i.cantidad}x ${i.nombre} — $${i.subtotal.toLocaleString("es-CO")}`
          ).join("\n")
        }\n\n*Total: $${order.total.toLocaleString("es-CO")}*\n\nLe enviaremos el link de pago en un momento.`;

        const orderMsg: ChatMessage = {
          id: `msg_${Date.now()}_ord`,
          timestamp: new Date().toISOString(),
          from: "sistema",
          text: orderText,
          type: "text",
        };
        conv.messages.push(orderMsg);
        conv.lastMessageAt = orderMsg.timestamp;

        // Send order confirmation via WhatsApp
        await sendWhatsApp(phone, orderText);
        break;
      }

      // ── Generate payment link → send to client ─────────────
      case "generate_payment_link": {
        if (!conv.order) {
          return NextResponse.json({ error: "No hay pedido asociado" }, { status: 400 });
        }
        const payId = `pay_${Date.now()}`;
        const payment: Payment = {
          id: payId,
          orderId: conv.order.id,
          amount: conv.order.total,
          status: "pendiente",
          link: `https://pay.sellix.ai/demo/${conv.order.id}`,
          method: null,
          paidAt: null,
          createdAt: new Date().toISOString(),
        };
        conv.order.payment = payment;
        conv.order.status = "confirmado";

        const payText = `💳 Hola ${nombre}! Aquí está su link de pago:\n\n*Total: $${payment.amount.toLocaleString("es-CO")}*\n🔗 ${payment.link}\n\nUna vez realice el pago, le confirmaremos su pedido. ¡Gracias!`;

        const payMsg: ChatMessage = {
          id: `msg_${Date.now()}_pay`,
          timestamp: new Date().toISOString(),
          from: "sistema",
          text: payText,
          type: "payment_link",
        };
        conv.messages.push(payMsg);
        conv.lastMessageAt = payMsg.timestamp;

        // Send payment link via WhatsApp
        await sendWhatsApp(phone, payText);
        break;
      }

      // ── Confirm payment ────────────────────────────────────
      case "confirm_payment": {
        if (!conv.order?.payment) {
          return NextResponse.json({ error: "No hay pago pendiente" }, { status: 400 });
        }
        conv.order.payment.status = "pagado";
        conv.order.payment.method = data.method || "Nequi";
        conv.order.payment.paidAt = new Date().toISOString();
        conv.order.status = "pagado";

        const confirmText = `✅ ${nombre}, su pago de *$${conv.order.payment.amount.toLocaleString("es-CO")}* ha sido confirmado.\n\nEstamos preparando su pedido. Le avisaremos cuando salga el envío. 🏍️\n\nDroguería Super Ofertas`;

        const confirmMsg: ChatMessage = {
          id: `msg_${Date.now()}_conf`,
          timestamp: new Date().toISOString(),
          from: "sistema",
          text: confirmText,
          type: "text",
        };
        conv.messages.push(confirmMsg);
        conv.lastMessageAt = confirmMsg.timestamp;

        // Send confirmation via WhatsApp
        await sendWhatsApp(phone, confirmText);
        break;
      }

      // ── Mark as delivered → auto followup ──────────────────
      case "mark_delivered": {
        if (conv.order) {
          conv.order.status = "entregado";

          const deliverMsg: ChatMessage = {
            id: `msg_${Date.now()}_del`,
            timestamp: new Date().toISOString(),
            from: "sistema",
            text: "📦 Pedido marcado como entregado",
            type: "text",
          };
          conv.messages.push(deliverMsg);

          // Auto followup
          const followupText = `Hola ${nombre}! 👋 Somos Droguería Super Ofertas.\n\n¿Recibió su pedido correctamente? ¿Llegó todo bien?\n\nSi necesita algo más o quiere hacer otro pedido, responda este mensaje. Estamos para servirle 💊`;

          const followup: ChatMessage = {
            id: `msg_${Date.now()}_fu`,
            timestamp: new Date(Date.now() + 1000).toISOString(),
            from: "sistema",
            text: followupText,
            type: "auto_followup",
          };
          conv.messages.push(followup);
          conv.lastMessageAt = followup.timestamp;

          // Send followup via WhatsApp
          await sendWhatsApp(phone, followupText);
        }
        break;
      }

      // ── Reset conversation (new order cycle) ────────────
      case "reset_conversation": {
        conv.stage = "lead";
        conv.status = "no_respondido";
        conv.order = null;
        conv.tags = ["whatsapp"];
        conv.unread = 0;
        conv.priority = "media";

        const resetMsg: ChatMessage = {
          id: `msg_${Date.now()}_reset`,
          timestamp: new Date().toISOString(),
          from: "sistema",
          text: "🔄 Conversación reiniciada — lista para nuevo pedido",
          type: "text",
        };
        conv.messages.push(resetMsg);
        conv.lastMessageAt = resetMsg.timestamp;
        break;
      }

      // ── Delete conversation ────────────────────────────────
      case "delete_conversation": {
        convs.splice(idx, 1);
        await saveConversations(convs);
        return NextResponse.json({ success: true, deleted: true });
      }

      default:
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
    }

    conv.order && (conv.order.updatedAt = new Date().toISOString());

    // Auto funnel engine
    const isManualStageChange = action === "update_stage";
    const funnelResult = applyFunnelRules(conv, isManualStageChange);

    convs[idx] = conv;
    await saveConversations(convs);

    return NextResponse.json({
      success: true,
      conversation: conv,
      funnel: {
        auto_updated: funnelResult.changed,
        reason: funnelResult.reason,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
