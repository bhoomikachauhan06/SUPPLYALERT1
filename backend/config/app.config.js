/**
 * DrishtiFlow Backend — App Configuration  
 * ==========================================
 * Central config loaded from environment variables.
 */

const dotenv = require("dotenv");
dotenv.config();

const config = {
  // Server
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  // CORS
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // ML Service
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "drishtiflow-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),

  // Firebase collections
  collections: {
    users: "users",
    shipments: "shipments",
    predictions: "predictions",
    simulations: "simulations",
    uploads: "file_uploads",
    chatSessions: "chat_sessions",
    chatMessages: "chat_messages",
    apiKeys: "api_keys",
  },

  // Risk thresholds
  riskThresholds: {
    low: 0.30,
    medium: 0.60,
    high: 1.0,
  },
  
  // AISHub
  aisHub: {
    username: process.env.AISHUB_USERNAME,
    pollInterval: parseInt(process.env.AISHUB_POLL_INTERVAL_MS || "300000", 10),
    format: parseInt(process.env.AISHUB_FORMAT || "1", 10),
    output: process.env.AISHUB_OUTPUT || "json",
    compress: parseInt(process.env.AISHUB_COMPRESS || "0", 10),
    interval: parseInt(process.env.AISHUB_INTERVAL || "0", 10),
  },
};

module.exports = config;
