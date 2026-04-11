import { NextRequest, NextResponse } from "next/server";

/**
 * NAVI AI — Gemini + XGBoost ML Integration (/api/navi-chat)
 * 
 * Architecture:
 *   1. Accepts user message + screen context + chat history
 *   2. If query is risk-related, runs a live ML prediction via /api/predict
 *   3. Feeds ML result + full dashboard context into Gemini as a rich system prompt
 *   4. Returns a Gemini-generated contextual response
 */

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ── ML Risk Prediction Runner ───────────────────────────
async function runMLPrediction(features: Record<string, number>, shipmentId: string, baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features, shipment_id: shipmentId }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

// ── System Prompt Builder ───────────────────────────────
function buildSystemPrompt(context: any, mlResult: any): string {
  const shipmentCount = context?.shipmentCount || context?.shipments?.length || 0;
  const highRiskCount = context?.highRiskShipments || 0;
  const currentPage = context?.currentPage || "Dashboard";
  const stats = context?.stats || {};
  const signals = context?.signals || [];
  const shipments = context?.shipments || [];

  // Format top shipments for context
  const topShipmentsText = shipments.slice(0, 5).map((s: any) =>
    `  • ${s.shipment_id || s.id}: ${s.origin} → ${s.destination} | Status: ${s.status} | Risk: ${s.risk_score || 0}%`
  ).join("\n");

  // Format weather/geopolitical signals
  const signalsText = signals.slice(0, 3).map((sig: any) =>
    `  • ${sig.type || sig.label}: ${sig.value || sig.description} (Risk: ${sig.risk_level || "moderate"})`
  ).join("\n");

  // ML prediction block
  const mlBlock = mlResult ? `
## 🤖 Live ML Model Output (XGBoost)
- Shipment: ${mlResult.shipment_id}
- Disruption Probability: ${mlResult.disruption_probability}%
- Risk Level: ${mlResult.risk_level?.toUpperCase()}
- Confidence: ${mlResult.confidence_score}%
- Estimated Delay: ${mlResult.estimated_delay_days} days
- Top Risk Factors: ${mlResult.top_risk_factors?.join(", ")}
- Model Explanation: ${mlResult.explanation}
` : "";

  return `You are NAVI — the expert AI co-pilot for DrishtiFlow, an enterprise logistics intelligence platform.

Your personality: Precise, actionable, professional. You are a senior supply chain analyst speaking to a logistics operations manager.

## Current Platform State
- Page: ${currentPage}
- Active Shipments: ${shipmentCount}
- High-Risk Shipments: ${highRiskCount}
- Average Delay Index: ${stats.avgDelay || "N/A"} days
- Fleet Coverage: ${stats.coverage || "N/A"}%

## Active Shipment Portfolio (sample)
${topShipmentsText || "  No shipment data available."}

## Live Intelligence Signals
${signalsText || "  No active signals."}
${mlBlock}

## Your Rules
1. Always reference specific data from the platform state above when available.
2. If an ML prediction result is provided, cite the probability, risk level, and top factors explicitly.
3. Keep responses focused and under 5 sentences unless the user asks for a detailed breakdown.
4. Use bullet points for lists. Use numbers for prioritized actions.
5. If you don't have data to answer precisely, say so and offer what you *can* infer.
6. You are aware of Supply Chain concepts: Incoterms, port congestion metrics, lead time variance, geopolitical risk indexes, weather severity scales.
7. NEVER make up shipment IDs or cargo values unless they appear in the context above.`;
}

// ── POST Handler ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { message, context, history } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: "Missing message" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiKey) {
      return NextResponse.json({
        success: true,
        reply: "NAVI requires a Gemini API key to operate. Please configure GEMINI_API_KEY in your .env.local file.",
        source: "config-error"
      });
    }

    // ── Detect if query needs ML prediction ──────────────
    const lowerMsg = message.toLowerCase();
    const needsML = lowerMsg.includes("risk") || lowerMsg.includes("predict") || 
                    lowerMsg.includes("probability") || lowerMsg.includes("delay") ||
                    lowerMsg.includes("disrupt") || lowerMsg.includes("score") ||
                    lowerMsg.includes("analyze") || lowerMsg.includes("chance");

    let mlResult = null;
    if (needsML) {
      // Extract features from context or use intelligent defaults
      const shipments = context?.shipments || [];
      const signals = context?.signals || [];
      
      // Build features from live signals
      const weatherSignal = signals.find((s: any) => s.type?.toLowerCase().includes("weather"));
      const geoSignal = signals.find((s: any) => s.type?.toLowerCase().includes("geopolit"));
      
      const features = {
        weather_severity: weatherSignal ? Math.min(parseFloat(weatherSignal.value) || 5, 10) : 5.0,
        geopolitical_risk: geoSignal ? Math.min(parseFloat(geoSignal.value) || 4, 10) : 4.0,
        route_complexity: 6.0,
        carrier_reliability: 5.5,
        port_congestion: context?.stats?.avgDelay > 3 ? 7.5 : 4.5,
        seasonal_demand: 5.5,
        lead_time_variance: 4.0,
        supplier_risk_score: shipments.length > 0 ? Math.min((context?.highRiskShipments || 0) / Math.max(shipments.length, 1) * 10, 10) : 3.0,
        customs_complexity: 4.0,
        historical_disruptions: 3.5,
      };

      // Use most at-risk shipment for prediction
      const riskiest = shipments.sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0))[0];
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      mlResult = await runMLPrediction(features, riskiest?.shipment_id || "FLEET-001", baseUrl);
    }

    // ── Build rich system prompt ──────────────────────────
    const systemPrompt = buildSystemPrompt(context, mlResult);

    // ── Format conversation history for Gemini ────────────
    const conversationHistory = (history || []).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // ── Call Gemini API ───────────────────────────────────
    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        ...conversationHistory,
        { role: "user", parts: [{ text: message }] }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.92,
        maxOutputTokens: 600,
        stopSequences: []
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ]
    };

    // ── Try each model in order (handles per-model quota limits) ────────────
    let reply: string | null = null;
    let usedModel = "";
    const errors: string[] = [];

    for (const model of GEMINI_MODELS) {
      const geminiRes = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
        signal: AbortSignal.timeout(15000),
      });

      const geminiData = await geminiRes.json();

      if (!geminiRes.ok || geminiData.error) {
        const errMsg = geminiData.error?.message || `HTTP ${geminiRes.status}`;
        console.warn(`[NAVI] ${model} failed (${geminiRes.status}): ${errMsg.slice(0, 120)}`);
        errors.push(`${model}: ${geminiRes.status}`);
        continue; // try next model
      }

      reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;
      if (reply) { usedModel = model; break; }
    }

    if (!reply) {
      throw new Error(`All models failed. Errors: ${errors.join(" | ")}`);
    }

    return NextResponse.json({
      success: true,
      reply,
      source: `gemini-${usedModel}`,
      mlUsed: !!mlResult,
      mlRiskLevel: mlResult?.risk_level || null,
    });

  } catch (error: any) {
    console.error("Navi Chat Error:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      reply: "NAVI is experiencing a temporary sync issue. Please retry your query — the intelligence core is rerouting.",
    }, { status: 500 });
  }
}
