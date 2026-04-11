"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import { GlassCard } from "@/components/ui/GlassCard";
import { RiskBadge } from "@/components/RiskBadge";
import {
  UploadCloud, FileSpreadsheet, CheckCircle, X,
  Download, Loader2, AlertTriangle, ArrowRight, Zap, Database
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SAMPLE_CSV = `shipment_id,weather_severity,geopolitical_risk,route_complexity,carrier_reliability,port_congestion,seasonal_demand,lead_time_variance,supplier_risk_score,customs_complexity,historical_disruptions
SHP-0001,8.5,7.0,6.0,5.5,8.0,7.5,4.0,3.0,5.0,6.5
SHP-0002,3.0,2.0,4.0,8.0,3.5,4.0,2.0,1.5,3.0,1.0
SHP-0003,6.0,8.5,7.5,4.0,7.0,6.0,5.5,7.0,6.5,5.0
SHP-0004,2.0,1.5,3.0,9.0,2.5,3.0,1.5,1.0,2.0,0.5`;

export default function UploadPage() {
  const [file,       setFile]       = useState<File | null>(null);
  const [dragging,   setDragging]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [results,    setResults]    = useState<any[]>([]);
  const [error,      setError]      = useState<string | null>(null);
  const [done,       setDone]       = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) { setFile(dropped); setError(null); setDone(false); setResults([]); }
    else setError("Invalid matrix configuration. Please drop a valid .csv file.");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]); setError(null); setDone(false); setResults([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setProgress(0); setError(null);

    // Animate progress bar (simulated neural processing)
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 95));
    }, 200);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api"}/upload/csv`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );
      clearInterval(interval); setProgress(100);
      setTimeout(() => { setDone(true); setResults(data.data?.predictions || []); }, 800);
    } catch {
      // Demo mode fallback — parse CSV client-side and call /api/predict
      try {
        const text = await file.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const vals = line.split(",");
          return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i]?.trim() }), {} as Record<string, string>);
        });

        const predictions = await Promise.all(
          rows.slice(0, 20).map(async (row) => {
            const features: Record<string, number> = {};
            headers.filter(h => h !== "shipment_id").forEach(h => {
               features[h] = parseFloat(row[h]) || 5;
            });
            const res = await fetch("/api/predict", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ features, shipment_id: row.shipment_id }),
            });
            const d = await res.json();
            return d.data;
          })
        );

        clearInterval(interval); setProgress(100);
        setTimeout(() => { setDone(true); setResults(predictions); }, 800);
      } catch (e2) {
        clearInterval(interval);
        setError("Network desynchronization. Check your CSV format and try again.");
      }
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "supply_alert_sample.csv";
    a.click(); URL.revokeObjectURL(url);
  };

  const reset = () => { setFile(null); setDone(false); setResults([]); setProgress(0); setError(null); };

  const riskCounts = {
    high:   results.filter(r => r?.risk_level === "high").length,
    medium: results.filter(r => r?.risk_level === "medium").length,
    low:    results.filter(r => r?.risk_level === "low").length,
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6 min-h-full overflow-y-auto overflow-x-hidden custom-scrollbar">

      {/* Header */}
      <div className="flex items-end justify-between shrink-0">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white font-display mb-1 flex items-center gap-3 text-glow shadow-cyan-500/50">
            <Database className="w-8 h-8 text-cyan-400" />
            Batch Analysis Node
          </h1>
          <p className="text-slate-400 font-medium tracking-wide">Upload shipment ledgers for instant AI risk scoring across your graph.</p>
        </div>
        <button onClick={downloadSample}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-sm font-bold tracking-widest uppercase text-slate-300 hover:text-cyan-400 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
          <Download className="w-4 h-4" />
          Sample LEDGER
        </button>
      </div>

      {/* Upload Zone */}
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <GlassCard glow={dragging ? "cyan" : "none"} hover={false} className="overflow-hidden flex-1 flex flex-col bg-slate-950/40 border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative">
              <div className="absolute inset-0 z-0 bg-radial-gradient from-cyan-900/10 to-transparent pointer-events-none" />
              
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 m-8 relative flex flex-col items-center justify-center p-12 border-2 rounded-3xl transition-all duration-500 z-10
                  ${dragging 
                    ? "border-cyan-400 bg-cyan-400/10 shadow-[inset_0_0_100px_rgba(34,211,238,0.2)] dashed-none border-solid scale-[0.98]" 
                    : "border-slate-700/50 border-dashed hover:border-cyan-500/50 hover:bg-white/[0.02]"}`}
              >
                <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-upload" />

                {!file ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center pointer-events-none"
                  >
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-cyan-400/20 blur-[40px] rounded-full animate-pulse" />
                      <div className="p-6 bg-slate-900/80 border border-white/5 rounded-3xl backdrop-blur-md shadow-2xl relative z-10">
                        <UploadCloud className="w-16 h-16 text-cyan-400 stroke-[1.5]" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 tracking-wide font-display">Initialize Data Stream</h3>
                    <p className="text-slate-500 text-sm mb-8 text-center max-w-sm tracking-wide leading-relaxed font-medium">
                      Drag & drop your CSV ledger here. System requires <span className="text-slate-300">shipment_id</span> plus 10 tensor features to calculate risk trajectories.
                    </p>
                    <label htmlFor="csv-upload" className="pointer-events-auto">
                      <span className="btn-cyan px-8 py-4 rounded-xl text-xs uppercase tracking-widest font-black cursor-pointer shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                        Select Local File
                      </span>
                    </label>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center text-center w-full max-w-md pointer-events-none"
                  >
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)] glow-emerald">
                      <FileSpreadsheet className="w-14 h-14 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-white mb-2 truncate max-w-full px-4">{file.name}</p>
                    <p className="text-sm text-slate-400 mb-8 font-mono">{Math.max(1, Math.round(file.size / 1024))} KB · Neural Analysis Ready</p>

                    {loading ? (
                      <div className="w-full space-y-4">
                        <div className="h-3 rounded-full bg-slate-900 border border-white/10 overflow-hidden shadow-inner">
                          <motion.div 
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                            initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                            transition={{ ease: "easeInOut" }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs font-black tracking-widest uppercase">
                          <span className="text-cyan-400 flex items-center">
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Processing Nodes
                          </span>
                          <span className="text-white">{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 w-full pointer-events-auto">
                        <button onClick={reset}
                          className="flex-1 px-5 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-xs font-black tracking-widest uppercase text-slate-400 hover:text-white border border-white/5 transition-all shadow-md">
                          Abort
                        </button>
                        <button onClick={handleUpload}
                          className="flex-[2] btn-cyan py-3 rounded-xl text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)]">
                          <Zap className="w-4 h-4 fill-cyan-900" />
                          Execute Analysis
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-6 flex items-center justify-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          /* ── Results View ── */
          <motion.div 
            key="results"
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6 flex-1 min-h-0"
          >
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-6 shrink-0">
              {[
                { label: "High Risk Detected",   count: riskCounts.high,   color: "text-rose-400",    bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "glow-[rgba(244,63,94,0.15)]" },
                { label: "Medium Risk Routes", count: riskCounts.medium, color: "text-amber-400",   bg: "bg-amber-500/10",  border: "border-amber-500/20", glow: "glow-[rgba(245,158,11,0.15)]" },
                { label: "Optimal Trajectories",    count: riskCounts.low,    color: "text-emerald-400", bg: "bg-emerald-500/10",border: "border-emerald-500/20", glow: "glow-[rgba(16,185,129,0.15)]" },
              ].map((c) => (
                <GlassCard key={c.label} hover={false} className={`p-6 border ${c.border} text-center flex flex-col justify-center bg-slate-950/80 shadow-[0_8px_30px_${c.glow}]`}>
                  <p className={`text-5xl font-black font-display ${c.color} drop-shadow-md mb-2`}>{c.count}</p>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{c.label}</p>
                </GlassCard>
              ))}
            </div>

            {/* Results table */}
            <GlassCard glow="cyan" hover={false} className="p-0 flex flex-col flex-1 overflow-hidden bg-slate-950/80 border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h3 className="font-black tracking-wide text-white text-sm">{results.length} Nodes Analyzed</h3>
                </div>
                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/20 text-xs font-bold tracking-widest uppercase text-slate-400 hover:text-white transition-all">
                  Run New Ledger <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 box-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                    <tr className="text-[10px] font-black tracking-widest text-slate-500 uppercase border-b border-white/5">
                      <th className="text-left py-4 pl-6 pr-4 font-mono">Shipment ID</th>
                      <th className="text-center py-4 pr-4">Risk Level</th>
                      <th className="text-right py-4 pr-4">Probability</th>
                      <th className="text-right py-4 pr-4">Est. Delay</th>
                      <th className="text-right py-4 pr-6">Neural Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="py-4 pl-6 pr-4 font-mono text-xs font-bold text-cyan-400 group-hover:text-cyan-300">{r?.shipment_id || `SHP-${String(i).padStart(4,"0")}`}</td>
                        <td className="py-4 pr-4 w-32">
                          <div className="flex justify-center">
                            {/* Assumes RiskBadge component renders safely with any value */}
                            <RiskBadge level={(r?.risk_level || "low") as any} />
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-right font-bold text-white tracking-widest">{r?.disruption_probability?.toFixed(1)}%</td>
                        <td className="py-4 pr-4 text-right text-slate-400 font-medium">+{r?.estimated_delay_days?.toFixed(1)}d</td>
                        <td className="py-4 pr-6 text-right text-[11px] font-bold tracking-widest text-slate-500">{r?.confidence_score?.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                    <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                    <p className="font-bold">No valid results processed.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
