// =============================================================
// Sellix AI — Next Best Action Engine (v2)
// Usa churn_v2 y recurrencia_clientes para acciones más precisas
// Distingue clientes CONTACTABLES vs totales para cifras realistas
// =============================================================

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type {
  NextAction, ClienteChurnV2, ClienteRecurrencia, ReposicionPendiente,
} from "@/lib/types";

const DATA_DIR = join(process.cwd(), "data", "output");

async function loadJSON<T>(filename: string): Promise<T> {
  try {
    const raw = await readFile(join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [] as unknown as T;
  }
}

function isContactable(telefono: string | null | undefined): boolean {
  return !!telefono && String(telefono).trim().length >= 7;
}

function countContactable<T extends { telefono?: string | null }>(arr: T[]): number {
  return arr.filter((x) => isContactable(x.telefono)).length;
}

export async function GET() {
  try {
    const [churnV2, recurrencia, repo] = await Promise.all([
      loadJSON<ClienteChurnV2[]>("churn_v2.json"),
      loadJSON<ClienteRecurrencia[]>("recurrencia_clientes.json"),
      loadJSON<ReposicionPendiente[]>("reposicion_pendiente.json"),
    ]);

    const actions: NextAction[] = [];

    // ── 1. CHURN CRÓNICO — Abandono grave de tratamiento crónico ───
    const churnCronico = churnV2.filter((c) => c.tipo_churn === "churn_cronico");
    if (churnCronico.length > 0) {
      const contactables = countContactable(churnCronico);
      const ingresoPromedio = churnCronico.reduce((s, c) => s + c.ingreso_total / Math.max(c.total_compras, 1), 0) / churnCronico.length;
      const potencial = Math.round(churnCronico.length * ingresoPromedio * 2);
      const realista = Math.round(contactables * ingresoPromedio * 0.35 * 2);

      actions.push({
        id: "churn-cronico",
        category: "churn",
        title: "Recuperar clientes que abandonaron tratamiento crónico",
        description: `${churnCronico.length} clientes dejaron de comprar su medicación crónica. Esto es una señal de alto valor: compran de otro lado o interrumpieron tratamiento. Contactar ahora puede recuperarlos.`,
        priority: "critica",
        clientes: churnCronico.length,
        clientes_contactables: contactables,
        ingreso_estimado: potencial,
        ingreso_realista: realista,
        href: "/churn",
        cta: "Ver clientes y contactar",
      });
    }

    // ── 2. CHURN TOTAL — Dejaron de comprar todo ───────────────────
    const churnTotal = churnV2.filter((c) => c.tipo_churn === "churn_total");
    if (churnTotal.length > 0) {
      const contactables = countContactable(churnTotal);
      const ingresoPromedio = 85000;
      const realista = Math.round(contactables * ingresoPromedio * 0.15);

      actions.push({
        id: "churn-total",
        category: "churn",
        title: "Reactivar clientes en churn total",
        description: `${churnTotal.length} clientes ya no compran hace más de 6 meses. Una campaña de reactivación con oferta puede traer de vuelta al 15-20%.`,
        priority: "alta",
        clientes: churnTotal.length,
        clientes_contactables: contactables,
        ingreso_estimado: Math.round(churnTotal.length * ingresoPromedio * 0.2),
        ingreso_realista: realista,
        href: "/churn",
        cta: "Ver clientes inactivos",
      });
    }

    // ── 3. VIP INACTIVO — Alto valor bajó actividad ────────────────
    const vipInactivo = churnV2.filter((c) => c.tipo_churn === "alto_valor_inactivo");
    if (vipInactivo.length > 0) {
      const contactables = countContactable(vipInactivo);
      const valorTotal = vipInactivo.reduce((s, c) => s + c.ingreso_total, 0);
      const realista = Math.round((valorTotal / vipInactivo.length) * contactables * 0.25);

      actions.push({
        id: "vip-inactivo",
        category: "vip",
        title: "Proteger VIPs en riesgo",
        description: `${vipInactivo.length} clientes de alto valor ($${Math.round(valorTotal).toLocaleString("es-CO")} históricos) están perdiendo actividad. Prioridad máxima.`,
        priority: "critica",
        clientes: vipInactivo.length,
        clientes_contactables: contactables,
        ingreso_estimado: Math.round(valorTotal * 0.3),
        ingreso_realista: realista,
        href: "/churn",
        cta: "Ver VIPs en riesgo",
      });
    }

    // ── 4. REPOSICIÓN VENCIDA ──────────────────────────────────────
    const repoVencido = repo.filter((r) => r.estado === "Vencido");
    if (repoVencido.length > 0) {
      const uniqueClients = new Set(repoVencido.map((r) => r.cedula)).size;
      const contactables = new Set(repoVencido.filter((r) => isContactable(r.telefono)).map((r) => r.cedula)).size;
      const ticketAvg = 55000;

      actions.push({
        id: "repo-vencido",
        category: "reposicion",
        title: "Contactar reposiciones vencidas",
        description: `${repoVencido.length} productos de ${uniqueClients} clientes ya debieron reponerse. Si no actuamos, compran en otro lado.`,
        priority: "critica",
        clientes: uniqueClients,
        clientes_contactables: contactables,
        ingreso_estimado: Math.round(repoVencido.length * ticketAvg * 0.5),
        ingreso_realista: Math.round(contactables * ticketAvg * 0.55),
        href: "/reposicion",
        cta: "Ver y enviar recordatorios",
      });
    }

    // ── 5. REPOSICIÓN ESTA SEMANA ──────────────────────────────────
    const repoSemana = repo.filter((r) => r.estado === "Esta semana");
    if (repoSemana.length > 0) {
      const uniqueClients = new Set(repoSemana.map((r) => r.cedula)).size;
      const contactables = new Set(repoSemana.filter((r) => isContactable(r.telefono)).map((r) => r.cedula)).size;
      const ticketAvg = 55000;

      actions.push({
        id: "repo-semana",
        category: "reposicion",
        title: "Enviar recordatorios preventivos",
        description: `${repoSemana.length} productos vencen esta semana. Un recordatorio oportuno tiene 60-70% de tasa de éxito.`,
        priority: "alta",
        clientes: uniqueClients,
        clientes_contactables: contactables,
        ingreso_estimado: Math.round(repoSemana.length * ticketAvg * 0.65),
        ingreso_realista: Math.round(contactables * ticketAvg * 0.7),
        href: "/reposicion",
        cta: "Crear campaña preventiva",
      });
    }

    // ── 6. DOWNGRADE — Bajaron ticket ──────────────────────────────
    const downgrade = churnV2.filter((c) => c.tipo_churn === "downgrade");
    if (downgrade.length > 0) {
      const contactables = countContactable(downgrade);
      const perdidaPromedio = Math.abs(downgrade.reduce((s, c) => s + c.ticket_cambio_pct, 0) / downgrade.length);

      actions.push({
        id: "downgrade",
        category: "churn",
        title: "Investigar clientes con ticket reducido",
        description: `${downgrade.length} clientes siguen comprando pero su ticket bajó ~${Math.round(perdidaPromedio)}%. Una oferta o atención puede recuperar el monto perdido.`,
        priority: "media",
        clientes: downgrade.length,
        clientes_contactables: contactables,
        ingreso_estimado: Math.round(downgrade.length * 30000),
        ingreso_realista: Math.round(contactables * 30000 * 0.4),
        href: "/churn",
        cta: "Ver clientes en downgrade",
      });
    }

    // ── 7. RECURRENTES CRÓNICOS — Oportunidad de fidelización ──────
    const recurrentesCronicos = recurrencia.filter((r) => r.tipo_cliente === "recurrente_tratamiento");
    if (recurrentesCronicos.length > 0) {
      const contactables = countContactable(recurrentesCronicos);
      const ticketAvg = recurrentesCronicos.reduce((s, r) => s + r.ticket_promedio, 0) / recurrentesCronicos.length;

      actions.push({
        id: "fidelizar-cronicos",
        category: "vip",
        title: "Fidelizar clientes de tratamiento crónico",
        description: `${recurrentesCronicos.length} clientes compran crónicos regularmente. Ofrecer beneficios (descuento por lealtad, suscripción) asegura su recompra por meses.`,
        priority: "media",
        clientes: recurrentesCronicos.length,
        clientes_contactables: contactables,
        ingreso_estimado: Math.round(recurrentesCronicos.length * ticketAvg * 3),
        ingreso_realista: Math.round(contactables * ticketAvg * 3),
        href: "/vip",
        cta: "Ver clientes crónicos",
      });
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Summary
    const totalContactables = actions.reduce((s, a) => s + a.clientes_contactables, 0);
    const totalClientes = actions.reduce((s, a) => s + a.clientes, 0);
    const ingresoRealista = actions.reduce((s, a) => s + a.ingreso_realista, 0);
    const ingresoPotencial = actions.reduce((s, a) => s + a.ingreso_estimado, 0);

    return NextResponse.json({
      actions,
      summary: {
        total_acciones: actions.length,
        total_clientes: totalClientes,
        total_contactables: totalContactables,
        ingreso_potencial: ingresoPotencial,
        ingreso_realista: ingresoRealista,
        acciones_criticas: actions.filter((a) => a.priority === "critica").length,
        pct_contactable: totalClientes > 0 ? Math.round((totalContactables / totalClientes) * 100) : 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando acciones" },
      { status: 500 }
    );
  }
}
