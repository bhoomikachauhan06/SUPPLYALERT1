import { NextRequest, NextResponse } from "next/server";

/**
 * NAVI AI - Gemini API Integration
 * Handles context-aware supply chain intelligence conversations.
 */

export async function POST(request: NextRequest) {
  try {
    const { message, context, history } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: "Missing message" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    
    // If no key, provide a high-quality simulated response based on context
    if (!geminiKey) {
      console.warn("GEMINI_API_KEY not found. Using simulated intelligence.");
      return handleSimulatedResponse(message, context);
    }

    // Prepare prompt with context
    const systemPrompt = `You are NAVI, an expert AI supply chain co-pilot for the SupplyAlert platform.
Your goal is to help the user manage global logistics risks.
Current Screen Data (JSON Context): ${JSON.stringify(context || {})}

Role:
- Reasoning: Analyze the provided screen data to find hidden risks.
- Conversation: Natural, friendly, and non-technical.
- Decisions: Suggest specific, actionable next steps (e.g. rerouting, pre-booking).

Behavior Rules:
- Avoid technical jargon.
- Be proactive. If you see a high risk score, mention it.
- Keep responses concise but high-value.
- Structure: Start with a natural explanation, then a clear recommendation.

Previous History: ${JSON.stringify(history || [])}
`;

    // Call Gemini API (using direct fetch for maximum compatibility)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\nUser Question: " + message }] }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const reply = data.candidates[0].content.parts[0].text;

    return NextResponse.json({
      success: true,
      reply,
      source: "gemini"
    });

  } catch (error: any) {
    console.error("Navi API Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal Server Error",
      reply: "I'm having a bit of trouble connecting to my central processing unit. However, looking at your current data, I'd suggest monitoring the Shanghai corridor closely—we're seeing some unusual turbulence there."
    }, { status: 500 });
  }
}

/**
 * High-quality fallback/simulated reasoning when API is unavailable
 */
function handleSimulatedResponse(message: string, context: any) {
  const lower = message.toLowerCase();
  let reply = "";

  const shipments = context?.shipments || [];
  const highRisk = shipments.filter((s: any) => s.risk_score > 60);

  if (lower.includes("analyze") || lower.includes("risk") || lower.includes("what's happening")) {
    if (highRisk.length > 0) {
      reply = `I've analyzed your current dashboard and noticed ${highRisk.length} shipments are entering high-risk zones. For example, ${highRisk[0].shipmentId} heading to ${highRisk[0].destination} has a disruption probability of ${highRisk[0].risk_score}%. I'd recommend investigating Route B options to bypass the current bottlenecks.`;
    } else {
      reply = "Scanning your network... Everything looks stable at the moment. However, I'm watching the weather patterns near your Asian hubs as there's some minor activity. Stay the course for now!";
    }
  } else if (lower.includes("action") || lower.includes("suggest") || lower.includes("do next")) {
    reply = "If I were in your shoes, I'd prioritize clearing the backlog at your primary European terminals. Congestion there is beginning to crawl. Also, checking in with your carrier for the Hamburg route could prevent a 3-day delay we're projecting.";
  } else {
    reply = "That's an interesting point! In the context of your current operations, focusing on route flexibility is usually the best strategy. Is there a specific shipment or region you're worried about?";
  }

  return NextResponse.json({
    success: true,
    reply,
    source: "simulation"
  });
}
