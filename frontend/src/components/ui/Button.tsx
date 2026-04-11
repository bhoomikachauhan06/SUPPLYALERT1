"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_35px_rgba(14,165,233,0.8)] hover:bg-sky-400 font-bold active:scale-[0.96]",
      secondary:
        "bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.7)] hover:bg-violet-500 font-bold active:scale-[0.96]",
      outline:
        "border border-white/10 hover:border-sky-500/50 hover:bg-sky-500/10 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] text-white font-medium active:scale-[0.96] backdrop-blur-md",
      ghost: "text-slate-400 hover:text-white hover:bg-white/10 font-medium",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-sm",
      lg: "px-8 py-4 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-xl transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none overflow-hidden group",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {/* Subtle shine on hover */}
        {(variant === "primary" || variant === "secondary") && (
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent z-0" />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">{children}</span>
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button };
