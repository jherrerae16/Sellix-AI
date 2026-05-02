// =============================================================
// Sellix AI — Data Service (Postgres)
//
// Lee datos crudos desde Postgres y computa los datasets derivados
// (KPIs, recurrencia, churn, ventas cruzadas, reposición) on-demand.
//
// Estrategia: cache en memoria por TTL corto. Para Vercel serverless
// el módulo se mantiene caliente entre invocaciones de la misma instancia,
// así que el cache funciona como amortiguador real.
//
// Si DATABASE_URL no está configurada, todas las funciones lanzan.
// El llamador debe usar `hasDatabase` desde db.ts y caer al servicio
// JSON tradicional como fallback.
// =============================================================

import { sql, DEFAULT_TENANT_ID } from "./db";
import type {
  KPIsResumen, ClienteRecurrencia, ClienteChurnV2, ChurnResumen,
  ReposicionPendiente, VentasCruzadasV2, ProductoClasificado,
  TipoClienteRecurrencia, TipoChurnV2,
} from "./types";

// ── Cache simple en memoria con TTL ─────────────────────────
// 5 min TTL: con cold starts en Vercel cada invocación nueva paga el cómputo
// completo. Cuando la lambda ya está caliente, esto hace que las páginas
// secundarias (reposición, churn, NBA) reutilicen las ventas ya cargadas.

const CACHE_TTL_MS = 5 * 60_000;
type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value);
  return loader().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  });
}

/** Invalida cache — llamar tras un upload. */
export function invalidateDataCache(): void {
  cache.clear();
}

// ── Helpers ────────────────────────────────────────────────

interface VentaRow {
  cedula: string;
  nombre: string | null;
  telefono: string | null;
  fecha: Date;
  codigo: string;
  producto: string;
  cantidad: number;
  total: number;
  sesion: string | null;
  categoria_terapeutica: string | null;
  tratamiento: string | null;
  es_cronico: boolean | null;
}

async function getAllVentas(tenantId: string): Promise<VentaRow[]> {
  return cached(`ventas:${tenantId}`, async () => {
    // Solo incluye ventas de uploads activos (o ventas sin upload_id, por compat)
    const rows = await sql<VentaRow[]>`
      SELECT
        v.cedula, c.nombre, c.telefono, v.fecha, v.codigo, v.producto,
        v.cantidad::float as cantidad, v.total::float as total, v.sesion,
        pm.categoria_terapeutica, pm.tratamiento, pm.es_cronico
      FROM ventas v
      LEFT JOIN clientes c ON c.tenant_id = v.tenant_id AND c.cedula = v.cedula
      LEFT JOIN productos_master pm ON pm.codigo = v.codigo
      LEFT JOIN uploads u ON u.id = v.upload_id
      WHERE v.tenant_id = ${tenantId}
        AND (u.active IS NULL OR u.active = true)
      ORDER BY v.fecha
    `;
    return rows.map((r) => ({ ...r, fecha: new Date(r.fecha) }));
  });
}

// ── KPIs Resumen ───────────────────────────────────────────

export async function getKPIsResumenDb(tenantId = DEFAULT_TENANT_ID): Promise<KPIsResumen> {
  return cached(`kpis:${tenantId}`, async () => {
    const ventas = await getAllVentas(tenantId);
    if (!ventas.length) {
      return {
        total_transacciones: 0,
        clientes_unicos: 0,
        ingresos_totales: 0,
        ticket_promedio: 0,
        clientes_en_riesgo_alto: 0,
        oportunidades_cruzada: 0,
        periodo: "Sin datos — suba un archivo de ventas",
      };
    }

    const sesiones = new Set(ventas.map((v) => v.sesion ?? `${v.cedula}_${v.fecha.toISOString().slice(0, 10)}`));
    const clientes = new Set(ventas.map((v) => v.cedula));
    const ingresos = ventas.reduce((s, v) => s + v.total, 0);
    const fechas = ventas.map((v) => v.fecha.getTime()).sort((a, b) => a - b);
    const min = new Date(fechas[0]).toISOString().slice(0, 10);
    const max = new Date(fechas[fechas.length - 1]).toISOString().slice(0, 10);

    const churn = await getChurnV2Db(tenantId);
    const enRiesgo = churn.filter((c) =>
      c.tipo_churn === "churn_riesgo" ||
      c.tipo_churn === "churn_tratamiento" ||
      c.tipo_churn === "churn_cronico"
    ).length;

    const cruzadas = await getVentasCruzadasV2Db(tenantId);

    return {
      total_transacciones: sesiones.size,
      clientes_unicos: clientes.size,
      ingresos_totales: ingresos,
      ticket_promedio: sesiones.size ? ingresos / sesiones.size : 0,
      clientes_en_riesgo_alto: enRiesgo,
      oportunidades_cruzada: cruzadas.por_producto.length,
      periodo: `${min} a ${max}`,
    };
  });
}

