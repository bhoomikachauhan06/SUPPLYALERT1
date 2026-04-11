import { NextRequest, NextResponse } from "next/server";

const DEMO_RESPONSES: Record<string, string> = {
  weather:   "⛈️ Weather Alert: Typhoon formation in the South China Sea is affecting Shanghai–LA and Shanghai–Hamburg corridors. 14 shipments flagged for rerouting. Recommend activating Route B via Ningbo. Estimated impact window: 5–9 days.",
  risk:      "Based on current global signals: Trans-Pacific corridor shows 8.5/10 weather severity and 7.2/10 geopolitical index. Top 3 at-risk shipments: SHP-2847 (78%), SHP-1932 (65%), SHP-0442 (58%). Recommend pre-authorizing backup carriers.",
  delay:     "Portfolio delay average is now 3.2 days (+18% WoW). Primary drivers: Rotterdam port congestion (8.1/10), Mumbai customs backlog (6.8/10). Recommend booking buffer stock and notifying downstream partners.",
  predict:   "Running prediction on current portfolio... 🔴 SHP-2847: 78% disruption risk (Shanghai→Hamburg). 🟡 SHP-1932: 65% risk (Seoul→Rotterdam). 🟢 SHP-0331: 12% risk (LA→Chicago). Confidence: 87%.",
  route:     "Optimal routing recommendation: Switch EU-bound Asia shipments to Ningbo port (+1.2 days transit) to bypass Shanghai congestion. Savings vs. delay risk: ₹40L per vessel. Rail alternative via Trans-Siberian available for time-sensitive cargo.",
  signal:    "Current global risk signals:\n🌊 Weather: Typhoon near Shanghai (severity 8.5/10)\n🌍 Geopolitical: Eastern Europe tensions (7.2/10)\n🚢 Port Congestion: Rotterdam (8.1/10), Mumbai (6.8/10)\n📈 Demand: Electronics seasonal peak (7.5/10)",
  help:      "I'm NAVI, your AI supply chain co-pilot. I can help with:\n\n• Risk assessment for any corridor\n• Weather & geopolitical signal analysis\n• Route optimization recommendations\n• Delay predictions & mitigation plans\n• Carrier reliability scoring\n\nTry asking: \"Any weather alerts?\" or \"What's the risk on my Shanghai shipments?\"",
  default:   "I'm NAVI, your AI supply chain intelligence co-pilot. I monitor global risk signals 24/7 and provide explainable AI predictions. Ask me about weather alerts, shipment risks, route optimizations, or supply signal breakdowns.",
};

function getDemoReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("weather") || lower.includes("storm") || lower.includes("typhoon") || lower.includes("flood"))
    return DEMO_RESPONSES.weather;
  if (lower.includes("route") || lower.includes("reroute") || lower.includes("path") || lower.includes("corridor"))
    return DEMO_RESPONSES.route;
  if (lower.includes("signal") || lower.includes("index") || lower.includes("global"))
    return DEMO_RESPONSES.signal;
  if (lower.includes("delay") || lower.includes("late") || lower.includes("behind") || lower.includes("slow"))
    return DEMO_RESPONSES.delay;
  if (lower.includes("predict") || lower.includes("score") || lower.includes("probability") || lower.includes("percent"))
    return DEMO_RESPONSES.predict;
  if (lower.includes("risk") || lower.includes("danger") || lower.includes("alert") || lower.includes("threat"))
    return DEMO_RESPONSES.risk;
  if (lower.includes("help") || lower.includes("what can") || lower.includes("how do") || lower.includes("what do"))
    return DEMO_RESPONSES.help;
  return DEMO_RESPONSES.default;
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Missing message" }, { status: 400 });
    }

    // Try OpenAI if configured
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are NAVI, an expert AI supply chain risk intelligence assistant for the SupplyAlert platform. 
You have deep knowledge of global logistics, geopolitical risks, weather patterns, port operations, and carrier reliability.
Keep answers concise (2-4 sentences), practical, and focused on actionable supply chain intelligence.
Use SupplyAlert terminology: risk scores 0-10, disruption probability %, ETA impact in days.`,
              },
              { role: "user", content: message },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            success: true,
            reply: data.choices[0].message.content,
            source: "openai",
          });
        }
      } catch {
        // Fall through to demo
      }
    }

    // Demo fallback
    return NextResponse.json({
      success: true,
      reply: getDemoReply(message),
      source: "demo",
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Chat API error" }, { status: 500 });
  }
}
