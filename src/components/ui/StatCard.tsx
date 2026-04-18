import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  accent?: "indigo" | "emerald" | "violet" | "amber" | "red" | "blue" | "gray" | "orange";
  size?: "sm" | "md";
}

const ACCENT_STYLES = {
  indigo:  { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  violet:  { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
  amber:   { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  red:     { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
  blue:    { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  gray:    { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-100" },
  orange:  { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
};

export function StatCard({ label, value, sublabel, icon, accent = "indigo", size = "md" }: StatCardProps) {
  const styles = ACCENT_STYLES[accent];
  const isSmall = size === "sm";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-soft transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${styles.text}`}>{label}</p>
          <p className={`font-bold text-gray-900 mt-1 tracking-tight ${isSmall ? "text-xl" : "text-2xl"}`}>
            {value}
          </p>
          {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
        </div>
        {icon && (
          <div className={`w-9 h-9 ${styles.bg} rounded-xl flex items-center justify-center ${styles.text} flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
