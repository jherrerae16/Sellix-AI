export const dynamic = "force-dynamic";

import { getVentasCruzadas, getVentasCruzadasV2 } from "@/lib/dataService";
import { VentaCruzadaTable } from "@/components/tables/VentaCruzadaTable";
import { CrossSellV2Tabs } from "@/components/tables/CrossSellV2Tabs";
import { Package, Layers, Stethoscope } from "lucide-react";

export default async function VentaCruzadaPage() {
  const [ventasCruzadas, v2] = await Promise.all([
    getVentasCruzadas(),
    getVentasCruzadasV2(),
  ]);

  const hasV2 = v2.por_producto.length > 0 || v2.por_categoria.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Venta Cruzada</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Asociaciones de productos, categorías y tratamientos
        </p>
      </div>

      {hasV2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Asociaciones multinivel</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Analizando {v2.total_sesiones.toLocaleString("es-CO")} sesiones de venta en 3 niveles
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-blue-50 p-3 flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-lg font-bold text-gray-900">{v2.por_producto.length}</p>
                <p className="text-xs text-gray-500">Pares de productos</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-indigo-50 p-3 flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-lg font-bold text-gray-900">{v2.por_categoria.length}</p>
                <p className="text-xs text-gray-500">Pares de categorías</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-emerald-50 p-3 flex items-center gap-3">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-lg font-bold text-gray-900">{v2.por_tratamiento.length}</p>
                <p className="text-xs text-gray-500">Pares de tratamientos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CrossSellV2Tabs data={v2} />
          </div>
        </div>
      )}

      {/* Original simple table for legacy / cashier view */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Recomendaciones para Punto de Venta</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {ventasCruzadas.length} pares con panel simple para el cajero
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <VentaCruzadaTable data={ventasCruzadas} />
        </div>
      </div>
    </div>
  );
}
