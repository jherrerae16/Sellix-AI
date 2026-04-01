"use client";

// =============================================================
// Sellix AI — Error boundary de página (SECURITY-15)
// Muestra mensaje genérico — nunca expone stack traces al usuario
// Loguea el error en consola (capturado por Vercel Logs)
// =============================================================

import { useEffect } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log estructurado — capturado por Vercel Logs (SECURITY-03)
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "PAGE_ERROR",
        context: {
          digest: error.digest ?? "unknown",
          // NO incluir error.message ni error.stack al usuario
        },
      })
    );
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
          <AlertCircle className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Ocurrió un error
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          No fue posible cargar esta sección. Por favor intente de nuevo.
          Si el problema persiste, contacte al administrador.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5
                     bg-brand-blue text-white text-sm font-medium rounded-lg
                     hover:bg-blue-800 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
