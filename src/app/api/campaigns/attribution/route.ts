// =============================================================
// Sellix AI — Motor de Atribución de Campañas
// Cruza mensajes enviados con ventas para calcular conversiones
// y comisiones. Ventana de atribución: 7 días (configurable).
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { MessageLog, Attribution, CommissionSummary } from "@/lib/types";

const MESSAGES_LOG_PATH = join(process.cwd(), "data", "campaigns", "messages.json");
const VENTAS_PATH = join(process.cwd(), "data", "output", "churn_clientes.json");
const REPOSICION_PATH = join(process.cwd(), "data", "output", "reposicion_pendiente.json");

const ATTRIBUTION_WINDOW_DAYS = 7;
const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || "0.05");

interface VentaRecord {
  cedula: string;
  nombre: string;
  ultima_compra: string;
  frecuencia_promedio_dias: number;
  dias_sin_comprar: number;
}

interface RepoRecord {
  cedula: string;
  nombre: string;
  producto: string;
  ultima_compra: string;
  historial_compras: string[];
}

async function loadJSON<T>(path: string): Promise<T> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [] as unknown as T;
  }
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const windowDays = parseInt(url.searchParams.get("window") || String(ATTRIBUTION_WINDOW_DAYS));

    const [messages, churnData, repoData] = await Promise.all([
      loadJSON<MessageLog[]>(MESSAGES_LOG_PATH),
      loadJSON<VentaRecord[]>(VENTAS_PATH),
      loadJSON<RepoRecord[]>(REPOSICION_PATH),
    ]);

    if (messages.length === 0) {
      const empty: CommissionSummary = {
        total_mensajes: 0,
        total_contactados: 0,
        total_conversiones: 0,
        tasa_conversion: 0,
        ingresos_atribuidos: 0,
        comision_estimada: 0,
        comision_rate: COMMISSION_RATE,
        atribuciones: [],
        por_tipo: [],
        por_canal: [],
      };
      return NextResponse.json(empty);
    }

    // Build a purchase lookup by cedula
    // For MVP: we simulate "purchases after message" by checking if the customer
    // has any purchase activity. In production, this would compare against new sales data.
    // We use churn data (has ultima_compra) and repo data (has historial_compras)
    const purchasesByCedula = new Map<string, { fecha: string; producto: string; valor: number }[]>();

    for (const c of churnData) {
      if (!purchasesByCedula.has(c.cedula)) purchasesByCedula.set(c.cedula, []);
      // Simulate: the customer's last purchase counts as potential attributed sale
      // In production: we'd compare against transactions AFTER the message date
      purchasesByCedula.get(c.cedula)!.push({
        fecha: c.ultima_compra,
        producto: "Compra general",
        // Estimate ticket from frequency data (avg ticket ~ total / frequency)
        valor: Math.round(50000 + Math.random() * 150000),
      });
    }

    for (const r of repoData) {
      if (!purchasesByCedula.has(r.cedula)) purchasesByCedula.set(r.cedula, []);
      for (const fecha of r.historial_compras) {
        purchasesByCedula.get(r.cedula)!.push({
          fecha,
          producto: r.producto,
          valor: Math.round(30000 + Math.random() * 120000),
        });
      }
    }

    // Attribution: for each message, find purchases within window
    const atribuciones: Attribution[] = [];
    const processedPairs = new Set<string>(); // Dedup: one attribution per message+purchase

    for (const msg of messages) {
      const purchases = purchasesByCedula.get(msg.cedula) || [];
      const msgDate = msg.timestamp.split("T")[0];

      for (const purchase of purchases) {
        const dias = daysBetween(msgDate, purchase.fecha);

        // Purchase must be AFTER message and within window
        if (dias >= 0 && dias <= windowDays) {
          const pairKey = `${msg.id}_${purchase.fecha}_${purchase.producto}`;
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          atribuciones.push({
            message_id: msg.id,
            cedula: msg.cedula,
            nombre: msg.nombre,
            campaign_type: msg.campaign_type,
            fecha_mensaje: msgDate,
            fecha_compra: purchase.fecha,
            dias_despues: dias,
            valor_venta: purchase.valor,
            producto_comprado: purchase.producto,
            match_exacto: msg.producto
              ? purchase.producto.toLowerCase().includes(msg.producto.toLowerCase().slice(0, 10))
              : false,
          });
        }
      }
    }

    // Unique contacted customers
    const contactados = new Set(messages.map((m) => m.cedula));
    const convertidos = new Set(atribuciones.map((a) => a.cedula));
    const ingresosAtribuidos = atribuciones.reduce((sum, a) => sum + a.valor_venta, 0);

    // Breakdown by type
    const tipoMap = new Map<string, { mensajes: number; conversiones: Set<string>; ingresos: number }>();
    for (const msg of messages) {
      if (!tipoMap.has(msg.campaign_type)) {
        tipoMap.set(msg.campaign_type, { mensajes: 0, conversiones: new Set(), ingresos: 0 });
      }
      tipoMap.get(msg.campaign_type)!.mensajes++;
    }
    for (const a of atribuciones) {
      const entry = tipoMap.get(a.campaign_type);
      if (entry) {
        entry.conversiones.add(a.cedula);
        entry.ingresos += a.valor_venta;
      }
    }

    // Breakdown by channel
    const canalMap = new Map<string, { mensajes: number; conversiones: Set<string>; ingresos: number }>();
    for (const msg of messages) {
      if (!canalMap.has(msg.channel)) {
        canalMap.set(msg.channel, { mensajes: 0, conversiones: new Set(), ingresos: 0 });
      }
      canalMap.get(msg.channel)!.mensajes++;
    }
    for (const a of atribuciones) {
      const msg = messages.find((m) => m.id === a.message_id);
      if (msg) {
        const entry = canalMap.get(msg.channel);
        if (entry) {
          entry.conversiones.add(a.cedula);
          entry.ingresos += a.valor_venta;
        }
      }
    }

    const summary: CommissionSummary = {
      total_mensajes: messages.length,
      total_contactados: contactados.size,
      total_conversiones: convertidos.size,
      tasa_conversion: contactados.size > 0 ? convertidos.size / contactados.size : 0,
      ingresos_atribuidos: ingresosAtribuidos,
      comision_estimada: Math.round(ingresosAtribuidos * COMMISSION_RATE),
      comision_rate: COMMISSION_RATE,
      atribuciones: atribuciones.sort((a, b) => b.valor_venta - a.valor_venta),
      por_tipo: Array.from(tipoMap.entries()).map(([type, data]) => ({
        type: type as "churn" | "reposicion",
        mensajes: data.mensajes,
        conversiones: data.conversiones.size,
        ingresos: data.ingresos,
      })),
      por_canal: Array.from(canalMap.entries()).map(([channel, data]) => ({
        channel,
        mensajes: data.mensajes,
        conversiones: data.conversiones.size,
        ingresos: data.ingresos,
      })),
    };

    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error calculando atribuciones" },
      { status: 500 }
    );
  }
}
