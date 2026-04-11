/**
 * DrishtiFlow — Prediction Type Definitions
 * ==========================================
 * TypeScript types for the Risk Scoring Engine.
 * Mirrors the Python PredictionResult dataclass.
 */

// ── Feature Types ─────────────────────────────────────

export type FeatureName =
  | "weather_severity"
  | "geopolitical_risk"
  | "route_complexity"
  | "carrier_reliability"
  | "port_congestion"
  | "seasonal_demand"
  | "lead_time_variance"
  | "supplier_risk_score"
  | "customs_complexity"
  | "historical_disruptions";

export interface FeatureInput {
  weather_severity?: number;       // 0-10
  geopolitical_risk?: number;      // 0-10
  route_complexity?: number;       // 0-10
  carrier_reliability?: number;    // 0-10
  port_congestion?: number;        // 0-10
  seasonal_demand?: number;        // 0-10
  lead_time_variance?: number;     // 0-10
  supplier_risk_score?: number;    // 0-10
  customs_complexity?: number;     // 0-10
  historical_disruptions?: number; // 0-10
}

export const FEATURE_DEFAULTS: Required<FeatureInput> = {
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

export const FEATURE_LABELS: Record<FeatureName, string> = {
  weather_severity: "Weather Severity",
  geopolitical_risk: "Geopolitical Risk",
  route_complexity: "Route Complexity",
  carrier_reliability: "Carrier Reliability",
  port_congestion: "Port Congestion",
  seasonal_demand: "Seasonal Demand",
  lead_time_variance: "Lead Time Variance",
  supplier_risk_score: "Supplier Risk Score",
  customs_complexity: "Customs Complexity",
  historical_disruptions: "Historical Disruptions",
};

// ── Risk Levels ───────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
};

export const RISK_BG_COLORS: Record<RiskLevel, string> = {
  low: "rgba(34, 197, 94, 0.1)",
  medium: "rgba(234, 179, 8, 0.1)",
  high: "rgba(239, 68, 68, 0.1)",
};

// ── Feature Importance ────────────────────────────────

export interface FeatureImportance {
  name: FeatureName;
  display_name: string;
  value: number;         // Current value (0-10)
  importance: number;    // Model importance % (0-100)
  contribution: number;  // Value × importance (0-100)
}

// ── Prediction Result ─────────────────────────────────

export interface PredictionResult {
  shipment_id: string;
  disruption_probability: number;        // 0-100%
  risk_level: RiskLevel;
  risk_color: string;                    // Hex color
  confidence_score: number;              // 0-100%
  feature_importance: FeatureImportance[];
  top_risk_factors: string[];
  estimated_delay_days: number;
  model_version: string;
  prediction_latency_ms: number;
  mode: "production" | "demo";
  explanation: string;
}

// ── API Request/Response ──────────────────────────────

export interface PredictRequest {
  shipment_id: string;
  features: FeatureInput;
}

export interface PredictResponse {
  success: boolean;
  data: PredictionResult;
  timestamp: number;
}

export interface BatchPredictRequest {
  shipments: PredictRequest[];
}

export interface BatchPredictResponse {
  success: boolean;
  data: PredictionResult[];
  count: number;
  timestamp: number;
}

export interface CSVPredictResponse {
  success: boolean;
  data: PredictionResult[];
  count: number;
  unmapped_columns: string[];
  total_rows: number;
  timestamp: number;
}

// ── Model Info ────────────────────────────────────────

export interface ModelInfo {
  version: string;
  is_production: boolean;
  mode: "production" | "demo";
  features: FeatureName[];
  feature_display_names: Record<FeatureName, string>;
  risk_thresholds: {
    low: number;
    medium: number;
    high: number;
  };
  cache_ttl: number;
  cache_size: number;
}

// ── Simulation Types ──────────────────────────────────

export type ScenarioType =
  | "cyclone"
  | "strike"
  | "port_closure"
  | "supplier_bankruptcy"
  | "pandemic"
  | "customs_delay"
  | "route_disruption"
  | "demand_surge"
  | "geopolitical_conflict"
  | "infrastructure_failure";

export interface SimulationRequest {
  scenario_type: ScenarioType;
  severity: number;           // 1-10
  affected_region: string;
  duration_days: number;
  base_features?: FeatureInput;
}

export interface SimulationResult {
  scenario_type: ScenarioType;
  original_risk: number;
  simulated_risk: number;
  risk_delta: number;
  estimated_delay_days: number;
  estimated_cost_impact_usd: number;
  affected_shipments: number;
  mitigation_suggestions: string[];
  explanation: string;
}

// ── Chart Data Types ──────────────────────────────────

export interface RiskGaugeData {
  value: number;
  min: number;
  max: number;
  thresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface FeatureBarChartData {
  name: string;
  value: number;
  fill: string;
}

export interface RiskTrendData {
  date: string;
  risk_score: number;
  shipment_count: number;
}
