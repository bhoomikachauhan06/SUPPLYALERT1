/**
 * DrishtiFlow — API Key Management Routes
 * ========================================
 */

const express = require("express");
const router = express.Router();
const apiKeyController = require("../controllers/apiKey.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// All management routes require standard user auth
router.use(authenticate);

router.get("/", apiKeyController.listKeys);
router.post("/", apiKeyController.createKey);
router.delete("/:keyId", apiKeyController.revokeKey);

module.exports = router;
