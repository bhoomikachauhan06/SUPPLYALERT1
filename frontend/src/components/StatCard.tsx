"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  color?: "cyan" | "violet" | "amber" | "rose" | "emerald";
  icon?: React.ReactNode;
  className?: string;
  prefix?: string;
}

const colorMap = {
  cyan:    { text: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/20"    },
  violet:  { text: "text-violet-400",  bg: "bg-violet-400/10",  border: "border-violet-400/20"  },
  amber:   { text: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20"   },
  rose:    { text: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-400/20"    },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
};

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return count;
}

export function StatCard({
  label, value, unit = "", trend, trendValue,
  color = "cyan", icon, className, prefix = "",
}: StatCardProps) {
  const c = colorMap[color];
  const animatedValue = useCountUp(value);

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-slate-400";

  return (
    <div
      className={cn(
        "glass-premium rounded-2xl p-6 relative overflow-hidden hover:-translate-y-0.5 transition-all duration-300",
        className
      )}
    >
      {/* Background accent blob */}
      <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-30", c.bg)} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          {icon && (
            <div className={cn("p-2.5 rounded-xl", c.bg)}>
              <div className={c.text}>{icon}</div>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2">
          <span className={cn("text-4xl font-bold tracking-tight font-display", c.text)}>
            {prefix}{animatedValue}{unit}
          </span>
        </div>

        {trend && trendValue && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}
