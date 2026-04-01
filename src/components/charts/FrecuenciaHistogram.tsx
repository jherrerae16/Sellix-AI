"use client";

// =============================================================
// Sellix AI — Histograma de frecuencia de compra (Módulo 1.1)
// Distribución de clientes por días entre compras
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
import type { ClienteChurn } from "@/lib/types";

interface FrecuenciaHistogramProps {
  data: ClienteChurn[];
}

interface Bin {
  label: string;
  count: number;
  desde: number;
  hasta: number;
}

const BINS: Bin[] = [
  { label: "0–15 d", count: 0, desde: 0, hasta: 15 },
  { label: "16–30 d", count: 0, desde: 16, hasta: 30 },
  { label: "31–45 d", count: 0, desde: 31, hasta: 45 },
  { label: "46–60 d", count: 0, desde: 46, hasta: 60 },
  { label: "61–90 d", count: 0, desde: 61, hasta: 90 },
  { label: ">90 d", count: 0, desde: 91, hasta: Infinity },
];

function buildBins(data: ClienteChurn[]): Bin[] {
  const bins: Bin[] = BINS.map((b) => ({ ...b, count: 0 }));
  for (const cliente of data) {
    const freq = cliente.frecuencia_promedio_dias;
    for (const bin of bins) {
      if (freq >= bin.desde && freq <= bin.hasta) {
        bin.count++;
        break;
      }
    }
  }
  return bins;
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
      <p className="font-medium text-gray-800 mb-1">Frecuencia: {label}</p>
      <p className="text-brand-blue">
        {payload[0].value} clientes
      </p>
    </div>
  );
}

export function FrecuenciaHistogram({ data }: FrecuenciaHistogramProps) {
  const bins = buildBins(data);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={bins}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey="count" fill="#3B6D11" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