// ── Productos clasificados ─────────────────────────────────

export async function getProductosClasificadosDb(): Promise<ProductoClasificado[]> {
  return cached("productos_clasificados", async () => {
    const rows = await sql`
      SELECT codigo, nombre_normalizado as nombre, principio_activo,
             categoria_atc, categoria_terapeutica, subcategoria,
             tipo_tratamiento, tratamiento, es_cronico, es_receta
      FROM productos_master
      WHERE classification_source IS NOT NULL
    `;
    return rows.map((r) => ({
      codigo: r.codigo,
      nombre: r.nombre,
      principio_activo: r.principio_activo ?? "",
      categoria_atc: r.categoria_atc ?? "",
      categoria_terapeutica: r.categoria_terapeutica ?? "Sin clasificar",
      subcategoria: r.subcategoria ?? "",
      tipo_tratamiento: (r.tipo_tratamiento ?? "no_aplica") as ProductoClasificado["tipo_tratamiento"],
      tratamiento: r.tratamiento ?? "",
      es_cronico: !!r.es_cronico,
      es_receta: !!r.es_receta,
    }));
  });
}

// ── Recurrencia (6 tipos de cliente) ───────────────────────
// Computado on-demand desde ventas + productos_master

export async function getRecurrenciaDb(tenantId = DEFAULT_TENANT_ID): Promise<ClienteRecurrencia[]> {
  return cached(`recurrencia:${tenantId}`, async () => {
    const ventas = await getAllVentas(tenantId);
    if (!ventas.length) return [];

    const REF_DATE = new Date();

    // Agrupar por cliente
    const porCliente = new Map<string, VentaRow[]>();
    for (const v of ventas) {
      if (!porCliente.has(v.cedula)) porCliente.set(v.cedula, []);
      porCliente.get(v.cedula)!.push(v);
    }

    const resultado: ClienteRecurrencia[] = [];

    for (const [cedula, vs] of porCliente) {
      vs.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

      // Sesiones (tickets)
      const sesionesSet = new Set(vs.map((v) => v.sesion ?? `${v.cedula}_${v.fecha.toISOString().slice(0, 10)}`));
      const numSesiones = sesionesSet.size;

      // Productos / categorías / tratamientos
      const productosCount = new Map<string, { codigo: string; nombre: string; veces: number }>();
      const categoriasCount = new Map<string, number>();
      const tratamientosCount = new Map<string, number>();

      for (const v of vs) {
        const k = v.codigo;
        const cur = productosCount.get(k);
        if (cur) cur.veces += 1;
        else productosCount.set(k, { codigo: v.codigo, nombre: v.producto, veces: 1 });

        if (v.categoria_terapeutica) {
          categoriasCount.set(v.categoria_terapeutica, (categoriasCount.get(v.categoria_terapeutica) ?? 0) + 1);
        }
        if (v.tratamiento) {
          tratamientosCount.set(v.tratamiento, (tratamientosCount.get(v.tratamiento) ?? 0) + 1);
        }
      }

      const top_productos = Array.from(productosCount.values())
        .sort((a, b) => b.veces - a.veces).slice(0, 10);
      const top_categorias = Array.from(categoriasCount.entries())
        .map(([categoria, veces]) => ({ categoria, veces }))
        .sort((a, b) => b.veces - a.veces).slice(0, 5);
      const top_tratamientos = Array.from(tratamientosCount.entries())
        .map(([tratamiento, veces]) => ({ tratamiento, veces }))
        .sort((a, b) => b.veces - a.veces).slice(0, 5);

      // Frecuencia
      const fechasUnicas = Array.from(new Set(vs.map((v) => v.fecha.toISOString().slice(0, 10))))
        .sort();
      let frecuencia_dias = 0;
      if (fechasUnicas.length > 1) {
        const intervals: number[] = [];
        for (let i = 1; i < fechasUnicas.length; i++) {
          const diff = (new Date(fechasUnicas[i]).getTime() - new Date(fechasUnicas[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
          intervals.push(diff);
        }
        frecuencia_dias = intervals.reduce((s, n) => s + n, 0) / intervals.length;
      }

      const ultimaCompra = vs[vs.length - 1].fecha;
      const primeraCompra = vs[0].fecha;
      const dias_sin_comprar = Math.floor((REF_DATE.getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));

      const ingreso_total = vs.reduce((s, v) => s + v.total, 0);
      const ticket_promedio = numSesiones ? ingreso_total / numSesiones : 0;

      // Clasificación
      const tieneCronicos = vs.some((v) => v.es_cronico);
      const topProdVeces = top_productos[0]?.veces ?? 0;
      const topCatVeces = top_categorias[0]?.veces ?? 0;
      const topTratVeces = top_tratamientos[0]?.veces ?? 0;

      let tipo_cliente: TipoClienteRecurrencia;
      let razon: string;

      const inactivo = frecuencia_dias > 0 && dias_sin_comprar > frecuencia_dias * 3;
      if (inactivo) {
        tipo_cliente = "inactivo";
        razon = `Sin comprar hace ${dias_sin_comprar}d (frec ~${Math.round(frecuencia_dias)}d)`;
      } else if (topProdVeces >= 3 && topProdVeces / numSesiones >= 0.4) {
        tipo_cliente = "recurrente_producto";
        razon = `Compra ${top_productos[0].nombre} ${topProdVeces}x`;
      } else if (topTratVeces >= 3 && tieneCronicos) {
        tipo_cliente = "recurrente_tratamiento";
        razon = `Tratamiento crónico: ${top_tratamientos[0].tratamiento}`;
      } else if (topCatVeces >= 3) {
        tipo_cliente = "recurrente_categoria";
        razon = `Compra ${top_categorias[0].categoria} ${topCatVeces}x`;
      } else if (numSesiones >= 5) {
        tipo_cliente = "frecuente_multicomprador";
        razon = `${numSesiones} compras de productos variados`;
      } else {
        tipo_cliente = "ocasional";
        razon = `${numSesiones} compras esporádicas`;
      }

      // Formato preferido — derivamos del producto top (o caja por default)
      const formato_preferido: "caja" | "blister" | "unidad" = "unidad";

      resultado.push({
        cedula,
        nombre: vs[0].nombre ?? "",
        telefono: vs[0].telefono ?? null,
        tipo_cliente,
        razon,
        num_sesiones: numSesiones,
        num_productos_diferentes: productosCount.size,
        num_categorias_diferentes: categoriasCount.size,
        num_tratamientos_diferentes: tratamientosCount.size,
        ingreso_total,
        ticket_promedio,
        frecuencia_dias,
        dias_sin_comprar,
        ultima_compra: ultimaCompra.toISOString(),
        primera_compra: primeraCompra.toISOString(),
        formato_preferido,
        dia_mes_promedio: 15,
        tiene_cronicos: tieneCronicos,
        top_productos,
        top_categorias,
        top_tratamientos,
      });
    }

    return resultado;
  });
}

// ── Churn v2 ───────────────────────────────────────────────

export async function getChurnV2Db(tenantId = DEFAULT_TENANT_ID): Promise<ClienteChurnV2[]> {
  return cached(`churn_v2:${tenantId}`, async () => {
    const recurrencia = await getRecurrenciaDb(tenantId);
    const REF_DATE = new Date();

    return recurrencia.map((cli) => {
      const churn_ratio = cli.frecuencia_dias > 0 ? cli.dias_sin_comprar / cli.frecuencia_dias : 0;

      let tipo_churn: TipoChurnV2;
      let nivel_riesgo: "alto" | "medio" | "bajo";
      let razon: string;

      const tratamientos_abandonados = cli.top_tratamientos
        .filter((t) => cli.tiene_cronicos)
        .slice(0, 3)
        .map((t) => ({
          tratamiento: t.tratamiento,
          es_cronico: cli.tiene_cronicos,
          dias_sin_comprar: cli.dias_sin_comprar,
          compras_totales: t.veces,
        }));

      if (churn_ratio < 1.5) {
        tipo_churn = "activo";
        nivel_riesgo = "bajo";
        razon = "Compra dentro de su frecuencia normal";
      } else if (churn_ratio < 2.5) {
        tipo_churn = "churn_riesgo";
        nivel_riesgo = "medio";
        razon = `Lleva ${cli.dias_sin_comprar}d sin comprar (frec ~${Math.round(cli.frecuencia_dias)}d)`;
      } else if (cli.tiene_cronicos && churn_ratio >= 2.5) {
        tipo_churn = "churn_cronico";
        nivel_riesgo = "alto";
        razon = `Crónico abandonó tratamiento hace ${cli.dias_sin_comprar}d`;
      } else if (churn_ratio >= 4) {
        tipo_churn = "churn_total";
        nivel_riesgo = "alto";
        razon = `${cli.dias_sin_comprar}d sin comprar — riesgo de pérdida total`;
      } else if (cli.ingreso_total > 500_000 && churn_ratio >= 2.5) {
        tipo_churn = "alto_valor_inactivo";
        nivel_riesgo = "alto";
        razon = `VIP inactivo (ingreso histórico $${Math.round(cli.ingreso_total).toLocaleString()})`;
      } else {
        tipo_churn = "churn_tratamiento";
        nivel_riesgo = "medio";
        razon = `Abandonó productos recurrentes`;
      }

      return {
        cedula: cli.cedula,
        nombre: cli.nombre,
        telefono: cli.telefono,
        tipo_churn,
        nivel_riesgo,
        razon,
        dias_sin_comprar: cli.dias_sin_comprar,
        frecuencia_dias: cli.frecuencia_dias,
        churn_ratio,
        total_compras: cli.num_sesiones,
        ingreso_total: cli.ingreso_total,
        ticket_cambio_pct: 0,
        ultima_compra: cli.ultima_compra,
        tratamientos_abandonados,
        tratamientos_activos: tipo_churn === "activo" ? cli.top_tratamientos.map((t) => t.tratamiento) : [],
        tiene_churn_cronico: tipo_churn === "churn_cronico",
      };
    });
  });
}

export async function getChurnResumenDb(tenantId = DEFAULT_TENANT_ID): Promise<ChurnResumen> {
  const churn = await getChurnV2Db(tenantId);
  const por_tipo: Record<string, number> = {};
  const por_riesgo: Record<string, number> = {};
  const tratamientosCount = new Map<string, Set<string>>();
  for (const c of churn) {
    por_tipo[c.tipo_churn] = (por_tipo[c.tipo_churn] ?? 0) + 1;
    por_riesgo[c.nivel_riesgo] = (por_riesgo[c.nivel_riesgo] ?? 0) + 1;
    for (const t of c.tratamientos_abandonados) {
      if (!tratamientosCount.has(t.tratamiento)) tratamientosCount.set(t.tratamiento, new Set());
      tratamientosCount.get(t.tratamiento)!.add(c.cedula);
    }
  }
  const top_tratamientos_abandonados = Array.from(tratamientosCount.entries())
    .map(([tratamiento, set]) => ({ tratamiento, clientes: set.size }))
    .sort((a, b) => b.clientes - a.clientes).slice(0, 10);
  return {
    total_clientes: churn.length,
    por_tipo,
    por_riesgo,
    top_tratamientos_abandonados,
  };
}

// ── Reposición pendiente ───────────────────────────────────
// Calculado en SQL puro para no traer 11k filas y agruparlas en JS.
// Agrupa por (cedula, codigo), arma intervalos con LAG, y proyecta
// próxima reposición = última compra + promedio de intervalos.

interface ReposicionRow {
  cedula: string;
  nombre: string | null;
  telefono: string | null;
  codigo: string;
  producto: string;
  ultima_compra: Date;
  ciclo_dias: number;
  proxima_reposicion: Date;
  dias_para_reposicion: number;
  historial_compras: Date[];
  intervalos_dias: number[];
}

export async function getReposicionesPendientesDb(tenantId = DEFAULT_TENANT_ID): Promise<ReposicionPendiente[]> {
  return cached(`reposicion:${tenantId}`, async () => {
    const rows = await sql<ReposicionRow[]>`
      WITH ventas_activas AS (
        SELECT v.cedula, v.codigo, v.producto, v.fecha
        FROM ventas v
        LEFT JOIN uploads u ON u.id = v.upload_id
        WHERE v.tenant_id = ${tenantId}
          AND (u.active IS NULL OR u.active = true)
      ),
      con_lag AS (
        SELECT cedula, codigo, producto, fecha,
               LAG(fecha) OVER (PARTITION BY cedula, codigo ORDER BY fecha) AS prev_fecha
        FROM ventas_activas
      ),
      intervalos AS (
        SELECT cedula, codigo, producto, fecha,
               EXTRACT(EPOCH FROM (fecha - prev_fecha))/86400 AS dias
        FROM con_lag
        WHERE prev_fecha IS NOT NULL
      ),
      ciclos AS (
        SELECT cedula, codigo,
               AVG(dias) FILTER (WHERE dias > 0 AND dias < 365) AS ciclo_dias,
               array_agg(ROUND(dias)::int ORDER BY fecha) FILTER (WHERE dias > 0 AND dias < 365) AS intervalos_dias
        FROM intervalos
        GROUP BY cedula, codigo
      ),
      ultima_compra AS (
        SELECT DISTINCT ON (cedula, codigo)
               cedula, codigo, producto, fecha AS ultima
        FROM ventas_activas
        ORDER BY cedula, codigo, fecha DESC
      ),
      historial AS (
        SELECT cedula, codigo, array_agg(fecha ORDER BY fecha) AS historial
        FROM ventas_activas
        GROUP BY cedula, codigo
        HAVING COUNT(*) >= 2
      )
      SELECT
        uc.cedula,
        cl.nombre,
        cl.telefono,
        uc.codigo,
        uc.producto,
        uc.ultima AS ultima_compra,
        ROUND(c.ciclo_dias)::int AS ciclo_dias,
        (uc.ultima + (c.ciclo_dias || ' days')::interval) AS proxima_reposicion,
        EXTRACT(DAY FROM ((uc.ultima + (c.ciclo_dias || ' days')::interval) - now()))::int AS dias_para_reposicion,
        h.historial AS historial_compras,
        c.intervalos_dias
      FROM ultima_compra uc
      JOIN ciclos c USING (cedula, codigo)
      JOIN historial h USING (cedula, codigo)
      LEFT JOIN clientes cl ON cl.tenant_id = ${tenantId} AND cl.cedula = uc.cedula
      WHERE c.ciclo_dias IS NOT NULL
        AND EXTRACT(DAY FROM ((uc.ultima + (c.ciclo_dias || ' days')::interval) - now()))::int <= 30
      ORDER BY dias_para_reposicion ASC
    `;

    return rows.map((r) => {
      const dias = Number(r.dias_para_reposicion);
      let estado: "Vencido" | "Esta semana" | "Próximo mes";
      if (dias < 0) estado = "Vencido";
      else if (dias <= 7) estado = "Esta semana";
      else estado = "Próximo mes";

      return {
        cedula: r.cedula,
        nombre: r.nombre ?? "",
        telefono: r.telefono ?? null,
        codigo: r.codigo,
        producto: r.producto,
        ultima_compra: new Date(r.ultima_compra).toISOString(),
        ciclo_dias: Number(r.ciclo_dias),
        proxima_reposicion: new Date(r.proxima_reposicion).toISOString(),
        dias_para_reposicion: dias,
        estado,
        historial_compras: (r.historial_compras ?? []).map((d) => new Date(d).toISOString()),
        intervalos_dias: r.intervalos_dias ?? [],
      };
    });
  });
}

// ── Ventas cruzadas v2 ─────────────────────────────────────

export async function getVentasCruzadasV2Db(tenantId = DEFAULT_TENANT_ID): Promise<VentasCruzadasV2> {
  return cached(`cruzadas_v2:${tenantId}`, async () => {
    const ventas = await getAllVentas(tenantId);
    if (!ventas.length) {
      return { total_sesiones: 0, por_producto: [], por_categoria: [], por_tratamiento: [] };
    }

    // Agrupar por sesión
    const sesiones = new Map<string, VentaRow[]>();
    for (const v of ventas) {
      const k = v.sesion ?? `${v.cedula}_${v.fecha.toISOString().slice(0, 10)}`;
      if (!sesiones.has(k)) sesiones.set(k, []);
      sesiones.get(k)!.push(v);
    }

    const N = sesiones.size;

    // Contar pares de productos en la misma sesión
    const paresProd = new Map<string, { a: VentaRow; b: VentaRow; veces: number }>();
    const conteoProd = new Map<string, number>();
    const paresCat = new Map<string, { a: string; b: string; veces: number }>();
    const conteoCat = new Map<string, number>();
    const paresTrat = new Map<string, { a: string; b: string; veces: number }>();
    const conteoTrat = new Map<string, number>();

    for (const items of sesiones.values()) {
      const seenProd = new Set<string>();
      const seenCat = new Set<string>();
      const seenTrat = new Set<string>();

      for (const it of items) {
        if (!seenProd.has(it.codigo)) {
          seenProd.add(it.codigo);
          conteoProd.set(it.codigo, (conteoProd.get(it.codigo) ?? 0) + 1);
        }
        if (it.categoria_terapeutica && !seenCat.has(it.categoria_terapeutica)) {
          seenCat.add(it.categoria_terapeutica);
          conteoCat.set(it.categoria_terapeutica, (conteoCat.get(it.categoria_terapeutica) ?? 0) + 1);
        }
        if (it.tratamiento && !seenTrat.has(it.tratamiento)) {
          seenTrat.add(it.tratamiento);
          conteoTrat.set(it.tratamiento, (conteoTrat.get(it.tratamiento) ?? 0) + 1);
        }
      }

      const arrProd = Array.from(seenProd);
      const arrCat = Array.from(seenCat);
      const arrTrat = Array.from(seenTrat);

      for (let i = 0; i < arrProd.length; i++) {
        for (let j = i + 1; j < arrProd.length; j++) {
          const [a, b] = [arrProd[i], arrProd[j]].sort();
          const key = `${a}|${b}`;
          if (!paresProd.has(key)) {
            const ra = items.find((x) => x.codigo === a)!;
            const rb = items.find((x) => x.codigo === b)!;
            paresProd.set(key, { a: ra, b: rb, veces: 0 });
          }
          paresProd.get(key)!.veces += 1;
        }
      }
      for (let i = 0; i < arrCat.length; i++) {
        for (let j = i + 1; j < arrCat.length; j++) {
          const [a, b] = [arrCat[i], arrCat[j]].sort();
          const key = `${a}|${b}`;
          if (!paresCat.has(key)) paresCat.set(key, { a, b, veces: 0 });
          paresCat.get(key)!.veces += 1;
        }
      }
      for (let i = 0; i < arrTrat.length; i++) {
        for (let j = i + 1; j < arrTrat.length; j++) {
          const [a, b] = [arrTrat[i], arrTrat[j]].sort();
          const key = `${a}|${b}`;
          if (!paresTrat.has(key)) paresTrat.set(key, { a, b, veces: 0 });
          paresTrat.get(key)!.veces += 1;
        }
      }
    }

    const MIN_SUPPORT = 3;

    const por_producto = Array.from(paresProd.values())
      .filter((p) => p.veces >= MIN_SUPPORT)
      .map((p) => {
        const support = p.veces / N;
        const ca = (conteoProd.get(p.a.codigo) ?? 1) / N;
        const cb = (conteoProd.get(p.b.codigo) ?? 1) / N;
        return {
          item_a: { codigo: p.a.codigo, nombre: p.a.producto, categoria: p.a.categoria_terapeutica ?? "", tratamiento: p.a.tratamiento ?? "" },
          item_b: { codigo: p.b.codigo, nombre: p.b.producto, categoria: p.b.categoria_terapeutica ?? "", tratamiento: p.b.tratamiento ?? "" },
          veces_juntos: p.veces,
          support,
          confianza_ab: support / ca,
          confianza_ba: support / cb,
          lift: support / (ca * cb),
        };
      })
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 100);

    const buildGeneric = (pares: Map<string, { a: string; b: string; veces: number }>, conteo: Map<string, number>) =>
      Array.from(pares.values())
        .filter((p) => p.veces >= MIN_SUPPORT)
        .map((p) => {
          const support = p.veces / N;
          const ca = (conteo.get(p.a) ?? 1) / N;
          const cb = (conteo.get(p.b) ?? 1) / N;
          return {
            item_a: p.a, item_b: p.b, veces_juntos: p.veces, support,
            confianza_ab: support / ca, confianza_ba: support / cb,
            lift: support / (ca * cb),
          };
        })
        .sort((a, b) => b.lift - a.lift)
        .slice(0, 50);

    return {
      total_sesiones: N,
      por_producto,
      por_categoria: buildGeneric(paresCat, conteoCat),
      por_tratamiento: buildGeneric(paresTrat, conteoTrat),
    };
  });
}
