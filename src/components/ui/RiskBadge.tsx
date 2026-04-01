// =============================================================
// Sellix AI — Badge de nivel de riesgo
// Mapea nivel a color: Alto=rojo, Medio=naranja, Bajo=verde
// =============================================================

type RiskLevel = "Alto" | "Medio" | "Bajo";

interface RiskBadgeProps {
  level: RiskLevel;
}

const badgeClasses: Record<RiskLevel, string> = {
  Alto: "bg-red-100 text-red-700 border-red-200",
  Medio: "bg-orange-100 text-orange-700 border-orange-200",
  Bajo: "bg-green-100 text-green-700 border-green-200",
};

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${badgeClasses[level]}
      `}
    >
      {level}
    </span>
  );
}
