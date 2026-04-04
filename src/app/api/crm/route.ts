// =============================================================
// Sellix AI — CRM API
// GET: load conversations (generates demo if empty)
// PUT: update conversation (stage, status, tags, notes, messages)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { loadConversations, saveConversations, generateDemoData } from "@/lib/crmData";
import { applyFunnelRules } from "@/lib/funnelEngine";
import type { Conversation, ChatMessage, Order, Payment } from "@/lib/types";

export async function GET() {
  let convs = await loadConversations();
  if (convs.length === 0) {
    convs = await generateDemoData();
  }

  // Summary
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

        // Send via WhatsApp if client has phone number
        if (conv.cliente.telefono && process.env.TWILIO_ACCOUNT_SID) {
          try {
            const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
            await fetch(`${baseUrl}/api/whatsapp/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: conv.cliente.telefono, message: data.text }),
            });
          } catch {
            // WhatsApp send failed — message still saved in CRM
          }
        }
        break;
      }

      // Simulates incoming WhatsApp message (for demo/testing)
      // In production this comes from /api/whatsapp/webhook
      case "receive_message": {
        const inMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          from: "cliente",
          text: data.text,
          type: data.type || "text",
        };
        conv.messages.push(inMsg);
        conv.lastMessageAt = inMsg.timestamp;
        conv.unread += 1;
        break;
      }

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
        // Stage updated by funnel engine below

        // Add system message
        const orderMsg: ChatMessage = {
          id: `msg_${Date.now()}_ord`,
          timestamp: new Date().toISOString(),
          from: "sistema",
          text: `📦 Pedido creado: ${order.items.length} productos — Total: $${order.total.toLocaleString("es-CO")}`,
          type: "text",
        };
        conv.messages.push(orderMsg);
        conv.lastMessageAt = orderMsg.timestamp;
        break;
      }

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
        // Stage/status updated by funnel engine below

        const payMsg: ChatMessage = {
          id: `msg_${Date.now()}_pay`,
          timestamp: new Date().toISOString(),
          from: "sistema",
          text: `🔗 Link de pago generado: $${payment.amount.toLocaleString("es-CO")}\n${payment.link}`,
          type: "payment_link",
        };
        conv.messages.push(payMsg);
        conv.lastMessageAt = payMsg.timestamp;
        break;
      }

      case "confirm_payment": {
        if (!conv.order?.payment) {
          return NextResponse.json({ error: "No hay pago pendiente" }, { status: 400 });
        }
        conv.order.payment.status = "pagado";
        conv.order.payment.method = data.method || "Nequi";
        conv.order.payment.paidAt = new Date().toISOString();
        conv.order.status = "pagado";
        // Stage/status/tags updated by funnel engine below

        const confirmMsg: ChatMessage = {
          id: `msg_${Date.now()}_conf`,
          timestamp: new Date().toISOString(),
          from: "sistema",
          text: `✅ Pago confirmado — $${conv.order.payment.amount.toLocaleString("es-CO")} recibidos via ${conv.order.payment.method}`,
          type: "text",
        };
        conv.messages.push(confirmMsg);
        conv.lastMessageAt = confirmMsg.timestamp;
        break;
      }

      case "mark_delivered": {
        if (conv.order) {
          conv.order.status = "entregado";
          // Stage/status/tags updated by funnel engine below

          const deliverMsg: ChatMessage = {
            id: `msg_${Date.now()}_del`,
            timestamp: new Date().toISOString(),
            from: "sistema",
            text: "📦 Pedido marcado como entregado",
            type: "text",
          };
          conv.messages.push(deliverMsg);

          // Auto followup message
          const followup: ChatMessage = {
            id: `msg_${Date.now()}_fu`,
            timestamp: new Date(Date.now() + 2000).toISOString(),
            from: "sistema",
            text: `Hola ${conv.cliente.nombre.split(" ")[0]}! Somos Droguería Super Ofertas. ¿Recibió su pedido correctamente? ¿Necesita algo más? Estamos para servirle 💊`,
            type: "auto_followup",
          };
          conv.messages.push(followup);
          conv.lastMessageAt = followup.timestamp;
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
    }

    conv.order && (conv.order.updatedAt = new Date().toISOString());

    // ── Auto funnel engine: evaluate and update stage/status ──
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
