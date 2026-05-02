// =============================================================
// Sellix AI — Upload Excel (Postgres-backed)
//
// Recibe Excel de ventas/remisiones, detecta columnas, persiste
// en Postgres (uploads + ventas + clientes), y encola productos
// no clasificados para enriquecimiento async vía Gemini.
//
// Funciona en Vercel serverless sin filesystem.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { sql, hasDatabase, DEFAULT_TENANT_ID } from "@/lib/db";
import { invalidateDataCache } from "@/lib/dataService";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // permitir hasta 60s para uploads grandes

// ── Column detection ──────────────────────────────────────────

const ANONYMOUS_IDS = new Set(["222222222222", "0", "", "SIN_CEDULA"]);

function norm(s: string): string {
  return String(s ?? "").toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function findCol(headers: string[], exact: string[], containsAll?: string[][]): string | null {
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

function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val !== "string") return 0;
  const cleaned = val.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseStr(val: unknown): string {
  return val === null || val === undefined ? "" : String(val).trim();
}

/** Read a row column safely — returns null if header is null. */
function readCol(row: Record<string, unknown>, col: string | null): unknown {
  return col ? row[col] : null;
}

// ── Process workbook → DB ──────────────────────────────────────

interface ProcessResult {
  uploadId: string;
  rowsProcessed: number;
  customersFound: number;
  newProductsQueued: number;
}

async function processWorkbookToDb(
  buffer: Buffer,
  originalName: string,
  tenantId: string,
  uploadedBy?: string,
): Promise<ProcessResult> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!wb.SheetNames.length) throw new Error("Excel sin hojas");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: null });
  if (!rows.length) throw new Error("Hoja sin datos");

  const headers = Object.keys(rows[0]);
  const cedCol = findCol(headers,
    ["CEDULA", "DOCUMENTO", "ID_CLIENTE", "IDENT_CLIENTE", "IDENTIFICACION_CLIENTE"],
    [["IDENT", "CLIENTE"], ["IDENTIFICACION", "CLIENTE"], ["DOCUMENTO"], ["CEDULA"]]);
  const nomCol = findCol(headers, ["CLIENTE", "NOMBRE", "NOMBRE_CLIENTE"], [["NOMBRE", "CLIENTE"]]);
  const telCol = findCol(headers, ["TELEFONO", "CELULAR", "TEL", "TELEFONO_CLIENTE"], [["TELEFONO"], ["CELULAR"]]);
  const fecCol = findCol(headers, ["FECHA", "FECHA_VENTA", "FECHA_REMISION", "FECHA_MOVIMIENTO"], [["FECHA", "MOVIMIENTO"], ["FECHA"]]);
  const codCol = findCol(headers, ["CODIGO", "COD_PROD", "ITEM", "COD_PRODUCTO", "CODIGO_PRODUCTO"], [["CODIGO", "PRODUCTO"], ["COD", "PRODUCTO"]]);
  const prodCol = findCol(headers, ["PRODUCTO", "DESCRIPCION", "NOMBRE_PROD", "NOMBRE_PRODUCTO"], [["NOMBRE", "PRODUCTO"], ["DESCRIPCION"]]);
  const cantCol = findCol(headers, ["CANTIDAD", "UNIDADES", "QTY", "CANTIDAD_UNIDAD"], [["CANTIDAD", "UNIDAD"], ["CANTIDAD"]]);
  const totCol = findCol(headers, ["TOTAL", "VALOR_TOTAL", "VENTA", "VALOR_VENTA_NETA"], [["VALOR", "TOTAL"], ["VALOR", "VENTA", "NETA"], ["TOTAL"]]);
  const sesCol = findCol(headers, ["SESION", "TICKET", "FACTURA", "REMISION", "CONSECUTIVO_MOVIMIENTO"], [["CONSECUTIVO"], ["FACTURA"], ["TICKET"], ["REMISION"]]);

  if (!cedCol || !fecCol) {
    throw new Error(`Columnas críticas no encontradas. Cabeceras: ${headers.slice(0, 8).join(", ")}...`);
  }

  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Insert upload row
  await sql`
    INSERT INTO uploads (id, tenant_id, filename, file_type, row_count, active, uploaded_by, processed_at)
    VALUES (${uploadId}, ${tenantId}, ${originalName}, ${"ventas"}, ${rows.length}, true, ${uploadedBy ?? null}, now())
  `;

  // Map rows + collect clientes/productos
  const clientesMap = new Map<string, {
    tenant_id: string; cedula: string; nombre: string | null; telefono: string | null;
    primera_compra: string; ultima_compra: string;
  }>();
  const productosObservados = new Map<string, string>(); // codigo → nombre
  const ventasRows: Array<{
    tenant_id: string; upload_id: string; cedula: string; fecha: Date;
    codigo: string; producto: string; cantidad: number; total: number; sesion: string;
  }> = [];

  for (const r of rows) {
    const cedula = parseStr(readCol(r, cedCol));
    if (!cedula || ANONYMOUS_IDS.has(cedula)) continue;

    const fecha = parseDate(readCol(r, fecCol));
    if (!fecha) continue;

    const codigo = parseStr(readCol(r, codCol));
    const producto = parseStr(readCol(r, prodCol));
    if (!codigo && !producto) continue;

    const cantidad = parseNum(readCol(r, cantCol)) || 1;
    const total = parseNum(readCol(r, totCol));
    const sesion = parseStr(readCol(r, sesCol)) || `${cedula}_${fecha.toISOString().slice(0, 10)}`;

    const codigoFinal = codigo || `SIN_CODIGO_${producto.slice(0, 30)}`;

    ventasRows.push({
      tenant_id: tenantId, upload_id: uploadId, cedula, fecha,
      codigo: codigoFinal, producto, cantidad, total, sesion,
    });

    if (codigo && producto && !productosObservados.has(codigo)) {
      productosObservados.set(codigo, producto);
    }

    const fechaIso = fecha.toISOString().slice(0, 10);
    const existing = clientesMap.get(cedula);
    const nombreVal = parseStr(readCol(r, nomCol));
    const telVal = parseStr(readCol(r, telCol));
    if (!existing) {
      clientesMap.set(cedula, {
        tenant_id: tenantId, cedula,
        nombre: nombreVal || null,
        telefono: telVal || null,
        primera_compra: fechaIso, ultima_compra: fechaIso,
      });
    } else {
      if (fechaIso < existing.primera_compra) existing.primera_compra = fechaIso;
      if (fechaIso > existing.ultima_compra) existing.ultima_compra = fechaIso;
      if (!existing.nombre && nombreVal) existing.nombre = nombreVal;
      if (!existing.telefono && telVal) existing.telefono = telVal;
    }
  }

  // Insert clientes (upsert)
  const clientesArr = Array.from(clientesMap.values());
  const CB = 500;
  for (let i = 0; i < clientesArr.length; i += CB) {
    await sql`
      INSERT INTO clientes ${sql(clientesArr.slice(i, i + CB))}
      ON CONFLICT (tenant_id, cedula) DO UPDATE SET
        nombre = COALESCE(EXCLUDED.nombre, clientes.nombre),
        telefono = COALESCE(EXCLUDED.telefono, clientes.telefono),
        primera_compra = LEAST(clientes.primera_compra, EXCLUDED.primera_compra),
        ultima_compra = GREATEST(clientes.ultima_compra, EXCLUDED.ultima_compra),
        updated_at = now()
    `;
  }

  // Insert ventas
  const VB = 1000;
  for (let i = 0; i < ventasRows.length; i += VB) {
    await sql`INSERT INTO ventas ${sql(ventasRows.slice(i, i + VB))}`;
  }

  // Encolar productos nuevos (no clasificados) para Gemini async
  let newProductsQueued = 0;
  if (productosObservados.size) {
    const codigos = Array.from(productosObservados.keys());
    const existentes = await sql<{ codigo: string }[]>`
      SELECT codigo FROM productos_master WHERE codigo = ANY(${codigos})
    `;
    const existentesSet = new Set(existentes.map((r) => r.codigo));
    const nuevos = Array.from(productosObservados.entries())
      .filter(([cod]) => !existentesSet.has(cod))
      .map(([codigo, nombre]) => ({ tenant_id: tenantId, codigo, nombre, status: "pending" }));

    if (nuevos.length) {
      // Insertar también en productos_master (sin clasificar) para que aparezcan
      const masterRows = nuevos.map((n) => ({
        codigo: n.codigo,
        nombre_normalizado: n.nombre,
        classification_source: null,
      }));
      const MB = 500;
      for (let i = 0; i < masterRows.length; i += MB) {
        await sql`
          INSERT INTO productos_master ${sql(masterRows.slice(i, i + MB))}
          ON CONFLICT (codigo) DO NOTHING
        `;
      }

      for (let i = 0; i < nuevos.length; i += MB) {
        await sql`INSERT INTO classification_queue ${sql(nuevos.slice(i, i + MB))}`;
      }
      newProductsQueued = nuevos.length;
    }
  }

  // Productos del tenant (nombre + código observado, sin precios — vienen del upload)
  const tenantProds = Array.from(productosObservados.entries()).map(([codigo, nombre]) => ({
    tenant_id: tenantId, codigo, nombre,
  }));
  for (let i = 0; i < tenantProds.length; i += CB) {
    await sql`
      INSERT INTO productos_tenant ${sql(tenantProds.slice(i, i + CB))}
      ON CONFLICT (tenant_id, codigo) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        updated_at = now()
    `;
  }

  // Audit log
  await sql`
    INSERT INTO audit_log (tenant_id, actor, action, entity_type, entity_id, payload)
    VALUES (${tenantId}, ${uploadedBy ?? "unknown"}, ${"upload.create"}, ${"upload"}, ${uploadId},
      ${sql.json({ filename: originalName, rows: rows.length, ventas: ventasRows.length, clientes: clientesArr.length, new_products: newProductsQueued })})
  `;

  return {
    uploadId,
    rowsProcessed: ventasRows.length,
    customersFound: clientesArr.length,
    newProductsQueued,
  };
}

