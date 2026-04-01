"use client";

// =============================================================
// Sellix AI — Error handler raíz de la aplicación (SECURITY-15)
// Captura errores que escapan de todos los error boundaries
// Debe incluir <html> y <body> — reemplaza el layout completo
// =============================================================

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log estructurado — capturado por Vercel Logs (SECURITY-03)
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "GLOBAL_ERROR",
        context: {
          digest: error.digest ?? "unknown",
        },
      })
    );
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-gray-50">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-5">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Error de aplicación
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              La aplicación encontró un error inesperado. Por favor recargue
              la página o contacte al administrador si el problema persiste.
            </p>
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-brand-blue text-white text-sm font-medium
                         rounded-lg hover:bg-blue-800 transition-colors"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
