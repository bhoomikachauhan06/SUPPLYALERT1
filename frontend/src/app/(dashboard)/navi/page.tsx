"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bot, Send, Loader2, Sparkles, BarChart3, ShieldAlert, 
  Lightbulb, Zap, Activity, TrendingUp, Brain, Globe2,
  ChevronRight, MessageSquare, AlertTriangle, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavi } from "@/context/NaviContext";
import { useDemoMode } from "@/app/(dashboard)/layout";

// ── Types ──────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mlUsed?: boolean;
  mlRiskLevel?: string | null;
}

// ── Quick Prompt chips ─────────────────────────────────
const QUICK_PROMPTS = [
  { icon: ShieldAlert,  label: "Risk Audit",       text: "Run a full risk audit on all active shipments and tell me what action I should take today." },
  { icon: BarChart3,    label: "Analyze Network",   text: "Analyze my current supply chain network and identify the top 3 vulnerabilities." },
  { icon: TrendingUp,   label: "Delay Forecast",    text: "Which shipments are most likely to be delayed in the next 7 days and why?" },
  { icon: Lightbulb,    label: "Optimize Routes",   text: "Suggest route optimizations to reduce delay risk across my fleet right now." },
  { icon: Globe2,       label: "Weather Impact",    text: "What is the current weather risk impact on my active shipments?" },
  { icon: Zap,          label: "Quick Summary",     text: "Give me a 3-bullet executive summary of my logistics dashboard right now." },
];

// ── Message Renderer ───────────────────────────────────
function MessageBubble({ msg, idx }: { msg: Message; idx: number }) {
  const isUser = msg.role === "user";

  return (
    <div
      key={idx}
      className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.35)] shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      {isUser && (
        <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare className="w-4 h-4 text-slate-300" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5 max-w-[75%]", isUser ? "items-end" : "items-start")}>
        {/* Bubble */}
        <div className={cn(
          "px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-lg",
          isUser
            ? "bg-gradient-to-br from-violet-600/90 to-indigo-700/90 text-white rounded-tr-sm border border-white/10"
            : "bg-white/5 border border-white/10 text-slate-100 rounded-tl-sm backdrop-blur-md"
        )}>
          <p className="whitespace-pre-wrap font-medium tracking-tight">{msg.content}</p>
        </div>

        {/* Footer row */}
        <div className={cn("flex items-center gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {isUser ? "You" : "Navi"}
          </span>
          {!isUser && msg.mlUsed && (
            <span className="flex items-center gap-1 text-[8px] font-black text-violet-400 uppercase tracking-wider border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 rounded-md">
              <Brain className="w-2.5 h-2.5" /> ML Active
            </span>
          )}
          {!isUser && msg.mlRiskLevel === "high" && (
            <span className="flex items-center gap-1 text-[8px] font-black text-rose-400 uppercase tracking-wider border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
              <AlertTriangle className="w-2.5 h-2.5" /> High Risk
            </span>
          )}
          {!isUser && msg.mlRiskLevel === "low" && (
            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-wider border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <CheckCircle2 className="w-2.5 h-2.5" /> Low Risk
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────
export default function NaviPage() {
  const { messages, addMessage, contextData, isLoading, setIsLoading, setContextData } = useNavi();
  const { demoMode } = useDemoMode();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update context page
  useEffect(() => {
    setContextData((prev: any) => ({ ...prev, currentPage: "Navi AI Chat" }));
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (customText?: string) => {
    const text = (customText || input).trim();
    if (!text || isLoading) return;
    if (!customText) setInput("");

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    addMessage(userMsg);
    setIsLoading(true);

    try {
      const res = await fetch("/api/navi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: {
            ...contextData,
            demoMode,
            currentPage: "Navi AI Chat",
          },
          history: messages.slice(-8),
        }),
      });

      const data = await res.json();
      addMessage({
        role: "assistant",
        content: data.reply || "I encountered an issue processing your request.",
        timestamp: new Date(),
        mlUsed: data.mlUsed || false,
        mlRiskLevel: data.mlRiskLevel || null,
      } as Message);
    } catch {
      addMessage({
        role: "assistant",
        content: "NAVI is experiencing a temporary sync issue. The intelligence core is rerouting — please retry.",
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#05050a] relative overflow-hidden">
      
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/8 blur-[150px] rounded-full pointer-events-none" />

      {/* ── Header ──────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl px-8 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.45)]">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#05050a] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight font-display">NAVI</h1>
              <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-widest">AI Co-Pilot</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Neural Link Active · Gemini + XGBoost ML · {demoMode ? "Demo Mode" : "Live Mode"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/3 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Activity className="w-3 h-3 text-cyan-400" />
            {messages.length - 1} Messages
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            <Brain className="w-3 h-3" />
            ML Model Online
          </div>
        </div>
      </div>

      {/* ── Chat Area ────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 space-y-6 relative z-10">
        
        {/* Welcome state */}
        {messages.length <= 1 && (
          <div className="max-w-2xl mx-auto text-center py-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white font-display mb-3">Intelligence Core Online</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed mb-8">
              I'm connected to your live logistics network and operational ML model. Ask me anything about your shipments, risks, or routes.
            </p>

            {/* Quick prompts */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.text)}
                  className="group flex items-start gap-3 p-4 rounded-2xl bg-white/3 border border-white/8 hover:bg-white/6 hover:border-violet-500/30 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20 group-hover:bg-violet-500/20 transition-all">
                    <p.icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white mb-1">{p.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">{p.text}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} msg={msg as Message} idx={idx} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">
                  Synthesizing intelligence...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick prompt chips (when chat active) ─────────── */}
      {messages.length > 1 && (
        <div className="shrink-0 px-8 py-3 border-t border-white/5 bg-slate-950/20 overflow-x-auto z-10">
          <div className="flex gap-2 w-max">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p.text)}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/3 border border-white/8 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-violet-500/10 hover:border-violet-500/30 transition-all uppercase tracking-wider whitespace-nowrap disabled:opacity-30"
              >
                <p.icon className="w-3 h-3 text-violet-400" />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input Area ───────────────────────────────────── */}
      <div className="shrink-0 px-8 py-5 border-t border-white/5 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-end gap-3 max-w-5xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask NAVI about shipment risks, route optimization, delay forecasts..."
              rows={1}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all pr-14 font-medium resize-none leading-relaxed custom-scrollbar"
              style={{ maxHeight: "120px", minHeight: "52px" }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span className="text-[9px] text-slate-700 font-bold">↵ Send</span>
            </div>
          </div>
          
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-105 transition-all shadow-lg shrink-0"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        
        <p className="text-center text-[9px] text-slate-800 font-bold uppercase tracking-widest mt-3">
          Powered by Gemini 1.5 Flash + XGBoost ML · DrishtiFlow Intelligence Core
        </p>
      </div>
    </div>
  );
}
