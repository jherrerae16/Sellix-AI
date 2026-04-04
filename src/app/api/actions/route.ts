// =============================================================
// Sellix AI — Next Best Action Engine
// Analiza churn, reposición, RFM, venta cruzada y gancho
// para generar acciones priorizadas con impacto estimado
// =============================================================

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NextAction } from "@/lib/types";

const DATA_DIR = join(process.cwd(), "data", "output");

async function loadJSON<T>(filename: string): Promise<T> {
  const raw = await readFile(join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

interface ChurnRecord {
  cedula: string; nombre: string; nivel_riesgo: string;
  dias_sin_comprar: number; churn_score: number; frecuencia_promedio_dias: number;
}

interface RepoRecord {
  cedula: string; nombre: string; producto: string;
  estado: string; dias_para_reposicion: number; ciclo_dias: number;
}

interface RFMRecord {
  cedula: string; nombre: string; segmento: string;
  clv_estimado_anual: number; monetary: number; frequency: number;
}

interface CruzadaRecord {
  producto_base: string; producto_recomendado: string;
  lift: number; confianza: number; incremento_ticket_estimado: number; veces_juntos: number;
}

interface GanchoRecord {
  nombre: string; categoria_gancho: string;
  indice_atraccion: number; poder_arrastre: number; ticket_promedio_en_sesion: number;
}

export async function GET() {
  try {
    const [churn, repo, rfm, cruzada, gancho] = await Promise.all([
      loadJSON<ChurnRecord[]>("churn_clientes.json"),
      loadJSON<RepoRecord[]>("reposicion_pendiente.json"),
      loadJSON<RFMRecord[]>("clientes_rfm.json"),
      loadJSON<CruzadaRecord[]>("ventas_cruzadas.json"),
      loadJSON<GanchoRecord[]>("productos_gancho.json"),
    ]);

    const actions: NextAction[] = [];

    // ── 1. CHURN: Clientes en riesgo alto ──────────────────────
    const churnAlto = churn.filter((c) => c.nivel_riesgo === "Alto");
    const churnMedio = churn.filter((c) => c.nivel_riesgo === "Medio");

    if (churnAlto.length > 0) {
      const avgTicket = 85000; // Estimated avg ticket for pharmacy
      actions.push({
        id: "churn-alto-llamar",
        category: "churn",
        title: "Llamar clientes en riesgo crítico",
        description: `${churnAlto.length} clientes llevan más del doble de su frecuencia habitual sin comprar. Cada día que pasa, es menos probable que regresen. Contactarlos esta semana puede recuperar hasta el 30% de ellos.`,
        priority: "critica",
        clientes: churnAlto.length,
        ingreso_estimado: Math.round(churnAlto.length * avgTicket * 0.3 * 3), // 30% recovery × 3 compras estimadas
        href: "/churn",
        cta: "Ver clientes y crear campaña",
      });
    }

    if (churnMedio.length > 0) {
      actions.push({
        id: "churn-medio-whatsapp",
        category: "churn",
        title: "Enviar WhatsApp a clientes en riesgo medio",
        description: `${churnMedio.length} clientes están empezando a alejarse. Un mensaje de WhatsApp o email oportuno puede evitar que pasen a riesgo alto. Es más barato retener que recuperar.`,
        priority: "alta",
        clientes: churnMedio.length,
        ingreso_estimado: Math.round(churnMedio.length * 65000 * 0.4 * 2),
        href: "/churn",
        cta: "Enviar campaña de retención",
      });
    }

    // ── 2. REPOSICIÓN: Vencidos y próximos ─────────────────────
    const repoVencido = repo.filter((r) => r.estado === "Vencido");
    const repoSemana = repo.filter((r) => r.estado === "Esta semana");

    if (repoVencido.length > 0) {
      const uniqueClients = new Set(repoVencido.map((r) => r.cedula)).size;
      actions.push({
        id: "repo-vencido-contactar",
        category: "reposicion",
        title: "Contactar reposiciones vencidas",
        description: `${repoVencido.length} productos de ${uniqueClients} clientes ya debieron haberse repuesto. Estos clientes probablemente compraron en otro lugar o interrumpieron su tratamiento. Contactarlos hoy.`,
        priority: "critica",
        clientes: uniqueClients,
        ingreso_estimado: Math.round(repoVencido.length * 55000 * 0.5),
        href: "/reposicion",
        cta: "Ver reposiciones vencidas",
      });
    }

    if (repoSemana.length > 0) {
      const uniqueClients = new Set(repoSemana.map((r) => r.cedula)).size;
      actions.push({
        id: "repo-semana-recordar",
        category: "reposicion",
        title: "Enviar recordatorios de esta semana",
        description: `${repoSemana.length} productos de ${uniqueClients} clientes vencen esta semana. Enviar un recordatorio preventivo antes de que se les agote el medicamento. Tasa de éxito esperada: 60-70%.`,
        priority: "alta",
        clientes: uniqueClients,
        ingreso_estimado: Math.round(repoSemana.length * 55000 * 0.65),
        href: "/reposicion",
        cta: "Crear campaña de recordatorio",
      });
    }

    // ── 3. VIP: Proteger clientes de mayor valor ───────────────
    const vipEnRiesgo = rfm.filter((c) => c.segmento === "VIP" || c.segmento === "Leal")
      .filter((c) => {
        const ch = churn.find((x) => x.cedula === c.cedula);
        return ch && (ch.nivel_riesgo === "Alto" || ch.nivel_riesgo === "Medio");
      });

    if (vipEnRiesgo.length > 0) {
      const clvTotal = vipEnRiesgo.reduce((s, c) => s + c.clv_estimado_anual, 0);
      actions.push({
        id: "vip-proteger",
        category: "vip",
        title: "Proteger clientes VIP en riesgo",
        description: `${vipEnRiesgo.length} de sus clientes más valiosos (VIP o Leales) también están en riesgo de abandono. Representan ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(clvTotal)} en valor anual. Prioridad máxima.`,
        priority: "critica",
        clientes: vipEnRiesgo.length,
        ingreso_estimado: Math.round(clvTotal * 0.4),
        href: "/vip",
        cta: "Ver clientes VIP en riesgo",
      });
    }

    // Clientes "En desarrollo" con potencial
    const enDesarrollo = rfm.filter((c) => c.segmento === "En desarrollo");
    if (enDesarrollo.length > 0) {
      const topDev = enDesarrollo.sort((a, b) => b.monetary - a.monetary).slice(0, 30);
      actions.push({
        id: "vip-desarrollar",
        category: "vip",
        title: "Impulsar clientes en desarrollo",
        description: `${enDesarrollo.length} clientes tienen potencial pero baja frecuencia. Una oferta personalizada o recordatorio puede convertirlos en clientes leales. Enfóquese en los ${topDev.length} con mayor ticket.`,
        priority: "media",
        clientes: topDev.length,
        ingreso_estimado: Math.round(topDev.reduce((s, c) => s + c.monetary * 0.2, 0)),
        href: "/vip",
        cta: "Ver segmentación RFM",
      });
    }

    // ── 4. VENTA CRUZADA: Top oportunidades ────────────────────
    const topCruzada = cruzada.filter((c) => c.lift >= 2.0).sort((a, b) => b.incremento_ticket_estimado - a.incremento_ticket_estimado);
    if (topCruzada.length > 0) {
      const avgIncremento = topCruzada.slice(0, 20).reduce((s, c) => s + c.incremento_ticket_estimado, 0) / Math.min(topCruzada.length, 20);
      actions.push({
        id: "cruzada-implementar",
        category: "venta_cruzada",
        title: "Activar recomendaciones de venta cruzada",
        description: `${topCruzada.length} pares de productos con Lift ≥ 2.0 — alta probabilidad de compra conjunta. Capacitar al cajero sobre los top ${Math.min(topCruzada.length, 10)} pares puede aumentar el ticket promedio en ~${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(avgIncremento)}.`,
        priority: "alta",
        clientes: churn.length,
        ingreso_estimado: Math.round(avgIncremento * churn.length * 0.15),
        href: "/cruzada",
        cta: "Ver oportunidades de venta cruzada",
      });
    }

    // ── 5. PRODUCTOS GANCHO: Estrategia de tráfico ─────────────
    const ganchoPrimario = gancho.filter((g) => g.categoria_gancho === "Gancho Primario");
    if (ganchoPrimario.length > 0) {
      const avgTicketGancho = ganchoPrimario.reduce((s, g) => s + g.ticket_promedio_en_sesion, 0) / ganchoPrimario.length;
      actions.push({
        id: "gancho-promocion",
        category: "gancho",
        title: "Diseñar promoción con productos gancho",
        description: `${ganchoPrimario.length} productos generan alto tráfico y arrastran ventas adicionales. Crear una promoción visible con estos productos puede incrementar el flujo de clientes. Ticket promedio cuando aparecen: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(avgTicketGancho)}.`,
        priority: "media",
        clientes: 0,
        ingreso_estimado: Math.round(ganchoPrimario.length * avgTicketGancho * 0.1),
        href: "/gancho",
        cta: "Ver productos gancho",
      });
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Summary
    const totalIngreso = actions.reduce((s, a) => s + a.ingreso_estimado, 0);
    const totalClientes = new Set(
      [...churnAlto, ...churnMedio, ...repoVencido, ...repoSemana, ...vipEnRiesgo]
        .map((c) => "cedula" in c ? c.cedula : "")
    ).size;

    return NextResponse.json({
      actions,
      summary: {
        total_acciones: actions.length,
        total_clientes_impactados: totalClientes,
        ingreso_potencial_total: totalIngreso,
        acciones_criticas: actions.filter((a) => a.priority === "critica").length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando acciones" },
      { status: 500 }
    );
  }
}
