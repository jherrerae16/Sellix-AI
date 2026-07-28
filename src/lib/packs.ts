// =============================================================
// Sellix AI — Vertical Packs (PRD v4.0 §3.2)
//
// El Core es agnóstico al sector. Todo lo que sabe de farmacia,
// pet shop o ferretería vive aquí, cargado desde `vertical_packs`.
//
// Regla dura: ningún módulo del Core puede contener
// `if (vertical === 'farmacia')`. Si hace falta, es que falta un
// parámetro en el esquema de pack.
//
// Fallback: si Postgres no está disponible o el pack no existe,
// se devuelve el Pack 001 embebido — que reproduce el comportamiento
// de v3. Así el producto en producción nunca queda sin configuración.
// =============================================================

import { sql, hasDatabase, DEFAULT_TENANT_ID } from "./db";

// ── Tipos ────────────────────────────────────────────────────

export interface OntologiaNivel {
  clave: string;
  label: string;
  ejemplo: string;
}

export interface PackOntologia {
  nivel_1: OntologiaNivel;
  nivel_2: OntologiaNivel;
  nivel_3: OntologiaNivel;
}

export interface PackRecompra {
  min_compras: number;
  cv_max: number;
  ciclo_max_dias: number;
  ventana_preventiva_dias: number;
}

export interface PackChurn {
  dias_inactividad_total: number;
  dias_riesgo: number;
  umbral_downgrade_pct: number;
  items_ancla: string[];
}

/** Tasas de conversión T2 (prior del vertical). Ver PRD §9. */
export interface PackConversionPrior {
  recuperacion_ancla: number;
  recuperacion_ancla_compras_futuras?: number;
  reactivacion_total: number;
  vip_inactivo: number;
  recompra_vencida: number;
  recompra_preventiva: number;
  downgrade_liftback: number;
  lealtad: number;
  lealtad_ciclos_extra: number;
}

/** Fallback de ticket cuando el tenant no tiene historial suficiente. */
export interface PackTicketReferencia {
  general: number;
  recompra: number;
}

export interface PackScoring {
  EXACT_PRODUCT_BASE: number;
  EXACT_PRODUCT_PER_REPEAT: number;
  EXACT_PRODUCT_REPEAT_CAP: number;
  PENDING_REPLENISHMENT: number;
  CATEGORY_BASE: number;
  CATEGORY_PER_TIME: number;
  CATEGORY_TIME_CAP: number;
  AFFINITY_BASE: number;
  AFFINITY_TIME_CAP: number;
  RECURRENT_BONUS: number;
  COOCCURRENCE_BONUS: number;
  PROMO_SENSITIVITY_BONUS: number;
  INACTIVE_PENALTY: number;
  TICKET_OUT_OF_RANGE_PENALTY: number;
  TICKET_OUT_OF_RANGE_FACTOR: number;
  MIN_INCLUSION: number;
  MIN_FUZZY_MATCH_LEN: number;
}

export interface PackModulos {
  recompra: boolean;
  captura_visual: boolean;
  comparador_competencia: boolean;
  postventa_durables: boolean;
}

export interface PackCapturaVisual {
  modos: string[];
  prompt: string;
}

export interface PackAgente {
  competidores_referencia: string[];
  restricciones_tono: string[];
}

export interface VerticalPack {
  id: string;
  nombre: string;
  version: string;
  /**
   * Nivel de evidencia de los priors del pack (PRD §9.2). Es una
   * propiedad declarada del pack, no algo que se infiera de su id:
   * el Core nunca pregunta "¿eres el pack genérico?", pregunta
   * "¿qué respaldo tienen tus tasas?".
   *   T1 = prior global conservador, sin evidencia sectorial
   *   T2 = prior del vertical, respaldado por benchmarks del sector
   */
  tier_prior: "T1" | "T2";
  ontologia: PackOntologia;
  clasificador_prompt: string;
  recompra: PackRecompra;
  churn: PackChurn;
  conversion_prior: PackConversionPrior;
  ticket_referencia: PackTicketReferencia;
  scoring: PackScoring;
  modulos: PackModulos;
  captura_visual: PackCapturaVisual;
  agente: PackAgente;
  labels: Record<string, string>;
}

// ── Pack 001 embebido (fallback) ─────────────────────────────
//
// Réplica exacta de las constantes de v3. Se usa cuando no hay
// Postgres o el pack pedido no existe. Mantener sincronizado con
// db/migrations/003_seed_packs.sql.

