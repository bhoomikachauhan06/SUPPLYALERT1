"use client";

import { useState, useEffect } from "react";
import { 
  Key, Plus, Trash2, Copy, Check, 
  ShieldCheck, AlertTriangle, ExternalLink, RefreshCw 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/keys`, {
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` }
      });
      const json = await resp.json();
      if (json.success) setKeys(json.data);
    } catch (err) {
      console.error("Failed to fetch API keys", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyLabel) return;
    setIsCreating(true);
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/keys`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}` 
        },
        body: JSON.stringify({ label: newKeyLabel })
      });
      const json = await resp.json();
      if (json.success) {
        setRevealedKey(json.data.rawKey);
        setNewKeyLabel("");
        fetchKeys();
      }
    } catch (err) {
      console.error("Error creating key", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this key? It will stop working immediately.")) return;
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` }
      });
      if (resp.ok) fetchKeys();
    } catch (err) {
      console.error("Error revoking key", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black font-display tracking-tight mb-2">
          INTEGRATION <span className="text-cyan-400">SETTINGS</span>
        </h1>
        <p className="text-slate-400">Manage your external data ingestion keys and system credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* API Keys Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-premium rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Key className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="font-bold text-lg">Ingestion API Keys</h2>
              </div>
              <Button 
                onClick={() => setRevealedKey(null)} 
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-9 px-4 rounded-xl"
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>
            </div>

            <div className="p-6">
              {revealedKey ? (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-orange-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Secret Key Generated</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-4">
                    Copy this key now. It will not be shown again for security reasons.
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/40 px-4 py-3 rounded-lg border border-white/10 font-mono text-cyan-400 text-sm break-all font-bold">
                      {revealedKey}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(revealedKey, 'new')}
                      className="px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                    >
                      {copied === 'new' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="e.g. MarineTraffic Webhook" 
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                    />
                    <Button onClick={handleCreateKey} disabled={!newKeyLabel || isCreating} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl px-6">
                      {isCreating ? <RefreshCw className="animate-spin w-4 h-4" /> : "Authorize"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {keys.length === 0 && !loading && (
                  <div className="py-12 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center opacity-40">
                        <ShieldCheck className="w-6 h-6 text-slate-500" />
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm">No active API keys found.</p>
                  </div>
                )}

                {keys.map((k) => (
                  <div key={k.id} className={cn(
                    "group flex items-center justify-between p-4 rounded-xl border transition-all",
                    k.isActive ? "bg-white/2 border-white/5 hover:bg-white/4" : "bg-black/20 border-white/5 opacity-50 grayscale"
                  )}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm tracking-tight">{k.label}</span>
                        {k.isActive ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-cyan-500/10 text-cyan-400 uppercase tracking-widest border border-cyan-500/20">Active</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-500 uppercase font-black tracking-widest">Revoked</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                        <code className="text-slate-400 font-bold tracking-widest">{k.prefix}••••••••</code>
                        <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                        {k.lastUsedAt && <span className="text-cyan-400">Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {k.isActive && (
                        <button 
                          onClick={() => handleRevokeKey(k.id)}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Webhook Documentation */}
          <div className="glass-premium rounded-2xl border border-white/5 p-6 bg-cyan-500/5 backdrop-blur-3xl">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              Ingestion Webhook Guide
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your logistics providers using standard HTTP POST requests. 
                Include your <strong>X-API-KEY</strong> in the header.
              </p>
              <pre className="bg-black/60 p-4 rounded-xl font-mono text-[11px] text-cyan-300 leading-relaxed border border-white/5 shadow-2xl">
{`curl -X POST ${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/ingest \\
  -H "x-api-key: YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "shipment_id": "CNT-9812",
    "origin_port": "Shanghai",
    "weather_severity": 8
  }'`}
              </pre>
            </div>
          </div>
        </div>

        {/* Sidebar / Recommendations */}
        <div className="space-y-6">
          <div className="glass-premium rounded-2xl border border-white/5 p-6">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Recommended APIs
            </h3>
            <div className="space-y-4">
              {[
                { name: "MarineTraffic", desc: "Vessel tracking & AIS", link: "https://www.marinetraffic.com/" },
                { name: "OpenWeatherMap", desc: "Global weather alerts", link: "https://openweathermap.org/" },
                { name: "TrackingMore", desc: "Universal package tracking", link: "https://www.trackingmore.com/" },
                { name: "Tive", desc: "IoT sensor & condition monitoring", link: "https://www.tive.com/" },
              ].map((api) => (
                <a 
                  key={api.name}
                  href={api.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl bg-white/2 border border-white/5 hover:bg-white/5 hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-200 group-hover:text-cyan-400">{api.name}</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </div>
                  <p className="text-[10px] text-slate-500">{api.desc}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
