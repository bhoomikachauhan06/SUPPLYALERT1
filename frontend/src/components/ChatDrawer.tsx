"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const DEMO_RESPONSES: Record<string, string> = {
  default: "I'm NAVI, your AI supply chain co-pilot. I can analyze risk patterns, explain disruption signals, and recommend mitigation strategies. What would you like to know?",
  risk: "Based on current signals, your highest-risk corridors are the Trans-Pacific routes (weather severity 8.5/10) and Eastern Europe lanes (geopolitical index 7.2/10). I recommend activating Route B contingencies for Shanghai-bound shipments.",
  weather: "⛈️ Severe weather alert: Typhoon formation detected in the South China Sea. This affects 14 active shipments on the Shanghai–LA corridor. Estimated impact window: 5–9 days. Recommend switching to Ningbo port routing.",
  delay: "Current average delay across your portfolio is 3.2 days, up 18% from last week. Primary drivers: port congestion at Rotterdam (congestion index 8.1) and customs backlogs in Mumbai.",
  predict: "Running prediction on your current shipment portfolio... High risk detected on SHP-2847 (Shanghai → Hamburg, 78% disruption probability). Key factors: weather severity 8.5, port congestion 9.0, historical disruptions 7.0.",
  help: "I can help you with:\n• **Risk Assessment** — \"What's the risk level for my Shanghai shipments?\"\n• **Weather Signals** — \"Any weather alerts?\"\n• **Route Optimization** — \"Find the safest route to Hamburg\"\n• **Delay Prediction** — \"Estimate delay for SHP-2847\"\n• **Signal Breakdown** — \"Explain the geopolitical risk score\"",
};

function getResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("weather") || lower.includes("storm") || lower.includes("typhoon"))
    return DEMO_RESPONSES.weather;
  if (lower.includes("risk") || lower.includes("danger") || lower.includes("alert"))
    return DEMO_RESPONSES.risk;
  if (lower.includes("delay") || lower.includes("late") || lower.includes("behind"))
    return DEMO_RESPONSES.delay;
  if (lower.includes("predict") || lower.includes("score") || lower.includes("probability"))
    return DEMO_RESPONSES.predict;
  if (lower.includes("help") || lower.includes("what can") || lower.includes("how"))
    return DEMO_RESPONSES.help;
  return DEMO_RESPONSES.default;
}

export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: DEMO_RESPONSES.default, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: new Date() }]);
    setLoading(true);

    // Simulate AI thinking delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: getResponse(text), timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl",
          "bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold text-sm shadow-lg",
          "transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]",
          open && "opacity-0 pointer-events-none scale-90"
        )}
        aria-label="Open NAVI AI Chat"
      >
        <Bot className="w-5 h-5" />
        <span>NAVI AI</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
      </button>

      {/* Chat Drawer */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] transition-all duration-500 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95 pointer-events-none"
        )}
      >
        <div className="glass-premium rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ height: "540px", boxShadow: "0 0 60px rgba(168,85,247,0.2)" }}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-gradient-to-r from-violet-950/60 to-cyan-950/60">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#05050a]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">NAVI</p>
                <p className="text-[10px] text-emerald-400 font-medium">AI Co-pilot · Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-gradient-to-r from-violet-600/80 to-cyan-600/80 text-white rounded-br-sm"
                      : "bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className="text-[10px] opacity-50 mt-1 text-right">
                    {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <MessageSquare className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask NAVI about your supply chain..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none min-w-0"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 text-center mt-2">
              Powered by SupplyAlert NAVI v2 · Demo Mode
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
