"use client";

import { useState } from "react";
import { X, FlaskConical } from "lucide-react";

interface DemoModeBannerProps {
  onToggle: () => void;
}

export function DemoModeBanner({ onToggle }: DemoModeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-4 px-4 h-9 bg-gradient-to-r from-violet-950 via-slate-900 to-violet-950 border-b border-violet-500/20 text-sm overflow-hidden">
      <div className="absolute inset-0 bg-violet-500/10 shimmer pointer-events-none" />
      <div className="flex items-center gap-2 text-violet-300 relative z-10">
        <FlaskConical className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs">
          <span className="font-bold text-white tracking-wide uppercase mr-2">Demo Mode</span>
          Using beautiful mock data.
        </span>
      </div>
      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={onToggle}
          className="px-3 py-0.5 rounded-full bg-violet-500 text-white text-[10px] uppercase font-black tracking-widest hover:bg-violet-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all"
        >
          Switch to Live API
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-violet-400/50 hover:text-white transition-colors ml-4"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
