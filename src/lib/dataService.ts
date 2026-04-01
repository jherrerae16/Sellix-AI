import type {
  KPIsResumen, ClienteChurn, ReposicionPendiente, VentaCruzada,
  ClienteRFM, ProductoGancho, VentaMensual, TopProducto,
} from "./types";

const DATA_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

async function fetchJSON<T>(filename: string): Promise<T> {
  const url = `${DATA_BASE_URL}/data/${filename}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error al cargar ${filename}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getKPIsResumen(): Promise<KPIsResumen> {
  return fetchJSON<KPIsResumen>("kpis_resumen.json");
}
export async function getClientesChurn(): Promise<ClienteChurn[]> {
  return fetchJSON<ClienteChurn[]>("churn_clientes.json");
}
export async function getReposicionesPendientes(): Promise<ReposicionPendiente[]> {
  return fetchJSON<ReposicionPendiente[]>("reposicion_pendiente.json");
}
export async function getVentasCruzadas(): Promise<VentaCruzada[]> {
  return fetchJSON<VentaCruzada[]>("ventas_cruzadas.json");
}
export async function getClientesRFM(): Promise<ClienteRFM[]> {
  return fetchJSON<ClienteRFM[]>("clientes_rfm.json");
}
export async function getProductosGancho(): Promise<ProductoGancho[]> {
  return fetchJSON<ProductoGancho[]>("productos_gancho.json");
}
export async function getVentasMensuales(): Promise<VentaMensual[]> {
  return fetchJSON<VentaMensual[]>("ventas_mensuales.json");
}
export async function getTopProductos(): Promise<TopProducto[]> {
  return fetchJSON<TopProducto[]>("top_productos.json");
}