export const PACK_001_FARMACIA: VerticalPack = {
  id: "001",
  nombre: "Farmacia / Droguería",
  version: "1.0.0",
  tier_prior: "T2",
  ontologia: {
    nivel_1: { clave: "categoria", label: "Categoría terapéutica", ejemplo: "Cardiovascular" },
    nivel_2: { clave: "subcategoria", label: "Grupo farmacológico", ejemplo: "Antihipertensivos" },
    nivel_3: { clave: "afinidad", label: "Tratamiento", ejemplo: "Hipertensión arterial" },
  },
  clasificador_prompt:
    "Clasifica estos productos farmacéuticos colombianos. Responde SOLO JSON según el schema.",
  recompra: { min_compras: 3, cv_max: 0.6, ciclo_max_dias: 120, ventana_preventiva_dias: 7 },
  churn: {
    dias_inactividad_total: 180,
    dias_riesgo: 45,
    umbral_downgrade_pct: 30,
    items_ancla: ["cronico"],
  },
  conversion_prior: {
    recuperacion_ancla: 0.35,
    recuperacion_ancla_compras_futuras: 2,
    reactivacion_total: 0.15,
    vip_inactivo: 0.25,
    recompra_vencida: 0.55,
    recompra_preventiva: 0.7,
    downgrade_liftback: 0.4,
    lealtad: 0.2,
    lealtad_ciclos_extra: 3,
  },
  ticket_referencia: { general: 85000, recompra: 55000 },
  scoring: {
    EXACT_PRODUCT_BASE: 50,
    EXACT_PRODUCT_PER_REPEAT: 5,
    EXACT_PRODUCT_REPEAT_CAP: 25,
    PENDING_REPLENISHMENT: 30,
    CATEGORY_BASE: 20,
    CATEGORY_PER_TIME: 2,
    CATEGORY_TIME_CAP: 15,
    AFFINITY_BASE: 5,
    AFFINITY_TIME_CAP: 10,
    RECURRENT_BONUS: 15,
    COOCCURRENCE_BONUS: 0,
    PROMO_SENSITIVITY_BONUS: 0,
    INACTIVE_PENALTY: -10,
    TICKET_OUT_OF_RANGE_PENALTY: 0,
    TICKET_OUT_OF_RANGE_FACTOR: 3,
    MIN_INCLUSION: 11,
    MIN_FUZZY_MATCH_LEN: 5,
  },
  modulos: {
    recompra: true,
    captura_visual: true,
    comparador_competencia: true,
    postventa_durables: false,
  },
  captura_visual: {
    modos: ["receta", "lista_compras", "foto_producto"],
    prompt:
      "Analiza esta receta médica. Extrae cada medicamento con su nombre, dosis, presentación y cantidad.",
  },
  agente: {
    competidores_referencia: ["Cruz Verde", "Farmatodo", "La Rebaja", "Olímpica"],
    restricciones_tono: [
      "Nunca dar diagnóstico ni recomendación médica",
      "Derivar cualquier consulta de salud al profesional",
      "No sugerir cambio de medicamento formulado",
    ],
  },
  labels: {
    recompra: "Reposición",
    afinidad: "Tratamiento",
    categoria: "Categoría terapéutica",
  },
};

// ── Cache ────────────────────────────────────────────────────
//
// Los packs cambian con muy baja frecuencia (despliegue de un nuevo
// vertical), así que un TTL largo es correcto.

const PACK_CACHE_TTL_MS = 15 * 60_000;

type PackCacheEntry = { value: VerticalPack; expiresAt: number };
const packCache = new Map<string, PackCacheEntry>();
const tenantPackCache = new Map<string, { packId: string; expiresAt: number }>();

/** Descarta el cache de packs. Llamar tras editar un pack o reasignar un tenant. */
export function invalidatePackCache(): void {
  packCache.clear();
  tenantPackCache.clear();
}

// ── Carga ────────────────────────────────────────────────────

interface PackRow {
  id: string;
  nombre: string;
  version: string;
  tier_prior: "T1" | "T2";
  ontologia: PackOntologia;
  clasificador_prompt: string;
  recompra: PackRecompra;
  churn: PackChurn;
  conversion_prior: PackConversionPrior;
  ticket_referencia: PackTicketReferencia;
  scoring: PackScoring;
  modulos: PackModulos;
  captura_visual: PackCapturaVisual;
  agente: PackAgente;
  labels: Record<string, string>;
}

/**
 * Carga un pack por id. Cae al Pack 001 embebido si no hay base de
 * datos o el pack no existe — el producto nunca queda sin config.
 */
