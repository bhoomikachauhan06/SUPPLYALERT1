"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import {
  Activity, Map, GitBranch, Upload, LogOut,
  Bell, Globe2, Zap, FlaskConical, Settings, Package, Bot
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChatDrawer } from "@/components/ChatDrawer";
import { NaviSidebar } from "@/components/NaviSidebar";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { NaviProvider } from "@/context/NaviContext";

// Demo mode context
export const DemoModeContext = createContext({ demoMode: true, setDemoMode: (_: boolean) => {} });
export function useDemoMode() { return useContext(DemoModeContext); }

let socket: Socket | null = null;

const NAV_ITEMS = [
  { name: "Overview",    path: "/dashboard",          icon: Map,      color: "text-cyan-400" },
  { name: "Shipments",   path: "/shipments",          icon: Package,  color: "text-blue-400" },
  { name: "Navi AI",     path: "/navi",               icon: Bot,      color: "text-violet-400", badge: "AI" },
  { name: "Risk Map",    path: "/dashboard/risk-map", icon: Globe2,   color: "text-violet-400" },
  { name: "Simulations", path: "/simulate",           icon: GitBranch,color: "text-amber-400" },
  { name: "Upload Data", path: "/upload",             icon: Upload,   color: "text-emerald-400" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, dbUser, loading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [alerts,    setAlerts]    = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [demoMode,  setDemoMode]  = useState(true);

  // Auth guard
  useEffect(() => {
    if (!loading && !dbUser) router.push("/login");
  }, [user, dbUser, loading, router]);

  // Socket connection
  useEffect(() => {
    if (dbUser && !socket) {
      socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000");
      socket.on("high_risk_alert", (data) => {
        setAlerts((prev) => [data.message, ...prev.slice(0, 4)]);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);
      });
    }
    return () => { if (socket) { socket.disconnect(); socket = null; } };
  }, [dbUser]);

  if (loading || !dbUser) {
    return (
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-cyan-400 font-bold tracking-wider font-display">LOADING INTELLIGENCE...</span>
        </div>
      </div>
    );
  }

  return (
    <NaviProvider>
      <DemoModeContext.Provider value={{ demoMode, setDemoMode }}>
        {demoMode && <DemoModeBanner onToggle={() => setDemoMode(false)} />}

        <div className={cn("flex w-screen h-screen max-w-[100vw] sm:max-w-none text-slate-50 overflow-hidden box-border bg-[#05050a] relative", demoMode && "pt-9")}>
          
          {/* Global Clean Dot Grid Background */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='white' fill-opacity='0.05'/%3E%3C/svg%3E")` }} 
          />
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none z-0" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none z-0" />

          {/* ── Sidebar ──────────────────────────────────── */}
          <aside className="w-64 flex-shrink-0 flex flex-col min-h-0 overflow-hidden z-20 border-r border-white/5 bg-slate-950/40 backdrop-blur-3xl shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
            
            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-white/5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.35)] mr-2.5">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg tracking-tight font-display">
                Supply<span className="text-cyan-400">Alert</span>
              </span>
            </div>

            {/* Demo mode toggle pill */}
            <div className="px-4 py-3 border-b border-white/5">
              <button
                onClick={() => setDemoMode(!demoMode)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  demoMode
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {demoMode ? "Demo Mode Active" : "Live Mode Active"}
                <span className={cn(
                  "ml-auto w-6 h-3.5 rounded-full transition-all flex items-center",
                  demoMode ? "bg-violet-500 justify-end" : "bg-emerald-500 justify-start"
                )}>
                  <span className="w-2.5 h-2.5 rounded-full bg-white mx-0.5" />
                </span>
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase px-3 mb-3">Navigation</p>
            {NAV_ITEMS.map(({ name, path, icon: Icon, color, badge }: any) => {
                const active = pathname === path || (path !== "/dashboard" && pathname.startsWith(path));
                return (
                  <Link key={path} href={path}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group",
                      active
                        ? "bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-slate-500 hover:text-slate-200 hover:bg-white/4",
                      name === "Navi AI" && !active && "hover:bg-violet-500/10 hover:border-violet-500/20"
                    )}>
                      <Icon className={cn("w-4.5 h-4.5 transition-colors", active ? color : "group-hover:text-slate-300")} />
                      <span className="text-sm font-medium">{name}</span>
                      {badge && (
                        <span className="ml-1 px-1.5 py-0.5 text-[8px] font-black rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">{badge}</span>
                      )}
                      {active && <span className={cn("ml-auto w-1.5 h-1.5 rounded-full", color.replace("text-", "bg-"))} />}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* User footer */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-500 flex items-center justify-center text-sm font-black text-white shadow-[0_0_10px_rgba(34,211,238,0.25)]">
                  {dbUser.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate text-white">{dbUser.name}</p>
                  <p className="text-[10px] text-cyan-400 font-mono capitalize tracking-wider font-bold">{dbUser.role}</p>
                </div>
                <Link href="/settings" className="p-2 rounded-xl hover:bg-white/10 text-slate-500 hover:text-white transition-colors duration-200">
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] rounded-xl transition-all duration-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </aside>

          {/* ── Main Content ─────────────────────────────── */}
          <main className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">

            {/* Toast alert */}
            {showToast && alerts.length > 0 && (
              <div className="absolute top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
                <div className="glass-premium rounded-xl p-4 flex items-start gap-3 max-w-sm border border-rose-500/30"
                  style={{ boxShadow: "0 0 30px rgba(244,63,94,0.2)" }}>
                  <div className="p-1.5 bg-rose-500/15 rounded-lg shrink-0">
                    <Bell className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-400 mb-0.5">High Risk Alert</h4>
                    <p className="text-xs text-slate-300 leading-snug">{alerts[0]}</p>
                  </div>
                </div>
              </div>
            )}

            {children}
          </main>
          
          <NaviSidebar />
        </div>
      </DemoModeContext.Provider>
    </NaviProvider>
  );
}
