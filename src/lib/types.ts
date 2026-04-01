// =============================================================
// Sellix AI — Interfaces TypeScript globales
// Corresponden directamente a los 8 JSON generados por el ETL
// =============================================================

/** Tarjetas KPI del Resumen Ejecutivo */
export interface KPIsResumen {
  total_transacciones: number;
  clientes_unicos: number;
  ingresos_totales: number;
  ticket_promedio: number;
  clientes_en_riesgo_alto: number;
  oportunidades_cruzada: number;
  periodo: string;
}

/** Registro de riesgo de churn por cliente */
export interface ClienteChurn {
  cedula: string;
  nombre: string;
  telefono: string | null;
  ultima_compra: string; // ISO date string
  frecuencia_promedio_dias: number;
  dias_sin_comprar: number;
  churn_score: number;
  nivel_riesgo: "Alto" | "Medio" | "Bajo";
  accion_sugerida: string;
}

/** Predicción de reposición pendiente por cliente/producto */
export interface ReposicionPendiente {
  cedula: string;
  nombre: string;
  telefono: string | null;
  producto: string;
  ultima_compra: string; // ISO date string
  ciclo_dias: number;
  proxima_reposicion: string; // ISO date string
  dias_para_reposicion: number;
  estado: "Vencido" | "Esta semana" | "Próximo mes";
  historial_compras: string[]; // ISO date strings sorted ascending
  intervalos_dias: number[];   // days between each consecutive purchase
}

/** Par de productos con métricas de venta cruzada (market basket) */
export interface VentaCruzada {
  producto_base: string;
  producto_recomendado: string;
  veces_juntos: number;
  lift: number;
  confianza: number;
  incremento_ticket_estimado: number;
  categoria_terapeutica?: string;
}

/** Cliente con segmentación RFM y métricas de valor */
export interface ClienteRFM {
  cedula: string;
  nombre: string;
  telefono: string | null;
  recency_dias: number;
  frequency: number;
  monetary: number;
  score_r: number; // 1-5
  score_f: number; // 1-5
  score_m: number; // 1-5
  segmento: "VIP" | "Leal" | "En desarrollo" | "En riesgo";
  clv_estimado_anual: number;
  churn_score: number;
  ticket_promedio: number;
  ultima_compra: string; // ISO date string
}

/** Producto con categoría de gancho y métricas de arrastre */
export interface ProductoGancho {
  codigo: string;
  nombre: string;
  categoria_gancho:
    | "Gancho Primario"
    | "Gancho Secundario"
    | "Volumen puro"
    | "Nicho estratégico";
  indice_atraccion: number;
  poder_arrastre: number;
  tiene_descuento_frecuente: boolean;
  ticket_promedio_en_sesion: number;
}

/** Venta mensual para el gráfico de tendencia */
export interface VentaMensual {
  mes: string; // YYYY-MM
  ingresos: number;
  transacciones: number;
}

/** Producto más vendido para el gráfico de barras */
export interface TopProducto {
  nombre: string;
  codigo: string;
  unidades: number;
  ingresos: number;
}

/** Sesión de usuario autenticado (NextAuth session user) */
export interface UserSession {
  userId: string;
  userName: string;
  expires: string;
}