export async function getPack(packId: string): Promise<VerticalPack> {
  const cached = packCache.get(packId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  if (!hasDatabase) return PACK_001_FARMACIA;

  try {
    const rows = await sql<PackRow[]>`
      SELECT id, nombre, version, tier_prior, ontologia, clasificador_prompt,
             recompra, churn, conversion_prior, ticket_referencia,
             scoring, modulos, captura_visual, agente, labels
      FROM vertical_packs
      WHERE id = ${packId} AND activo = true
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      console.warn(`[packs] pack ${packId} no encontrado — usando Pack 001`);
      return PACK_001_FARMACIA;
    }
    const pack: VerticalPack = { ...row };
    packCache.set(packId, { value: pack, expiresAt: Date.now() + PACK_CACHE_TTL_MS });
    return pack;
  } catch (err) {
    console.error("[packs] error cargando pack, usando Pack 001:", err);
    return PACK_001_FARMACIA;
  }
}

/** Resuelve el pack asignado a un tenant. */
export async function getPackForTenant(
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<VerticalPack> {
  const cached = tenantPackCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return getPack(cached.packId);

  if (!hasDatabase) return PACK_001_FARMACIA;

  try {
    const rows = await sql<{ pack_id: string }[]>`
      SELECT pack_id FROM tenants WHERE id = ${tenantId} LIMIT 1
    `;
    const packId = rows[0]?.pack_id ?? "001";
    tenantPackCache.set(tenantId, { packId, expiresAt: Date.now() + PACK_CACHE_TTL_MS });
    return getPack(packId);
  } catch (err) {
    console.error("[packs] error resolviendo pack del tenant, usando Pack 001:", err);
    return PACK_001_FARMACIA;
  }
}

// ── Calibración de conversión (PRD §9) ───────────────────────

export type ConversionTier = "T1" | "T2" | "T3" | "override";

export interface TasaConversion {
  /** Tasa a aplicar, en [0,1]. */
  tasa: number;
  /** De dónde salió — determina el badge que muestra la UI. */
  tier: ConversionTier;
  /** Eventos de atribución usados en la calibración (solo T3). */
  n: number;
  /** Texto del badge. */
  label: string;
}

/** Fuerza del prior en la contracción bayesiana: con n=k el prior pesa 50%. */
export const PRIOR_STRENGTH = 50;

/** Mínimo de eventos para considerar la tasa calibrada con datos del tenant. */
export const MIN_EVENTS_FOR_T3 = 50;

/**
 * Contracción bayesiana hacia el prior del pack.
 *
 *   tasa = (conversiones + prior × k) / (contactados + k)
 *
 * Con n=0 devuelve exactamente el prior; con n=500 el prior pesa ~9%.
 * Evita que 3 conversiones afortunadas produzcan una tasa del 100%.
 */
export function shrinkToPrior(
  conversiones: number,
  contactados: number,
  prior: number,
  k: number = PRIOR_STRENGTH,
): number {
  if (contactados <= 0) return prior;
  return (conversiones + prior * k) / (contactados + k);
}

/**
 * Resuelve la tasa de conversión de una acción con su procedencia.
 *
 * La UI **siempre** debe mostrar el badge junto a la cifra de ingreso
 * proyectado: un número que el dueño usa para comprar inventario tiene
 * que decir de dónde salió (PRD §9.3).
 */
export function resolveTasaConversion(params: {
  pack: VerticalPack;
  accion: keyof PackConversionPrior;
  /** Eventos reales del tenant, si existen. */
  conversiones?: number;
  contactados?: number;
  /** Override manual del dueño, si lo hay. */
  override?: number | null;
}): TasaConversion {
  const { pack, accion, conversiones = 0, contactados = 0, override } = params;

  const priorRaw = pack.conversion_prior[accion];
  const prior = typeof priorRaw === "number" ? priorRaw : 0;

  if (override !== null && override !== undefined) {
    return { tasa: override, tier: "override", n: contactados, label: "Ajustada por ti" };
  }

  if (contactados >= MIN_EVENTS_FOR_T3) {
    return {
      tasa: shrinkToPrior(conversiones, contactados, prior),
      tier: "T3",
      n: contactados,
      label: `Calibrado con tus datos (n=${contactados})`,
    };
  }

  // Sin evidencia propia suficiente: se usa el prior del pack, y el
  // badge refleja qué respaldo tiene ese prior. La distinción viene
  // del campo `tier_prior`, no de la identidad del pack.
  return pack.tier_prior === "T1"
    ? { tasa: prior, tier: "T1", n: contactados, label: "Estimación general" }
    : { tasa: prior, tier: "T2", n: contactados, label: "Referencia del sector" };
}

// ── Helpers de ontología ─────────────────────────────────────

/** Etiqueta de UI para un concepto, con fallback al término genérico. */
export function label(pack: VerticalPack, clave: string, fallback: string): string {
  return pack.labels[clave] ?? fallback;
}

/** True si el módulo está habilitado para el vertical del tenant. */
export function moduloHabilitado(pack: VerticalPack, modulo: keyof PackModulos): boolean {
  return pack.modulos[modulo] === true;
}

/** True si el modo de captura visual está habilitado (receta, placa_vin, etc.). */
export function capturaVisualSoporta(pack: VerticalPack, modo: string): boolean {
  return pack.captura_visual.modos.includes(modo);
}
