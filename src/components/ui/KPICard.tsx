// =============================================================
// Sellix AI — Tarjeta KPI reutilizable
// Soporta formatos: cop, number, percent, score, days
// Variantes de color por tipo de KPI
// =============================================================

import { formatCOP, formatNumber, formatPercent, formatScore, formatDays } from "@/lib/formatters";

type KPIFormat = "cop" | "number" | "percent" | "score" | "days";
type KPIColor = "blue" | "red" | "orange" | "green" | "gray";

interface KPICardProps {
  label: string;
  value: number;
  format?: KPIFormat;
  color?: KPIColor;
  subtitle?: string;
  onClick?: () => void;
}

const colorClasses: Record<KPIColor, string> = {
  blue: "border-l-brand-blue",
  red: "border-l-risk-high",
  orange: "border-l-risk-medium",
  green: "border-l-risk-low",
  gray: "border-l-gray-400",
};

const valueColorClasses: Record<KPIColor, string> = {
  blue: "text-brand-blue",
  red: "text-risk-high",
  orange: "text-risk-medium",
  green: "text-risk-low",
  gray: "text-gray-700",
};

function formatValue(value: number, format: KPIFormat): string {
  switch (format) {
    case "cop":
      return formatCOP(value);
    case "percent":
      return formatPercent(value);
    case "score":
      return formatScore(value);
    case "days":
      return formatDays(value);
    case "number":
    default:
      return formatNumber(value);
  }
}

export function KPICard({
  label,
  value,
  format = "number",
  color = "blue",
  subtitle,
  onClick,
}: KPICardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 border-l-4 p-5
        ${colorClasses[color]}
        ${onClick ? "cursor-pointer hover:shadow-md transition-shadow text-left w-full" : ""}
      `}
    >
      <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColorClasses[color]}`}>
        {formatValue(value, format)}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
      )}
    </Tag>
  );
}
