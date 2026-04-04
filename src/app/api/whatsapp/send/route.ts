// =============================================================
// Sellix AI — Send WhatsApp message from CRM inbox
// Uses Twilio to send a reply to the customer
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ error: "Faltan campos: to, message" }, { status: 400 });
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!sid || !token || !from) {
      return NextResponse.json(
        { error: "Twilio no configurado (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)" },
        { status: 500 }
      );
    }

    const client = twilio(sid, token);

    // Ensure "whatsapp:" prefix
    const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const result = await client.messages.create({
      from,
      to: toNumber,
      body: message,
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error enviando WhatsApp" },
      { status: 500 }
    );
  }
}
