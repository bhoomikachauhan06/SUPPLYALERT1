/**
 * DrishtiFlow — Risk Scoring Service
 * ====================================
 * TypeScript service layer for the Prediction Engine.
 * 
 * Architecture compliance (CLAUDE.md):
 * - Service → Business logic (DIRECTIVES.SEPARATION_OF_CONCERNS)
 * - All prediction logic encapsulated here
 * - Controller/API routes only handle request/response
 * 
 * Features:
 * - Production mode: Calls Python FastAPI microservice
 * - Demo mode: Generates realistic mock predictions client-side
 * - Request validation, error handling, retry logic
 * - Caching layer to reduce redundant API calls
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import {
  FeatureInput,
  FeatureName,
  PredictionResult,
  PredictResponse,
  BatchPredictResponse,
  CSVPredictResponse,
  ModelInfo,
  SimulationRequest,
  SimulationResult,
  FeatureImportance,
  FEATURE_DEFAULTS,
  FEATURE_LABELS,
  RISK_COLORS,
  RiskLevel,
} from "@/types/prediction";

// ── Configuration ─────────────────────────────────────

const ML_SERVICE_URL =
  process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8000";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// ── Cache ─────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const predictionCache = new Map<string, CacheEntry<PredictionResult>>();

function getCacheKey(features: FeatureInput): string {
  return JSON.stringify(
    Object.entries(features)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, Math.round((v ?? 5) * 100) / 100])
  );
}

function getCached(key: string): PredictionResult | null {
  const entry = predictionCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  predictionCache.delete(key);
  return null;
}

function setCache(key: string, data: PredictionResult): void {
  // Evict old entries if cache is too large
  if (predictionCache.size > 500) {
    const oldest = Array.from(predictionCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, 100);
    oldest.forEach(([k]) => predictionCache.delete(k));
  }
  predictionCache.set(key, { data, timestamp: Date.now() });
}

// ── HTTP Client ───────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      console.warn(
        `Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

// ── Demo Prediction Engine ────────────────────────────

function generateDemoPrediction(
  features: FeatureInput,
  shipmentId: string
): PredictionResult {
  /**
   * Client-side demo prediction for when the ML service is unavailable.
   * Uses a weighted formula that approximates trained model behavior.
   */
  const weights: Record<FeatureName, number> = {
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

  // Compute weighted risk score
  let score = 0;
  const featureNames = Object.keys(weights) as FeatureName[];

  for (const feat of featureNames) {
    const value = features[feat] ?? FEATURE_DEFAULTS[feat];
    score += value * weights[feat];
  }

  // Normalize to 0-100%
  const probability = Math.min(Math.max((score / 10) * 100, 1), 99);

  // Risk level
  let riskLevel: RiskLevel = "low";
  if (probability >= 60) riskLevel = "high";
  else if (probability >= 30) riskLevel = "medium";

  // Feature importance (chart-ready)
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const featureImportance: FeatureImportance[] = featureNames
    .map((name) => {
      const value = features[name] ?? FEATURE_DEFAULTS[name];
      const importance = (weights[name] / totalWeight) * 100;
      const contribution = importance * (value / 10);

      return {
        name,
        display_name: FEATURE_LABELS[name],
        value: Math.round(value * 100) / 100,
        importance: Math.round(importance * 100) / 100,
        contribution: Math.round(contribution * 100) / 100,
      };
    })
    .sort((a, b) => b.contribution - a.contribution);

  // Top risk factors
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

  // Estimated delay
  let delay = 0;
  if (probability >= 20) {
    delay = (probability / 100) * 14;
    if ((features.weather_severity ?? 5) > 7) delay *= 1.3;
    if ((features.port_congestion ?? 5) > 7) delay *= 1.2;
    delay = Math.min(delay, 21);
  }

  // Confidence
  const providedCount = (Object.keys(features) as FeatureName[]).filter(
    (k) => features[k] !== undefined
  ).length;
  const completeness = providedCount / featureNames.length;
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
    explanation = `Moderate disruption risk (${probability.toFixed(1)}%). Key drivers: ${factorsStr}. Consider contingency plans.`;
  } else {
    explanation = `⚠️ HIGH RISK (${probability.toFixed(1)}%). Key drivers: ${factorsStr}. Estimated delay: ${delay.toFixed(1)} days. Immediate action recommended.`;
  }

  return {
    shipment_id: shipmentId,
    disruption_probability: Math.round(probability * 100) / 100,
    risk_level: riskLevel,
    risk_color: RISK_COLORS[riskLevel],
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

// ── Risk Scoring Service ──────────────────────────────

export class RiskScoringService {
  private static instance: RiskScoringService;
  private useDemoMode: boolean = false;

  private constructor() {}

  static getInstance(): RiskScoringService {
    if (!RiskScoringService.instance) {
      RiskScoringService.instance = new RiskScoringService();
    }
    return RiskScoringService.instance;
  }

  // ── Health & Status ───────────────────────────────

  async checkHealth(): Promise<{
    healthy: boolean;
    mode: "production" | "demo";
  }> {
    try {
      const response = await apiClient.get("/api/health", { timeout: 5000 });
      this.useDemoMode = response.data.mode === "demo";
      return {
        healthy: true,
        mode: response.data.mode,
      };
    } catch {
      this.useDemoMode = true;
      return { healthy: false, mode: "demo" };
    }
  }

  async getModelInfo(): Promise<ModelInfo | null> {
    try {
      const response = await apiClient.get("/api/model/info");
      return response.data.data;
    } catch {
      return null;
    }
  }

  // ── Single Prediction ─────────────────────────────

  async predict(
    features: FeatureInput,
    shipmentId: string = "SHP-000001",
    options?: { useCache?: boolean; forceDemoMode?: boolean }
  ): Promise<PredictionResult> {
    const { useCache = true, forceDemoMode = false } = options || {};

    // Cache check
    if (useCache) {
      const cacheKey = getCacheKey(features);
      const cached = getCached(cacheKey);
      if (cached) {
        return { ...cached, shipment_id: shipmentId };
      }
    }

    // Demo mode fallback
    if (forceDemoMode || this.useDemoMode) {
      const result = generateDemoPrediction(features, shipmentId);
      if (useCache) setCache(getCacheKey(features), result);
      return result;
    }

    // Production API call
    try {
      const response = await withRetry(() =>
        apiClient.post<PredictResponse>("/api/predict", {
          shipment_id: shipmentId,
          features: this.fillDefaults(features),
        })
      );

      const result = response.data.data;
      if (useCache) setCache(getCacheKey(features), result);
      return result;
    } catch (error) {
      console.warn("ML service unavailable, falling back to demo mode:", error);
      this.useDemoMode = true;
      const result = generateDemoPrediction(features, shipmentId);
      if (useCache) setCache(getCacheKey(features), result);
      return result;
    }
  }

  // ── Batch Prediction ──────────────────────────────

  async predictBatch(
    shipments: Array<{ shipment_id: string; features: FeatureInput }>
  ): Promise<PredictionResult[]> {
    if (this.useDemoMode) {
      return shipments.map((s) =>
        generateDemoPrediction(s.features, s.shipment_id)
      );
    }

    try {
      const response = await withRetry(() =>
        apiClient.post<BatchPredictResponse>("/api/predict/batch", {
          shipments: shipments.map((s) => ({
            shipment_id: s.shipment_id,
            features: this.fillDefaults(s.features),
          })),
        })
      );

      return response.data.data;
    } catch {
      // Fallback to demo
      return shipments.map((s) =>
        generateDemoPrediction(s.features, s.shipment_id)
      );
    }
  }

  // ── CSV Prediction ────────────────────────────────

  async predictFromCSV(file: File): Promise<CSVPredictResponse> {
    if (this.useDemoMode) {
      return this.mockCSVPrediction(file);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post<CSVPredictResponse>(
        "/api/predict/csv",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        }
      );

      return response.data;
    } catch {
      return this.mockCSVPrediction(file);
    }
  }

  private async mockCSVPrediction(file: File): Promise<CSVPredictResponse> {
    // Parse CSV client-side for demo
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    const results: PredictionResult[] = [];

    for (let i = 1; i < Math.min(lines.length, 101); i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const features: FeatureInput = {};

      headers.forEach((header, idx) => {
        const featureName = header as FeatureName;
        if (featureName in FEATURE_DEFAULTS) {
          const val = parseFloat(values[idx]);
          if (!isNaN(val)) {
            features[featureName] = Math.min(Math.max(val, 0), 10);
          }
        }
      });

      const shipmentId =
        headers.includes("shipment_id")
          ? values[headers.indexOf("shipment_id")]
          : `CSV-${String(i).padStart(4, "0")}`;

      results.push(generateDemoPrediction(features, shipmentId));
    }

    return {
      success: true,
      data: results,
      count: results.length,
      unmapped_columns: [],
      total_rows: lines.length - 1,
      timestamp: Date.now(),
    };
  }

  // ── Demo Endpoint ─────────────────────────────────

  async getDemoPrediction(): Promise<PredictionResult> {
    const demoFeatures: FeatureInput = {
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

    return this.predict(demoFeatures, "DEMO-HIGH-RISK", {
      forceDemoMode: true,
    });
  }

  // ── What-If Simulation ────────────────────────────

  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const baseFeatures = request.base_features || { ...FEATURE_DEFAULTS };

    // Get baseline prediction
    const baseline = await this.predict(
      baseFeatures,
      "SIM-BASELINE",
      { forceDemoMode: true }
    );

    // Modify features based on scenario
    const modifiedFeatures = this.applyScenario(
      { ...baseFeatures },
      request
    );

    // Get scenario prediction
    const scenario = await this.predict(
      modifiedFeatures,
      "SIM-SCENARIO",
      { forceDemoMode: true }
    );

    const riskDelta =
      scenario.disruption_probability - baseline.disruption_probability;

    // Estimate cost impact (simplified model)
    const avgShipmentValue = 50000; // USD
    const costImpact =
      (scenario.disruption_probability / 100) *
      avgShipmentValue *
      request.severity *
      0.1;

    return {
      scenario_type: request.scenario_type,
      original_risk: baseline.disruption_probability,
      simulated_risk: scenario.disruption_probability,
      risk_delta: Math.round(riskDelta * 100) / 100,
      estimated_delay_days: scenario.estimated_delay_days,
      estimated_cost_impact_usd: Math.round(costImpact),
      affected_shipments: Math.floor(request.severity * 12),
      mitigation_suggestions: this.getMitigationSuggestions(
        request.scenario_type,
        scenario.disruption_probability
      ),
      explanation: `Simulating "${request.scenario_type}" (severity ${request.severity}/10) in ${request.affected_region}: risk increases from ${baseline.disruption_probability.toFixed(1)}% to ${scenario.disruption_probability.toFixed(1)}% (+${riskDelta.toFixed(1)}pp). Estimated financial impact: $${costImpact.toLocaleString()}.`,
    };
  }

  private applyScenario(
    features: FeatureInput,
    scenario: SimulationRequest
  ): FeatureInput {
    const severity = scenario.severity;
    const modified = { ...features };

    const scenarios: Record<string, () => void> = {
      cyclone: () => {
        modified.weather_severity = Math.min(
          (modified.weather_severity ?? 3) + severity * 0.8,
          10
        );
        modified.port_congestion = Math.min(
          (modified.port_congestion ?? 4) + severity * 0.5,
          10
        );
      },
      strike: () => {
        modified.port_congestion = Math.min(
          (modified.port_congestion ?? 4) + severity * 0.7,
          10
        );
        modified.lead_time_variance = Math.min(
          (modified.lead_time_variance ?? 3) + severity * 0.6,
          10
        );
      },
      port_closure: () => {
        modified.port_congestion = 10;
        modified.route_complexity = Math.min(
          (modified.route_complexity ?? 5) + severity * 0.5,
          10
        );
      },
      supplier_bankruptcy: () => {
        modified.supplier_risk_score = Math.min(8 + severity * 0.2, 10);
        modified.lead_time_variance = Math.min(
          (modified.lead_time_variance ?? 3) + severity * 0.7,
          10
        );
      },
      pandemic: () => {
        modified.port_congestion = Math.min(
          (modified.port_congestion ?? 4) + severity * 0.6,
          10
        );
        modified.supplier_risk_score = Math.min(
          (modified.supplier_risk_score ?? 3) + severity * 0.5,
          10
        );
        modified.customs_complexity = Math.min(
          (modified.customs_complexity ?? 4) + severity * 0.4,
          10
        );
      },
      geopolitical_conflict: () => {
        modified.geopolitical_risk = Math.min(
          (modified.geopolitical_risk ?? 2) + severity * 0.9,
          10
        );
        modified.route_complexity = Math.min(
          (modified.route_complexity ?? 5) + severity * 0.4,
          10
        );
      },
      demand_surge: () => {
        modified.seasonal_demand = Math.min(
          (modified.seasonal_demand ?? 5) + severity * 0.8,
          10
        );
        modified.port_congestion = Math.min(
          (modified.port_congestion ?? 4) + severity * 0.3,
          10
        );
      },
      customs_delay: () => {
        modified.customs_complexity = Math.min(
          (modified.customs_complexity ?? 4) + severity * 0.8,
          10
        );
      },
      route_disruption: () => {
        modified.route_complexity = Math.min(
          (modified.route_complexity ?? 5) + severity * 0.7,
          10
        );
        modified.historical_disruptions = Math.min(
          (modified.historical_disruptions ?? 2) + severity * 0.4,
          10
        );
      },
      infrastructure_failure: () => {
        modified.port_congestion = Math.min(
          (modified.port_congestion ?? 4) + severity * 0.8,
          10
        );
        modified.route_complexity = Math.min(
          (modified.route_complexity ?? 5) + severity * 0.5,
          10
        );
      },
    };

    const applyFn = scenarios[scenario.scenario_type];
    if (applyFn) applyFn();

    return modified;
  }

  private getMitigationSuggestions(
    scenarioType: string,
    riskLevel: number
  ): string[] {
    const suggestions: Record<string, string[]> = {
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
        "Review trade compliance for affected regions",
        "Pre-clear shipments with customs authorities",
        "Establish alternative supplier relationships outside affected regions",
      ],
      demand_surge: [
        "Activate surge capacity agreements with carriers",
        "Prepay for guaranteed freight space",
        "Shift non-critical orders to slower, cheaper modes",
        "Communicate realistic lead times to customers",
      ],
    };

    const baseSuggestions = suggestions[scenarioType] || [
      "Monitor situation closely",
      "Prepare contingency routes",
      "Increase communication with suppliers",
      "Review insurance coverage",
    ];

    // Add urgency-based suggestion
    if (riskLevel >= 70) {
      baseSuggestions.unshift(
        "🚨 CRITICAL: Activate emergency response protocol immediately"
      );
    }

    return baseSuggestions.slice(0, 5);
  }

  // ── Utilities ─────────────────────────────────────

  private fillDefaults(features: FeatureInput): Required<FeatureInput> {
    const filled = { ...FEATURE_DEFAULTS };
    for (const [key, value] of Object.entries(features)) {
      if (value !== undefined && value !== null) {
        (filled as Record<string, number>)[key] = value;
      }
    }
    return filled;
  }

  clearCache(): void {
    predictionCache.clear();
  }
}

// ── Export singleton ──────────────────────────────────
export const riskScoringService = RiskScoringService.getInstance();
export default riskScoringService;
