/**
 * DrishtiFlow — API Key Controller
 * =================================
 * Endpoints for managing ingestion keys.
 */

const ApiKeyService = require("../services/apiKey.service");

class ApiKeyController {
  async createKey(req, res) {
    try {
      const { label } = req.body;
      const userId = req.user.uid;

      const result = await ApiKeyService.createKey(userId, label);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async listKeys(req, res) {
    try {
      const userId = req.user.uid;
      const keys = await ApiKeyService.listKeys(userId);

      return res.json({
        success: true,
        data: keys,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async revokeKey(req, res) {
    try {
      const { keyId } = req.params;
      const userId = req.user.uid;

      await ApiKeyService.revokeKey(keyId, userId);

      return res.json({
        success: true,
        message: "API key revoked successfully.",
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ApiKeyController();
