import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

type GlowColor = "cyan" | "violet" | "amber" | "rose" | "emerald" | "none";

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  glow?: GlowColor;
  hover?: boolean;
}

const glowMap: Record<GlowColor, string> = {
  cyan:    "hover:border-cyan-500/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.2)]",
  violet:  "hover:border-violet-500/60 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]",
  amber:   "hover:border-amber-500/60 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]",
  rose:    "hover:border-rose-500/60 hover:shadow-[0_0_40px_rgba(244,63,94,0.2)]",
  emerald: "hover:border-emerald-500/60 hover:shadow-[0_0_40px_rgba(52,211,153,0.2)]",
  none:    "",
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = "none", hover = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -4, scale: 1.005 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "glass-premium rounded-[20px] relative overflow-hidden transition-colors duration-300",
          glow !== "none" && glowMap[glow],
          className
        )}
        {...props}
      >
        {/* Inner gradient sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/20 pointer-events-none rounded-[20px]" />
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
