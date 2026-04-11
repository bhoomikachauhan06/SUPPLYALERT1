"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import {
  Package, AlertTriangle, Clock, Globe2, RefreshCw,
  MapPin, TrendingUp, ShieldCheck, Wifi, WifiOff,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { useDemoMode } from "@/app/(dashboard)/layout";

import { useNavi } from "@/context/NaviContext";

const ShipmentMap = dynamic(() => import("@/components/ShipmentMap"), { ssr: false });

// ── Mock data for demo mode ──────────────────────────
const MOCK_SHIPMENTS = [
  { shipmentId: "SHP-2847", origin: "Shanghai", destination: "Hamburg",     risk_score: 78, status: "at_risk",   lat: 31.2, lng: 121.5,  destLat: 53.5, destLng: 10.0 },
  { shipmentId: "SHP-1932", origin: "Seoul",    destination: "Rotterdam",   risk_score: 65, status: "at_risk",   lat: 37.6, lng: 127.0,  destLat: 51.9, destLng: 4.5  },
  { shipmentId: "SHP-0442", origin: "Mumbai",   destination: "Los Angeles", risk_score: 58, status: "at_risk",   lat: 19.1, lng: 72.9,   destLat: 34.0, destLng: -118.2},
  { shipmentId: "SHP-0331", origin: "LA",       destination: "Chicago",     risk_score: 12, status: "in_transit", lat: 34.0, lng: -118.2, destLat: 41.8, destLng: -87.6 },
  { shipmentId: "SHP-1103", origin: "Dubai",    destination: "Frankfurt",   risk_score: 44, status: "in_transit", lat: 25.2, lng: 55.3,   destLat: 50.1, destLng: 8.7   },
  { shipmentId: "SHP-0889", origin: "Tokyo",    destination: "Seattle",     risk_score: 31, status: "in_transit", lat: 35.7, lng: 139.7,  destLat: 47.6, destLng: -122.3},
];

const MOCK_STATS = {
  totalActive: 247, highRisk: 18, avgDelay: 3.2, coverage: 94,
};

const MOCK_SIGNALS = [
  { id: 1, type: "weather",     label: "Typhoon — South China Sea",    severity: 8.5, color: "text-red-400",    bg: "bg-red-400/10" },
  { id: 2, type: "geopolitical",label: "Geopolitical — Eastern Europe", severity: 7.2, color: "text-orange-400", bg: "bg-orange-400/10" },
  { id: 3, type: "congestion",  label: "Port Congestion — Rotterdam",   severity: 8.1, color: "text-amber-400",  bg: "bg-amber-400/10" },
  { id: 4, type: "congestion",  label: "Port Congestion — Shanghai",    severity: 7.4, color: "text-amber-400",  bg: "bg-amber-400/10" },
];

