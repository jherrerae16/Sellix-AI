// =============================================================
// Sellix AI — Twilio WhatsApp Webhook
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { loadConversations, saveConversations } from "@/lib/crmStore";
import { applyFunnelRules } from "@/lib/funnelEngine";
import type { Conversation, ChatMessage } from "@/lib/types";

export async function POST(request: NextRequest) {
  const debug: string[] = [];

  try {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const body = formData.get("Body") as string;
    const profileName = formData.get("ProfileName") as string;
    const numMedia = parseInt(formData.get("NumMedia") as string || "0");
    const mediaUrl = formData.get("MediaUrl0") as string | null;

    debug.push(`from=${from}, body=${body?.slice(0, 30)}, profile=${profileName}`);
    debug.push(`REDIS_URL=${process.env.REDIS_URL ? "SET(" + process.env.REDIS_URL.slice(0, 15) + "...)" : "NOT SET"}`);

    if (!from) {
      debug.push("No FROM field");
      console.log("WEBHOOK DEBUG:", debug.join(" | "));
      return new NextResponse("OK", { status: 200 });
    }

    const phone = from.replace("whatsapp:", "");
    debug.push(`phone=${phone}`);

    const convs = await loadConversations();
    debug.push(`loaded=${convs.length} conversations`);

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
      debug.push("NEW conversation created");
    } else {
      debug.push("EXISTING conversation found");
    }

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      from: "cliente",
      text: numMedia > 0 && mediaUrl ? `📷 [Imagen adjunta]\n${body || ""}` : (body || "(mensaje vacío)"),
      type: numMedia > 0 ? "image" : "text",
    };

    conv.messages.push(msg);
    conv.lastMessageAt = msg.timestamp;
    conv.unread += 1;

    applyFunnelRules(conv);

    await saveConversations(convs);
    debug.push(`saved=${convs.length} conversations`);

    console.log("WEBHOOK DEBUG:", debug.join(" | "));

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch (err) {
    debug.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    console.error("WEBHOOK DEBUG:", debug.join(" | "));
    return new NextResponse("OK", { status: 200 });
  }
}

export async function GET() {
  const debug: Record<string, unknown> = {
    status: "WhatsApp webhook active",
    redis_url: process.env.REDIS_URL ? "SET (" + process.env.REDIS_URL.slice(0, 20) + "...)" : "NOT SET",
  };

  try {
    const convs = await loadConversations();
    debug.conversations_stored = convs.length;
    if (convs.length > 0) {
      const last = convs[convs.length - 1];
      debug.last_client = last.cliente.nombre;
      debug.last_message = last.messages[last.messages.length - 1]?.text?.slice(0, 50);
    }
  } catch (err) {
    debug.load_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(debug);
}
