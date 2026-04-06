// =============================================================
// Sellix AI — Twilio WhatsApp Webhook
// Modes:
//   auto    → IA responde automáticamente al cliente
//   copilot → IA genera borrador, admin aprueba en inbox
//   manual  → Solo registra, admin responde manualmente
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { loadConversations, saveConversations } from "@/lib/crmStore";
import { applyFunnelRules } from "@/lib/funnelEngine";
import { analyzePrescription } from "@/lib/prescriptionAnalyzer";
import { generateSalesResponse } from "@/lib/salesAgent";
import { getBotConfig } from "@/lib/botConfig";
import twilio from "twilio";
import type { ChatMessage } from "@/lib/types";

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return false;
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const body = formData.get("Body") as string;
    const profileName = formData.get("ProfileName") as string;
    const numMedia = parseInt(formData.get("NumMedia") as string || "0");
    const mediaUrl = formData.get("MediaUrl0") as string | null;
    const mediaType = formData.get("MediaContentType0") as string | null;

    if (!from) return new NextResponse("OK", { status: 200 });

    const phone = from.replace("whatsapp:", "");
    const convs = await loadConversations();
    const botConfig = await getBotConfig();

    // Find or create conversation
    let conv = convs.find((c) => c.cliente.telefono === phone);
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        cliente: { nombre: profileName || phone, telefono: phone, cedula: null },
        stage: "lead",
        status: "no_respondido",
        priority: "alta",
        tags: ["nuevo", "whatsapp"],
        notes: "",
        messages: [],
        order: null,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        unread: 0,
        assignedTo: null,
      };
      convs.push(conv);
    }

    // Check if image (prescription)
    const isImage = numMedia > 0 && mediaUrl && mediaType?.startsWith("image/");

    // Save client message
    const clientMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      from: "cliente",
      text: isImage ? `📷 [Foto enviada]${body ? `\n${body}` : ""}` : (body || "(mensaje vacío)"),
      type: isImage ? "image" : "text",
    };
    conv.messages.push(clientMsg);
    conv.lastMessageAt = clientMsg.timestamp;
    conv.unread += 1;

    // ── Handle image (prescription analysis) ─────────────────
    if (isImage && mediaUrl) {
      const result = await analyzePrescription(mediaUrl);
      if (!conv.tags.includes("receta")) conv.tags.push("receta");

      if (botConfig.mode === "auto") {
        // Send prescription results directly
        const rxMsg: ChatMessage = {
          id: `msg_${Date.now()}_rx`,
          timestamp: new Date(Date.now() + 500).toISOString(),
          from: "sistema",
          text: result.mensaje_cliente,
          type: "text",
        };
        conv.messages.push(rxMsg);
        conv.lastMessageAt = rxMsg.timestamp;
        await sendWhatsApp(phone, result.mensaje_cliente);
      } else if (botConfig.mode === "copilot") {
        // Save as draft for admin approval
        const draftMsg: ChatMessage = {
          id: `msg_${Date.now()}_draft`,
          timestamp: new Date(Date.now() + 500).toISOString(),
          from: "sistema",
          text: `💡 *Borrador IA (pendiente aprobación):*\n\n${result.mensaje_cliente}`,
          type: "text",
        };
        conv.messages.push(draftMsg);
        conv.lastMessageAt = draftMsg.timestamp;
        if (!conv.tags.includes("borrador")) conv.tags.push("borrador");
      }
      // manual mode: just save, no response
    }

    // ── Handle text messages ─────────────────────────────────
    if (!isImage && body) {
      if (botConfig.mode === "auto") {
        // Generate and send AI response automatically
        const history = conv.messages
          .filter((m) => m.from !== "sistema")
          .slice(-10)
          .map((m) => ({ from: m.from, text: m.text }));

        const aiResult = await generateSalesResponse(body, history, conv.cliente.nombre);

        const aiMsg: ChatMessage = {
          id: `msg_${Date.now()}_ai`,
          timestamp: new Date(Date.now() + 500).toISOString(),
          from: "agente",
          text: aiResult.response,
          type: "text",
        };
        conv.messages.push(aiMsg);
        conv.lastMessageAt = aiMsg.timestamp;
        conv.unread = 0;

        // Send via WhatsApp
        await sendWhatsApp(phone, aiResult.response);

        console.log("AUTO-RESPONSE:", {
          client: conv.cliente.nombre,
          tools: aiResult.toolsUsed,
          error: aiResult.error,
        });

      } else if (botConfig.mode === "copilot") {
        // Generate draft for admin approval
        const history = conv.messages
          .filter((m) => m.from !== "sistema")
          .slice(-10)
          .map((m) => ({ from: m.from, text: m.text }));

        const aiResult = await generateSalesResponse(body, history, conv.cliente.nombre);

        const draftMsg: ChatMessage = {
          id: `msg_${Date.now()}_draft`,
          timestamp: new Date(Date.now() + 500).toISOString(),
          from: "sistema",
          text: `💡 *Sugerencia IA:*\n\n${aiResult.response}`,
          type: "text",
        };
        conv.messages.push(draftMsg);
        conv.lastMessageAt = draftMsg.timestamp;
        if (!conv.tags.includes("borrador")) conv.tags.push("borrador");
      }
      // manual mode: just save the client message, no AI
    }

    applyFunnelRules(conv);
    await saveConversations(convs);

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new NextResponse("OK", { status: 200 });
  }
}

export async function GET() {
  const convs = await loadConversations();
  const config = await getBotConfig();
  return NextResponse.json({
    status: "WhatsApp webhook active",
    mode: config.mode,
    conversations: convs.length,
  });
}
