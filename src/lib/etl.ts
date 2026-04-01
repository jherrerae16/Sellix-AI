// =============================================================
// Sellix AI — ETL inteligente
// Detecta columnas automáticamente por archivo (fuzzy matching)
// Acepta múltiples archivos con esquemas diferentes
// =============================================================

import type {
  KPIsResumen, ClienteChurn, ReposicionPendiente, VentaCruzada,
  ClienteRFM, ProductoGancho, VentaMensual, TopProducto,
} from "./types";

const ANONYMOUS_IDS = new Set(["222222222222", "0", "", "SIN_CEDULA"]);

interface SaleRow {
  cedula: string;
  nombre: string;
  telefono: string | null;
  fecha: Date;
  fechaStr: string;
  producto: string;
  codigo: string;
  cantidad: number;
  total: number;
  sesion: string;
}

export interface ETLResult {
  "kpis_resumen.json": KPIsResumen;
  "ventas_mensuales.json": VentaMensual[];
  "top_productos.json": TopProducto[];
  "ventas_cruzadas.json": VentaCruzada[];
  "churn_clientes.json": ClienteChurn[];
  "reposicion_pendiente.json": ReposicionPendiente[];
  "clientes_rfm.json": ClienteRFM[];
  "productos_gancho.json": ProductoGancho[];
  rowsProcessed: number;
  customersFound: number;
}

// ─── fuzzy column matching ───────────────────────────────────

