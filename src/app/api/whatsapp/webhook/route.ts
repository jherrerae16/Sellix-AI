// =============================================================
// Sellix AI — Twilio WhatsApp Webhook
// Receives incoming WhatsApp messages and creates/updates
// conversations in the CRM.
//
// Configure in Twilio Console:
// Messaging → Settings → WhatsApp Sandbox
// "WHEN A MESSAGE COMES IN" → POST https://your-app.vercel.app/api/whatsapp/webhook
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { loadConversations, saveConversations, generateDemoData } from "@/lib/crmData";
import { applyFunnelRules } from "@/lib/funnelEngine";
import type { Conversation, ChatMessage } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const formData = await request.formData();
    const from = formData.get("From") as string;        // "whatsapp:+57573000000000"
    const body = formData.get("Body") as string;         // Message text
    const profileName = formData.get("ProfileName") as string; // WhatsApp display name
    const numMedia = parseInt(formData.get("NumMedia") as string || "0");
    const mediaUrl = formData.get("MediaUrl0") as string | null; // Image URL if sent

    if (!from || !body) {
      return new NextResponse("OK", { status: 200 });
    }

    // Extract phone number (remove "whatsapp:" prefix)
    const phone = from.replace("whatsapp:", "");

    // Load existing conversations
    let convs = await loadConversations();
    if (convs.length === 0) {
      convs = await generateDemoData();
    }

    // Find existing conversation by phone
    let conv = convs.find((c) => c.cliente.telefono === phone);

    if (!conv) {
      // Create new conversation
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

    // Add the incoming message
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      from: "cliente",
      text: numMedia > 0 && mediaUrl ? `📷 [Imagen adjunta]\n${body || ""}` : body,
      type: numMedia > 0 ? "image" : "text",
    };

    conv.messages.push(msg);
    conv.lastMessageAt = msg.timestamp;
    conv.unread += 1;

    // Run funnel engine
    applyFunnelRules(conv);

    await saveConversations(convs);

    // Respond with empty TwiML (acknowledge receipt, no auto-reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new NextResponse("OK", { status: 200 }); // Always 200 to Twilio
  }
}

// Twilio also sends GET for verification
export async function GET() {
  return NextResponse.json({ status: "WhatsApp webhook active" });
}
