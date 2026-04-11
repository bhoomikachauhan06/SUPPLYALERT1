"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bot, X, Send, Loader2, Sparkles, 
  ChevronRight, ChevronLeft, BarChart3, 
  ShieldAlert, Lightbulb, MessageSquare 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavi } from "@/context/NaviContext";

/**
 * NaviSidebar - The AI Co-Pilot UI
 * High-performance, context-aware assistant panel.
 */

export function NaviSidebar() {
  const { 
    isOpen, setIsOpen, messages, addMessage, 
    contextData, isLoading, setIsLoading 
  } = useNavi();
  
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const text = customText || input.trim();
    if (!text || isLoading) return;

    if (!customText) setInput("");
    
    addMessage({ role: "user", content: text, timestamp: new Date() });
    setIsLoading(true);

    try {
      const response = await fetch("/api/navi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: contextData,
          history: messages.slice(-5) 
        }),
      });

      const data = await response.json();
      addMessage({ 
        role: "assistant", 
        content: data.reply, 
        timestamp: new Date() 
      });
    } catch (err) {
      addMessage({ 
        role: "assistant", 
        content: "I'm having trouble syncing with the global risk nodes. I suggest monitoring your primary corridors for unusual variance.", 
        timestamp: new Date() 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const QuickAction = ({ icon: Icon, label, onClick }: any) => (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 hover:border-cyan-500/30 transition-all text-left uppercase tracking-wider"
    >
      <Icon className="w-3 h-3 text-cyan-400" />
      {label}
    </button>
  );

  return (
    <>
      {/* Collapsed Trigger Button (when closed - Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 bottom-6 z-[60] group"
        >
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-105 hover:shadow-[0_15px_40px_rgba(34,211,238,0.3)] transition-all">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
          </div>
        </button>
      )}

      {/* Main Sidebar Panel (Right side) */}
      <aside
        className={cn(
          "h-screen z-[70] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden shrink-0 border-l transition-colors",
          isOpen ? "w-[400px] opacity-100 border-white/10" : "w-0 opacity-0 pointer-events-none border-transparent"
        )}
      >
        <div className="h-full w-[400px] bg-[#05050a]/95 backdrop-blur-3xl shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden">
          {/* Animated Glows */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-violet-600/10 blur-[120px] rounded-full -ml-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-600/10 blur-[120px] rounded-full -mr-32 -mb-32 pointer-events-none" />

          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/40 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg tracking-tight">NAVI <span className="text-cyan-400 text-xs font-bold ml-1 uppercase border border-cyan-400/30 px-1.5 py-0.5 rounded">CO-PILOT</span></h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Neural Link Active</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-500 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10"
          >
            {messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end text-right" : "items-start text-left")}>
                <div
                  className={cn(
                    "max-w-[90%] px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed shadow-lg font-medium tracking-tight",
                    m.role === "user"
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm border border-white/10"
                      : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm backdrop-blur-md"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest px-1">
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {m.role === 'user' ? 'Transmission' : 'Navi Rec'}
                </span>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-3 animate-pulse">
                  Synthesizing Context...
                </div>
              </div>
            )}
          </div>

          {/* Context Actions Pannel */}
          <div className="px-6 py-5 border-t border-white/10 bg-black/40 relative z-10">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Tactical Operations</p>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction 
                icon={BarChart3} 
                label="Analyze Data" 
                onClick={() => handleSendMessage("Can you analyze all the data visible on my screen right now?")} 
              />
              <QuickAction 
                icon={ShieldAlert} 
                label="Risk Audit" 
                onClick={() => handleSendMessage("What are the top 3 risks I should worry about today?")} 
              />
              <QuickAction 
                icon={Lightbulb} 
                label="Optimizations" 
                onClick={() => handleSendMessage("Suggest 3 actions I can take right now to improve efficiency.")} 
              />
              <QuickAction 
                icon={MessageSquare} 
                label="Direct Query" 
                onClick={() => inputRef.current?.focus()} 
              />
            </div>
          </div>

          {/* Input Block */}
          <div className="p-6 bg-slate-950 relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  id="navi-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask Navi co-pilot..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-700 outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all pr-12 font-medium"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-cyan-500 hover:text-white hover:bg-cyan-500 transition-all disabled:opacity-30 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-center text-[9px] text-slate-800 font-bold uppercase tracking-widest mt-5">
              Secure Intelligence Bridge · Gemini Pro Enabled
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
