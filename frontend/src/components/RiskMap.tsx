"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { AlertTriangle, MapPin } from "lucide-react";

// Fix for default Leaflet icon issues in Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const highRiskIcon = new L.Icon({
  ...customIcon.options,
  // Using a custom red variant or filter approach. For demo, we just use a trick or standard icon.
  // In production, you'd serve a local red marker PNG. For now we use the standard, but style the popup.
});

L.Marker.prototype.options.icon = customIcon;

// A custom component to update center based on props if needed
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export interface MapShipment {
  id: string;
  origin: string;
  destination: string;
  lat: number;
  lng: number;
  risk_level: string;
  probability: number;
}

interface RiskMapProps {
  shipments: MapShipment[];
  className?: string;
}

export default function RiskMap({ shipments, className }: RiskMapProps) {
  // Center roughly over global trade routes (Middle East / Indian Ocean focus)
  const defaultCenter: [number, number] = [20, 50];

  return (
    <div className={`w-full h-full relative z-0 rounded-2xl overflow-hidden border border-slate-800 ${className}`}>
      <MapContainer 
        center={defaultCenter} 
        zoom={3} 
        style={{ height: '100%', width: '100%', background: '#020617' }}
        zoomControl={false}
      >
        {/* Dark theme tile layer via CartoDB */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {shipments.map((shipment) => {
          const isHighRisk = shipment.risk_level === 'high' || shipment.risk_level === 'critical';
          
          return (
            <Marker 
              key={shipment.id} 
              position={[shipment.lat, shipment.lng]}
            >
              <Popup className="glass-popup">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 min-w-[200px] text-slate-100 font-sans shadow-2xl">
                  <div className="flex items-start justify-between mb-2 pb-2 border-b border-slate-800">
                    <div>
                      <h4 className="font-bold text-sm">{shipment.id}</h4>
                      <p className="text-xs text-slate-400 capitalize">{shipment.origin} → {shipment.destination}</p>
                    </div>
                    {isHighRisk && <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-medium text-slate-400">Risk Profile:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                      isHighRisk ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {shipment.risk_level} ({shipment.probability.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Global overriding CSS for the leafleft popup to remove white background */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: white;
          padding: 8px 12px 0 0;
        }
      `}} />
    </div>
  );
}
