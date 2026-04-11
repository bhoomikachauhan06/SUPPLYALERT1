"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ShieldAlert, Activity, GitBranch, ArrowRight, Zap,
  Globe2, Brain, TrendingUp, CheckCircle, ChevronRight
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { cn } from "@/lib/utils";

const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

const FEATURES = [
  {
    icon: Brain,
    title: "AI Risk Prediction",
    desc: "XGBoost models process 10 real-time signals — weather, geopolitics, congestion — delivering 94%+ accuracy.",
    color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20",
    glow: "hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]",
  },
  {
    icon: Globe2,
    title: "Live 3D Globe",
    desc: "Visualize every active shipment and risk corridor on a cinematic, photorealistic interactive globe.",
    color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20",
    glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
  },
  {
    icon: Zap,
    title: "Instant Alerts",
    desc: "Real-time socket alerts the moment a disruption risk crosses your threshold — before it hits your operations.",
    color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20",
    glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  },
];

const STATS = [
  { value: "94%", label: "Prediction Accuracy" },
  { value: "2.3s", label: "Avg Alert Latency" },
  { value: "10+", label: "Risk Signal Sources" },
  { value: "₹16Cr+", label: "Losses Prevented" },
];

const MARQUEE_ITEMS = ["PREDICT", "PREPARE", "PREVENT", "PERFORM", "PROTECT", "PREVAIL"];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <main className="relative bg-[#05050a] text-white overflow-x-hidden font-sans min-h-screen">

      {/* ── 3D Globe Background ──────────────────────────── */}
      {mounted && (
        <motion.div
          className="fixed top-1/2 left-1/2 w-[140vw] h-[140vh] -ml-[70vw] -mt-[70vh] z-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <Globe />
        </motion.div>
      )}

      {/* Simple vignetting */}
      <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-transparent to-[#05050a]/40" />

      {/* ── Navbar ───────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="glass-premium rounded-2xl px-5 py-2.5 flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight font-display">
                Supply<span className="text-cyan-400">Alert</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-[11px] font-bold tracking-[0.15em] text-slate-400">
              <Link href="#features"  className="hover:text-cyan-400 transition-colors">FEATURES</Link>
              <Link href="#how"       className="hover:text-cyan-400 transition-colors">HOW IT WORKS</Link>
              <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">DASHBOARD</Link>
            </div>
          </div>

          <div className="glass-premium rounded-2xl px-4 py-2.5 flex items-center gap-4">
            <Link href="/login"
              className="text-[11px] font-bold tracking-[0.15em] text-slate-400 hover:text-white transition-colors">
              LOGIN
            </Link>
            <Link href="/dashboard">
              <button className="btn-cyan px-5 py-2 rounded-xl text-[11px] font-black tracking-[0.1em] flex items-center gap-1.5">
                ACCESS TERMINAL <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-32 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl mx-auto space-y-8"
        >
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-premium border border-cyan-500/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-[11px] font-black tracking-[0.2em] text-cyan-400 uppercase">
              Cognitive Supply Chain Engine V4.0
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.88] font-display">
            NO SURPRISES.
            <br />
            <span className="gradient-text">JUST SOLUTIONS.</span>
          </h1>

          <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            AI that detects global disruptions and calculates the optimal response instantly.
            <br className="hidden md:block" />
            Stop tracking delays — start bypassing them.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/dashboard">
              <button className="btn-cyan px-8 py-4 rounded-2xl text-[13px] font-black tracking-[0.1em] flex items-center gap-2.5">
                ACCESS TERMINAL <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/dashboard/risk-map">
              <button className="glass-premium px-8 py-4 rounded-2xl text-[13px] font-black tracking-[0.1em] text-white hover:border-cyan-500/30 transition-all flex items-center gap-2.5">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                LIVE RISK MAP
              </button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="bento-grid pt-12 max-w-4xl mx-auto">
            {STATS.map((s, i) => (
              <div key={s.label} className={cn(
                "col-span-6 md:col-span-3 bento-card border-white/5",
                i % 2 === 0 ? "bg-cyan-500/5" : "bg-violet-500/5"
              )}>
                <div className="bento-inner text-center py-6">
                  <p className={cn("text-3xl font-black font-display", i % 2 === 0 ? "text-cyan-400" : "text-violet-400")}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Marquee ticker ───────────────────────────────── */}
      <div className="relative z-10 bg-cyan-400 py-4 overflow-hidden border-y border-[#05050a] my-24 rotate-[-1deg]">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="text-4xl md:text-6xl font-black tracking-tighter text-[#05050a] mx-12">
              {item}.
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[11px] font-black tracking-[0.4em] text-cyan-400 uppercase mb-4">
            Intelligence Core
          </p>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter font-display">
            AESTHETICALLY<br />
            <span className="gradient-text">SMART</span>
          </h2>
        </div>

        <div className="bento-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className={cn(
                  "bento-card",
                  i === 0 ? "col-span-12 md:col-span-8" : "col-span-12 md:col-span-4",
                  f.border, f.glow
                )}
              >
                <div className="bento-inner p-10 h-full justify-between">
                  <div>
                    <div className={cn("inline-flex p-4 rounded-2xl mb-8", f.bg)}>
                      <Icon className={cn("w-8 h-8", f.color)} />
                    </div>
                    <h3 className="text-2xl font-black mb-4 font-display tracking-tight">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md">{f.desc}</p>
                  </div>
                  <div className={cn("flex items-center gap-2 mt-12 text-[10px] font-black uppercase tracking-[0.2em]", f.color)}>
                    INITIALIZE PROTOCOL <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {/* Decorative Bento Cell */}
          <div className="col-span-12 md:col-span-4 bento-card bg-gradient-to-br from-violet-600/20 to-cyan-400/20 border-white/10 hidden md:block">
            <div className="bento-inner justify-center items-center text-center">
              <Zap className="w-12 h-12 text-white animate-pulse mb-4" />
              <p className="text-xs font-black text-white/50 uppercase tracking-[0.3em]">Neural Link Status: OK</p>
            </div>
          </div>
          <div className="col-span-12 md:col-span-8 bento-card bg-slate-950/40 border-white/5 overflow-hidden group">
            <div className="bento-inner p-10 flex-row gap-10 items-center justify-between">
               <div>
                  <h3 className="text-xl font-black font-display mb-2">94% Prediction Accuracy</h3>
                  <p className="text-xs text-slate-500 font-medium">Verified across 10+ risk signals including real-time AIS marine traffic.</p>
               </div>
               <div className="w-32 h-32 rounded-full border-8 border-cyan-500/20 border-t-cyan-500 group-hover:rotate-180 transition-transform duration-1000 flex items-center justify-center shrink-0">
                  <span className="text-xl font-black text-cyan-400">94.2</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how" className="relative z-10 py-24 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[11px] font-black tracking-[0.3em] text-violet-400 uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter font-display">
            THREE STEPS TO
            <br />
            <span className="gradient-text">ZERO SURPRISES</span>
          </h2>
        </div>

        <div className="space-y-6">
          {[
            {
              step: "01", title: "Upload Shipment Data",
              desc: "Drop your CSV or connect via API. SupplyAlert parses origin, destination, carrier, and route metadata instantly.",
              icon: "⬆️", color: "border-cyan-500/30",
            },
            {
              step: "02", title: "AI Scores Every Shipment",
              desc: "Our XGBoost model fuses 10 live signals — weather, port congestion, geopolitical risk — and assigns a disruption probability in milliseconds.",
              icon: "🧠", color: "border-violet-500/30",
            },
            {
              step: "03", title: "Act Before It Happens",
              desc: "Receive explainable alerts with recommended alternative routes, carrier switches, and buffer timing — automatically.",
              icon: "⚡", color: "border-amber-500/30",
            },
          ].map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`glass-premium rounded-2xl p-6 border ${step.color} flex items-center gap-6`}
            >
              <div className="text-4xl shrink-0">{step.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-black text-slate-600 tracking-widest">{step.step}</span>
                  <h3 className="text-lg font-bold font-display">{step.title}</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass-premium rounded-3xl p-12 border border-cyan-500/20"
          style={{ boxShadow: "0 0 60px rgba(34,211,238,0.08)" }}
        >
          <p className="text-[11px] font-black tracking-[0.3em] text-cyan-400 uppercase mb-4">
            Start Now
          </p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 font-display">
            READY TO SEE
            <br />
            <span className="gradient-text">YOUR RISK?</span>
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Access the full AI terminal — 3D globe, risk predictions, NAVI AI chat, and live signal feeds. No surprises. Just solutions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/dashboard">
              <button className="btn-cyan px-8 py-4 rounded-2xl text-sm font-black tracking-wide flex items-center gap-2">
                ACCESS TERMINAL <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/register">
              <button className="glass-premium px-8 py-4 rounded-2xl text-sm font-black text-white border border-white/10 hover:border-violet-500/30 transition-all">
                CREATE FREE ACCOUNT
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="relative z-10 py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center">
              <Activity className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold font-display">Supply<span className="text-cyan-400">Alert</span></span>
          </Link>
          <div className="flex gap-8 text-[10px] font-bold tracking-[0.2em] text-slate-600">
            <Link href="#" className="hover:text-white transition-colors">PRIVACY</Link>
            <Link href="#" className="hover:text-white transition-colors">TERMS</Link>
            <Link href="#" className="hover:text-white transition-colors">STATUS</Link>
            <Link href="#" className="hover:text-white transition-colors">DOCS</Link>
          </div>
          <p className="text-[10px] font-bold text-slate-700 tracking-widest uppercase">
            © 2026 SupplyAlert Intelligence Core.
          </p>
        </div>
      </footer>
    </main>
  );
}
