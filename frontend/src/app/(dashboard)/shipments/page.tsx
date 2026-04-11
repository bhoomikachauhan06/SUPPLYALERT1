"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Link from "next/link";
import { 
  Search, Package, MapPin, Clock, ArrowRight, 
  Filter, ChevronRight, AlertCircle, CheckCircle2,
  Anchor, Activity, Calendar, Plane, Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/app/(dashboard)/layout";
import { useNavi } from "@/context/NaviContext";
import dynamic from "next/dynamic";

const ShipmentMap = dynamic(() => import("@/components/ShipmentMap"), { ssr: false });

// ── Types ─────────────────────────────────────────────
interface Shipment {
  id: string;
  shipment_id: string;
  origin: string;
  destination: string;
  status: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  transit_days_expected: number;
  carrier: string;
  shipment_value_usd?: number;
  risk_score?: number;
  transport_mode?: string;
}

const MOCK_SHIPMENTS: Shipment[] = [
  { id: "mock-1", shipment_id: "SHP-001234", origin: "Shanghai", destination: "Los Angeles", carrier: "MaerskLine", transport_mode: "Sea", shipment_value_usd: 125000, transit_days_expected: 28, status: "IN_TRANSIT", origin_lat: 31.2304, origin_lng: 121.4737, dest_lat: 33.9425, dest_lng: -118.408, risk_score: 50 },
  { id: "mock-2", shipment_id: "SHP-001235", origin: "Rotterdam", destination: "New York", carrier: "MSC", transport_mode: "Sea", shipment_value_usd: 89000, transit_days_expected: 14, status: "IN_TRANSIT", origin_lat: 51.9225, origin_lng: 4.4792, dest_lat: 40.6413, dest_lng: -74.0781, risk_score: 25 },
  { id: "mock-3", shipment_id: "SHP-001236", origin: "Mumbai", destination: "Hamburg", carrier: "Hapag-Lloyd", transport_mode: "Sea", shipment_value_usd: 67000, transit_days_expected: 21, status: "DELAYED", origin_lat: 19.076, origin_lng: 72.8777, dest_lat: 53.5511, dest_lng: 9.9937, risk_score: 75 },
  { id: "mock-4", shipment_id: "SHP-001237", origin: "Singapore", destination: "Sydney", carrier: "CMA-CGM", transport_mode: "Air", shipment_value_usd: 43000, transit_days_expected: 10, status: "IN_TRANSIT", origin_lat: 1.3521, origin_lng: 103.8198, dest_lat: -33.8688, dest_lng: 151.2093, risk_score: 15 },
  { id: "mock-5", shipment_id: "SHP-001238", origin: "Busan", destination: "São Paulo", carrier: "Evergreen", transport_mode: "Land", shipment_value_usd: 156000, transit_days_expected: 35, status: "PENDING", origin_lat: 35.1796, origin_lng: 129.0756, dest_lat: -23.5505, dest_lng: -46.6333, risk_score: 30 },
  { id: "mock-6", shipment_id: "SHP-001239", origin: "Singapore", destination: "Rotterdam", carrier: "OceanNetworkExpress", transport_mode: "Sea", shipment_value_usd: 210000, transit_days_expected: 22, status: "CRITICAL", origin_lat: 1.2903, origin_lng: 103.8520, dest_lat: 51.9225, dest_lng: 4.4792, risk_score: 95 }
];

// ── Helpers ───────────────────────────────────────────
const getStatusConfig = (status: string) => {
  switch (status.toUpperCase()) {
    case "IN_TRANSIT":
      return { label: "On Track", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: Activity };
    case "DELAYED":
      return { label: "Delayed", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock };
    case "CRITICAL":
      return { label: "Critical", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: AlertCircle };
    case "DELIVERED":
      return { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 };
    default:
      return { label: "Pending", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", icon: Package };
  }
};

export default function ShipmentsPage() {
  const { demoMode } = useDemoMode();
  const { setContextData } = useNavi();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Data Loading ────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (demoMode) {
        setShipments(MOCK_SHIPMENTS);
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api"}/shipment`, { withCredentials: true });
        const liveShipments = res.data.data?.shipments || [];
        setShipments(liveShipments.length > 0 ? liveShipments : MOCK_SHIPMENTS);
      } catch (err) {
        console.error("Failed to fetch shipments, falling back to mock data:", err);
        setShipments(MOCK_SHIPMENTS);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [demoMode]);


  // ── Navi Context ────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      setContextData({
        currentPage: "Shipment Inventory",
        shipmentCount: shipments.length,
        activeFilters: searchQuery ? ["Search: " + searchQuery] : []
      });
    }
  }, [loading, shipments, searchQuery, setContextData]);

  // ── Filter Logic ────────────────────────────────────
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => 
      s.shipment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shipments, searchQuery]);

  if (loading) {
    return (
      <div className="p-8 bento-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="col-span-12 md:col-span-4 h-64 rounded-[2rem] bg-white/3 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-10">
      
      {/* ── Header & Search ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-white mb-1">
            SHIPMENT <span className="gradient-text">INVENTORY</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">Manage and track your global logistics assets.</p>
        </div>

        <div className="relative group max-w-md w-full">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by Shipment ID, Origin, or Destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900/60 transition-all backdrop-blur-xl"
          />
        </div>
      </div>

      {/* ── Shipment Grid ───────────────────────────────── */}
      {filteredShipments.length > 0 ? (
        <div className="bento-grid">
          {filteredShipments.map((s, i) => {
            const config = getStatusConfig(s.status);
            const StatusIcon = config.icon;
            
            return (
              <Link 
                key={s.id} 
                href={`/shipments/${s.shipment_id}`}
                className="col-span-12 md:col-span-6 xl:col-span-4 bento-card group hover:shadow-[0_0_40px_rgba(34,211,238,0.1)]"
              >
                <div className="bento-inner p-8">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Global Identifier</span>
                      <h3 className="text-xl font-black font-display text-white group-hover:text-cyan-400 transition-colors">{s.shipment_id}</h3>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase border backdrop-blur-md flex items-center gap-1.5", config.bg, config.color, config.border)}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </div>
                  </div>

                  {/* Route Display */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                      <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-400 to-violet-500 opacity-30" />
                      <div className="w-1.5 h-1.5 rounded-sm rotate-45 border border-violet-500" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Origin</p>
                        <p className="text-sm font-bold text-slate-300">{s.origin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Destination</p>
                        <p className="text-sm font-bold text-slate-300">{s.destination}</p>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
                      <ShipmentMap 
                        shipments={[{
                          shipmentId: s.shipment_id,
                          origin: s.origin,
                          destination: s.destination,
                          risk_score: s.risk_score || 0,
                          status: s.status,
                          lat: s.origin_lat,
                          lng: s.origin_lng,
                          destLat: s.dest_lat,
                          destLng: s.dest_lng
                        }]} 
                        preview={true} 
                      />
                    </div>
                  </div>

                  {/* Stats Footer */}
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ETA Window</p>
                        <p className="text-xs font-bold text-white">{s.transit_days_expected} Days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {s.transport_mode === 'Air' ? <Plane className="w-3.5 h-3.5 text-slate-500" /> : 
                         s.transport_mode === 'Land' ? <Truck className="w-3.5 h-3.5 text-slate-500" /> : 
                         <Anchor className="w-3.5 h-3.5 text-slate-500" />}
                        <div>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Transport</p>
                          <p className="text-xs font-bold text-white">{s.transport_mode || 'Sea'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-cyan-500" />
                        <div>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Live Status</p>
                          <p className="text-xs font-bold text-cyan-400">
                            {s.status === "IN_TRANSIT" ? "Telemetry Active" : 
                             s.status === "CRITICAL" ? "High Alert" : 
                             s.status === "DELAYED" ? "Monitoring..." : "Confirmed"}
                          </p>
                        </div>
                    </div>
                  </div>

                  {/* Hover Indicator */}
                  <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                    <ChevronRight className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center bento-card border-dashed">
          <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-slate-700" />
          </div>
          <h2 className="text-2xl font-black font-display text-white mb-2">NO SHIPMENT FOUND</h2>
          <p className="text-slate-500 max-w-sm">We couldn't find any shipments matching your search query. Try searching by ID or location.</p>
          <button 
            onClick={() => setSearchQuery("")}
            className="mt-8 px-6 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
          >
            Clear Search
          </button>
        </div>
      )}

    </div>
  );
}
