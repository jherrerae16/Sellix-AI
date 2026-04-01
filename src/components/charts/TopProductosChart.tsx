"use client";

// =============================================================
// Sellix AI — Gráfico de top productos por ingresos (Módulo 1.1)
// BarChart horizontal — top 10 productos
// =============================================================

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TopProducto } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface TopProductosChartProps {
  data: TopProducto[];
}

const COLORS = [
  "#185FA5", "#1e73c2", "#2488df", "#3b9de8", "#52b1f0",
  "#69c5f8", "#3B6D11", "#4a8a16", "#5aa71b", "#6bc420",
];

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TopProducto }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-sm max-w-[200px]">
      <p className="font-medium text-gray-800 mb-1 leading-snug">{d.nombre}</p>
      <p className="text-brand-blue">{formatCOP(d.ingresos)}</p>
      <p className="text-gray-500">{d.unidades.toLocaleString("es-CO")} unidades</p>
    </div>
  );
}

export function TopProductosChart({ data }: TopProductosChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: truncate(d.nombre, 22),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) =>
            v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}k`
          }
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey="ingresos" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
