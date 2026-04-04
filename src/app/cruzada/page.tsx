export const dynamic = "force-dynamic";

import { getVentasCruzadas } from "@/lib/dataService";
import { VentaCruzadaTable } from "@/components/tables/VentaCruzadaTable";

export default async function VentaCruzadaPage() {
  const ventasCruzadas = await getVentasCruzadas();
  const productosBase = new Set(ventasCruzadas.map((v) => v.producto_base)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Detección de Venta Cruzada
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {ventasCruzadas.length} pares de productos · {productosBase} productos base
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Haz clic en cualquier fila</strong> para ver el detalle de la
          recomendación y la explicación para el cajero.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <VentaCruzadaTable data={ventasCruzadas} />
      </div>
    </div>
  );
}
