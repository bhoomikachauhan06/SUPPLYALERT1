"use client";

import { cn } from "@/lib/utils";

type RiskLevel = "low" | "medium" | "high" | "critical";

interface RiskBadgeProps {
  level: RiskLevel;
  probability?: number;
  className?: string;
  pulse?: boolean;
}

const config: Record<RiskLevel, { label: string; dot: string; badge: string }> = {
  low:      { label: "Low Risk",      dot: "bg-emerald-400", badge: "risk-low" },
  medium:   { label: "Medium Risk",   dot: "bg-amber-400",   badge: "risk-medium" },
  high:     { label: "High Risk",     dot: "bg-rose-400 animate-ping-slow", badge: "risk-high" },
  critical: { label: "Critical Risk", dot: "bg-red-500 animate-ping-slow",  badge: "risk-high" },
};

export function RiskBadge({ level, probability, className, pulse = false }: RiskBadgeProps) {
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide",
        c.badge,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {(level === "high" || level === "critical" || pulse) && (
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", c.dot)} />
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", c.dot.replace("animate-ping-slow", ""))} />
      </span>
      {c.label}
      {probability !== undefined && (
        <span className="opacity-80 ml-0.5">{probability.toFixed(0)}%</span>
      )}
    </span>
  );
}
