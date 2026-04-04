// =============================================================
// Sellix AI — Módulo 2.2: Productos Gancho
// Server Component — mapa de burbujas + tabla de productos
// =============================================================

export const dynamic = "force-dynamic";

import { getProductosGancho } from "@/lib/dataService";
import { BubbleGancho } from "@/components/charts/BubbleGancho";
import { GanchoTable } from "@/components/tables/GanchoTable";
import { AdminOnly } from "@/components/layout/AdminOnly";

export default async function GanchoPage() {
  const productos = await getProductosGancho();

  const primarios = productos.filter((p) => p.categoria_gancho === "Gancho Primario");
  const secundarios = productos.filter((p) => p.categoria_gancho === "Gancho Secundario");
  const volumen = productos.filter((p) => p.categoria_gancho === "Volumen puro");
  const nicho = productos.filter((p) => p.categoria_gancho === "Nicho estratégico");

  return (
    <AdminOnly>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Productos Gancho</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {productos.length} productos analizados
        </p>
      </div>

      {/* Cards de categorías */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Gancho Primario",
            count: primarios.length,
            desc: "Alta frec. + alto arrastre",
            color: "border-l-brand-blue bg-blue-50",
          },
          {
            label: "Gancho Secundario",
            count: secundarios.length,
            desc: "Alta frec. + arrastre medio",
            color: "border-l-brand-green bg-green-50",
          },
          {
            label: "Volumen puro",
            count: volumen.length,
            desc: "Alta frec. + bajo arrastre",
            color: "border-l-risk-medium bg-orange-50",
          },
          {
            label: "Nicho estratégico",
            count: nicho.length,
            desc: "Baja frec. + alto ticket",
            color: "border-l-purple-500 bg-purple-50",
          },
        ].map((cat) => (
          <div
            key={cat.label}
            className={`rounded-xl border border-gray-200 border-l-4 p-4 ${cat.color}`}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {cat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{cat.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* Instrucción de lectura */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Gancho Primario:</strong> promocionar activamente — generan tráfico y arrastran compras adicionales.{" "}
          <strong>Volumen puro:</strong> alta rotación pero poca compra complementaria.{" "}
          <strong>Nicho estratégico:</strong> alto ticket unitario, priorizar en ventas personalizadas.
        </p>
      </div>

      {/* Mapa de burbujas */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-800">
            Mapa de productos — Atracción vs. Arrastre
          </h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Tamaño de burbuja proporcional al ticket promedio de sesión
        </p>
        <BubbleGancho data={productos} />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Catálogo de productos gancho
        </h2>
        <GanchoTable data={productos} />
      </div>
    </div>
    </AdminOnly>
  );
}
