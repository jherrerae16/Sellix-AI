export const dynamic = "force-dynamic";

import { getVentasCruzadasV2, getBundles } from "@/lib/dataService";
import { CrossSellV2Tabs } from "@/components/tables/CrossSellV2Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ShoppingCart, Package, ShoppingBag, Layers, Sparkles } from "lucide-react";

export default async function VentaCruzadaPage() {
  const [v2, bundles] = await Promise.all([
    getVentasCruzadasV2(),
    getBundles(),
  ]);

  const ticketMax = bundles.length > 0 ? Math.max(...bundles.map((b) => b.ticket_promedio)) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Venta Cruzada"
        subtitle={`${v2.total_sesiones.toLocaleString("es-CO")} sesiones analizadas`}
        icon={<ShoppingCart className="w-5 h-5" />}
        badge={
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
            Asociaciones
          </span>
        }
      />

      {/* Hero insight */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 rounded-3xl border border-indigo-100 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Oportunidad</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">
              {bundles.length} combos detectados
            </h2>
            <p className="text-gray-600 mt-2 max-w-2xl">
              {bundles.length > 0 && (
                <>
                  El combo más valioso alcanza un ticket de{" "}
                  <span className="font-semibold text-emerald-700">
                    ${ticketMax.toLocaleString("es-CO")}
                  </span>
                  .{" "}
                </>
              )}
              Usa estas asociaciones en el punto de venta o en campañas de WhatsApp para subir el ticket promedio.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Pares de productos"
          value={v2.por_producto.length}
          sublabel="con Lift ≥ 1.5"
          icon={<Package className="w-4 h-4" />}
          accent="indigo"
        />
        <StatCard
          label="Combos completos"
          value={bundles.length}
          sublabel="3+ productos juntos"
          icon={<ShoppingBag className="w-4 h-4" />}
          accent="violet"
        />
        <StatCard
          label="Asociaciones de categorías"
          value={v2.por_categoria.length}
          sublabel="cruces terapéuticos"
          icon={<Layers className="w-4 h-4" />}
          accent="emerald"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-6">
        <CrossSellV2Tabs data={v2} bundles={bundles} />
      </div>
    </div>
  );
}
