"use client";

// =============================================================
// Sellix AI — Scatter plot RFM (Módulo 2.1)
// Eje X: Frecuencia, Eje Y: Monetary — color por segmento
// =============================================================

import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import type { ClienteRFM } from "@/lib/types";
import { formatCOP, formatDate } from "@/lib/formatters";
import { ClienteDetailPanel } from "@/components/ui/ClienteDetailPanel";

interface ScatterRFMProps {
  data: ClienteRFM[];
}

const SEGMENT_COLORS: Record<string, string> = {
  VIP: "#185FA5",
  Leal: "#3B6D11",
  "En desarrollo": "#EF9F27",
  "En riesgo": "#E24B4A",
};

const SEGMENTS = ["VIP", "Leal", "En desarrollo", "En riesgo"] as const;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ClienteRFM }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-md text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1 truncate">{d.nombre}</p>
      <p
        className="text-xs font-medium mb-2 px-2 py-0.5 rounded-full inline-block text-white"
        style={{ backgroundColor: SEGMENT_COLORS[d.segmento] }}
      >
        {d.segmento}
      </p>
      <div className="space-y-0.5 text-xs text-gray-600">
        <p>Frecuencia: <span className="font-medium">{d.frequency} compras</span></p>
        <p>Valor total: <span className="font-medium">{formatCOP(d.monetary)}</span></p>
        <p>CLV anual: <span className="font-medium text-brand-blue">{formatCOP(d.clv_estimado_anual)}</span></p>
        <p>Ticket prom.: <span className="font-medium">{formatCOP(d.ticket_promedio)}</span></p>
        <p>Última compra: <span className="font-medium">{formatDate(d.ultima_compra)}</span></p>
      </div>
    </div>
  );
}

export function ScatterRFM({ data }: ScatterRFMProps) {
  const [selected, setSelected] = useState<ClienteRFM | null>(null);

  // Agrupar datos por segmento
  const bySegment = SEGMENTS.map((seg) => ({
    segmento: seg,
    color: SEGMENT_COLORS[seg],
    data: data.filter((d) => d.segmento === seg),
  }));

  function handleClick(point: ClienteRFM) {
    setSelected(point);
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="frequency"
            name="Frecuencia"
            label={{
              value: "Frecuencia (compras)",
              position: "insideBottom",
              offset: -4,
              style: { fontSize: 11, fill: "#9ca3af" },
            }}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="monetary"
            name="Valor total"
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}k`
            }
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <ZAxis range={[40, 40]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="circle"
          />
          {bySegment.map(({ segmento, color, data: segData }) => (
            <Scatter
              key={segmento}
              name={segmento}
              data={segData}
              fill={color}
              fillOpacity={0.75}
              onClick={(point) => handleClick(point as ClienteRFM)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {selected && (
        <ClienteDetailPanel
          cliente={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
