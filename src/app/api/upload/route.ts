import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { runETL } from "@/lib/etl";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs";

// ─── paths ────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const DATA_DIR    = path.join(process.cwd(), "data", "output");
const MANIFEST    = path.join(UPLOADS_DIR, "manifest.json");

// ─── manifest CRUD ────────────────────────────────────────────

interface FileEntry {
  id: string;
  name: string;
  uploadDate: string;
  rowCount: number;
  active: boolean;
}
interface Manifest { files: FileEntry[] }

function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readManifest(): Manifest {
  ensureDirs();
  if (!fs.existsSync(MANIFEST)) return { files: [] };
  return JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
}

function writeManifest(m: Manifest) {
  ensureDirs();
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2), "utf-8");
}

// ─── reprocess all active files ───────────────────────────────

const OUTPUT_FILES = [
  "kpis_resumen.json", "ventas_mensuales.json", "top_productos.json",
  "ventas_cruzadas.json", "churn_clientes.json", "reposicion_pendiente.json",
  "clientes_rfm.json", "productos_gancho.json",
] as const;

const EMPTY_KPIS = {
  total_transacciones: 0, clientes_unicos: 0, ingresos_totales: 0,
  ticket_promedio: 0, clientes_en_riesgo_alto: 0, oportunidades_cruzada: 0, periodo: "",
};

function reprocess(): { rowsProcessed: number; customersFound: number } {
  const manifest = readManifest();
  const active = manifest.files.filter((f) => f.active);

  if (!active.length) {
    // Write empty data
    fs.writeFileSync(path.join(DATA_DIR, "kpis_resumen.json"), JSON.stringify(EMPTY_KPIS, null, 2));
    for (const f of OUTPUT_FILES) {
      if (f !== "kpis_resumen.json") {
        fs.writeFileSync(path.join(DATA_DIR, f), "[]");
      }
    }
    return { rowsProcessed: 0, customersFound: 0 };
  }

  const fileSets: Record<string, unknown>[][] = [];
  for (const entry of active) {
    const fp = path.join(UPLOADS_DIR, `${entry.id}.xlsx`);
    if (!fs.existsSync(fp)) continue;
    const buf = fs.readFileSync(fp);
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: null });
    fileSets.push(rows);
  }

  if (!fileSets.length) return { rowsProcessed: 0, customersFound: 0 };

  const result = runETL(fileSets);

  for (const filename of OUTPUT_FILES) {
    fs.writeFileSync(
      path.join(DATA_DIR, filename),
      JSON.stringify(result[filename], null, 2),
      "utf-8",
    );
  }

  revalidatePath("/", "layout");
  return { rowsProcessed: result.rowsProcessed, customersFound: result.customersFound };
}

// ─── GET: list files ──────────────────────────────────────────

const isServerless = !!process.env.VERCEL;

export async function GET() {
  const manifest = readManifest();

  // Check if pre-loaded data exists in data/output/
  let dataStats = { hasData: false, totalRecords: 0, files: 0 };
  try {
    const outputDir = path.join(process.cwd(), "data", "output");
    const outputFiles = fs.readdirSync(outputDir).filter((f: string) => f.endsWith(".json") && f !== ".gitkeep");
    if (outputFiles.length > 0) {
      dataStats.hasData = true;
      dataStats.files = outputFiles.length;
      // Count records from churn (as proxy for total customers)
      const churnPath = path.join(outputDir, "churn_clientes.json");
      if (fs.existsSync(churnPath)) {
        const churn = JSON.parse(fs.readFileSync(churnPath, "utf-8"));
        dataStats.totalRecords = Array.isArray(churn) ? churn.length : 0;
      }
    }
  } catch { /* ignore */ }

  return NextResponse.json({ ...manifest, serverless: isServerless, dataStats });
}

// ─── POST: upload new file ────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se recibió archivo." }, { status: 400 });

    ensureDirs();

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Quick validation: try to read the file
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    if (!wb.SheetNames.length) return NextResponse.json({ error: "Archivo Excel vacío." }, { status: 400 });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });
    if (!rows.length) return NextResponse.json({ error: "La hoja de datos está vacía." }, { status: 400 });

    // Save file
    fs.writeFileSync(path.join(UPLOADS_DIR, `${id}.xlsx`), buffer);

    // Update manifest
    const manifest = readManifest();
    manifest.files.push({
      id,
      name: file.name,
      uploadDate: new Date().toISOString(),
      rowCount: rows.length,
      active: true,
    });
    writeManifest(manifest);

    // Reprocess all active files
    const stats = reprocess();

    return NextResponse.json({ success: true, id, ...stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al procesar el archivo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PUT: toggle active state ─────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, active } = body as { id: string; active: boolean };
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const manifest = readManifest();
    const entry = manifest.files.find((f) => f.id === id);
    if (!entry) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });

    entry.active = active;
    writeManifest(manifest);

    const stats = reprocess();
    return NextResponse.json({ success: true, ...stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al actualizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE: remove file ──────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id: string };
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const manifest = readManifest();
    manifest.files = manifest.files.filter((f) => f.id !== id);
    writeManifest(manifest);

    // Delete file from disk
    const fp = path.join(UPLOADS_DIR, `${id}.xlsx`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    const stats = reprocess();
    return NextResponse.json({ success: true, ...stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al eliminar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
