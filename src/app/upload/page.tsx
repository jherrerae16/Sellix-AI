"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Trash2, Loader2, RefreshCw, Cloud, Database,
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
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isServerless, setIsServerless] = useState(false);
  const [dataStats, setDataStats] = useState<{ hasData: boolean; totalRecords: number; files: number }>({ hasData: false, totalRecords: 0, files: 0 });

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/upload");
      const data = await res.json();
      setFiles(data.files ?? []);
      setIsServerless(data.serverless === true);
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
      setUploadMsg({
        type: "ok",
        text: `${file.name} cargado — ${data.rowsProcessed?.toLocaleString("es-CO")} filas`,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de datos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Los datos de ventas se procesan y alimentan todos los módulos del dashboard.
        </p>
      </div>

      {/* Serverless notice */}
      {isServerless && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Cloud className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Plataforma en la nube</p>
            <p className="text-xs text-blue-600 mt-1">
              Los datos están pre-cargados en el servidor. Para actualizar los datos de ventas,
              contacte al administrador de la plataforma.
            </p>
          </div>
        </div>
      )}

      {/* Data status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-700">Estado de los datos</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600">Estado</p>
            <p className="text-lg font-bold text-emerald-700">{dataStats.hasData ? "Activo" : "Sin datos"}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Archivos JSON</p>
            <p className="text-lg font-bold text-blue-700">{dataStats.files}</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-3">
            <p className="text-xs text-violet-600">Clientes analizados</p>
            <p className="text-lg font-bold text-violet-700">{dataStats.totalRecords.toLocaleString("es-CO")}</p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Archivos cargados</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-4 px-5 py-3">
                <FileSpreadsheet className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">
                    {f.rowCount.toLocaleString("es-CO")} filas ·{" "}
                    {new Date(f.uploadDate).toLocaleDateString("es-CO", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  f.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {f.active ? "Activo" : "Inactivo"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload zone — only show if not serverless */}
      {!isServerless && (
        <>
          {uploadMsg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
              uploadMsg.type === "ok"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {uploadMsg.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {uploadMsg.text}
            </div>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
              isDragging ? "border-brand-blue bg-blue-50" : "border-gray-300 bg-white hover:border-brand-blue"
            }`}
          >
            <input type="file" accept=".xlsx,.xls" onChange={handleChange} disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            {uploading ? (
              <div className="space-y-3 pointer-events-none">
                <RefreshCw className="w-10 h-10 text-brand-blue animate-spin mx-auto" />
                <p className="text-sm font-medium text-gray-700">Procesando {fileName}…</p>
              </div>
            ) : (
              <div className="space-y-2 pointer-events-none">
                <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-sm font-medium text-gray-700">Arrastra tu archivo Excel aquí</p>
                <p className="text-xs text-gray-400">o haz clic para seleccionarlo · .xlsx / .xls</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
