// =============================================================
// Sellix AI — Prepare NBA actions for one-click approval
//
// Toma cada acción del NBA actual, selecciona los top clientes
// contactables, genera un mensaje WhatsApp personalizado con Gemini
// y persiste la "acción preparada" lista para aprobar y enviar.
//
// Auth: Bearer CRON_SECRET (igual que /api/classification/process).
// Triggered por Vercel cron cada 30 min, o manualmente desde UI.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Schema, SchemaType } from "@google/generative-ai";
import { sql, hasDatabase, DEFAULT_TENANT_ID } from "@/lib/db";
import {
  getChurnV2, getRecurrencia, getReposicionesPendientes,
} from "@/lib/dataService";
import type {
  ClienteChurnV2, ClienteRecurrencia, ReposicionPendiente,
} from "@/lib/types";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_RECIPIENTS_PER_ACTION = 50;
const ACTION_TTL_HOURS = 24;

// ── Auth ─────────────────────────────────────────────────────

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Aceptar Bearer (cron) O sesión NextAuth (botón UI).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) {
    return true;
  }
  const session = await auth();
  return !!session?.user;
}

// ── Recipient selection ─────────────────────────────────────

interface PreparedRecipient {
  cedula: string;
  nombre: string;
  telefono: string | null;
  contactable: boolean;
  score: number;
  razon: string;
  producto?: string;
}

function isContactable(t: string | null | undefined): boolean {
  return !!t && String(t).trim().length >= 7;
}

function selectChurnCronicoRecipients(churn: ClienteChurnV2[]): PreparedRecipient[] {
  return churn
    .filter((c) => c.tipo_churn === "churn_cronico" && isContactable(c.telefono))
    .sort((a, b) => b.ingreso_total - a.ingreso_total)
    .slice(0, MAX_RECIPIENTS_PER_ACTION)
    .map((c) => ({
      cedula: c.cedula,
      nombre: c.nombre,
      telefono: c.telefono,
      contactable: true,
      score: Math.min(100, Math.round(c.churn_ratio * 30 + (c.ingreso_total / 100000))),
      razon: c.razon,
      producto: c.tratamientos_abandonados[0]?.tratamiento,
    }));
}

function selectRepoVencidoRecipients(repo: ReposicionPendiente[]): PreparedRecipient[] {
  // Dedupe por cedula, tomar el producto más urgente
  const byCedula = new Map<string, ReposicionPendiente>();
  for (const r of repo.filter((x) => x.estado === "Vencido" && isContactable(x.telefono))) {
    const cur = byCedula.get(r.cedula);
    if (!cur || r.dias_para_reposicion < cur.dias_para_reposicion) {
      byCedula.set(r.cedula, r);
    }
  }
  return Array.from(byCedula.values())
    .sort((a, b) => a.dias_para_reposicion - b.dias_para_reposicion)
    .slice(0, MAX_RECIPIENTS_PER_ACTION)
    .map((r) => ({
      cedula: r.cedula,
      nombre: r.nombre,
      telefono: r.telefono,
      contactable: true,
      score: Math.min(100, 50 + Math.abs(r.dias_para_reposicion)),
      razon: `${Math.abs(r.dias_para_reposicion)}d vencido — ${r.producto}`,
      producto: r.producto,
    }));
}

function selectRepoSemanaRecipients(repo: ReposicionPendiente[]): PreparedRecipient[] {
  const byCedula = new Map<string, ReposicionPendiente>();
  for (const r of repo.filter((x) => x.estado === "Esta semana" && isContactable(x.telefono))) {
    const cur = byCedula.get(r.cedula);
    if (!cur || r.dias_para_reposicion < cur.dias_para_reposicion) {
      byCedula.set(r.cedula, r);
    }
  }
  return Array.from(byCedula.values())
    .sort((a, b) => a.dias_para_reposicion - b.dias_para_reposicion)
    .slice(0, MAX_RECIPIENTS_PER_ACTION)
    .map((r) => ({
      cedula: r.cedula,
      nombre: r.nombre,
      telefono: r.telefono,
      contactable: true,
      score: 70,
      razon: `Repone en ${r.dias_para_reposicion}d — ${r.producto}`,
      producto: r.producto,
    }));
}

