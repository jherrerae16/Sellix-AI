// =============================================================
// Sellix AI — Data Service
// Lee JSON desde data/output/ (privado, no public/)
// Retorna arrays vacíos si los datos aún no se han generado
// =============================================================

import { readFile } from "fs/promises";
import { join } from "path";
import type {
  KPIsResumen, ClienteChurn, ReposicionPendiente, VentaCruzada,
  ClienteRFM, ProductoGancho, VentaMensual, TopProducto,
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

export async function getKPIsResumen(): Promise<KPIsResumen> {
  return loadJSON<KPIsResumen>("kpis_resumen.json", EMPTY_KPIS);
}
export async function getClientesChurn(): Promise<ClienteChurn[]> {
  return loadJSON<ClienteChurn[]>("churn_clientes.json", []);
}
export async function getReposicionesPendientes(): Promise<ReposicionPendiente[]> {
  return loadJSON<ReposicionPendiente[]>("reposicion_pendiente.json", []);
}
export async function getVentasCruzadas(): Promise<VentaCruzada[]> {
  return loadJSON<VentaCruzada[]>("ventas_cruzadas.json", []);
}
export async function getClientesRFM(): Promise<ClienteRFM[]> {
  return loadJSON<ClienteRFM[]>("clientes_rfm.json", []);
}
export async function getProductosGancho(): Promise<ProductoGancho[]> {
  return loadJSON<ProductoGancho[]>("productos_gancho.json", []);
}
export async function getVentasMensuales(): Promise<VentaMensual[]> {
  return loadJSON<VentaMensual[]>("ventas_mensuales.json", []);
}
export async function getTopProductos(): Promise<TopProducto[]> {
  return loadJSON<TopProducto[]>("top_productos.json", []);
}
