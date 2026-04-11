/**
 * DrishtiFlow — Simulation Routes
 * ==================================
 */

const express = require("express");
const router = express.Router();
const simulationController = require("../controllers/simulation.controller");
const { optionalAuth } = require("../middlewares/auth.middleware");
const { validate, schemas } = require("../middlewares/validate.middleware");

router.use(optionalAuth);

router.post("/", validate(schemas.simulate), simulationController.runSimulation);
router.get("/history", simulationController.getHistory);

module.exports = router;