function selectVipInactivoRecipients(churn: ClienteChurnV2[]): PreparedRecipient[] {
  return churn
    .filter((c) => c.tipo_churn === "alto_valor_inactivo" && isContactable(c.telefono))
    .sort((a, b) => b.ingreso_total - a.ingreso_total)
    .slice(0, MAX_RECIPIENTS_PER_ACTION)
    .map((c) => ({
      cedula: c.cedula,
      nombre: c.nombre,
      telefono: c.telefono,
      contactable: true,
      score: 90,
      razon: `VIP — $${Math.round(c.ingreso_total).toLocaleString("es-CO")} histórico`,
    }));
}

function selectChurnTotalRecipients(churn: ClienteChurnV2[]): PreparedRecipient[] {
  return churn
    .filter((c) => c.tipo_churn === "churn_total" && isContactable(c.telefono))
    .sort((a, b) => b.ingreso_total - a.ingreso_total)
    .slice(0, MAX_RECIPIENTS_PER_ACTION)
    .map((c) => ({
      cedula: c.cedula,
      nombre: c.nombre,
      telefono: c.telefono,
      contactable: true,
      score: Math.min(100, 30 + (c.ingreso_total / 100000)),
      razon: `${c.dias_sin_comprar}d sin comprar`,
    }));
}

function selectFidelizarCronicosRecipients(rec: ClienteRecurrencia[]): PreparedRecipient[] {
  return rec
    .filter((r) => r.tipo_cliente === "recurrente_tratamiento" && isContactable(r.telefono))
    .sort((a, b) => b.ingreso_total - a.ingreso_total)
    .slice(0, MAX_RECIPIENTS_PER_ACTION)
    .map((r) => ({
      cedula: r.cedula,
      nombre: r.nombre,
      telefono: r.telefono,
      contactable: true,
      score: 60,
      razon: r.razon,
      producto: r.top_tratamientos[0]?.tratamiento,
    }));
}

// ── AI message generation ───────────────────────────────────

const MESSAGE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    message: {
      type: SchemaType.STRING,
      description: "Mensaje WhatsApp empático, máximo 350 chars. Usa {{nombre}} como placeholder.",
    },
    suggested_offer: {
      type: SchemaType.STRING,
      description: "Oferta sugerida en una línea (ej: '10% descuento en primera reposición'). Vacío si no aplica.",
    },
  },
  required: ["message", "suggested_offer"],
};

interface ActionContext {
  category: string;
  title: string;
  description: string;
  example_recipients: { nombre: string; razon: string; producto?: string }[];
}

async function generateMessage(ctx: ActionContext): Promise<{ message: string; suggested_offer: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      message: `Hola {{nombre}}, te escribimos de la droguería. Notamos que es momento de revisar tu compra. ¿Te ayudamos?`,
      suggested_offer: "",
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: MESSAGE_SCHEMA,
    },
  });

  const prompt = `Eres encargado de comunicación de una droguería profesional en Colombia. Genera un mensaje WhatsApp educado y profesional para esta acción comercial:

Categoría: ${ctx.category}
Acción: ${ctx.title}
Contexto: ${ctx.description}

Ejemplos de destinatarios:
${ctx.example_recipients.slice(0, 3).map((r) => `- ${r.nombre}: ${r.razon}${r.producto ? ` (producto: ${r.producto})` : ""}`).join("\n")}

REGLAS ESTRICTAS:
1. Tono: profesional, respetuoso, cercano pero NO informal. Como una droguería de barrio que cuida a su cliente, no como un vendedor de marketplace.
2. PROHIBIDO emojis, signos de exclamación múltiples, mayúsculas, lenguaje promocional agresivo ("ÚLTIMA OPORTUNIDAD", "OFERTÓN", "NO TE LO PIERDAS").
3. PROHIBIDO inventar precios, descuentos específicos, fechas límite o productos concretos.
4. Saludo formal de día ("Buen día", "Buenas tardes") es opcional.
5. Identifícate como la droguería brevemente.
6. Si la acción es de salud (crónicos, reposición), enfatiza el cuidado del paciente, no la venta.
7. Mensaje breve: 200-300 caracteres ideal, máximo 350.
8. Usa {{nombre}} como placeholder del cliente.
9. CTA suave: "Quedamos atentos a tu respuesta", "Si necesitas asesoría, escríbenos", "Estamos a tu orden".
10. La oferta sugerida (campo separado) puede mencionar descuento moderado (5-15%), atención prioritaria, o entrega a domicilio. Si no aplica oferta, pon string vacío.

EJEMPLOS DE BUEN TONO:
- "Buen día {{nombre}}, le escribimos de la droguería. Notamos que ha sido un par de meses desde su última compra del tratamiento que venía manejando. Si lo desea podemos coordinar la reposición y enviarla. Quedamos atentos."
- "Hola {{nombre}}, le saluda la droguería. Es momento de la próxima reposición de su medicamento habitual. Si gusta podemos prepararlo para que lo recoja o se lo enviamos. Cuéntenos cómo prefiere."

EJEMPLOS DE MAL TONO (NO HACER):
- "Hola {{nombre}}!! Volvé pronto que te extrañamos 😍 Tenemos OFERTÓN para vos!"
- "Parce, hace rato no te vemos! Vení que te damos descuentazo!"`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return JSON.parse(text);
  } catch {
    return {
      message: `Hola {{nombre}}, te escribimos de la droguería. ¿Te ayudamos con tu próxima compra?`,
      suggested_offer: "",
    };
  }
}