// ── GET: list uploads ─────────────────────────────────────────

export async function GET() {
  if (!hasDatabase) {
    return NextResponse.json({
      files: [],
      serverless: true,
      dataStats: { hasData: false, totalRecords: 0, jsonFiles: 0 },
      error: "DATABASE_URL no configurada",
    });
  }

  const tenantId = DEFAULT_TENANT_ID;
  const uploads = await sql<{
    id: string; filename: string; row_count: number; active: boolean;
    uploaded_at: Date; file_type: string;
  }[]>`
    SELECT id, filename, row_count, active, uploaded_at, file_type
    FROM uploads
    WHERE tenant_id = ${tenantId}
    ORDER BY uploaded_at DESC
  `;

  const [{ count: ventasCount }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM ventas v
    LEFT JOIN uploads u ON u.id = v.upload_id
    WHERE v.tenant_id = ${tenantId} AND (u.active IS NULL OR u.active = true)
  `;
  const [{ count: clientesCount }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM clientes WHERE tenant_id = ${tenantId}
  `;
  const [{ count: productosCount }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM productos_master
  `;
  const [{ count: pendingClass }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM classification_queue WHERE status = 'pending' AND tenant_id = ${tenantId}
  `;

  return NextResponse.json({
    files: uploads.map((u) => ({
      id: u.id,
      name: u.filename,
      uploadDate: u.uploaded_at,
      rowCount: u.row_count,
      active: u.active,
    })),
    serverless: true,
    dataStats: {
      hasData: ventasCount > 0,
      totalRecords: clientesCount,
      ventasCount,
      productosCount,
      pendingClassification: pendingClass,
      jsonFiles: 0,
    },
  });
}

// ── POST: upload Excel ────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!hasDatabase) {
    return NextResponse.json({ error: "DATABASE_URL no configurada en este entorno" }, { status: 500 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se recibió archivo." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processWorkbookToDb(buffer, file.name, DEFAULT_TENANT_ID);

    invalidateDataCache();
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      id: result.uploadId,
      rowsProcessed: result.rowsProcessed,
      customersFound: result.customersFound,
      newProductsQueued: result.newProductsQueued,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al procesar el archivo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PUT: toggle active ────────────────────────────────────────

export async function PUT(request: NextRequest) {
  if (!hasDatabase) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });
  }
  try {
    const { id, active } = await request.json() as { id: string; active: boolean };
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    await sql`
      UPDATE uploads SET active = ${active}
      WHERE id = ${id} AND tenant_id = ${DEFAULT_TENANT_ID}
    `;

    invalidateDataCache();
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al actualizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE: remove upload + ventas asociadas ──────────────────

export async function DELETE(request: NextRequest) {
  if (!hasDatabase) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });
  }
  try {
    const { id } = await request.json() as { id: string };
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    // Delete cascada: ventas asociadas a este upload
    await sql`DELETE FROM ventas WHERE upload_id = ${id} AND tenant_id = ${DEFAULT_TENANT_ID}`;
    await sql`DELETE FROM uploads WHERE id = ${id} AND tenant_id = ${DEFAULT_TENANT_ID}`;

    invalidateDataCache();
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al eliminar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
