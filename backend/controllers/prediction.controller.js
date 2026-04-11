/**
 * DrishtiFlow — Prediction Controller
 * ======================================
 * Handles prediction API requests.
 * 
 * Architecture (CLAUDE.md):
 * - Controller → request/response only
 * - Service → business logic
 */

const riskScoringService = require("../services/riskScoring.service");

/**
 * POST /api/predict
 * Single shipment prediction.
 */
const predict = async (req, res, next) => {
  try {
    const { shipment_id, features } = req.body;

    const result = await riskScoringService.predict(features, shipment_id);

    // Save to history if user is authenticated
    if (req.user) {
      await riskScoringService.savePrediction(req.user.uid, {
        ...result,
        features,
      });
    }

    res.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/predict/batch
 * Batch prediction (up to 100 shipments).
 */
const predictBatch = async (req, res, next) => {
  try {
    const { shipments } = req.body;

    if (!shipments || !Array.isArray(shipments)) {
      return res.status(400).json({
        success: false,
        error: "Missing 'shipments' array",
      });
    }

    if (shipments.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Maximum 100 shipments per batch",
      });
    }

    const results = await riskScoringService.predictBatch(shipments);

    res.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/predict/demo
 * Demo prediction for showcasing.
 */
const predictDemo = async (req, res, next) => {
  try {
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

    const result = await riskScoringService.predict(demoFeatures, "DEMO-HIGH-RISK");

    res.json({
      success: true,
      data: result,
      scenario: "Typhoon approaching Shanghai port during peak season",
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/predict/history
 * Get prediction history for current user.
 */
const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const history = await riskScoringService.getPredictionHistory(req.user.uid, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/predict/health
 * ML service health check.
 */
const healthCheck = async (req, res, next) => {
  try {
    const health = await riskScoringService.getServiceHealth();
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  predict,
  predictBatch,
  predictDemo,
  getHistory,
  healthCheck,
};