/** Normalize: uppercase, remove accents, remove non-alphanumeric */
function norm(s: string): string {
  return s.toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Find a column by exact normalized match OR by keyword containment.
 * Returns the original header name (preserving casing).
 */
function findCol(
  headers: string[],
  exact: string[],
  containsAll?: string[][],
): string | null {
  const normed = headers.map((h) => [h, norm(h)] as const);

  for (const cand of exact) {
    const nc = norm(cand);
    const hit = normed.find(([, nh]) => nh === nc);
    if (hit) return hit[0];
  }

  if (containsAll) {
    for (const parts of containsAll) {
      const np = parts.map(norm);
      const hit = normed.find(([, nh]) => np.every((p) => nh.includes(p)));
      if (hit) return hit[0];
    }
  }

  return null;
}

// ─── value parsers ───────────────────────────────────────────

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // Handle "1.500.000" (es-CO thousands) and "1,500,000" (en)
    // Strategy: if string has dots and commas, last separator is decimal
    let clean = val.replace(/[$\s]/g, "");
    // If format is 1.500.000 (dots as thousands), remove dots
    if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
      clean = clean.replace(/\./g, "");
    } else if (/^\d{1,3}(\.\d{3})+,\d+$/.test(clean)) {
      // 1.500,50 → 1500.50
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string") {
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = val.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T00:00:00`);
    // YYYY-MM-DD
    const ymd = val.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymd) return new Date(`${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}T00:00:00`);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toISO(d: Date): string { return d.toISOString().slice(0, 10); }
function daysDiff(from: Date, to: Date): number { return Math.round((to.getTime() - from.getTime()) / 86400000); }

function quintile(values: number[], value: number, invert = false): number {
  if (!values.length) return 3;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = sorted.filter((v) => v <= value).length / sorted.length;
  const score = Math.min(5, Math.ceil(rank * 5) || 1);
  return invert ? 6 - score : score;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function avgFreq(sortedDates: string[]): number {
  if (sortedDates.length < 2) return 30;
  const diffs: number[] = [];
  for (let i = 1; i < sortedDates.length; i++)
    diffs.push(daysDiff(new Date(sortedDates[i - 1]), new Date(sortedDates[i])));
  return diffs.reduce((s, d) => s + d, 0) / diffs.length;
}

// ─── per-file row parser ─────────────────────────────────────

function parseFileRows(rawRows: Record<string, unknown>[]): SaleRow[] {
  if (!rawRows.length) return [];
  const headers = Object.keys(rawRows[0]);

  // ── Detect columns ──
  const colCedula = findCol(headers,
    ["CEDULA", "NIT", "DOCUMENTO", "CC", "IDCLIENTE", "IDENTIFICACION", "IDENTCLIENTE"],
    [["IDENT", "CLIENT"], ["IDENTIFICACION"]],
  );
  const colNombre = findCol(headers,
    ["NOMBRE", "NOMBRECLIENTE", "CLIENTE", "RAZONSOCIAL", "NOMCLIENTE"],
    [["NOMBRE", "CLIENT"], ["NOM", "CLIENT"]],
  );
  const colApellido = findCol(headers,
    ["APELLIDO", "APELLIDOCLIENTE"],
    [["APELLIDO", "CLIENT"], ["APELLIDO"]],
  );
  const colTel = findCol(headers,
    ["TELEFONO", "TEL", "CELULAR", "MOVIL", "TELEFONOCLIENTE"],
    [["TELEFON"], ["CELULAR"], ["MOVIL"]],
  );
  const colFecha = findCol(headers,
    ["FECHA", "FECHAVENTA", "FECHAFACTURA", "FECHADOCUMENTO", "FECHAMOVIMIENTO"],
    [["FECHA", "MOV"], ["FECHA", "VENT"], ["FECHA"]],
  );
  const colProducto = findCol(headers,
    ["PRODUCTO", "DESCRIPCION", "ARTICULO", "ITEM", "NOMBREPRODUCTO", "NOMPRODUCTO"],
    [["NOMBRE", "PRODUCT"], ["NOM", "PRODUCT"], ["DESCRIPCION"]],
  );
  const colCodigo = findCol(headers,
    ["CODIGO", "COD", "REFERENCIA", "REF", "CODIGOPRODUCTO", "CODPRODUCTO"],
    [["COD", "PRODUCT"], ["CODIGO", "PROD"]],
  );

  // Quantity columns (multi-column support for cajas/blister/unidad)
  const colCantUnidad  = findCol(headers, [], [["CANTIDAD", "UNIDAD"], ["CANT", "UNIDAD"]]);
  const colCantBlister = findCol(headers, [], [["CANTIDAD", "BLISTER"], ["CALIDAD", "BLISTER"]]);
  const colCantCaja    = findCol(headers, [], [["CANTIDAD", "CAJA"]]);
  const colCantGeneric = findCol(headers, ["CANTIDAD", "CANT", "QTY", "UNIDADES"], []);
  const hasMultiQty = !!(colCantUnidad || colCantBlister || colCantCaja);

  // Total: prefer valor_total > valor_venta_neta > sub_total
  const colTotal = findCol(headers,
    ["VALORTOTAL", "TOTAL", "VALORVENTANETA", "VENTANETA", "SUBTOTAL", "PRECIOTOTAL", "IMPORTE"],
    [["VALOR", "TOTAL"], ["VENTA", "NETA"], ["SUB", "TOTAL"]],
  );

  // Session / invoice
  const colSesion = findCol(headers,
    ["SESION", "FACTURA", "NUMEROFACTURA", "TICKET", "TRANSACCION", "NUMERO",
     "PEDIDO", "ORDEN", "REVISION", "CONSECUTIVOMOVIMIENTO"],
    [["CONSECUTIVO", "MOV"], ["FACTURA"], ["REVISION"]],
  );

  if (!colFecha)   throw new Error(`Columna de FECHA no encontrada. Columnas: ${headers.join(", ")}`);
  if (!colTotal)   throw new Error(`Columna de TOTAL/VALOR no encontrada. Columnas: ${headers.join(", ")}`);

  const rows: SaleRow[] = [];

  for (const raw of rawRows) {
    const fecha = parseDate(raw[colFecha!]);
    if (!fecha) continue;
    const total = parseNum(raw[colTotal!]);
    if (total <= 0) continue;

    const cedula = colCedula ? String(raw[colCedula] ?? "").trim() : "SIN_CEDULA";
    const codigo = colCodigo ? String(raw[colCodigo!] ?? "").trim() : "";

    // Product name: use nombre_producto if available, else codigo
    let producto = "";
    if (colProducto) {
      producto = String(raw[colProducto!] ?? "").trim().toUpperCase();
    }
    if (!producto && codigo) {
      producto = codigo;
    }
    if (!producto) producto = "PRODUCTO";

    // Nombre + Apellido
    let nombre = colNombre ? String(raw[colNombre] ?? "").trim().toUpperCase() : "SIN NOMBRE";
    if (colApellido) {
      const apellido = String(raw[colApellido] ?? "").trim().toUpperCase();
      if (apellido) nombre = `${nombre} ${apellido}`;
    }

    // Quantity
    let cantidad = 1;
    if (hasMultiQty) {
      cantidad = (colCantUnidad ? parseNum(raw[colCantUnidad]) : 0)
        + (colCantBlister ? parseNum(raw[colCantBlister]) : 0)
        + (colCantCaja ? parseNum(raw[colCantCaja]) : 0);
      if (cantidad <= 0) cantidad = 1;
    } else if (colCantGeneric) {
      cantidad = Math.max(1, parseNum(raw[colCantGeneric]));
    }

    const sesion = colSesion
      ? String(raw[colSesion!] ?? "").trim()
      : `${cedula}_${toISO(fecha)}`;

    rows.push({
      cedula: cedula || "SIN_CEDULA",
      nombre,
      telefono: colTel ? (String(raw[colTel] ?? "").trim() || null) : null,
      fecha,
      fechaStr: toISO(fecha),
      producto,
      codigo,
      cantidad,
      total,
      sesion: sesion || `${cedula}_${toISO(fecha)}`,
    });
  }

  return rows;
}

// ─── cross-reference product names ───────────────────────────

function enrichProductNames(rows: SaleRow[]): void {
  const nameByCode: Record<string, string> = {};
  for (const r of rows) {
    if (r.codigo && r.producto !== r.codigo && r.producto !== "PRODUCTO") {
      nameByCode[r.codigo] = r.producto;
    }
  }
  for (const r of rows) {
    if ((r.producto === r.codigo || r.producto === "PRODUCTO") && nameByCode[r.codigo]) {
      r.producto = nameByCode[r.codigo];
    }
  }
}

// ─── analysis (runs on combined rows) ────────────────────────

function analyze(rows: SaleRow[]): ETLResult {
  const maxDate = rows.reduce((m, r) => (r.fecha > m ? r.fecha : m), rows[0].fecha);

  // ── Ventas mensuales ──
  const byMonth: Record<string, { ingresos: number; sesiones: Set<string> }> = {};
  for (const r of rows) {
    const mes = r.fechaStr.slice(0, 7);
    if (!byMonth[mes]) byMonth[mes] = { ingresos: 0, sesiones: new Set() };
    byMonth[mes].ingresos += r.total;
    byMonth[mes].sesiones.add(r.sesion);
  }
  const ventasMensuales: VentaMensual[] = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ingresos: Math.round(v.ingresos), transacciones: v.sesiones.size }));

  // ── Top productos ──
  const byProd: Record<string, { nombre: string; codigo: string; unidades: number; ingresos: number }> = {};
  for (const r of rows) {
    if (!byProd[r.producto]) byProd[r.producto] = { nombre: r.producto, codigo: r.codigo, unidades: 0, ingresos: 0 };
    byProd[r.producto].unidades += r.cantidad;
    byProd[r.producto].ingresos += r.total;
  }
  const topProductos: TopProducto[] = Object.values(byProd)
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 10)
    .map((p) => ({ ...p, unidades: Math.round(p.unidades), ingresos: Math.round(p.ingresos) }));

  // ── KPIs base ──
  const allSesiones = new Set(rows.map((r) => r.sesion));
  const cedulasActivas = new Set(rows.filter((r) => !ANONYMOUS_IDS.has(r.cedula)).map((r) => r.cedula));
  const totalIngresos = rows.reduce((s, r) => s + r.total, 0);
  const ticketPromedio = allSesiones.size > 0 ? totalIngresos / allSesiones.size : 0;

  // ── Market basket ──
  const sessionProducts: Record<string, Set<string>> = {};
  const sessionTotals: Record<string, number> = {};
  for (const r of rows) {
    if (!sessionProducts[r.sesion]) sessionProducts[r.sesion] = new Set();
    sessionProducts[r.sesion].add(r.producto);
    sessionTotals[r.sesion] = (sessionTotals[r.sesion] ?? 0) + r.total;
  }

  const pairCount: Record<string, number> = {};
  const productSessions: Record<string, number> = {};
  const totalSessions = Object.keys(sessionProducts).length;

  for (const prods of Object.values(sessionProducts)) {
    const arr = [...prods];
    for (const p of arr) productSessions[p] = (productSessions[p] ?? 0) + 1;
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++) {
        const key = [arr[i], arr[j]].sort().join("|||");
        pairCount[key] = (pairCount[key] ?? 0) + 1;
      }
  }

  const ventasCruzadas: VentaCruzada[] = [];
  for (const [key, count] of Object.entries(pairCount)) {
    if (count < 5) continue;
    const [a, b] = key.split("|||");
    const suppA = (productSessions[a] ?? 1) / totalSessions;
    const suppB = (productSessions[b] ?? 1) / totalSessions;
    const suppAB = count / totalSessions;
    const conf = suppAB / suppA;
    const lift = conf / suppB;
    if (lift < 1.5) continue;

    ventasCruzadas.push({
      producto_base: a,
      producto_recomendado: b,
      veces_juntos: count,
      lift: Math.round(lift * 100) / 100,
      confianza: Math.round(conf * 100) / 100,
      incremento_ticket_estimado: byProd[b]
        ? Math.round(byProd[b].ingresos / Math.max(1, byProd[b].unidades))
        : 0,
    });
  }
  ventasCruzadas.sort((a, b) => b.lift - a.lift);

  // ── Customer rows (exclude anonymous) ──
  const customerRows: Record<string, SaleRow[]> = {};
  for (const r of rows) {
    if (ANONYMOUS_IDS.has(r.cedula)) continue;
    if (!customerRows[r.cedula]) customerRows[r.cedula] = [];
    customerRows[r.cedula].push(r);
  }

  // ── Churn ──
  const churnClientes: ClienteChurn[] = [];
  for (const [cedula, cRows] of Object.entries(customerRows)) {
    const dates = [...new Set(cRows.map((r) => r.fechaStr))].sort();
    const ultimaCompra = dates[dates.length - 1];
    const diasSin = daysDiff(new Date(ultimaCompra), maxDate);
    const frecuencia = avgFreq(dates);
    const churnScore = Math.round((diasSin / Math.max(frecuencia, 1)) * 100) / 100;
    const nivel_riesgo = churnScore >= 2.0 ? "Alto" : churnScore >= 1.3 ? "Medio" : "Bajo";

    churnClientes.push({
      cedula,
      nombre: cRows[0].nombre,
      telefono: cRows[0].telefono,
      ultima_compra: ultimaCompra,
      frecuencia_promedio_dias: Math.round(frecuencia * 10) / 10,
      dias_sin_comprar: diasSin,
      churn_score: churnScore,
      nivel_riesgo,
      accion_sugerida:
        churnScore >= 2.0 ? "Llamar esta semana"
        : churnScore >= 1.3 ? "Enviar WhatsApp"
        : "Monitorear",
    });
  }
  churnClientes.sort((a, b) => b.churn_score - a.churn_score);
  const altoCount = churnClientes.filter((c) => c.nivel_riesgo === "Alto").length;

  // ── Reposición (solo productos con patrón recurrente) ──
  //
  // Filtros para descartar productos esporádicos:
  //  1. Mínimo 3 compras del mismo producto por el mismo cliente
  //  2. Coeficiente de variación del ciclo ≤ 0.6 (ciclo relativamente estable)
  //     CV = desviación estándar / media. Un CV > 0.6 indica intervalos
  //     demasiado irregulares (ej: 15, 90, 30 días → no es crónico)
  //  3. Ciclo promedio ≤ 120 días (descartar compras semestrales/anuales)
  //
  const MIN_PURCHASES = 3;
  const MAX_CV = 0.6;
  const MAX_CYCLE_DAYS = 120;

  const reposicion: ReposicionPendiente[] = [];
  for (const [cedula, cRows] of Object.entries(customerRows)) {
    const byP: Record<string, SaleRow[]> = {};
    for (const r of cRows) {
      if (!byP[r.producto]) byP[r.producto] = [];
      byP[r.producto].push(r);
    }
    for (const [prod, pRows] of Object.entries(byP)) {
      const dates = [...new Set(pRows.map((r) => r.fechaStr))].sort();

      // Filtro 1: mínimo de compras
      if (dates.length < MIN_PURCHASES) continue;

      // Calcular intervalos entre compras consecutivas
      const diffs: number[] = [];
      for (let i = 1; i < dates.length; i++)
        diffs.push(daysDiff(new Date(dates[i - 1]), new Date(dates[i])));

      const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length;

      // Filtro 3: ciclo no mayor a MAX_CYCLE_DAYS
      if (mean > MAX_CYCLE_DAYS) continue;

      // Filtro 2: coeficiente de variación ≤ MAX_CV
      const variance = diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / diffs.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 999;
      if (cv > MAX_CV) continue;

      // Producto pasa los filtros → calcular reposición
      const ultima = dates[dates.length - 1];
      const proxima = new Date(ultima);
      proxima.setDate(proxima.getDate() + Math.round(mean));
      const diasPara = daysDiff(maxDate, proxima);
      if (diasPara > 30) continue;

      reposicion.push({
        cedula,
        nombre: pRows[0].nombre,
        telefono: pRows[0].telefono,
        producto: prod,
        ultima_compra: ultima,
        ciclo_dias: Math.round(mean * 10) / 10,
        proxima_reposicion: toISO(proxima),
        dias_para_reposicion: diasPara,
        estado: diasPara < 0 ? "Vencido" : diasPara <= 7 ? "Esta semana" : "Próximo mes",
        historial_compras: dates,
        intervalos_dias: diffs,
      });
    }
  }
  reposicion.sort((a, b) => a.dias_para_reposicion - b.dias_para_reposicion);

  // ── RFM ──
  type RFMRaw = {
    cedula: string; nombre: string; telefono: string | null;
    ultima_compra: string; firstDate: string;
    recency: number; frequency: number; monetary: number; ticket: number; churnScore: number;
  };
  const rfmRaw: RFMRaw[] = [];
  for (const [cedula, cRows] of Object.entries(customerRows)) {
    const dates = [...new Set(cRows.map((r) => r.fechaStr))].sort();
    const sessions = new Set(cRows.map((r) => r.sesion));
    const monetary = cRows.reduce((s, r) => s + r.total, 0);
    const ultima = dates[dates.length - 1];
    const freq = sessions.size;
    const cs = churnClientes.find((c) => c.cedula === cedula)?.churn_score ?? 0;

    rfmRaw.push({
      cedula, nombre: cRows[0].nombre, telefono: cRows[0].telefono,
      ultima_compra: ultima, firstDate: dates[0],
      recency: daysDiff(new Date(ultima), maxDate),
      frequency: freq, monetary: Math.round(monetary),
      ticket: Math.round(monetary / freq), churnScore: cs,
    });
  }

  const allRecency   = rfmRaw.map((r) => r.recency);
  const allFrequency = rfmRaw.map((r) => r.frequency);
  const allMonetary  = rfmRaw.map((r) => r.monetary);

  const clientesRFM: ClienteRFM[] = rfmRaw.map((r) => {
    const sR = quintile(allRecency,   r.recency,   true);
    const sF = quintile(allFrequency, r.frequency, false);
    const sM = quintile(allMonetary,  r.monetary,  false);

    let segmento: ClienteRFM["segmento"];
    if (sR >= 4 && (sF >= 4 || sM >= 4)) segmento = "VIP";
    else if (sR >= 3 && sF >= 3) segmento = "Leal";
    else if (sR <= 2) segmento = "En riesgo";
    else segmento = "En desarrollo";

    const rangeMonths = Math.max(1, daysDiff(new Date(r.firstDate), maxDate) / 30);
    const clv = Math.round(r.ticket * (r.frequency / rangeMonths) * 12);

    return {
      cedula: r.cedula, nombre: r.nombre, telefono: r.telefono,
      ultima_compra: r.ultima_compra, recency_dias: r.recency,
      frequency: r.frequency, monetary: r.monetary,
      score_r: sR, score_f: sF, score_m: sM,
      segmento, clv_estimado_anual: clv,
      churn_score: r.churnScore, ticket_promedio: r.ticket,
    };
  });
  clientesRFM.sort((a, b) => b.clv_estimado_anual - a.clv_estimado_anual);

  // ── Productos gancho ──
  const prodStats: Record<string, {
    nombre: string; codigo: string;
    sessCount: number; totalTicket: number; otherCounts: number[];
  }> = {};
  for (const [sesion, prods] of Object.entries(sessionProducts)) {
    const arr = [...prods];
    for (const p of arr) {
      if (!prodStats[p]) {
        const s = rows.find((r) => r.producto === p);
        prodStats[p] = { nombre: p, codigo: s?.codigo ?? "", sessCount: 0, totalTicket: 0, otherCounts: [] };
      }
      prodStats[p].sessCount++;
      prodStats[p].totalTicket += sessionTotals[sesion] ?? 0;
      prodStats[p].otherCounts.push(arr.length - 1);
    }
  }

  const allAtrac = Object.values(prodStats).map((p) => p.sessCount / totalSessions);
  const allArrastre = Object.values(prodStats).map((p) =>
    p.otherCounts.length ? p.otherCounts.reduce((s, v) => s + v, 0) / p.otherCounts.length : 0
  );
  const medA = median(allAtrac);
  const medR = median(allArrastre);

  const productosGancho: ProductoGancho[] = Object.values(prodStats).map((p) => {
    const indice = p.sessCount / totalSessions;
    const arrastre = p.otherCounts.length
      ? p.otherCounts.reduce((s, v) => s + v, 0) / p.otherCounts.length : 0;
    const hiA = indice >= medA;
    const hiR = arrastre >= medR;

    return {
      nombre: p.nombre, codigo: p.codigo,
      categoria_gancho: (hiA && hiR ? "Gancho Primario"
        : !hiA && hiR ? "Gancho Secundario"
        : hiA && !hiR ? "Volumen puro"
        : "Nicho estratégico") as ProductoGancho["categoria_gancho"],
      indice_atraccion: Math.round(indice * 1000) / 1000,
      poder_arrastre: Math.round(arrastre * 100) / 100,
      tiene_descuento_frecuente: false,
      ticket_promedio_en_sesion: Math.round(p.sessCount > 0 ? p.totalTicket / p.sessCount : 0),
    };
  }).sort((a, b) => b.poder_arrastre - a.poder_arrastre);

  // ── KPIs resumen ──
  const kpis: KPIsResumen = {
    total_transacciones: allSesiones.size,
    clientes_unicos: cedulasActivas.size,
    ingresos_totales: Math.round(totalIngresos),
    ticket_promedio: Math.round(ticketPromedio),
    clientes_en_riesgo_alto: altoCount,
    oportunidades_cruzada: ventasCruzadas.length,
    periodo: `${ventasMensuales[0]?.mes ?? ""} - ${ventasMensuales[ventasMensuales.length - 1]?.mes ?? ""}`,
  };

  return {
    "kpis_resumen.json": kpis,
    "ventas_mensuales.json": ventasMensuales,
    "top_productos.json": topProductos,
    "ventas_cruzadas.json": ventasCruzadas,
    "churn_clientes.json": churnClientes,
    "reposicion_pendiente.json": reposicion,
    "clientes_rfm.json": clientesRFM,
    "productos_gancho.json": productosGancho,
    rowsProcessed: rows.length,
    customersFound: Object.keys(customerRows).length,
  };
}

// ─── main entry: accepts multiple files ──────────────────────

export function runETL(fileSets: Record<string, unknown>[][]): ETLResult {
  const allRows: SaleRow[] = [];

  for (const rawRows of fileSets) {
    if (!rawRows.length) continue;
    allRows.push(...parseFileRows(rawRows));
  }

  if (!allRows.length) throw new Error("No se encontraron filas válidas en ningún archivo.");

  // Cross-reference product names between files
  enrichProductNames(allRows);

  return analyze(allRows);
}
