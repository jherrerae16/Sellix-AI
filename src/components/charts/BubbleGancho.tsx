"use client";

// =============================================================
// Sellix AI — Mapa de burbujas de Productos Gancho (Módulo 2.2)
// Eje X: índice atracción, Eje Y: poder arrastre, tamaño: ticket
// =============================================================

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ProductoGancho } from "@/lib/types";
import { formatCOP, formatScore } from "@/lib/formatters";

interface BubbleGanchoProps {
  data: ProductoGancho[];
}

const CATEGORIA_COLORS: Record<string, string> = {
  "Gancho Primario": "#185FA5",
  "Gancho Secundario": "#3B6D11",
  "Volumen puro": "#EF9F27",
  "Nicho estratégico": "#9333ea",
};

const CATEGORIAS = [
  "Gancho Primario",
  "Gancho Secundario",
  "Volumen puro",
  "Nicho estratégico",
] as const;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ProductoGancho }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-md text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1 truncate leading-snug">
        {d.nombre}
      </p>
      <p
        className="text-xs font-medium mb-2 px-2 py-0.5 rounded-full inline-block text-white"
        style={{ backgroundColor: CATEGORIA_COLORS[d.categoria_gancho] }}
      >
        {d.categoria_gancho}
      </p>
      <div className="space-y-0.5 text-xs text-gray-600">
        <p>Índice atracción: <span className="font-medium">{formatScore(d.indice_atraccion * 100, 1)}%</span></p>
        <p>Poder arrastre: <span className="font-medium">{formatScore(d.poder_arrastre)} productos</span></p>
        <p>Ticket sesión: <span className="font-medium">{formatCOP(d.ticket_promedio_en_sesion)}</span></p>
        <p>Descuento frecuente: <span className="font-medium">{d.tiene_descuento_frecuente ? "Sí" : "No"}</span></p>
      </div>
    </div>
  );
}

export function BubbleGancho({ data }: BubbleGanchoProps) {
  // Normalizar ticket para tamaño de burbuja (rango 300–2000 para ZAxis)
  const maxTicket = Math.max(...data.map((d) => d.ticket_promedio_en_sesion), 1);
  const withZ = data.map((d) => ({
    ...d,
    z: Math.max(300, (d.ticket_promedio_en_sesion / maxTicket) * 2000),
  }));

  const byCategory = CATEGORIAS.map((cat) => ({
    categoria: cat,
    color: CATEGORIA_COLORS[cat],
    data: withZ.filter((d) => d.categoria_gancho === cat),
  })).filter((g) => g.data.length > 0);

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          type="number"
          dataKey="indice_atraccion"
          name="Índice de atracción"
          tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
          label={{
            value: "Índice de atracción",
            position: "insideBottom",
            offset: -12,
            style: { fontSize: 11, fill: "#9ca3af" },
          }}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="poder_arrastre"
          name="Poder de arrastre"
          label={{
            value: "Poder de arrastre",
            angle: -90,
            position: "insideLeft",
            offset: 12,
            style: { fontSize: 11, fill: "#9ca3af" },
          }}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <ZAxis type="number" dataKey="z" range={[300, 2000]} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          iconType="circle"
        />
        {byCategory.map(({ categoria, color, data: catData }) => (
          <Scatter
            key={categoria}
            name={categoria}
            data={catData}
            fill={color}
            fillOpacity={0.65}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
