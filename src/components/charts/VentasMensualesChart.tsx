"use client";

// =============================================================
// Sellix AI — Gráfico de ventas mensuales (Módulo 1.1)
// BarChart Recharts — eje X: mes, eje Y: ingresos COP
// =============================================================

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { VentaMensual } from "@/lib/types";
import { formatCOP } from "@/lib/formatters";

interface VentasMensualesChartProps {
  data: VentaMensual[];
}

const MESES_ES: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function formatMesLabel(mes: string): string {
  // mes = "YYYY-MM"
  const parts = mes.split("-");
  if (parts.length === 2) {
    return `${MESES_ES[parts[1]] ?? parts[1]} ${parts[0].slice(2)}`;
  }
  return mes;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-sm">
      <p className="font-medium text-gray-800 mb-1">{label}</p>
      <p className="text-brand-blue">{formatCOP(payload[0].value)}</p>
    </div>
  );
}

export function VentasMensualesChart({ data }: VentasMensualesChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMesLabel(d.mes),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `$${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `$${(v / 1_000).toFixed(0)}k`
              : `$${v}`
          }
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey="ingresos" fill="#185FA5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
