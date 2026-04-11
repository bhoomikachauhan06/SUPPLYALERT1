/**
 * DrishtiFlow — Simulation Service
 * ===================================
 * What-If scenario engine.
 * 
 * Architecture (CLAUDE.md):
 * - ORCHESTRATION.QUEUE_ENGINE equivalent for supply chain
 */

const { db } = require("../config/firebase.config");
const config = require("../config/app.config");
const riskScoringService = require("./riskScoring.service");

const FEATURE_DEFAULTS = {
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

const SCENARIO_MODIFIERS = {
  cyclone: { weather_severity: [0.8], port_congestion: [0.5] },
  strike: { port_congestion: [0.7], lead_time_variance: [0.6] },
  port_closure: { port_congestion: [1.0, true], route_complexity: [0.5] },
  supplier_bankruptcy: { supplier_risk_score: [0.2, false, 8], lead_time_variance: [0.7] },
  pandemic: { port_congestion: [0.6], supplier_risk_score: [0.5], customs_complexity: [0.4] },
  geopolitical_conflict: { geopolitical_risk: [0.9], route_complexity: [0.4] },
  demand_surge: { seasonal_demand: [0.8], port_congestion: [0.3] },
  customs_delay: { customs_complexity: [0.8] },
  route_disruption: { route_complexity: [0.7], historical_disruptions: [0.4] },
  infrastructure_failure: { port_congestion: [0.8], route_complexity: [0.5] },
};

const MITIGATION_MAP = {
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

class SimulationService {
  /**
   * Run a what-if simulation.
   */
  async runSimulation(userId, { scenario_type, severity, affected_region, duration_days = 7, base_features }) {
    const baseFeats = { ...FEATURE_DEFAULTS, ...(base_features || {}) };

    // Get baseline risk
    const baseline = await riskScoringService.predict(baseFeats, "SIM-BASELINE");
    const originalRisk = baseline.disruption_probability;

    // Apply scenario modifiers
    const modified = { ...baseFeats };
    const modifiers = SCENARIO_MODIFIERS[scenario_type] || {};
    for (const [feat, params] of Object.entries(modifiers)) {
      const [factor, setMax, base] = params;
      if (setMax) {
        modified[feat] = 10;
      } else if (base !== undefined) {
        modified[feat] = Math.min(base + severity * factor, 10);
      } else {
        modified[feat] = Math.min((modified[feat] || 5) + severity * factor, 10);
      }
    }

    // Get simulated risk
    const simulated = await riskScoringService.predict(modified, "SIM-SCENARIO");
    const simulatedRisk = simulated.disruption_probability;
    const riskDelta = Math.round((simulatedRisk - originalRisk) * 100) / 100;

    // Estimates
    const delay = (simulatedRisk / 100) * 14 * (severity > 7 ? 1.5 : 1);
    const costImpact = Math.round((simulatedRisk / 100) * 50000 * severity * 0.1);
    const affectedShipments = Math.floor(severity * 12);

    const mitigations = [...(MITIGATION_MAP[scenario_type] || ["Monitor closely"])];
    if (simulatedRisk >= 70) {
      mitigations.unshift("🚨 CRITICAL: Activate emergency response protocol immediately");
    }

    const result = {
      scenario_type,
      severity,
      affected_region,
      duration_days,
      original_risk: Math.round(originalRisk * 100) / 100,
      simulated_risk: Math.round(simulatedRisk * 100) / 100,
      risk_delta: riskDelta,
      estimated_delay_days: Math.round(delay * 10) / 10,
      estimated_cost_impact_usd: costImpact,
      affected_shipments: affectedShipments,
      mitigation_suggestions: mitigations.slice(0, 5),
      explanation: `Simulating "${scenario_type}" (severity ${severity}/10) in ${affected_region}: risk ${originalRisk.toFixed(1)}% → ${simulatedRisk.toFixed(1)}% (+${riskDelta.toFixed(1)}pp). Financial impact: $${costImpact.toLocaleString()}.`,
    };

    // Save to Firestore
    if (!db) throw new Error("Database not initialized");

    const docRef = await db.collection(config.collections.simulations).add({
      userId,
      ...result,
      createdAt: new Date().toISOString(),
    });

    return { id: docRef.id, ...result };
  }

  /**
   * Get simulation history.
   */
  async getHistory(userId, { page = 1, limit = 20 } = {}) {
    if (!db) throw new Error("Database not initialized");

    const offset = (page - 1) * limit;
    const snapshot = await db
      .collection(config.collections.simulations)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const simulations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { simulations, page, limit };
  }
}

module.exports = new SimulationService();
