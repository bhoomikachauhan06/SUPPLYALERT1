"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { RiskBadge } from "@/components/RiskBadge";
import { Zap, BarChart3, Loader2 } from "lucide-react";

const FEATURES = [
  { key: "weather_severity",      label: "Weather Severity",       color: "text-cyan-400" },
  { key: "geopolitical_risk",     label: "Geopolitical Risk",      color: "text-violet-400" },
  { key: "port_congestion",       label: "Port Congestion",        color: "text-amber-400" },
  { key: "carrier_reliability",   label: "Carrier Reliability",    color: "text-emerald-400" },
  { key: "route_complexity",      label: "Route Complexity",       color: "text-rose-400" },
  { key: "historical_disruptions",label: "Historical Disruptions", color: "text-orange-400" },
  { key: "supplier_risk_score",   label: "Supplier Risk",          color: "text-pink-400" },
  { key: "lead_time_variance",    label: "Lead Time Variance",     color: "text-blue-400" },
  { key: "customs_complexity",    label: "Customs Complexity",     color: "text-indigo-400" },
  { key: "seasonal_demand",       label: "Seasonal Demand",        color: "text-teal-400" },
];

const DEFAULT_FEATURES: Record<string, number> = {
  weather_severity: 5, geopolitical_risk: 4, port_congestion: 5,
  carrier_reliability: 5, route_complexity: 5, historical_disruptions: 3,
  supplier_risk_score: 4, lead_time_variance: 3, customs_complexity: 4, seasonal_demand: 5,
};

interface PredictResult {
  disruption_probability: number;
  risk_level: string;
  confidence_score: number;
  estimated_delay_days: number;
  explanation: string;
  feature_importance: { display_name: string; importance: number; value: number }[];
  top_risk_factors: string[];
}

export function PredictWidget() {
  const [features, setFeatures] = useState<Record<string, number>>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, shipment_id: "WIDGET-DEMO" }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = (result?.risk_level ?? "low") as "low" | "medium" | "high";

  return (
    <GlassCard glow="violet" className="p-5 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="p-2 bg-violet-500/10 rounded-lg">
          <Zap className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Risk Predictor</h3>
          <p className="text-[10px] text-slate-400">Adjust signals → get instant AI risk score</p>
        </div>
      </div>

      {/* Feature Sliders */}
      <div className="space-y-3 mb-3 flex-1 overflow-y-auto pr-2">
        {FEATURES.map((f) => (
          <div key={f.key}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400">{f.label}</span>
              <span className={`text-xs font-bold ${f.color}`}>{features[f.key].toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0} max={10} step={0.5}
              value={features[f.key]}
              onChange={(e) => setFeatures(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) }))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #a855f7 ${features[f.key] * 10}%, rgba(255,255,255,0.1) ${features[f.key] * 10}%)`
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        className="w-full shrink-0 btn-violet py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {loading ? "Predicting..." : "Run AI Prediction"}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-4 space-y-3 shrink-0 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="text-xs text-slate-400 mb-1">Disruption Probability</p>
              <p className="text-3xl font-bold font-display text-white">
                {result.disruption_probability.toFixed(1)}
                <span className="text-lg text-slate-400">%</span>
              </p>
            </div>
            <div className="text-right">
              <RiskBadge level={riskLevel} pulse />
              <p className="text-xs text-slate-500 mt-1.5">
                {result.estimated_delay_days.toFixed(1)}d est. delay
              </p>
            </div>
          </div>

          {/* Top 3 feature importance bars */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-semibold text-slate-300">Top Risk Drivers</span>
            </div>
            <div className="space-y-2">
              {result.feature_importance.slice(0, 4).map((f) => (
                <div key={f.display_name}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-400">{f.display_name}</span>
                    <span className="text-violet-400 font-medium">{f.importance.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                      style={{ width: `${Math.min(f.importance * 2, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed border-t border-white/10 pt-3">
            {result.explanation}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
