"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cn } from "@/lib/utils";

// Fix Leaflet's default icon path issues in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// ── Icon Factories ─────────────────────────────────────
const createOriginIcon = (color: string) => {
  return L.divIcon({
    className: "bg-transparent",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute inline-flex h-full w-full rounded-full opacity-30" style="background-color: ${color};"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 border-2 border-[#05050a]" style="background-color: ${color};"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createDestinationIcon = (color: string) => {
  return L.divIcon({
    className: "bg-transparent",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="relative w-4 h-4 rounded-sm rotate-45 border-2" style="border-color: ${color}; background-color: #05050a; opacity: 0.7;">
          <div class="absolute inset-1 rounded-full" style="background-color: ${color}; opacity: 0.5;"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createVesselIcon = (color: string, mode: string = "Sea") => {
  const emoji = mode === "Air" ? "✈" : mode === "Land" ? "🚛" : "🚢";
  return L.divIcon({
    className: "bg-transparent",
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <span class="absolute inline-flex h-full w-full rounded-full animate-ping-slow opacity-20" style="background-color: ${color};"></span>
        <span class="absolute inline-flex h-8 w-8 rounded-full opacity-30" style="background-color: ${color};"></span>
        <div class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-[0_0_20px_${color}]" style="background-color:#05050a; border-color:${color};">
          <span style="font-size:14px; line-height:1;">${emoji}</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// ── Helpers ────────────────────────────────────────────
// Interpolate between two lat/lng points by progress (0–1)
const interpolatePosition = (
  from: [number, number],
  to: [number, number],
  t: number
): [number, number] => {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
};

// Derive synthetic progress from shipment metadata
const getProgress = (shipment: Shipment): number => {
  if (shipment.status === "DELIVERED") return 1;
  if (shipment.status === "PENDING") return 0.05;
  // Use risk score + status to simulate realistic varied progress
  const base = shipment.status === "DELAYED" ? 0.3 : 0.5;
  // Mix in shipmentId hash for variety
  const hash = shipment.shipmentId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.min(0.92, base + (hash % 30) / 100);
};

// ── Auto-fit bounds helper ─────────────────────────────
function FitBounds({ positions, preview }: { positions: [number,number][], preview: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2 && !preview) {
      map.fitBounds(positions, { padding: [50, 50], maxZoom: 6 });
    }
  }, []);
  return null;
}

// ── Types ─────────────────────────────────────────────
interface Shipment {
  shipmentId: string;
  origin: string;
  destination: string;
  risk_score: number;
  status: string;
  transport_mode?: string;
  lat?: number;
  lng?: number;
  destLat?: number;
  destLng?: number;
}

interface ShipmentMapProps {
  shipments: Shipment[];
  preview?: boolean;
}

export default function ShipmentMap({ shipments, preview = false }: ShipmentMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="w-full h-full bg-[#05050a] flex items-center justify-center"><div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" /></div>;

  const defaultCenter: [number, number] = shipments.length === 1 && shipments[0].lat && shipments[0].lng 
    ? [shipments[0].lat, shipments[0].lng] 
    : [25, 10];

  const allPositions: [number, number][] = shipments.flatMap(s => {
    const pts: [number, number][] = [];
    if (s.lat && s.lng) pts.push([s.lat, s.lng]);
    if (s.destLat && s.destLng) pts.push([s.destLat, s.destLng]);
    return pts;
  });

  return (
    <div className={cn("w-full h-full relative overflow-hidden z-0 bg-[#05050a]", preview ? "rounded-2xl" : "rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)]")}>
      <MapContainer
        center={defaultCenter}
        zoom={preview ? 3 : 3}
        minZoom={2}
        className="w-full h-full"
        zoomControl={!preview}
        dragging={!preview}
        scrollWheelZoom={!preview}
        doubleClickZoom={!preview}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png" opacity={0.25} />

        {!preview && allPositions.length >= 2 && (
          <FitBounds positions={allPositions} preview={preview} />
        )}

        {shipments.map((shipment) => {
          if (!shipment.lat || !shipment.lng) return null;

          const riskLevel = shipment.risk_score >= 60 ? "high" : shipment.risk_score >= 35 ? "medium" : "low";
          let color = "#22d3ee";
          if (riskLevel === "high") color = "#f43f5e";
          if (riskLevel === "medium") color = "#fbbf24";

          const originPos: [number, number] = [shipment.lat, shipment.lng];
          const destPos: [number, number] | null = shipment.destLat && shipment.destLng ? [shipment.destLat, shipment.destLng] : null;

          const progress = getProgress(shipment);
          const currentPos: [number, number] | null = destPos ? interpolatePosition(originPos, destPos, progress) : null;

          return (
            <div key={shipment.shipmentId}>
              {/* Completed path: origin → current */}
              {currentPos && (
                <Polyline
                  positions={[originPos, currentPos]}
                  pathOptions={{ color, weight: preview ? 1.5 : 2.5, opacity: 0.85, lineCap: "round" }}
                />
              )}

              {/* Remaining path: current → destination */}
              {currentPos && destPos && (
                <Polyline
                  positions={[currentPos, destPos]}
                  pathOptions={{ color, weight: preview ? 1 : 1.5, opacity: 0.25, dashArray: "6, 10", lineCap: "round" }}
                />
              )}

              {/* Origin Marker */}
              <Marker position={originPos} icon={createOriginIcon(color)}>
                <Popup closeButton={false}>
                  <div className="bg-[#0f111a] border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[220px] text-white">
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Departure</div>
                    <div className="text-sm font-bold">{shipment.origin}</div>
                    <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-500 uppercase">{shipment.shipmentId}</div>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              {destPos && (
                <Marker position={destPos} icon={createDestinationIcon(color)}>
                  <Popup closeButton={false}>
                    <div className="bg-[#0f111a] border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[220px] text-white">
                      <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">Arrival Terminal</div>
                      <div className="text-sm font-bold">{shipment.destination}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* 🛳 Live Vessel Position Marker */}
              {currentPos && shipment.status !== "DELIVERED" && (
                <Marker position={currentPos} icon={createVesselIcon(color, shipment.transport_mode)}>
                  <Popup closeButton={false}>
                    <div className="bg-[#0f111a] border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[240px] text-white">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color }}>⚡ Live Position</div>
                      <div className="text-sm font-bold mb-1">{shipment.shipmentId}</div>
                      <div className="text-[10px] text-slate-400">{shipment.origin} → {shipment.destination}</div>
                      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 uppercase">Route Progress</span>
                        <span className="text-xs font-black" style={{ color }}>{Math.round(progress * 100)}%</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, backgroundColor: color }}></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MapContainer>

      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-container { background: #05050a !important; font-family: inherit !important; }
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
}

