// =============================================================
// Sellix AI — API de envío de campañas (Email + WhatsApp)
// MVP: Todos los mensajes van a DEMO_EMAIL / DEMO_PHONE
// Ahora también guarda log de cada mensaje enviado
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import twilio from "twilio";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { CampaignSendRequest, CampaignRecipient, MessageLog } from "@/lib/types";

const MESSAGES_LOG_PATH = join(process.cwd(), "data", "campaigns", "messages.json");

function replacePlaceholders(
  template: string,
  recipient: CampaignRecipient
): string {
  return template
    .replace(/\{\{nombre\}\}/g, recipient.nombre)
    .replace(/\{\{producto\}\}/g, recipient.producto ?? "—")
    .replace(/\{\{proxima_reposicion\}\}/g, recipient.proxima_reposicion ?? "—")
    .replace(/\{\{dias_sin_comprar\}\}/g, String(recipient.dias_sin_comprar ?? "—"))
    .replace(/\{\{ciclo_dias\}\}/g, String(recipient.ciclo_dias ?? "—"))
    .replace(/\{\{estado\}\}/g, recipient.estado ?? "—")
    .replace(/\{\{nivel_riesgo\}\}/g, recipient.nivel_riesgo ?? "—")
    .replace(/\{\{accion_sugerida\}\}/g, recipient.accion_sugerida ?? "—");
}

async function loadMessageLog(): Promise<MessageLog[]> {
  try {
    const raw = await readFile(MESSAGES_LOG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveMessageLog(logs: MessageLog[]): Promise<void> {
  await mkdir(join(process.cwd(), "data", "campaigns"), { recursive: true });
  await writeFile(MESSAGES_LOG_PATH, JSON.stringify(logs, null, 2), "utf-8");
}

async function sendEmail(
  resend: Resend,
  subject: string,
  body: string,
  recipientName: string
): Promise<{ ok: boolean; error?: string }> {
  const demoEmail = process.env.DEMO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Sellix AI <onboarding@resend.dev>";
  if (!demoEmail) return { ok: false, error: "DEMO_EMAIL no configurado" };

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [demoEmail],
      subject: `[Demo - ${recipientName}] ${subject}`,
      text: body,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error enviando email" };
  }
}

async function sendWhatsApp(
  client: twilio.Twilio,
  body: string,
  recipientName: string
): Promise<{ ok: boolean; error?: string }> {
  const demoPhone = process.env.DEMO_PHONE;
  const fromPhone = process.env.TWILIO_WHATSAPP_FROM;
  if (!demoPhone || !fromPhone) return { ok: false, error: "DEMO_PHONE o TWILIO_WHATSAPP_FROM no configurado" };

  try {
    await client.messages.create({
      from: fromPhone,
      to: demoPhone,
      body: `[Demo - ${recipientName}]\n\n${body}`,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error enviando WhatsApp" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CampaignSendRequest = await request.json();
    const { type, channel, templateId, subject, body: messageBody, recipients } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { success: false, sent: 0, errors: ["No hay destinatarios seleccionados"] },
        { status: 400 }
      );
    }

    let resend: Resend | null = null;
    let twilioClient: twilio.Twilio | null = null;

    if (channel === "email" || channel === "ambos") {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { success: false, sent: 0, errors: ["RESEND_API_KEY no configurado en .env.local"] },
          { status: 500 }
        );
      }
      resend = new Resend(apiKey);
    }

    if (channel === "whatsapp" || channel === "ambos") {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      if (!sid || !token) {
        return NextResponse.json(
          { success: false, sent: 0, errors: ["TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no configurados"] },
          { status: 500 }
        );
      }
      twilioClient = twilio(sid, token);
    }

    let sent = 0;
    const errors: string[] = [];
    const newLogs: MessageLog[] = [];

    for (const recipient of recipients) {
      const personalizedSubject = replacePlaceholders(subject, recipient);
      const personalizedBody = replacePlaceholders(messageBody, recipient);
      let sentThisRecipient = false;

      if (resend && (channel === "email" || channel === "ambos")) {
        const result = await sendEmail(resend, personalizedSubject, personalizedBody, recipient.nombre);
        if (result.ok) { sent++; sentThisRecipient = true; }
        else errors.push(`Email a ${recipient.nombre}: ${result.error}`);
      }

      if (twilioClient && (channel === "whatsapp" || channel === "ambos")) {
        const result = await sendWhatsApp(twilioClient, personalizedBody, recipient.nombre);
        if (result.ok) { sent++; sentThisRecipient = true; }
        else errors.push(`WhatsApp a ${recipient.nombre}: ${result.error}`);
      }

      if (sentThisRecipient) {
        newLogs.push({
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          cedula: recipient.cedula,
          nombre: recipient.nombre,
          campaign_type: type,
          channel,
          template_id: templateId,
          producto: recipient.producto,
        });
      }
    }

    // Save message logs for attribution
    if (newLogs.length > 0) {
      const existing = await loadMessageLog();
      await saveMessageLog([...existing, ...newLogs]);
    }

    return NextResponse.json({ success: errors.length === 0, sent, errors });
  } catch (err) {
    return NextResponse.json(
      { success: false, sent: 0, errors: [err instanceof Error ? err.message : "Error interno del servidor"] },
      { status: 500 }
    );
  }
}
