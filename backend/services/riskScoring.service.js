/**
 * DrishtiFlow — Risk Scoring Service (Backend)
 * ===============================================
 * Proxies predictions to the Python ML microservice.
 * Falls back to server-side demo predictions.
 * 
 * Architecture (CLAUDE.md):
 * - ORCHESTRATION.RISK_ENGINE: Feature importance + confidence scoring
 * - EXECUTION.predictRisk: Prediction pipeline
 */

const axios = require("axios");
const config = require("../config/app.config");
const { db } = require("../config/firebase.config");

const ML_URL = config.mlServiceUrl;

// Feature defaults for missing values
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

const FEATURE_WEIGHTS = {
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

class RiskScoringService {
  /**
   * Predict disruption risk for a single shipment.
   */
  async predict(features, shipmentId = "SHP-000001") {
    const filledFeatures = { ...FEATURE_DEFAULTS, ...features };

    // Try ML service first
    try {
      const response = await axios.post(
        `${ML_URL}/api/predict`,
        { shipment_id: shipmentId, features: filledFeatures },
        { timeout: 10000 }
      );

      if (response.data?.success) {
        return response.data.data;
      }
    } catch {
      // ML service unavailable — use demo mode
    }

    // Fallback: server-side demo prediction
    return this._demoPrediction(filledFeatures, shipmentId);
  }

  /**
   * Batch prediction for multiple shipments.
   */
  async predictBatch(shipments) {
    try {
      const response = await axios.post(
        `${ML_URL}/api/predict/batch`,
        {
          shipments: shipments.map((s) => ({
            shipment_id: s.shipment_id,
            features: { ...FEATURE_DEFAULTS, ...s.features },
          })),
        },
        { timeout: 30000 }
      );

      if (response.data?.success) {
        return response.data.data;
      }
    } catch {
      // fallback
    }

    return shipments.map((s) =>
      this._demoPrediction(
        { ...FEATURE_DEFAULTS, ...s.features },
        s.shipment_id
      )
    );
  }

  /**
   * Save prediction result to Firestore.
   */
  async savePrediction(userId, prediction) {
    if (!db) throw new Error("Database not initialized");

    const predictionDoc = {
      userId,
      shipmentId: prediction.shipment_id,
      disruptionProbability: prediction.disruption_probability,
      riskLevel: prediction.risk_level,
      confidenceScore: prediction.confidence_score,
      estimatedDelayDays: prediction.estimated_delay_days,
      featureImportance: prediction.feature_importance,
      topRiskFactors: prediction.top_risk_factors,
      explanation: prediction.explanation,
      modelVersion: prediction.model_version,
      predictionLatencyMs: prediction.prediction_latency_ms,
      mode: prediction.mode,
      inputFeatures: prediction.features || {},
      createdAt: new Date().toISOString(),
    };

    const docRef = await db
      .collection(config.collections.predictions)
      .add(predictionDoc);

    return { id: docRef.id, ...predictionDoc };
  }

  /**
   * Get prediction history for a user.
   */
  async getPredictionHistory(userId, { page = 1, limit = 20 } = {}) {
    if (!db) throw new Error("Database not initialized");

    const offset = (page - 1) * limit;

    const snapshot = await db
      .collection(config.collections.predictions)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const predictions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { predictions, page, limit };
  }

  /**
   * Get ML service health status.
   */
  async getServiceHealth() {
    try {
      const response = await axios.get(`${ML_URL}/api/health`, {
        timeout: 5000,
      });
      return {
        ml_service: "online",
        mode: response.data.mode,
        model_loaded: response.data.model_loaded,
      };
    } catch {
      return {
        ml_service: "offline",
        mode: "demo",
        model_loaded: false,
      };
    }
  }

  /**
   * Demo prediction (server-side fallback).
   */
  _demoPrediction(features, shipmentId) {
    let score = 0;
    const totalWeight = Object.values(FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);

    for (const [feat, weight] of Object.entries(FEATURE_WEIGHTS)) {
      score += (features[feat] ?? 5) * weight;
    }

    const probability = Math.min(Math.max((score / 10) * 100, 1), 99);

    let riskLevel = "low";
    let riskColor = "#22c55e";
    if (probability >= 60) {
      riskLevel = "high";
      riskColor = "#ef4444";
    } else if (probability >= 30) {
      riskLevel = "medium";
      riskColor = "#eab308";
    }

    const featureImportance = Object.entries(FEATURE_WEIGHTS)
      .map(([name, weight]) => ({
        name,
        display_name: name
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        value: Math.round((features[name] ?? 5) * 100) / 100,
        importance: Math.round((weight / totalWeight) * 100 * 100) / 100,
        contribution:
          Math.round(
            ((weight / totalWeight) * ((features[name] ?? 5) / 10)) * 100 * 100
          ) / 100,
      }))
      .sort((a, b) => b.contribution - a.contribution);

    const topFactors = featureImportance
      .filter((f) => f.value >= 5)
      .slice(0, 4)
      .map((f) => {
        const sev = f.value >= 8 ? "Critical" : f.value >= 6 ? "High" : "Moderate";
        return `${sev} ${f.display_name} (${f.value}/10)`;
      });

    if (topFactors.length === 0) topFactors.push("No significant risk factors");

    let delay = 0;
    if (probability >= 20) {
      delay = (probability / 100) * 14;
      if ((features.weather_severity ?? 5) > 7) delay *= 1.3;
      if ((features.port_congestion ?? 5) > 7) delay *= 1.2;
      delay = Math.min(delay, 21);
    }

    const certainty = Math.abs(probability / 100 - 0.5) * 2;
    const provided = Object.keys(features).filter((k) => k in FEATURE_DEFAULTS).length;
    const completeness = provided / Object.keys(FEATURE_DEFAULTS).length;
    const confidence = Math.min(Math.max((0.6 * certainty + 0.4 * completeness) * 100, 15), 98);

    const factorsStr = topFactors.slice(0, 3).join(", ");
    let explanation;
    if (riskLevel === "low") {
      explanation = `Low disruption risk (${probability.toFixed(1)}%). ${factorsStr}. No immediate action required.`;
    } else if (riskLevel === "medium") {
      explanation = `Moderate disruption risk (${probability.toFixed(1)}%). Key drivers: ${factorsStr}. Consider contingency plans.`;
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
}

module.exports = new RiskScoringService();
