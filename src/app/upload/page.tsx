"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Trash2, Loader2, Database, Sparkles,
} from "lucide-react";

interface FileEntry {
  id: string;
  name: string;
  uploadDate: string;
  rowCount: number;
  active: boolean;
}

interface DataStats {
  hasData: boolean;
  totalRecords: number;
  ventasCount?: number;
  productosCount?: number;
  pendingClassification?: number;
  jsonFiles: number;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dataStats, setDataStats] = useState<DataStats>({ hasData: false, totalRecords: 0, jsonFiles: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/upload");
      const data = await res.json();
      setFiles(data.files ?? []);
      if (data.dataStats) setDataStats(data.dataStats);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

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
      const parts = [
        `${(data.rowsProcessed ?? 0).toLocaleString("es-CO")} ventas`,
        `${(data.customersFound ?? 0).toLocaleString("es-CO")} clientes`,
      ];
      if (data.newProductsQueued > 0) {
        parts.push(`${data.newProductsQueued} productos nuevos en cola de clasificación`);
      }
      setUploadMsg({
        type: "ok",
        text: `${file.name} cargado — ${parts.join(" · ")}`,
      });
      await loadFiles();
      router.refresh(); // invalida Server Components de TODAS las pestañas
    } catch (e) {
      setUploadMsg({ type: "err", text: e instanceof Error ? e.message : "Error inesperado" });
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(f: FileEntry) {
    setBusyId(f.id);
    try {
      const res = await fetch("/api/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: f.id, active: !f.active }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar");
      await loadFiles();
      router.refresh();
    } catch (e) {
      setUploadMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteFile(f: FileEntry) {
    if (!confirm(`¿Eliminar "${f.name}" y todas sus ventas asociadas? Esta acción no se puede deshacer.`)) return;
    setBusyId(f.id);
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: f.id }),
      });
      if (!res.ok) throw new Error("No se pudo eliminar");
      setUploadMsg({ type: "ok", text: `${f.name} eliminado` });
      await loadFiles();
      router.refresh();
    } catch (e) {
      setUploadMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setBusyId(null);
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de datos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sube archivos Excel de ventas o remisiones. El sistema los procesa y alimenta todos los módulos del dashboard.
        </p>
      </div>

      {/* Data status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-700">Estado de los datos</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600">Estado</p>
            <p className="text-lg font-bold text-emerald-700">{dataStats.hasData ? "Activo" : "Sin datos"}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Ventas</p>
            <p className="text-lg font-bold text-blue-700">
              {(dataStats.ventasCount ?? 0).toLocaleString("es-CO")}
            </p>
          </div>
          <div className="bg-violet-50 rounded-lg p-3">
            <p className="text-xs text-violet-600">Clientes</p>
            <p className="text-lg font-bold text-violet-700">
              {dataStats.totalRecords.toLocaleString("es-CO")}
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-600">Productos</p>
            <p className="text-lg font-bold text-amber-700">
              {(dataStats.productosCount ?? 0).toLocaleString("es-CO")}
            </p>
          </div>
        </div>
        {(dataStats.pendingClassification ?? 0) > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <Sparkles className="w-4 h-4" />
            <span>
              {dataStats.pendingClassification} producto{dataStats.pendingClassification === 1 ? "" : "s"} en cola de clasificación con IA
            </span>
          </div>
        )}
      </div>

      {/* Upload feedback */}
      {uploadMsg && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${
          uploadMsg.type === "ok"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {uploadMsg.type === "ok"
            ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span>{uploadMsg.text}</span>
        </div>
      )}

      {/* Upload zone — siempre visible, funciona en serverless con Postgres */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
          isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white hover:border-indigo-400"
        }`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {uploading ? (
          <div className="space-y-3 pointer-events-none">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-700">Procesando {fileName}…</p>
            <p className="text-xs text-gray-400">Esto puede tomar varios segundos para archivos grandes</p>
          </div>
        ) : (
          <div className="space-y-2 pointer-events-none">
            <Upload className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Arrastra tu archivo Excel aquí</p>
            <p className="text-xs text-gray-400">o haz clic para seleccionarlo · .xlsx / .xls</p>
            <p className="text-[11px] text-gray-400 pt-1">
              El archivo se agregará a los existentes — no los reemplaza
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Archivos cargados
              <span className="ml-2 text-xs font-normal text-gray-400">
                {files.filter((f) => f.active).length} de {files.length} activos
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
                <FileSpreadsheet className={`w-5 h-5 flex-shrink-0 ${f.active ? "text-emerald-500" : "text-gray-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">
                    {f.rowCount.toLocaleString("es-CO")} filas ·{" "}
                    {new Date(f.uploadDate).toLocaleDateString("es-CO", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>

                {/* Toggle active */}
                <button
                  onClick={() => toggleActive(f)}
                  disabled={busyId === f.id}
                  title={f.active ? "Desactivar" : "Activar"}
                  className="relative w-10 h-5 rounded-full transition-colors disabled:opacity-50"
                  style={{ backgroundColor: f.active ? "#6366F1" : "#d1d5db" }}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      f.active ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteFile(f)}
                  disabled={busyId === f.id}
                  title="Eliminar archivo y sus ventas"
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {busyId === f.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
