// =============================================================
// Sellix AI — Página 404 en español
// =============================================================

import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md px-6">
        <p className="text-6xl font-bold text-brand-blue mb-4">404</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Página no encontrada
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          La página que busca no existe o fue movida.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5
                       bg-brand-blue text-white text-sm font-medium rounded-lg
                       hover:bg-blue-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
