/**
 * DrishtiFlow — Ingest Routes
 * =============================
 * External API surface for live data.
 */

const express = require("express");
const router = express.Router();
const ingestController = require("../controllers/ingest.controller");
const { validateApiKey } = require("../middlewares/apiKey.middleware");

// Routes protected by X-API-KEY
router.post("/", validateApiKey, ingestController.ingestShipment);

module.exports = router;
