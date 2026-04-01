"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Trash2, Loader2, RefreshCw,
} from "lucide-react";

interface FileEntry {
  id: string;
  name: string;
  uploadDate: string;
  rowCount: number;
  active: boolean;
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null); // file id being toggled/deleted
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/upload");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // ── Upload ──
  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setUploadMsg({ type: "err", text: "Solo se aceptan archivos .xlsx o .xls" });
      return;
    }
    setFileName(file.name);
    setUploading(true);
    setUploadMsg(null);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadMsg({
        type: "ok",
        text: `${file.name} cargado — ${data.rowsProcessed?.toLocaleString("es-CO")} filas, ${data.customersFound?.toLocaleString("es-CO")} clientes`,
      });
      loadFiles();
    } catch (e) {
      setUploadMsg({ type: "err", text: e instanceof Error ? e.message : "Error inesperado" });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  // ── Toggle ──
  async function toggleFile(id: string, active: boolean) {
    setProcessing(id);
    try {
      await fetch("/api/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      loadFiles();
    } catch { /* ignore */ }
    finally { setProcessing(null); }
  }

  // ── Delete ──
  async function deleteFile(id: string) {
    if (!confirm("¿Eliminar este archivo? El dashboard se recalculará sin él.")) return;
    setProcessing(id);
    try {
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadFiles();
    } catch { /* ignore */ }
    finally { setProcessing(null); }
  }

  const activeCount = files.filter((f) => f.active).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cargar datos de ventas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Puedes subir múltiples archivos Excel. El análisis combina todos los archivos activos.
        </p>
      </div>

      {/* ── File list ── */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Archivos de datos
              <span className="ml-2 text-xs font-normal text-gray-400">
                {activeCount} de {files.length} activos
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {files.map((f) => (
              <li
                key={f.id}
                className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                  f.active ? "bg-white" : "bg-gray-50 opacity-60"
                }`}
              >
                <FileSpreadsheet className={`w-5 h-5 flex-shrink-0 ${f.active ? "text-green-500" : "text-gray-400"}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">
                    {f.rowCount.toLocaleString("es-CO")} filas ·{" "}
                    {new Date(f.uploadDate).toLocaleDateString("es-CO", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleFile(f.id, !f.active)}
                  disabled={processing === f.id}
                  title={f.active ? "Desactivar" : "Activar"}
                  className="relative w-10 h-5 rounded-full transition-colors disabled:opacity-50"
                  style={{ backgroundColor: f.active ? "#185FA5" : "#d1d5db" }}
                >
                  {processing === f.id ? (
                    <Loader2 className="w-3.5 h-3.5 text-white absolute top-0.5 left-3 animate-spin" />
                  ) : (
                    <span
                      className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        f.active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteFile(f.id)}
                  disabled={processing === f.id}
                  title="Eliminar archivo"
                  className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Upload message ── */}
      {uploadMsg && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            uploadMsg.type === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {uploadMsg.type === "ok" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {uploadMsg.text}
        </div>
      )}

      {/* ── Drop zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
          isDragging ? "border-brand-blue bg-blue-50"
          : "border-gray-300 bg-white hover:border-brand-blue hover:bg-blue-50/30"
        }`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        {uploading ? (
          <div className="space-y-3 pointer-events-none">
            <RefreshCw className="w-10 h-10 text-brand-blue animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-700">Procesando {fileName}…</p>
            <p className="text-xs text-gray-400">Detectando columnas · Ejecutando análisis</p>
          </div>
        ) : (
          <div className="space-y-2 pointer-events-none">
            <Upload className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-sm font-medium text-gray-700">
              {files.length > 0 ? "Agregar otro archivo" : "Arrastra tu archivo Excel aquí"}
            </p>
            <p className="text-xs text-gray-400">o haz clic para seleccionarlo · .xlsx / .xls</p>
          </div>
        )}
      </div>

      {/* ── Column help ── */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="px-5 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-50">
          ¿Qué columnas detecta el sistema?
        </summary>
        <div className="px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-xs text-gray-500">
          {[
            ["Identificación",  "CEDULA, NIT, IDENT_CLIENTE, IDENTIFICACION CLIENTE…"],
            ["Nombre",          "NOMBRE, NOMBRE_CLIENTE, NOMBRE CLIENTE…"],
            ["Apellido",        "APELLIDO_CLIENTE (se combina con nombre)"],
            ["Teléfono",        "TELEFONO, CELULAR, TELEFONO CLIENTE…"],
            ["Fecha",           "FECHA, FECHA_VENTA, FECHA MOVIMIENTO…"],
            ["Producto",        "PRODUCTO, NOMBRE_PRODUCTO, DESCRIPCION…"],
            ["Código",          "CODIGO, COD_PRODUCTO, CODIGO PRODUCTO…"],
            ["Cantidad",        "CANTIDAD, CANTIDAD_UNIDAD, CANTIDAD_CAJA, CANTIDAD_BLISTER (se suman)"],
            ["Valor total",     "VALOR_TOTAL, TOTAL, VALOR VENTA NETA…"],
            ["Transacción",     "SESION, FACTURA, REVISION, CONSECUTIVO MOVIMIENTO…"],
          ].map(([col, desc]) => (
            <div key={col}>
              <span className="font-semibold text-gray-700">{col}: </span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
        <p className="px-5 pb-3 text-xs text-gray-400">
          No importan mayúsculas, tildes ni guiones bajos.
          Si tienes archivos con columnas diferentes, sube ambos — el sistema los detecta por separado y combina los datos.
        </p>
      </details>
    </div>
  );
}
