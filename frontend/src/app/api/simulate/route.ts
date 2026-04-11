/**
 * DrishtiFlow — Simulation API Route
 * ====================================
 * What-If scenario simulation endpoint.
 * 
 * POST /api/simulate → Run simulation with scenario parameters
 */

import { NextRequest, NextResponse } from "next/server";

const VALID_SCENARIOS = [
  "cyclone",
  "strike",
  "port_closure",
  "supplier_bankruptcy",
  "pandemic",
  "customs_delay",
  "route_disruption",
  "demand_surge",
  "geopolitical_conflict",
  "infrastructure_failure",
];

// Scenario feature modifiers
const SCENARIO_MODIFIERS: Record<string, Record<string, (severity: number, current: number) => number>> = {
  cyclone: {
    weather_severity: (s, c) => Math.min(c + s * 0.8, 10),
    port_congestion: (s, c) => Math.min(c + s * 0.5, 10),
  },
  strike: {
    port_congestion: (s, c) => Math.min(c + s * 0.7, 10),
    lead_time_variance: (s, c) => Math.min(c + s * 0.6, 10),
  },
  port_closure: {
    port_congestion: () => 10,
    route_complexity: (s, c) => Math.min(c + s * 0.5, 10),
  },
  supplier_bankruptcy: {
    supplier_risk_score: (s) => Math.min(8 + s * 0.2, 10),
    lead_time_variance: (s, c) => Math.min(c + s * 0.7, 10),
  },
  pandemic: {
    port_congestion: (s, c) => Math.min(c + s * 0.6, 10),
    supplier_risk_score: (s, c) => Math.min(c + s * 0.5, 10),
    customs_complexity: (s, c) => Math.min(c + s * 0.4, 10),
  },
  geopolitical_conflict: {
    geopolitical_risk: (s, c) => Math.min(c + s * 0.9, 10),
    route_complexity: (s, c) => Math.min(c + s * 0.4, 10),
  },
  demand_surge: {
    seasonal_demand: (s, c) => Math.min(c + s * 0.8, 10),
    port_congestion: (s, c) => Math.min(c + s * 0.3, 10),
  },
  customs_delay: {
    customs_complexity: (s, c) => Math.min(c + s * 0.8, 10),
  },
  route_disruption: {
    route_complexity: (s, c) => Math.min(c + s * 0.7, 10),
    historical_disruptions: (s, c) => Math.min(c + s * 0.4, 10),
  },
  infrastructure_failure: {
    port_congestion: (s, c) => Math.min(c + s * 0.8, 10),
    route_complexity: (s, c) => Math.min(c + s * 0.5, 10),
  },
};

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

function computeRiskScore(features: Record<string, number>): number {
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

  let score = 0;
  for (const [feat, weight] of Object.entries(weights)) {
    score += (features[feat] ?? 5) * weight;
  }
  return Math.min(Math.max((score / 10) * 100, 1), 99);
}

