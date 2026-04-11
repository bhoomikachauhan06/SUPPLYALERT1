"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, Package, MapPin, Clock, ShieldCheck, 
  Anchor, Truck, TrendingUp, AlertTriangle, Activity,
  Calendar, CreditCard, User, Building2, Plane
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/app/(dashboard)/layout";
import { useNavi } from "@/context/NaviContext";

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
  shipment_value_usd: number;
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

const STEPS = [
  { id: "PENDING", label: "Booking Confirmed", icon: Package },
  { id: "PROCESSING", label: "Processing at Port", icon: Building2 },
  { id: "IN_TRANSIT", label: "In Transit", icon: ShipIcon },
  { id: "DELIVERED", label: "Delivered", icon: CheckIcon },
];

function ShipIcon(props: any) { return <Anchor {...props} />; }
function CheckIcon(props: any) { return <ShieldCheck {...props} />; }

export default function ShipmentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { demoMode } = useDemoMode();
  const { setContextData } = useNavi();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Data Loading ────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (demoMode) {
        const mock = MOCK_SHIPMENTS.find(s => s.shipment_id === id) || null;
        setShipment(mock);
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api"}/shipment/${id}`, { withCredentials: true });
        if (res.data.data) {
          setShipment(res.data.data);
        } else {
          // Fallback if DB is empty
          setShipment(MOCK_SHIPMENTS.find(s => s.shipment_id === id) || null);
        }
      } catch (err) {
        console.error("Failed to fetch shipment details, falling back to mock data:", err);
        setShipment(MOCK_SHIPMENTS.find(s => s.shipment_id === id) || null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, demoMode]);

  // ── Navi Context ────────────────────────────────────
  useEffect(() => {
    if (shipment) {
      setContextData({
        currentPage: `Shipment: ${id}`,
        activeShipmentId: shipment.shipment_id,
        shipmentStatus: shipment.status
      });
    }
  }, [shipment, setContextData, id]);

  if (loading) {
    return (
      <div className="p-8 bento-grid">
        <div className="col-span-12 h-12 rounded-xl bg-white/3 shimmer mb-4" />
        <div className="col-span-12 lg:col-span-4 h-[600px] rounded-[2rem] bg-white/3 shimmer" />
        <div className="col-span-12 lg:col-span-8 h-[600px] rounded-[2rem] bg-white/3 shimmer" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
        <h1 className="text-3xl font-black font-display text-white mb-2">SHIPMENT NOT FOUND</h1>
        <p className="text-slate-500 mb-8 max-w-md">The shipment ID you are looking for does not exist in our telemetry logs.</p>
        <button onClick={() => router.push("/shipments")} className="btn-cyan px-8 py-3 rounded-xl flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </button>
      </div>
    );
  }

  const renderStatusBadge = () => {
    const isAtRisk = (shipment.risk_score || 0) >= 50;
    return (
      <div className={cn(
        "px-4 py-1.5 rounded-full text-[11px] font-black uppercase border backdrop-blur-md flex items-center gap-2",
        isAtRisk ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
      )}>
        {isAtRisk ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
        {shipment.status === "IN_TRANSIT" ? "LIVE TRACKING" : shipment.status}
      </div>
    );
  };

  return (
    <div className="p-8 flex flex-col gap-8">
      
      {/* ── Breadcrumb & Header ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/shipments")} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-black font-display tracking-tight text-white">{shipment.shipment_id}</h1>
              {renderStatusBadge()}
            </div>
            <p className="text-slate-500 text-sm font-medium">Telemetry sync active • Last seen 2 mins ago</p>
          </div>
        </div>
      </div>

      <div className="bento-grid">
        
        {/* ── Left Column: Journey & Details ───────────────── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          
          {/* Status Timeline */}
          <div className="bento-card border-cyan-500/10">
            <div className="bento-inner p-8">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Journey Status
              </h3>
              
              <div className="relative space-y-12">
                {/* Vertical Line */}
                <div className="absolute left-6 top-2 bottom-2 w-px bg-white/5" />
                
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  // Simple logic to show active steps based on status
                  const isPast = (shipment.status === "DELIVERED") || 
                                (shipment.status === "IN_TRANSIT" && idx <= 2) ||
                                (idx === 0);
                  const isCurrent = (shipment.status === step.id) || (shipment.status === "IN_TRANSIT" && idx === 2);
                  
                  return (
                    <div key={step.id} className="relative flex items-start gap-10 group">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 relative z-10 transition-all duration-500",
                        isCurrent ? "bg-cyan-500 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] scale-110" :
                        isPast ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" :
                        "bg-slate-900 border-white/5 text-slate-600"
                      )}>
                        <Icon className={cn("w-5 h-5", isCurrent ? "text-slate-900" : "")} />
                      </div>
                      <div className="pt-1.5 flex-1">
                        <h4 className={cn("text-sm font-black tracking-tight transition-all", isCurrent ? "text-white text-lg" : "text-slate-400")}>
                          {step.label}
                        </h4>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                          {isCurrent ? "Active Processing" : isPast ? "Completed" : "Scheduled"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logistics Intelligence */}
          <div className="bento-card bg-gradient-to-br from-slate-950/40 to-cyan-900/10 border-white/5">
            <div className="bento-inner p-8">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6">Logistics Intel</h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Truck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Primary Carrier</p>
                    <p className="text-sm font-black text-white">{shipment.carrier}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                    <CreditCard className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Cargo Valuation</p>
                    <p className="text-sm font-black text-white">${shipment.shipment_value_usd.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    shipment.transport_mode === 'Air' ? "bg-sky-500/10 border-sky-500/20" :
                    shipment.transport_mode === 'Land' ? "bg-orange-500/10 border-orange-500/20" :
                    "bg-emerald-500/10 border-emerald-500/20"
                  )}>
                    {shipment.transport_mode === 'Air' 
                      ? <Plane className="w-5 h-5 text-sky-400" />
                      : shipment.transport_mode === 'Land'
                      ? <Truck className="w-5 h-5 text-orange-400" />
                      : <Anchor className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Mode of Transport</p>
                    <p className="text-sm font-black text-white">{shipment.transport_mode || 'Sea'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Calendar className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Expected Transit</p>
                    <p className="text-sm font-black text-white">{shipment.transit_days_expected} Days</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/3 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                    <TrendingUp className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Current Risk Index</p>
                    <p className="text-sm font-black text-rose-400">{shipment.risk_score || 0}% Probability</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right Column: Interactive Map ────────────────── */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bento-card border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)] flex-1 min-h-[700px]">
            <div className="absolute inset-0 z-0">
               {/* Pass as array to component */}
              <ShipmentMap shipments={[{
                  shipmentId: shipment.shipment_id,
                  origin: shipment.origin,
                  destination: shipment.destination,
                  risk_score: shipment.risk_score || 0,
                  status: shipment.status,
                  lat: shipment.origin_lat,
                  lng: shipment.origin_lng,
                  destLat: shipment.dest_lat,
                  destLng: shipment.dest_lng
              }]} />
            </div>
            
            {/* Map UI Overlays */}
            <div className="absolute top-8 left-8 z-10 p-6 rounded-[2rem] bg-slate-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl max-w-xs pointer-events-none">
              <h2 className="text-xl font-black font-display text-white mb-4">ACTIVE ROUTE</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 mt-1" />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Departure</p>
                    <p className="text-sm font-bold text-white">{shipment.origin}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2.5 h-2.5 rounded-sm bg-violet-500 rotate-45 shrink-0 mt-1" />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Destination</p>
                    <p className="text-sm font-bold text-white">{shipment.destination}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 z-10 flex gap-4 pointer-events-none">
               <div className="p-4 rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">SAT-COM Active</span>
               </div>
               <div className="p-4 rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/10 flex items-center gap-3">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Telemetry 1.2ms</span>
               </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
