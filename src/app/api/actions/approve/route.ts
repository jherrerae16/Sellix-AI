// =============================================================
// Sellix AI — Approve & dispatch prepared action
//
// Body: { id: string, edited_message?: string }
//   - Marca prepared_action como executed
//   - Crea campaign + message_log entries
//   - Envía via Twilio (todos van a DEMO_PHONE en sandbox)
//
// Auditado en audit_log.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { Resend } from "resend";
import { sql, withTenant, hasDatabase, DEFAULT_TENANT_ID } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface PreparedActionRow {
  id: string;
  tenant_id: string;
  category: string;
  title: string;
  recipients: PreparedRecipient[];
  suggested_message: string;
  channel: string;
  status: string;
}

interface PreparedRecipient {
  cedula: string;
  nombre: string;
  telefono: string | null;
  contactable: boolean;
  producto?: string;
}

function replacePlaceholders(template: string, recipient: PreparedRecipient): string {
  return template
    .replace(/\{\{nombre\}\}/g, recipient.nombre || "cliente")
    .replace(/\{\{producto\}\}/g, recipient.producto || "tu producto");
}

interface SendResult {
  cedula: string;
  ok: boolean;
  error?: string;
}

async function sendWhatsApp(
  client: twilio.Twilio,
  body: string,
  recipient: PreparedRecipient,
): Promise<SendResult> {
  const demoPhone = process.env.DEMO_PHONE;
  const fromPhone = process.env.TWILIO_WHATSAPP_FROM;
  if (!demoPhone || !fromPhone) {
    return { cedula: recipient.cedula, ok: false, error: "DEMO_PHONE / TWILIO_WHATSAPP_FROM faltante" };
  }
  try {
    await client.messages.create({
      from: fromPhone,
      to: demoPhone,
      body: `[Demo - ${recipient.nombre}]\n\n${body}`,
    });
    return { cedula: recipient.cedula, ok: true };
  } catch (err) {
    return {
      cedula: recipient.cedula,
      ok: false,
      error: err instanceof Error ? err.message : "Error WhatsApp",
    };
  }
}

async function sendEmail(
  resend: Resend,
  subject: string,
  body: string,
  recipient: PreparedRecipient,
): Promise<SendResult> {
  const demoEmail = process.env.DEMO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Sellix AI <onboarding@resend.dev>";
  if (!demoEmail) {
    return { cedula: recipient.cedula, ok: false, error: "DEMO_EMAIL faltante" };
  }
  try {
    await resend.emails.send({
      from: fromEmail,
      to: [demoEmail],
      subject: `[Demo - ${recipient.nombre}] ${subject}`,
      text: body,
    });
    return { cedula: recipient.cedula, ok: true };
  } catch (err) {
    return {
      cedula: recipient.cedula,
      ok: false,
      error: err instanceof Error ? err.message : "Error email",
    };
  }
}

export async function POST(request: NextRequest) {
  if (!hasDatabase) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });
  }

  // Resolver actor desde sesión NextAuth para audit trail
  const session = await auth();
  const actor = session?.user?.name || session?.user?.email || "unknown";

  let body: { id?: string; edited_message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { id, edited_message } = body;
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const [action] = await withTenant(DEFAULT_TENANT_ID, (tx) => tx<PreparedActionRow[]>`
    SELECT id, tenant_id, category, title, recipients, suggested_message, channel, status
    FROM prepared_actions
    WHERE id = ${id} AND tenant_id = ${DEFAULT_TENANT_ID}
  `);
  if (!action) {
    return NextResponse.json({ error: "Acción no encontrada" }, { status: 404 });
  }
  if (action.status !== "ready") {
    return NextResponse.json({ error: `Acción en estado '${action.status}', no se puede aprobar` }, { status: 400 });
  }

  const messageTemplate = (edited_message ?? action.suggested_message).trim();
  if (!messageTemplate) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  // Crear campaign
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await withTenant(DEFAULT_TENANT_ID, (tx) => tx`
    INSERT INTO campaigns (id, tenant_id, type, channel, body, status, created_at)
    VALUES (${campaignId}, ${DEFAULT_TENANT_ID}, ${action.category}, ${action.channel},
            ${messageTemplate}, 'sending', now())
  `);

  // Init clients
  let twilioClient: twilio.Twilio | null = null;
  let resendClient: Resend | null = null;
  if (action.channel === "whatsapp") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      return NextResponse.json({ error: "TWILIO credentials missing" }, { status: 500 });
    }
    twilioClient = twilio(sid, token);
  } else if (action.channel === "email") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });
    }
    resendClient = new Resend(apiKey);
  }

  // Send + log
  const results: SendResult[] = [];
  for (const r of action.recipients) {
    const personalized = replacePlaceholders(messageTemplate, r);
    let result: SendResult;
    if (twilioClient) {
      result = await sendWhatsApp(twilioClient, personalized, r);
    } else if (resendClient) {
      result = await sendEmail(resendClient, action.title, personalized, r);
    } else {
      result = { cedula: r.cedula, ok: false, error: "No client" };
    }
    results.push(result);

    const logId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await withTenant(DEFAULT_TENANT_ID, (tx) => tx`
      INSERT INTO message_log (
        id, tenant_id, campaign_id, cedula, nombre, campaign_type,
        channel, producto, delivered, error, sent_at
      ) VALUES (
        ${logId}, ${DEFAULT_TENANT_ID}, ${campaignId}, ${r.cedula}, ${r.nombre},
        ${action.category}, ${action.channel}, ${r.producto ?? null},
        ${result.ok}, ${result.error ?? null}, now()
      )
    `);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  // Update campaign
  await withTenant(DEFAULT_TENANT_ID, (tx) => tx`
    UPDATE campaigns SET
      status = ${failed === 0 ? "sent" : "partial"},
      sent_count = ${sent},
      error_count = ${failed},
      sent_at = now()
    WHERE id = ${campaignId}
  `);

  // Mark prepared_action approved + executed
  await withTenant(DEFAULT_TENANT_ID, (tx) => tx`
    UPDATE prepared_actions SET
      status = 'executed',
      approved_by = ${actor},
      approved_at = now(),
      executed_at = now(),
      campaign_id = ${campaignId}
    WHERE id = ${id}
  `);

  // Audit
  await withTenant(DEFAULT_TENANT_ID, (tx) => tx`
    INSERT INTO audit_log (tenant_id, actor, action, entity_type, entity_id, payload)
    VALUES (${DEFAULT_TENANT_ID}, ${actor}, ${"action.approve"}, ${"prepared_action"}, ${id},
      ${sql.json({ campaign_id: campaignId, sent, failed, recipients: action.recipients.length })})
  `);

  return NextResponse.json({
    success: true,
    campaign_id: campaignId,
    sent,
    failed,
    errors: results.filter((r) => !r.ok).slice(0, 10).map((r) => ({ cedula: r.cedula, error: r.error })),
  });
}
