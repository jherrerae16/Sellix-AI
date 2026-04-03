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

// =============================================================
// Motor de Campañas
// =============================================================

export type CampaignType = "churn" | "reposicion";
export type CampaignChannel = "email" | "whatsapp" | "ambos";
export type CampaignStatus = "pendiente" | "enviado" | "error";

export interface CampaignRecipient {
  cedula: string;
  nombre: string;
  telefono: string | null;
  // Reposición
  producto?: string;
  proxima_reposicion?: string;
  estado?: string;
  ciclo_dias?: number;
  // Churn
  nivel_riesgo?: string;
  dias_sin_comprar?: number;
  accion_sugerida?: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  type: CampaignType;
  subject: string;
  body: string;
}

export interface CampaignSendRequest {
  type: CampaignType;
  channel: CampaignChannel;
  templateId: string;
  subject: string;
  body: string;
  recipients: CampaignRecipient[];
}

export interface CampaignResult {
  success: boolean;
  sent: number;
  errors: string[];
}

// =============================================================
// Atribución de Campañas
// =============================================================

export interface MessageLog {
  id: string;
  timestamp: string;
  cedula: string;
  nombre: string;
  campaign_type: CampaignType;
  channel: CampaignChannel;
  template_id: string;
  producto?: string;
}

export interface Attribution {
  message_id: string;
  cedula: string;
  nombre: string;
  campaign_type: CampaignType;
  fecha_mensaje: string;
  fecha_compra: string;
  dias_despues: number;
  valor_venta: number;
  producto_comprado: string;
  match_exacto: boolean;
}

export interface CommissionSummary {
  total_mensajes: number;
  total_contactados: number;
  total_conversiones: number;
  tasa_conversion: number;
  ingresos_atribuidos: number;
  comision_estimada: number;
  comision_rate: number;
  atribuciones: Attribution[];
  por_tipo: {
    type: CampaignType;
    mensajes: number;
    conversiones: number;
    ingresos: number;
  }[];
  por_canal: {
    channel: string;
    mensajes: number;
    conversiones: number;
    ingresos: number;
  }[];
}

// =============================================================
// Next Best Action
// =============================================================

export type ActionPriority = "critica" | "alta" | "media" | "baja";
export type ActionCategory = "churn" | "reposicion" | "venta_cruzada" | "vip" | "gancho";

export interface NextAction {
  id: string;
  category: ActionCategory;
  title: string;
  description: string;
  priority: ActionPriority;
  clientes: number;
  ingreso_estimado: number;
  href: string;
  cta: string;
}

// =============================================================
// Copilot
// =============================================================

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  data?: CopilotData | null;
  timestamp: string;
}

// =============================================================
// Cotizador / Comparador de precios
// =============================================================

export interface ProductPrice {
  codigo: string;
  nombre: string;
  precio_nuestro: number;
  competidores: {
    nombre: string;
    precio: number;
    diferencia_pct: number;
  }[];
  ahorro_max: number;
  ahorro_max_pct: number;
  categoria: string;
}

export interface CopilotData {
  type: "table" | "kpi" | "actions" | "campaign_preview";
  title: string;
  rows?: Record<string, string | number>[];
  columns?: string[];
  kpis?: { label: string; value: string }[];
  actions?: { label: string; href: string }[];
}
