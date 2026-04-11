/**
 * DrishtiFlow — Validation Middleware
 * =====================================
 * Input validation using Joi schemas.
 * 
 * Architecture (CLAUDE.md):
 * - DIRECTIVES.RULES.SECURITY: "Validate all inputs"
 */

const Joi = require("joi");

/**
 * Generic validation middleware factory.
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {string} source - "body" | "query" | "params"
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/"/g, ""),
      }));

      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
    }

    req[source] = value; // Use sanitized data
    next();
  };
};

// ── Validation Schemas ────────────────────────────────

const schemas = {
  // Auth
  register: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid("ADMIN", "USER").default("USER"),
    company: Joi.string().max(200).optional(),
  }),

  login: Joi.object({
    idToken: Joi.string().required(),
  }),

  // Prediction
  predict: Joi.object({
    shipment_id: Joi.string().max(100).default("SHP-000001"),
    features: Joi.object({
      weather_severity: Joi.number().min(0).max(10).optional(),
      geopolitical_risk: Joi.number().min(0).max(10).optional(),
      route_complexity: Joi.number().min(0).max(10).optional(),
      carrier_reliability: Joi.number().min(0).max(10).optional(),
      port_congestion: Joi.number().min(0).max(10).optional(),
      seasonal_demand: Joi.number().min(0).max(10).optional(),
      lead_time_variance: Joi.number().min(0).max(10).optional(),
      supplier_risk_score: Joi.number().min(0).max(10).optional(),
      customs_complexity: Joi.number().min(0).max(10).optional(),
      historical_disruptions: Joi.number().min(0).max(10).optional(),
    }).required(),
  }),

  // Simulation
  simulate: Joi.object({
    scenario_type: Joi.string()
      .valid(
        "cyclone", "strike", "port_closure", "supplier_bankruptcy",
        "pandemic", "customs_delay", "route_disruption",
        "demand_surge", "geopolitical_conflict", "infrastructure_failure"
      )
      .required(),
    severity: Joi.number().min(1).max(10).required(),
    affected_region: Joi.string().max(200).required(),
    duration_days: Joi.number().min(1).max(365).default(7),
    base_features: Joi.object().optional(),
  }),

  // Shipment
  createShipment: Joi.object({
    shipment_id: Joi.string().max(100).optional(),
    origin: Joi.string().max(200).required(),
    destination: Joi.string().max(200).required(),
    carrier: Joi.string().max(200).optional(),
    shipment_value_usd: Joi.number().min(0).optional(),
    transit_days_expected: Joi.number().min(1).max(365).optional(),
    origin_lat: Joi.number().min(-90).max(90).optional(),
    origin_lng: Joi.number().min(-180).max(180).optional(),
    dest_lat: Joi.number().min(-90).max(90).optional(),
    dest_lng: Joi.number().min(-180).max(180).optional(),
  }),

  // Chat
  chatMessage: Joi.object({
    message: Joi.string().min(1).max(5000).required(),
    session_id: Joi.string().optional(),
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().optional(),
    sort_order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

module.exports = {
  validate,
  schemas,
};
