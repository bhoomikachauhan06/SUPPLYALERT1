/**
 * DrishtiFlow — API Key Middleware
 * =================================
 * Validates 'x-api-key' header for ingestion endpoints.
 */

const ApiKeyService = require("../services/apiKey.service");
const { logger } = require("../libs/logger"); // Adjust path if needed

const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.headers["X-API-KEY"];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "API key is missing. Use 'x-api-key' header.",
    });
  }

  try {
    const keyInfo = await ApiKeyService.validateKey(apiKey);

    if (!keyInfo) {
      return res.status(403).json({
        success: false,
        message: "Invalid or inactive API key.",
      });
    }

    // Attach user info to request
    req.user = { uid: keyInfo.userId, viaApiKey: true };
    req.apiKeyId = keyInfo.keyId;

    next();
  } catch (error) {
    console.error("API Key validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

module.exports = { validateApiKey };