// ── Build prepared actions ──────────────────────────────────

interface ActionDef {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  recipients: PreparedRecipient[];
  channel: "whatsapp" | "email";
  ingreso_estimado: number;
  ingreso_realista: number;
}

const DEFAULT_TICKET = 85000;
const REPO_TICKET = 55000;

async function buildActionDefs(): Promise<ActionDef[]> {
  const [churnV2, recurrencia, repo] = await Promise.all([
    getChurnV2(),
    getRecurrencia(),
    getReposicionesPendientes(),
  ]);

  const defs: ActionDef[] = [];

  // Churn crónico
  const churnCronicoR = selectChurnCronicoRecipients(churnV2);
  if (churnCronicoR.length) {
    const total = churnV2.filter((c) => c.tipo_churn === "churn_cronico").length;
    const ticket = churnCronicoR.reduce((s, r) => {
      const c = churnV2.find((x) => x.cedula === r.cedula);
      return s + (c ? c.ingreso_total / Math.max(c.total_compras, 1) : DEFAULT_TICKET);
    }, 0) / churnCronicoR.length;
    defs.push({
      id: "churn-cronico",
      category: "churn",
      priority: "critica",
      title: "Recuperar clientes que abandonaron tratamiento crónico",
      description: `${total} clientes dejaron de comprar su medicación crónica. Top ${churnCronicoR.length} contactables seleccionados.`,
      recipients: churnCronicoR,
      channel: "whatsapp",
      ingreso_estimado: Math.round(total * ticket * 2),
      ingreso_realista: Math.round(churnCronicoR.length * ticket * 0.35 * 2),
    });
  }

  // Repo vencido
  const repoVencidoR = selectRepoVencidoRecipients(repo);
  if (repoVencidoR.length) {
    const totalClientes = new Set(repo.filter((r) => r.estado === "Vencido").map((r) => r.cedula)).size;
    defs.push({
      id: "repo-vencido",
      category: "reposicion",
      priority: "critica",
      title: "Contactar reposiciones vencidas",
      description: `${totalClientes} clientes con productos vencidos. Top ${repoVencidoR.length} contactables.`,
      recipients: repoVencidoR,
      channel: "whatsapp",
      ingreso_estimado: Math.round(totalClientes * REPO_TICKET * 0.5),
      ingreso_realista: Math.round(repoVencidoR.length * REPO_TICKET * 0.55),
    });
  }

  // Repo esta semana
  const repoSemanaR = selectRepoSemanaRecipients(repo);
  if (repoSemanaR.length) {
    const totalClientes = new Set(repo.filter((r) => r.estado === "Esta semana").map((r) => r.cedula)).size;
    defs.push({
      id: "repo-semana",
      category: "reposicion",
      priority: "alta",
      title: "Recordatorios preventivos esta semana",
      description: `${totalClientes} clientes con reposición próxima. Recordatorio oportuno = 70% conversión.`,
      recipients: repoSemanaR,
      channel: "whatsapp",
      ingreso_estimado: Math.round(totalClientes * REPO_TICKET * 0.65),
      ingreso_realista: Math.round(repoSemanaR.length * REPO_TICKET * 0.70),
    });
  }

  // VIP inactivo
  const vipR = selectVipInactivoRecipients(churnV2);
  if (vipR.length) {
    const total = churnV2.filter((c) => c.tipo_churn === "alto_valor_inactivo").length;
    const valorTotal = churnV2
      .filter((c) => c.tipo_churn === "alto_valor_inactivo")
      .reduce((s, c) => s + c.ingreso_total, 0);
    const ticket = total > 0 ? valorTotal / total : DEFAULT_TICKET;
    defs.push({
      id: "vip-inactivo",
      category: "vip",
      priority: "critica",
      title: "Proteger VIPs en riesgo",
      description: `${total} clientes alto valor con baja actividad. Top ${vipR.length} contactables.`,
      recipients: vipR,
      channel: "whatsapp",
      ingreso_estimado: Math.round(valorTotal * 0.3),
      ingreso_realista: Math.round(ticket * vipR.length * 0.25),
    });
  }

  // Churn total
  const churnTotalR = selectChurnTotalRecipients(churnV2);
  if (churnTotalR.length) {
    const total = churnV2.filter((c) => c.tipo_churn === "churn_total").length;
    defs.push({
      id: "churn-total",
      category: "churn",
      priority: "alta",
      title: "Reactivar clientes en churn total",
      description: `${total} clientes inactivos hace >6 meses. Top ${churnTotalR.length} contactables con campaña reactivación.`,
      recipients: churnTotalR,
      channel: "whatsapp",
      ingreso_estimado: Math.round(total * DEFAULT_TICKET * 0.2),
      ingreso_realista: Math.round(churnTotalR.length * DEFAULT_TICKET * 0.15),
    });
  }

  // Fidelizar crónicos
  const fidelR = selectFidelizarCronicosRecipients(recurrencia);
  if (fidelR.length) {
    const total = recurrencia.filter((r) => r.tipo_cliente === "recurrente_tratamiento").length;
    const ticket = fidelR.reduce((s, r) => {
      const rec = recurrencia.find((x) => x.cedula === r.cedula);
      return s + (rec?.ticket_promedio ?? DEFAULT_TICKET);
    }, 0) / fidelR.length;
    defs.push({
      id: "fidelizar-cronicos",
      category: "vip",
      priority: "media",
      title: "Fidelizar clientes crónicos con programa lealtad",
      description: `${total} clientes crónicos recurrentes. Top ${fidelR.length} contactables candidatos a programa.`,
      recipients: fidelR,
      channel: "whatsapp",
      ingreso_estimado: Math.round(total * ticket * 1.0),
      ingreso_realista: Math.round(fidelR.length * ticket * 0.20 * 3),
    });
  }

  return defs;
}

