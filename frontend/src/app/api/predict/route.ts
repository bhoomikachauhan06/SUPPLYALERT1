/**
 * DrishtiFlow — Prediction API Route
 * =====================================
 * Next.js API route that proxies to the Python ML service
 * or handles predictions directly in demo mode.
 * 
 * Routes:
 *   POST /api/predict         → Single prediction
 *   GET  /api/predict         → Demo prediction
 *   POST /api/predict?batch=true → Batch prediction
 * 
 * Architecture (CLAUDE.md):
 *   Controller → request/response only
 *   Service → business logic (riskScoring.service.ts)
 */

import { NextRequest, NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ── Feature validation ────────────────────────────────

const VALID_FEATURES = [
  "weather_severity",
  "geopolitical_risk",
  "route_complexity",
  "carrier_reliability",
  "port_congestion",
  "seasonal_demand",
  "lead_time_variance",
  "supplier_risk_score",
  "customs_complexity",
  "historical_disruptions",
];

const FEATURE_DEFAULTS: Record<string, number> = {
  weather_severity: 3.0,
  geopolitical_risk: 2.0,
  route_complexity: 5.0,
  carrier_reliability: 4.0,
  port_congestion: 4.0,
  seasonal_demand: 5.0,
  lead_time_variance: 3.0,
  supplier_risk_score: 3.0,
  customs_complexity: 4.0,
  historical_disruptions: 2.0,
};

// ── Demo Prediction Engine (server-side) ──────────────

function computeDemoPrediction(
  features: Record<string, number>,
  shipmentId: string
) {
  const weights: Record<string, number> = {
    weather_severity: 0.20,
    geopolitical_risk: 0.18,
    port_congestion: 0.15,
    historical_disruptions: 0.12,
    carrier_reliability: 0.10,
    supplier_risk_score: 0.08,
    route_complexity: 0.07,
    lead_time_variance: 0.05,
    customs_complexity: 0.03,
    seasonal_demand: 0.02,
  };

  // Fill defaults
  const filledFeatures: Record<string, number> = {};
  for (const feat of VALID_FEATURES) {
    filledFeatures[feat] = features[feat] ?? FEATURE_DEFAULTS[feat];
  }

  // Compute risk score
  let score = 0;
  for (const [feat, weight] of Object.entries(weights)) {
    score += (filledFeatures[feat] ?? 5) * weight;
  }

  const probability = Math.min(Math.max((score / 10) * 100, 1), 99);

  // Risk level
  let riskLevel = "low";
  let riskColor = "#22c55e";
  if (probability >= 60) {
    riskLevel = "high";
    riskColor = "#ef4444";
  } else if (probability >= 30) {
    riskLevel = "medium";
    riskColor = "#eab308";
  }

  // Feature importance
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const featureImportance = VALID_FEATURES.map((feat) => ({
    name: feat,
    display_name: feat
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    value: Math.round((filledFeatures[feat] ?? 5) * 100) / 100,
    importance:
      Math.round(((weights[feat] || 0.05) / totalWeight) * 100 * 100) / 100,
    contribution:
      Math.round(
        (((weights[feat] || 0.05) / totalWeight) *
          ((filledFeatures[feat] ?? 5) / 10)) *
          100 *
          100
      ) / 100,
  })).sort((a, b) => b.contribution - a.contribution);

  // Top factors
  const topFactors = featureImportance
    .filter((f) => f.value >= 5)
    .slice(0, 4)
    .map((f) => {
      const severity =
        f.value >= 8 ? "Critical" : f.value >= 6 ? "High" : "Moderate";
      return `${severity} ${f.display_name} (${f.value}/10)`;
    });

  if (topFactors.length === 0) {
    topFactors.push("No significant risk factors detected");
  }

  // Delay estimation
  let delay = 0;
  if (probability >= 20) {
    delay = (probability / 100) * 14;
    if ((filledFeatures.weather_severity ?? 5) > 7) delay *= 1.3;
    if ((filledFeatures.port_congestion ?? 5) > 7) delay *= 1.2;
    delay = Math.min(delay, 21);
  }

  // Confidence
  const provided = Object.keys(features).filter((k) =>
    VALID_FEATURES.includes(k)
  ).length;
  const completeness = provided / VALID_FEATURES.length;
  const certainty = Math.abs(probability / 100 - 0.5) * 2;
  const confidence = Math.min(
    Math.max((0.6 * certainty + 0.4 * completeness) * 100, 15),
    98
  );

  // Explanation
  const factorsStr = topFactors.slice(0, 3).join(", ");
  let explanation: string;
  if (riskLevel === "low") {
    explanation = `Low disruption risk (${probability.toFixed(1)}%). ${factorsStr}. No immediate action required.`;
  } else if (riskLevel === "medium") {
    explanation = `Moderate disruption risk (${probability.toFixed(1)}%). Key drivers: ${factorsStr}. Consider activating contingency plans.`;
  } else {
    explanation = `⚠️ HIGH RISK (${probability.toFixed(1)}%). Key drivers: ${factorsStr}. Estimated delay: ${delay.toFixed(1)} days. Immediate intervention recommended.`;
  }

  return {
    shipment_id: shipmentId,
    disruption_probability: Math.round(probability * 100) / 100,
    risk_level: riskLevel,
    risk_color: riskColor,
    confidence_score: Math.round(confidence * 100) / 100,
    feature_importance: featureImportance,
    top_risk_factors: topFactors,
    estimated_delay_days: Math.round(delay * 10) / 10,
    model_version: "1.0.0-demo",
    prediction_latency_ms: 0,
    mode: "demo",
    explanation,
  };
}

// ── GET handler (demo prediction) ─────────────────────

export async function GET() {
  const start = performance.now();

  const demoFeatures = {
    weather_severity: 8.5,
    geopolitical_risk: 6.0,
    route_complexity: 7.0,
    carrier_reliability: 5.5,
    port_congestion: 8.0,
    seasonal_demand: 7.5,
    lead_time_variance: 4.0,
    supplier_risk_score: 3.0,
    customs_complexity: 5.0,
    historical_disruptions: 6.5,
  };

  const result = computeDemoPrediction(demoFeatures, "DEMO-HIGH-RISK");
  result.prediction_latency_ms =
    Math.round((performance.now() - start) * 100) / 100;

  return NextResponse.json({
    success: true,
    data: result,
    scenario: "Typhoon approaching Shanghai port during peak season",
    timestamp: Date.now(),
  });
}

// ── POST handler ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    const body = await request.json();
    const isBatch = request.nextUrl.searchParams.get("batch") === "true";

    // ── Input Validation ──────────────────────────
    if (isBatch) {
      if (!body.shipments || !Array.isArray(body.shipments)) {
        return NextResponse.json(
          { success: false, error: "Missing 'shipments' array" },
          { status: 400 }
        );
      }
      if (body.shipments.length > 100) {
        return NextResponse.json(
          { success: false, error: "Maximum 100 shipments per batch" },
          { status: 400 }
        );
      }
    } else {
      if (!body.features || typeof body.features !== "object") {
        return NextResponse.json(
          { success: false, error: "Missing 'features' object" },
          { status: 400 }
        );
      }

      // Validate feature values
      for (const [key, value] of Object.entries(body.features)) {
        if (!VALID_FEATURES.includes(key)) {
          continue; // Ignore unknown features
        }
        if (typeof value !== "number" || value < 0 || value > 10) {
          return NextResponse.json(
            {
              success: false,
              error: `Feature '${key}' must be a number between 0 and 10`,
            },
            { status: 400 }
          );
        }
      }
    }

    // ── Try ML Service First ──────────────────────
    try {
      const mlUrl = isBatch
        ? `${ML_SERVICE_URL}/api/predict/batch`
        : `${ML_SERVICE_URL}/api/predict`;

      const mlResponse = await fetch(mlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        return NextResponse.json(mlData);
      }
    } catch {
      // ML service unavailable — fall through to demo mode
    }

    // ── Demo Mode Fallback ────────────────────────
    if (isBatch) {
      const results = body.shipments.map(
        (s: { features: Record<string, number>; shipment_id?: string }, i: number) => {
          const result = computeDemoPrediction(
            s.features,
            s.shipment_id || `BATCH-${String(i).padStart(4, "0")}`
          );
          result.prediction_latency_ms =
            Math.round((performance.now() - start) * 100) / 100;
          return result;
        }
      );

      return NextResponse.json({
        success: true,
        data: results,
        count: results.length,
        timestamp: Date.now(),
      });
    }

    // Single prediction
    const result = computeDemoPrediction(
      body.features,
      body.shipment_id || "SHP-000001"
    );
    result.prediction_latency_ms =
      Math.round((performance.now() - start) * 100) / 100;

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Prediction API error:", message);

    return NextResponse.json(
      { success: false, error: `Prediction failed: ${message}` },
      { status: 500 }
    );
  }
}