export default function DashboardPage() {
  const { demoMode } = useDemoMode();
  const { setContextData } = useNavi();
  const [shipments, setShipments] = useState<any[]>([]);
  const [stats,     setStats]     = useState({ totalActive: 0, highRisk: 0, avgDelay: 0, coverage: 0 });
  const [signals,   setSignals]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  // Update Navi Context
  useEffect(() => {
    if (!loading) {
      setContextData({
        currentPage: "Dashboard Overview",
        stats,
        signals,
        shipments: shipments.slice(0, 10), // Relevant slice for AI context
        highRiskShipments: shipments.filter(s => s.risk_score >= 60).length
      });
    }
  }, [loading, stats, signals, shipments, setContextData]);

  const loadData = async () => {
    if (demoMode) {
      setShipments(MOCK_SHIPMENTS);
      setStats(MOCK_STATS);
      setSignals(MOCK_SIGNALS);
      setLoading(false);
      return;
    }
    try {
      const [statsRes, listRes, signalsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api"}/shipment/stats`, { withCredentials: true }),
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api"}/shipment`, { withCredentials: true }),
        fetch("/api/signals").then(r => r.json()),
      ]);
      setShipments(listRes.data.data?.shipments || []);
      setStats(statsRes.data.data || MOCK_STATS);
      setSignals(signalsRes.data?.weather || MOCK_SIGNALS);
    } catch {
      setShipments(MOCK_SHIPMENTS);
      setStats(MOCK_STATS);
      setSignals(MOCK_SIGNALS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [demoMode]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const highRisk = shipments.filter(s => (s.risk_score || 0) >= 50 || s.status === "at_risk");

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/3 shimmer" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-white/3 shimmer" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full p-6 flex flex-col gap-8">
      
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between shrink-0 gap-4 mt-2">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white font-display mb-1 text-glow">
            Global Operations
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Real-time risk intelligence across your supply network.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md ${
            demoMode
              ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            {demoMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {demoMode ? "Demo Feed" : "Live Feed"}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-md text-sm font-semibold text-slate-300 hover:text-white border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Bento Grid Operations ───────────────────────────────── */}
      <div className="bento-grid mb-12">
        
        {/* KPI Row (Integrated into Grid) */}
        <div className="col-span-12 md:col-span-3 h-full">
          <StatCard label="Active Shipments" value={stats.totalActive} color="cyan"
            icon={<Package className="w-5 h-5" />} trend="up" trendValue="+12 this week" />
        </div>
        <div className="col-span-12 md:col-span-3 h-full">
          <StatCard label="High Risk Alerts" value={stats.highRisk} color="rose"
            icon={<AlertTriangle className="w-5 h-5" />} trend="up" trendValue="+3 last 24h" />
        </div>
        <div className="col-span-12 md:col-span-3 h-full">
          <StatCard label="Avg Delay (days)" value={stats.avgDelay || 3} unit="d" color="amber"
            icon={<Clock className="w-5 h-5" />} trend="down" trendValue="+18% WoW" />
        </div>
        <div className="col-span-12 md:col-span-3 h-full">
          <StatCard label="Route Coverage" value={stats.coverage || 94} unit="%" color="emerald"
            icon={<ShieldCheck className="w-5 h-5" />} trend="flat" trendValue="Stable" />
        </div>

        {/* Live Logistics Map (Main Feature) */}
        <div className="col-span-12 lg:col-span-8 row-span-2 relative min-h-[600px] lg:min-h-0 bento-card border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)]">
          <div className="absolute inset-0 z-0">
            <ShipmentMap shipments={shipments} />
          </div>
          
          {/* Overlay Map Legend/Header */}
          <div className="absolute top-6 left-6 z-10 p-4 rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                <Globe2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Network Surveillance</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Live Spatial Tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Risk Signals */}
        <div className="col-span-12 lg:col-span-4 row-span-1 bento-card border-amber-500/10">
          <div className="bento-inner">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Live Risk Signals</h3>
                <p className="text-[10px] text-slate-500 font-medium">Real-time global anomaly detection</p>
              </div>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              {signals.slice(0, 5).map((s) => (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${s.bg} border border-white/5 shadow-inner backdrop-blur-sm`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${s.color}`}>{s.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-black ${s.color} mr-0.5 drop-shadow-md`}>{s.severity}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Idx</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Immediate Attention (Critical Shipments) */}
        <div className="col-span-12 lg:col-span-4 row-span-1 bento-card border-rose-500/10">
          <div className="bento-inner">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Immediate Attention</h3>
                <p className="text-[10px] text-slate-500 font-medium">Critical shipments at risk</p>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 text-[11px] font-black shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                {highRisk.length}
              </span>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {highRisk.slice(0, 5).map((s) => {
                const risk = s.risk_score >= 60 ? "high" : s.risk_score >= 35 ? "medium" : "low";
                return (
                  <div key={s.shipmentId} className="group cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-cyan-400 group-hover:text-cyan-300 transition-colors tracking-wide">{s.shipmentId}</span>
                      <RiskBadge level={risk as "low"|"medium"|"high"} probability={s.risk_score} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mb-2">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {s.origin} <span className="text-slate-600 font-black px-1">→</span> {s.destination}
                    </div>
                    <div className="h-1 rounded-full bg-slate-900 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        s.risk_score >= 60 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : s.risk_score >= 35 ? "bg-amber-500" : "bg-emerald-500"
                      }`} style={{ width: `${s.risk_score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