const MITIGATION_MAP: Record<string, string[]> = {
  cyclone: [
    "Reroute shipments to avoid affected ports",
    "Pre-position inventory at secondary warehouses",
    "Activate air freight backup for critical orders",
    "Extend delivery windows and notify customers",
  ],
  strike: [
    "Divert to non-union ports",
    "Increase inventory buffer at destination",
    "Negotiate priority handling agreements",
    "Explore intermodal transport alternatives",
  ],
  port_closure: [
    "Immediately reroute to nearest open port",
    "Convert ocean freight to air for critical shipments",
    "Negotiate storage at transshipment hubs",
    "Communicate revised ETA to all stakeholders",
  ],
  supplier_bankruptcy: [
    "Activate backup supplier agreements",
    "Increase order quantities from remaining suppliers",
    "Expedite qualification of new suppliers",
    "Review and adjust safety stock levels",
  ],
  pandemic: [
    "Diversify supplier base across regions",
    "Build 60-day safety stock for critical items",
    "Establish digital documentation workflows",
    "Create regional fulfillment redundancy",
  ],
  geopolitical_conflict: [
    "Avoid routing through conflict zones",
    "Review trade compliance requirements",
    "Pre-clear shipments with customs",
    "Find alternative suppliers outside affected regions",
  ],
  demand_surge: [
    "Activate surge capacity agreements",
    "Prepay for guaranteed freight space",
    "Shift non-critical orders to slower modes",
    "Communicate realistic lead times",
  ],
  customs_delay: [
    "Pre-submit customs documentation",
    "Engage customs broker for priority processing",
    "Ensure product classification compliance",
    "Establish trusted trader programs",
  ],
  route_disruption: [
    "Identify and activate alternative routes",
    "Increase safety stock levels",
    "Engage backup logistics providers",
    "Communicate delays to downstream partners",
  ],
  infrastructure_failure: [
    "Switch to alternative ports/terminals",
    "Arrange temporary warehousing",
    "Explore multimodal transport options",
    "Coordinate with local authorities for updates",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    const { scenario_type, severity, affected_region, duration_days, base_features } = body;

    if (!scenario_type || !VALID_SCENARIOS.includes(scenario_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid scenario_type. Must be one of: ${VALID_SCENARIOS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!severity || severity < 1 || severity > 10) {
      return NextResponse.json(
        { success: false, error: "severity must be between 1 and 10" },
        { status: 400 }
      );
    }

    if (!affected_region) {
      return NextResponse.json(
        { success: false, error: "affected_region is required" },
        { status: 400 }
      );
    }

    // Compute baseline
    const baseFeatures = { ...FEATURE_DEFAULTS, ...(base_features || {}) };
    const originalRisk = computeRiskScore(baseFeatures);

    // Apply scenario modifiers
    const modifiedFeatures = { ...baseFeatures };
    const modifiers = SCENARIO_MODIFIERS[scenario_type];
    if (modifiers) {
      for (const [feat, modifierFn] of Object.entries(modifiers)) {
        modifiedFeatures[feat] = modifierFn(severity, modifiedFeatures[feat] ?? 5);
      }
    }

    const simulatedRisk = computeRiskScore(modifiedFeatures);
    const riskDelta = Math.round((simulatedRisk - originalRisk) * 100) / 100;

    // Delay estimation
    const delay = (simulatedRisk / 100) * 14 * (severity > 7 ? 1.5 : 1);

    // Cost impact
    const avgShipmentValue = 50000;
    const costImpact = Math.round((simulatedRisk / 100) * avgShipmentValue * severity * 0.1);

    // Affected shipments (mock)
    const affectedShipments = Math.floor(severity * 12);

    const mitigationSuggestions = MITIGATION_MAP[scenario_type] || [
      "Monitor situation closely",
      "Prepare contingency plans",
      "Review insurance coverage",
    ];

    if (simulatedRisk >= 70) {
      mitigationSuggestions.unshift("🚨 CRITICAL: Activate emergency response protocol immediately");
    }

    return NextResponse.json({
      success: true,
      data: {
        scenario_type,
        severity,
        affected_region,
        duration_days: duration_days || 7,
        original_risk: Math.round(originalRisk * 100) / 100,
        simulated_risk: Math.round(simulatedRisk * 100) / 100,
        risk_delta: riskDelta,
        estimated_delay_days: Math.round(delay * 10) / 10,
        estimated_cost_impact_usd: costImpact,
        affected_shipments: affectedShipments,
        mitigation_suggestions: mitigationSuggestions.slice(0, 5),
        modified_features: modifiedFeatures,
        explanation: `Simulating "${scenario_type}" (severity ${severity}/10) in ${affected_region}: risk increases from ${originalRisk.toFixed(1)}% to ${simulatedRisk.toFixed(1)}% (+${riskDelta.toFixed(1)}pp). Estimated financial impact: $${costImpact.toLocaleString()}.`,
      },
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Simulation failed: ${message}` },
      { status: 500 }
    );
  }
}
