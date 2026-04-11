"use client";

import { useState } from "react";
import axios from "axios";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { GitBranch, Navigation, CloudLightning, ShieldAlert, Cpu, Activity, Coins, Clock, Plane, Ship, Truck, CheckCircle2, Bot, ArrowRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PredictWidget } from "@/components/PredictWidget";
import { useNavi } from "@/context/NaviContext";
import { useDemoMode } from "@/app/(dashboard)/layout";
import { Loader2 } from "lucide-react";

const scenarios = [
  { id: "cyclone", name: "Category 5 Cyclone", icon: CloudLightning, color: "text-sky-400", bg: "bg-sky-500/20", border: "border-sky-500/40" },
  { id: "port_strike", name: "Port Labor Strike", icon: ShieldAlert, color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/40" },
  { id: "suez_blockage", name: "Canal Blockage", icon: Navigation, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40" },
];

export default function SimulatePage() {
  const [selectedScenario, setSelectedScenario] = useState("cyclone");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const baseFeatures = {
    weather_severity: 3,
    geop_risk: 2,
    route_complexity: 5,
    carrier_rel: 4,
    port_congestion: 3,
    seasonality: 4,
    lead_variance: 2,
    supplier_risk: 3,
    customs_delay: 4,
    hist_drops: 2
  };

  const runSimulation = async () => {
    setLoading(true);
    setResults(null); 
    const payload = {
      scenario_type: selectedScenario,
      severity: 8,
      affected_region: "Global",
      duration_days: 7,
      base_features: baseFeatures
    };

    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api"}/simulate`, payload, { withCredentials: true });
      const simData = data.data;

      // Mock Decision & Comparison Data based on Scenario
      const generateComparison = (scenario: string) => {
        const sea = { mode: "SEA", icon: Ship, cost: 20, time: 80, risk: (scenario === "port_strike" || scenario === "suez_blockage") ? 90 : 50, costLabel: "$12K", timeLabel: "35 Days", riskLevel: (scenario === "port_strike" || scenario === "suez_blockage") ? "High" : "Medium" };
        const air = { mode: "AIR", icon: Plane, cost: 85, time: 20, risk: scenario === "cyclone" ? 85 : 15, costLabel: "$45K", timeLabel: "3 Days", riskLevel: scenario === "cyclone" ? "High" : "Low" };
        const road = { mode: "ROAD", icon: Truck, cost: 40, time: 50, risk: scenario === "cyclone" ? 60 : 35, costLabel: "$18K", timeLabel: "14 Days", riskLevel: scenario === "cyclone" ? "Medium" : "Low" };
        
        const options = [sea, air, road];
        let best = air;
        let reason = "Based on Time Constraints";
        let action = "Switch to AIR transport to bypass delays";
        let insight = "Choosing air transport circumvents the maritime bottlenecks entirely. Expect a higher cost, but guaranteed delivery protecting your SLA.";

        if (scenario === "cyclone") {
          best = road;
          reason = "Based on Safety & Risk Tolerance";
          action = "Reroute via ROAD transport";
          insight = "Extreme weather conditions render air and sea unsafe. Overland trucking avoids the affected coastal regions, balancing cost and safety.";
        }

        return { options, recommended: best, reason, action, insight };
      };

      if (!simData.modified_features) {
        simData.modified_features = { ...baseFeatures };
      }
      
      const comparison = generateComparison(selectedScenario);
      
      setTimeout(() => setResults({ ...simData, comparison }), 800); // Cinematic delay
    } catch (err) {
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const fallbackData = await res.json();
        if (fallbackData.success) {
          const simData = fallbackData.data;
          const comparison = generateComparison(selectedScenario);
          setTimeout(() => setResults({ ...simData, comparison }), 800);
        } else {
          console.error("Internal simulation failed:", fallbackData.error);
        }
      } catch (fallbackErr) {
        console.error("All simulation routes failed:", fallbackErr);
      }
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const activeScenario = scenarios.find(s => s.id === selectedScenario);

  return (
    <div className="relative w-full min-h-full p-8 lg:p-12 flex flex-col gap-10 max-w-[1700px] mx-auto overflow-y-auto overflow-x-hidden custom-scrollbar">
      
      {/* ── Page Header ─────────────────────────────── */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 px-1 mb-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-3 flex items-center gap-4 font-display text-glow">
            <GitBranch className="w-10 h-10 text-violet-500" /> What-If Engine
          </h1>
          <p className="text-slate-400 font-bold tracking-widest uppercase text-xs opacity-70">
            Advanced Neural Stress-Testing & Disruptive Future Synthesis
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 border border-violet-500/20 bg-violet-500/10 rounded-2xl text-violet-300 backdrop-blur-md font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <Activity className="w-4 h-4 animate-pulse" />
          Neural Core Active
        </div>
      </div>

      {/* ── Bento Operations Grid ────────────────────── */}
      <div className="bento-grid flex-1">
        
        {/* Left: Vector Control */}
        <div className="col-span-12 xl:col-span-3 row-span-2 bento-card border-violet-500/10">
          <div className="bento-inner">
            <div className="mb-4 flex items-center gap-3 border-b border-white/5 pb-3 shrink-0">
              <Cpu className="w-5 h-5 text-violet-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Select Vector</h3>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
              {scenarios.map((scenario, i) => {
                const isSelected = selectedScenario === scenario.id;
                const Icon = scenario.icon;
                return (
                  <div 
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={cn(
                      "flex items-center gap-5 p-5 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden group border",
                      isSelected 
                        ? `${scenario.border} bg-white/[0.07] shadow-[0_0_30px_rgba(139,92,246,0.15)]` 
                        : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/[0.03]"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.8)]" />
                    )}
                    <div className={cn("p-3 rounded-xl transition-all duration-500", isSelected ? `${scenario.bg} scale-110` : "bg-white/5")}>
                      <Icon className={cn("w-6 h-6", isSelected ? scenario.color : "text-slate-600 group-hover:text-slate-300")} />
                    </div>
                    <div>
                      <span className={cn("font-black block text-sm tracking-tight", isSelected ? "text-white" : "text-slate-500 group-hover:text-slate-300")}>{scenario.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1 block">Injection ID: {scenario.id.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4 mt-2 shrink-0 border-t border-white/5 flex flex-col justify-end">
              <Button onClick={runSimulation} disabled={loading} variant="secondary" className="w-full py-5 text-xs font-black tracking-[0.25em] shadow-[0_0_30px_rgba(139,92,246,0.2)] bg-violet-600/20 hover:bg-violet-600/40 text-violet-200 border border-violet-500/30">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'FIND OPTIMAL PLAN'}
              </Button>
            </div>
          </div>
        </div>

        {/* Center: Neural Visualization & Results */}
        <div className="col-span-12 xl:col-span-9 row-span-2 relative min-h-[600px]">
          <AnimatePresence mode="wait">
            {!results && !loading ? (
              <motion.div 
                key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bento-card border-dashed border-2 m-0.5"
              >
                <div className="relative w-48 h-48 border border-slate-800/50 rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite]">
                  <GitBranch className="w-8 h-8 text-slate-400 opacity-20" />
                </div>
                <h2 className="mt-8 text-xl font-black tracking-[0.3em] text-slate-300 uppercase font-display">Awaiting Signal</h2>
                <p className="text-[10px] font-bold mt-4 max-w-sm text-center text-slate-500 uppercase tracking-widest">
                  Initialize vector analysis via the control nodes.
                </p>
              </motion.div>
            ) : loading ? (
              <motion.div 
                key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bento-card border-violet-500/30 overflow-hidden"
              >
                <div className="w-24 h-24 mb-8 relative">
                   <div className="absolute inset-0 border-t-4 border-violet-500 rounded-full animate-spin" />
                   <div className="absolute inset-0 flex items-center justify-center">
                    <ActiveIcon className="w-8 h-8 text-violet-400" icon={activeScenario?.icon} />
                  </div>
                </div>
                <h2 className="text-xl font-black tracking-[0.4em] text-white uppercase font-display">Computing...</h2>
              </motion.div>
            ) : (
              <motion.div 
                key="results" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col gap-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-2">
                  <div className="bento-card bg-slate-950/70">
                    <div className="bento-inner">
                      <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Feature Distortion Profile</h3>
                      <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={
                            Object.keys(baseFeatures).map(key => ({
                              subject: key.replace(/_/g, ' '),
                              base: baseFeatures[key as keyof typeof baseFeatures],
                              simulated: results.modified_features ? results.modified_features[key] : baseFeatures[key as keyof typeof baseFeatures]
                            }))
                          }>
                            <PolarGrid stroke="rgba(255,255,255,0.05)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                            <Radar name="Baseline" dataKey="base" stroke="#475569" fill="#1e293b" fillOpacity={0.2} />
                            <Radar name="Projected" dataKey="simulated" stroke="#22d3ee" strokeWidth={3} fill="#0891b2" fillOpacity={0.4} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="bento-card border-rose-500/10 h-full">
                    <div className="bento-inner text-center justify-center">
                      <div className="text-[80px] font-black text-rose-500 leading-none drop-shadow-[0_0_30px_rgba(244,63,94,0.3)] tracking-tighter">
                        {results.simulated_risk?.toFixed(1)}%
                      </div>
                      <div className="text-slate-500 font-black tracking-[0.2em] uppercase mt-4 text-[9px]">Post-Simulation Criticality</div>
                      <div className="mt-8 flex items-center justify-center gap-6 px-6 py-4 rounded-3xl bg-black/40 border border-white/5">
                        <div className="text-center">
                          <span className="text-[8px] text-slate-500 block uppercase font-black tracking-widest mb-1">Impact</span>
                          <span className="text-lg font-black text-rose-400">+{((results.simulated_risk || 0) - (results.original_risk || 0)).toFixed(1)}% ↑</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* New Decision Matrix Integrated replacing basic Financial layout */}
                  <div className="col-span-1 md:col-span-2 bento-card border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 shadow-[0_0_40px_rgba(139,92,246,0.1)]">
                    <div className="bento-inner p-6">
                      
                      {/* Top: Recommendation & Real World Alert */}
                      <div className="flex flex-col lg:flex-row gap-6 mb-8">
                        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CheckCircle2 className="w-24 h-24 text-emerald-400" />
                          </div>
                          <div className="relative z-10">
                            <span className="inline-block px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[9px] uppercase tracking-widest rounded mb-3">
                              Recommended Option
                            </span>
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                              {results.comparison.recommended.icon && (() => {
                                const RecommendedIcon = results.comparison.recommended.icon;
                                return <RecommendedIcon className="w-7 h-7 text-emerald-400" />;
                              })()} 
                              {results.comparison.recommended.mode} Transport
                            </h3>
                            <p className="text-emerald-300/90 text-sm font-semibold mt-2 flex items-center gap-2">
                              <ArrowRight className="w-4 h-4" /> {results.comparison.action}
                            </p>
                            <p className="text-[10px] text-emerald-400/60 mt-3 font-bold uppercase tracking-widest">
                              {results.comparison.reason}
                            </p>
                          </div>
                        </div>

                        {/* Real-World Alert */}
                        <div className="w-full lg:w-64 shrink-0 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex flex-col justify-center">
                          <div className="flex items-center gap-2 text-rose-400 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-black text-[10px] uppercase tracking-widest">Active Constraint</span>
                          </div>
                          <p className="text-sm font-semibold text-rose-200">
                            {activeScenario?.name} Warning
                          </p>
                          <p className="text-[10px] text-rose-300/60 mt-1 uppercase tracking-wider font-bold">
                            Impact limits standard routes
                          </p>
                        </div>
                      </div>

                      {/* Middle: Route Comparison Table */}
                      <div className="mb-8">
                        <h4 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-4 border-b border-white/5 pb-2">Route Analysis Matrix</h4>
                        <div className="flex flex-col gap-3">
                          {results.comparison.options.map((opt: any, i: number) => {
                            const isRecommended = opt.mode === results.comparison.recommended.mode;
                            return (
                              <div key={i} className={cn(
                                "flex items-center gap-4 p-3 rounded-xl border transition-all",
                                isRecommended ? "bg-white/10 border-white/20" : "bg-black/40 border-white/5"
                              )}>
                                <div className={cn(
                                  "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center",
                                  isRecommended ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                                )}>
                                  {(() => {
                                    const OptIcon = opt.icon;
                                    return <OptIcon className="w-5 h-5" />;
                                  })()}
                                </div>
                                <div className="w-20 shrink-0">
                                  <div className="font-black text-xs text-white">{opt.mode}</div>
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{opt.costLabel}</div>
                                </div>

                                {/* Progress Bars */}
                                <div className="flex-1 grid grid-cols-2 gap-6">
                                  <div>
                                    <div className="flex justify-between text-[8px] font-bold tracking-widest uppercase mb-1">
                                      <span className="text-slate-400">Cost</span>
                                      <span className="text-slate-300">{opt.cost}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${opt.cost}%` }} />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-[8px] font-bold tracking-widest uppercase mb-1">
                                      <span className="text-slate-400">Time</span>
                                      <span className="text-slate-300">{opt.time}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${opt.time}%` }} />
                                    </div>
                                  </div>
                                </div>

                                {/* Risk Indicator */}
                                <div className="w-24 pl-4 border-l border-white/5 flex flex-col items-center justify-center shrink-0">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Risk Level</span>
                                  <div className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
                                    opt.riskLevel === 'High' ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : 
                                    opt.riskLevel === 'Medium' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : 
                                    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  )}>
                                    {opt.riskLevel}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bottom: Navi AI Insight */}
                      <div className="bg-gradient-to-r from-violet-600/10 to-transparent border border-violet-500/20 rounded-xl p-4 flex gap-4 items-start">
                        <div className="w-8 h-8 shrink-0 bg-violet-500/20 border border-violet-500/30 rounded-lg flex items-center justify-center">
                          <Bot className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-black text-[10px] uppercase tracking-[0.2em] text-violet-300">Navi Insight</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            {results.comparison.insight}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar replacement (Sticky/Bento) */}
        <div className="col-span-12 xl:col-span-12 mt-6">
           <PredictWidget />
        </div>

      </div>
    </div>
  );
}

function ActiveIcon({ icon: Icon, className }: { icon: any, className?: string }) {
  if (!Icon) return <GitBranch className={className} />;
  return <Icon className={className} />;
}

