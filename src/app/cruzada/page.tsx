export const dynamic = "force-dynamic";

import { getVentasCruzadasV2, getBundles } from "@/lib/dataService";
import { CrossSellV2Tabs } from "@/components/tables/CrossSellV2Tabs";
import { Package, Layers, Stethoscope, ShoppingBag } from "lucide-react";

export default async function VentaCruzadaPage() {
  const [v2, bundles] = await Promise.all([
    getVentasCruzadasV2(),
    getBundles(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Venta Cruzada</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Asociaciones encontradas en {v2.total_sesiones.toLocaleString("es-CO")} sesiones de venta
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-blue-50 p-3 flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{v2.por_producto.length}</p>
            <p className="text-xs text-gray-500">Pares de productos</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-violet-50 p-3 flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-violet-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">{bundles.length}</p>
            <p className="text-xs text-gray-500">Combos de 3+ productos</p>
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
        <CrossSellV2Tabs data={v2} bundles={bundles} />
      </div>
    </div>
  );
}
