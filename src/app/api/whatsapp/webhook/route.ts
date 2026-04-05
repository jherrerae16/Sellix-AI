// =============================================================
// Sellix AI — Twilio WhatsApp Webhook
// Receives messages + images (prescriptions) from WhatsApp
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { loadConversations, saveConversations } from "@/lib/crmStore";
import { applyFunnelRules } from "@/lib/funnelEngine";
import { analyzePrescription } from "@/lib/prescriptionAnalyzer";
import twilio from "twilio";
import type { Conversation, ChatMessage } from "@/lib/types";

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

    console.log("WEBHOOK:", { from, body: body?.slice(0, 30), numMedia, mediaType });

    if (!from) {
      return new NextResponse("OK", { status: 200 });
    }

    const phone = from.replace("whatsapp:", "");
    const convs = await loadConversations();

    // Find or create conversation
    let conv = convs.find((c) => c.cliente.telefono === phone);
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        cliente: {
          nombre: profileName || phone,
          telefono: phone,
          cedula: null,
        },
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

    // Determine if this is an image (potential prescription)
    const isImage = numMedia > 0 && mediaUrl && mediaType?.startsWith("image/");

    // Save incoming message
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      from: "cliente",
      text: isImage
        ? `📷 [Foto enviada]${body ? `\n${body}` : ""}`
        : (body || "(mensaje vacío)"),
      type: isImage ? "image" : "text",
    };
    conv.messages.push(msg);
    conv.lastMessageAt = msg.timestamp;
    conv.unread += 1;

    // ── If image: analyze as prescription ──────────────────────
    if (isImage && mediaUrl) {
      // Add processing message to CRM
      const processingMsg: ChatMessage = {
        id: `msg_${Date.now()}_proc`,
        timestamp: new Date(Date.now() + 500).toISOString(),
        from: "sistema",
        text: "🔍 Analizando receta médica...",
        type: "text",
      };
      conv.messages.push(processingMsg);

      // Analyze the prescription
      const result = await analyzePrescription(mediaUrl);

      // Add result message to CRM
      const resultMsg: ChatMessage = {
        id: `msg_${Date.now()}_rx`,
        timestamp: new Date(Date.now() + 1000).toISOString(),
        from: "sistema",
        text: result.mensaje_cliente,
        type: "text",
      };
      conv.messages.push(resultMsg);
      conv.lastMessageAt = resultMsg.timestamp;

      // Tag the conversation
      if (!conv.tags.includes("receta")) conv.tags.push("receta");
      if (result.success && result.productos.length > 0) {
        conv.stage = "potencial";
        conv.priority = "alta";
      }

      // Send response to client via WhatsApp
      await sendWhatsApp(phone, result.mensaje_cliente);

      console.log("PRESCRIPTION:", {
        products: result.productos.length,
        total: result.total_estimado,
        success: result.success,
      });
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
  return NextResponse.json({
    status: "WhatsApp webhook active",
    redis_url: process.env.REDIS_URL ? "SET" : "NOT SET",
    gemini: process.env.GEMINI_API_KEY ? "SET" : "NOT SET",
    conversations_stored: convs.length,
    features: ["text_messages", "prescription_analysis", "auto_pricing"],
  });
}
