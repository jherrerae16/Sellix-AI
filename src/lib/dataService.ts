// =============================================================
// Sellix AI — Data Service (Unified)
//
// Capa única de acceso a datos. Decide en runtime:
//   - Si DATABASE_URL está configurada → lee de Postgres
//   - Si no → lee de los JSON estáticos en data/output/ (modo legacy)
//
// Esto permite que el resto del código no cambie al migrar de
// "JSON-en-disco" a "Postgres". Los routes/components siguen
// llamando a getKPIsResumen(), getRecurrencia(), etc.
//
// Cuando el ETL de upload corre, invalida el cache de Postgres.
// =============================================================

import { readFile } from "fs/promises";
import { join } from "path";
import { hasDatabase } from "./db";
import * as db from "./dataServiceDb";
import type {
  KPIsResumen, ClienteChurn, ReposicionPendiente, VentaCruzada,
  ClienteRFM, ProductoGancho, VentaMensual, TopProducto,
  ClienteRecurrencia, VentasCruzadasV2, ClienteChurnV2, ChurnResumen,
  Bundle, ProductoClasificado,
} from "./types";

const DATA_DIR = join(process.cwd(), "data", "output");

async function loadJSON<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const EMPTY_KPIS: KPIsResumen = {
  total_transacciones: 0,
  clientes_unicos: 0,
  ingresos_totales: 0,
  ticket_promedio: 0,
  clientes_en_riesgo_alto: 0,
  oportunidades_cruzada: 0,
  periodo: "Sin datos — suba un archivo de ventas",
};

// Re-export del invalidador para que el upload route lo llame
export { invalidateDataCache } from "./dataServiceDb";

// ── KPIs / charts simples ──────────────────────────────────

export async function getKPIsResumen(): Promise<KPIsResumen> {
  if (hasDatabase) return db.getKPIsResumenDb();
  return loadJSON<KPIsResumen>("kpis_resumen.json", EMPTY_KPIS);
}

export async function getVentasMensuales(): Promise<VentaMensual[]> {
  return loadJSON<VentaMensual[]>("ventas_mensuales.json", []);
}

export async function getTopProductos(): Promise<TopProducto[]> {
  return loadJSON<TopProducto[]>("top_productos.json", []);
}

// ── Churn (legacy) ─────────────────────────────────────────

export async function getClientesChurn(): Promise<ClienteChurn[]> {
  return loadJSON<ClienteChurn[]>("churn_clientes.json", []);
}

// ── Reposición ─────────────────────────────────────────────

export async function getReposicionesPendientes(): Promise<ReposicionPendiente[]> {
  if (hasDatabase) return db.getReposicionesPendientesDb();
  return loadJSON<ReposicionPendiente[]>("reposicion_pendiente.json", []);
}

// ── Cross-sell legacy ──────────────────────────────────────

export async function getVentasCruzadas(): Promise<VentaCruzada[]> {
  return loadJSON<VentaCruzada[]>("ventas_cruzadas.json", []);
}

// ── RFM y gancho (legacy) ──────────────────────────────────

export async function getClientesRFM(): Promise<ClienteRFM[]> {
  return loadJSON<ClienteRFM[]>("clientes_rfm.json", []);
}

export async function getProductosGancho(): Promise<ProductoGancho[]> {
  return loadJSON<ProductoGancho[]>("productos_gancho.json", []);
}

// ── Datasets enriquecidos (v2) ─────────────────────────────

export async function getRecurrencia(): Promise<ClienteRecurrencia[]> {
  if (hasDatabase) return db.getRecurrenciaDb();
  return loadJSON<ClienteRecurrencia[]>("recurrencia_clientes.json", []);
}

export async function getVentasCruzadasV2(): Promise<VentasCruzadasV2> {
  if (hasDatabase) return db.getVentasCruzadasV2Db();
  return loadJSON<VentasCruzadasV2>("ventas_cruzadas_v2.json", {
    total_sesiones: 0, por_producto: [], por_categoria: [], por_tratamiento: [],
  });
}

export async function getChurnV2(): Promise<ClienteChurnV2[]> {
  if (hasDatabase) return db.getChurnV2Db();
  return loadJSON<ClienteChurnV2[]>("churn_v2.json", []);
}

export async function getChurnResumen(): Promise<ChurnResumen> {
  if (hasDatabase) return db.getChurnResumenDb();
  return loadJSON<ChurnResumen>("churn_resumen.json", {
    total_clientes: 0, por_tipo: {}, por_riesgo: {}, top_tratamientos_abandonados: [],
  });
}

export async function getBundles(): Promise<Bundle[]> {
  return loadJSON<Bundle[]>("bundles.json", []);
}

// ── Productos clasificados ─────────────────────────────────

export async function getProductosClasificados(): Promise<ProductoClasificado[]> {
  if (hasDatabase) return db.getProductosClasificadosDb();
  return loadJSON<ProductoClasificado[]>("productos_clasificados.json", []);
}
