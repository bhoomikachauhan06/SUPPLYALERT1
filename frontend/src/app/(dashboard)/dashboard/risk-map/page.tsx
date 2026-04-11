"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle, CheckCircle, MapPin, TrendingUp, Package, Map as MapIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { cn } from "@/lib/utils";
import { useNavi } from "@/context/NaviContext";

const ShipmentMap = dynamic(() => import("@/components/ShipmentMap"), { ssr: false });

const MOCK_SHIPMENTS = [
  { id: "SHP-2847", origin: "Shanghai",    destination: "Hamburg",      risk: "high",   prob: 78, route: "Trans-Pacific → Suez", lat: 31.23, lng: 121.47,  destLat: 53.5, destLng: 10.0 },
  { id: "SHP-1932", origin: "Seoul",       destination: "Rotterdam",    risk: "high",   prob: 65, route: "Asia → Europe",        lat: 37.56, lng: 126.97,  destLat: 51.9, destLng: 4.5  },
  { id: "SHP-0442", origin: "Mumbai",      destination: "Los Angeles",  risk: "high",   prob: 58, route: "Indian Ocean → Pacific",lat: 19.07, lng: 72.87,   destLat: 34.0, destLng: -118.2},
  { id: "SHP-1103", origin: "Dubai",       destination: "Frankfurt",    risk: "medium", prob: 44, route: "Persian Gulf → Med",   lat: 25.20, lng: 55.27,   destLat: 50.1, destLng: 8.7   },
  { id: "SHP-0889", origin: "Tokyo",       destination: "Seattle",      risk: "medium", prob: 31, route: "Trans-Pacific",        lat: 35.68, lng: 139.69,  destLat: 47.6, destLng: -122.3},
  { id: "SHP-0331", origin: "Los Angeles", destination: "Chicago",      risk: "low",    prob: 12, route: "Domestic Rail",        lat: 34.05, lng: -118.24, destLat: 41.8, destLng: -87.6 },
  { id: "SHP-2201", origin: "Singapore",   destination: "Rotterdam",    risk: "medium", prob: 38, route: "Asia → Europe",        lat: 1.35,  lng: 103.81,  destLat: 51.9, destLng: 4.5  },
  { id: "SHP-3312", origin: "New York",    destination: "London",       risk: "low",    prob:  8, route: "Trans-Atlantic",       lat: 40.71, lng: -74.00,  destLat: 51.5, destLng: -0.12 },
  { id: "SHP-4401", origin: "Guangzhou",   destination: "Long Beach",   risk: "high",   prob: 71, route: "Trans-Pacific",        lat: 23.12, lng: 113.26,  destLat: 33.7, destLng: -118.1},
  { id: "SHP-5582", origin: "Chennai",     destination: "Colombo",      risk: "low",    prob: 15, route: "South Asian Coastal",  lat: 13.08, lng: 80.27,   destLat: 6.9,  destLng: 79.8  },
];

type FilterType = "all" | "high" | "medium" | "low";

export default function RiskMapPage() {
  const [filter,   setFilter]   = useState<FilterType>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = MOCK_SHIPMENTS.filter(s => filter === "all" || s.risk === filter);

  const counts = {
    high:   MOCK_SHIPMENTS.filter(s => s.risk === "high").length,
    medium: MOCK_SHIPMENTS.filter(s => s.risk === "medium").length,
    low:    MOCK_SHIPMENTS.filter(s => s.risk === "low").length,
  };

  // Map MOCK_SHIPMENTS into format for ShipmentMap component
  const mapShipments = filtered.map(s => ({
    shipmentId: s.id,
    origin: s.origin,
    destination: s.destination,
    risk_score: s.prob,
    status: s.risk === "high" ? "at_risk" : "in_transit",
    lat: s.lat,
    lng: s.lng,
    destLat: s.destLat,
    destLng: s.destLng,
  }));

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-end justify-between shrink-0 gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white font-display mb-1 text-glow">
            Risk Surveillance
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Localized threat intelligence mapping across global maritime corridors.
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Grid Scan Active
          </div>
        </div>
      </div>

      <div className="bento-grid pb-12">
        
        {/* 1. Risk Summary Pills (IntegratedHeader) */}
        {[
          { label: "High Risk",   count: counts.high,   color: "text-rose-400",    bg: "bg-rose-500/10",   border: "border-rose-500/15" },
          { label: "Medium Risk", count: counts.medium, color: "text-amber-400",   bg: "bg-amber-500/10",  border: "border-amber-500/15" },
          { label: "Optimal",    count: counts.low,    color: "text-emerald-400", bg: "bg-emerald-500/10",border: "border-emerald-500/15" },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} className={`col-span-12 md:col-span-4 bento-card ${bg} ${border}`}>
            <div className="bento-inner text-center justify-center py-8">
              <p className={`text-4xl font-black font-display ${color} drop-shadow-md`}>{count}</p>
              <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-2">{label}</p>
            </div>
          </div>
        ))}

        {/* 2. Shipment Manifest (Sidebar Table) */}
        <div className="col-span-12 lg:col-span-4 row-span-2 bento-card h-[800px] flex flex-col">
          <div className="bento-inner">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">Live Manifest</h3>
              </div>
              <div className="flex gap-1">
                {(["all", "high"] as FilterType[]).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} 
                    className={cn("px-2 py-1 rounded text-[9px] font-black uppercase transition-all", filter === f ? "bg-cyan-500/20 text-cyan-400" : "text-slate-600 hover:text-slate-400")}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 h-full">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(selected === s.id ? null : s.id)}
                  className={cn(
                    "w-full text-left rounded-2xl p-4 transition-all duration-300 relative group",
                    selected === s.id
                      ? "bg-white/[0.04] border border-cyan-500/30"
                      : "bg-black/20 border border-white/5 hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black tracking-wide text-cyan-400 group-hover:text-cyan-300 transition-colors">{s.id}</span>
                    <RiskBadge level={s.risk as "low" | "medium" | "high"} probability={s.prob} />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {s.origin} <span className="text-slate-600">→</span> {s.destination}
                  </div>
                  
                  {selected === s.id && (
                    <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-1">
                      <p className="text-[9px] text-slate-500 mb-2 font-mono">{s.route}</p>
                      <div className="h-1 rounded-full bg-black/50 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", s.risk === "high" ? "bg-rose-500" : s.risk === "medium" ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${s.prob}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Massive 2D Map Container */}
        <div className="col-span-12 lg:col-span-8 row-span-2 bento-card min-h-[500px] lg:min-h-[800px] border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)]">
          <div className="absolute inset-0 z-0">
            <ShipmentMap shipments={mapShipments} />
          </div>
          <div className="absolute top-6 left-6 z-10 p-4 rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                <MapIcon className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Temporal Risk Overlay</h3>
            </div>
          </div>
          
          {/* Legend Overlay */}
          <div className="absolute bottom-6 right-6 z-10 p-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/5 hidden sm:block">
            <div className="grid grid-cols-2 gap-4">
              {[
                { color: "bg-rose-500",    label: "High Impact" },
                { color: "bg-amber-400",   label: "Delayed" },
                { color: "bg-emerald-400", label: "Optimal" },
                { color: "bg-cyan-500",    label: "Neural Path" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
