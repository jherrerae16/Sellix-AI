export const dynamic = "force-dynamic";
export const maxDuration = 60;

import {
  getKPIsResumen, getVentasMensuales, getTopProductos,
  getClientesChurn, getVentasCruzadas, getReposicionesPendientes,
} from "@/lib/dataService";
import { KPICard } from "@/components/ui/KPICard";
import { VentasMensualesChart } from "@/components/charts/VentasMensualesChart";
import { TopProductosChart } from "@/components/charts/TopProductosChart";
import { FrecuenciaHistogram } from "@/components/charts/FrecuenciaHistogram";
import { HomeRouter } from "@/components/layout/HomeRouter";

export default async function HomePage() {
  const [kpis, ventasMensuales, topProductos, clientesChurn, ventasCruzadas, reposiciones] =
    await Promise.all([
      getKPIsResumen(),
      getVentasMensuales(),
      getTopProductos(),
      getClientesChurn(),
      getVentasCruzadas(),
      getReposicionesPendientes(),
    ]);

  const adminView = (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Resumen Ejecutivo</h1>
        <p className="text-sm text-gray-500 mt-0.5">{kpis.periodo}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Transacciones" value={kpis.total_transacciones} format="number" color="blue" />
        <KPICard label="Clientes únicos" value={kpis.clientes_unicos} format="number" color="blue" />
        <KPICard label="Ingresos totales" value={kpis.ingresos_totales} format="cop" color="green" />
        <KPICard label="Ticket promedio" value={kpis.ticket_promedio} format="cop" color="blue" />
        <KPICard label="En riesgo de churn" value={kpis.clientes_en_riesgo_alto} format="number" color="red" subtitle="clientes en riesgo alto" />
        <KPICard label="Oport. venta cruzada" value={kpis.oportunidades_cruzada} format="number" color="orange" subtitle="pares detectados" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Ventas por mes</h2>
          <VentasMensualesChart data={ventasMensuales} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Top 10 productos por ingresos</h2>
          <TopProductosChart data={topProductos} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Distribución por frecuencia de compra</h2>
          <span className="text-xs text-gray-400">{clientesChurn.length} clientes</span>
        </div>
        <FrecuenciaHistogram data={clientesChurn} />
      </div>
    </div>
  );

  return (
    <HomeRouter
      adminView={adminView}
      ventasCruzadas={ventasCruzadas}
      reposiciones={reposiciones}
      churn={clientesChurn}
    />
  );
}