// ── Persist ─────────────────────────────────────────────────

async function persistAction(
  def: ActionDef,
  message: string,
  suggested_offer: string,
  tenantId: string,
): Promise<void> {
  const id = `prep_${def.id}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + ACTION_TTL_HOURS * 3600_000);

  // Marcar previas del mismo tipo como expiradas (solo 1 ready por tipo)
  await sql`
    UPDATE prepared_actions
    SET status = 'expired'
    WHERE tenant_id = ${tenantId}
      AND status = 'ready'
      AND id LIKE ${"prep_" + def.id + "_%"}
  `;

  // sql.json envía como JSONB nativo. Cast a unknown porque sql.json
  // espera tipo más estricto — runtime acepta arrays normalmente.
  await sql`
    INSERT INTO prepared_actions (
      id, tenant_id, category, priority, title, description,
      recipients, suggested_message, channel, offer,
      ingreso_estimado, ingreso_realista, status, expires_at, computed_at
    ) VALUES (
      ${id}, ${tenantId}, ${def.category}, ${def.priority}, ${def.title}, ${def.description},
      ${sql.json(def.recipients as never)},
      ${message},
      ${def.channel},
      ${sql.json({ description: suggested_offer })},
      ${def.ingreso_estimado}, ${def.ingreso_realista},
      'ready', ${expiresAt}, now()
    )
  `;
}

// ── Handler ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!hasDatabase) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });
  }
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = DEFAULT_TENANT_ID;
  const start = Date.now();
  const stats = { actions_prepared: 0, recipients_total: 0, duration_ms: 0 };

  try {
    const defs = await buildActionDefs();

    for (const def of defs) {
      const { message, suggested_offer } = await generateMessage({
        category: def.category,
        title: def.title,
        description: def.description,
        example_recipients: def.recipients.slice(0, 3),
      });
      await persistAction(def, message, suggested_offer, tenantId);
      stats.actions_prepared += 1;
      stats.recipients_total += def.recipients.length;
    }

    await sql`
      INSERT INTO audit_log (tenant_id, actor, action, entity_type, payload)
      VALUES (${tenantId}, 'system', 'actions.prepare', 'prepared_actions',
        ${sql.json(stats as never)})
    `;

    stats.duration_ms = Date.now() - start;
    return NextResponse.json({ success: true, stats });
  } catch (err) {
    stats.duration_ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg, stats }, { status: 500 });
  }
}
