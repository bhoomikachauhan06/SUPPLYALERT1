/**
 * DrishtiFlow — Prediction Routes
 * ==================================
 */

const express = require("express");
const router = express.Router();
const predictionController = require("../controllers/prediction.controller");
const { authenticate, optionalAuth } = require("../middlewares/auth.middleware");
const { validate, schemas } = require("../middlewares/validate.middleware");

// Public demo
router.get("/demo", predictionController.predictDemo);
router.get("/health", predictionController.healthCheck);

// Authenticated prediction
router.post("/", optionalAuth, validate(schemas.predict), predictionController.predict);
router.post("/batch", authenticate, predictionController.predictBatch);
router.get("/history", authenticate, predictionController.getHistory);

module.exports = router;
