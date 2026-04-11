/**
 * DrishtiFlow — Simulation Controller
 * ======================================
 */

const simulationService = require("../services/simulation.service");

/**
 * POST /api/simulate
 */
const runSimulation = async (req, res, next) => {
  try {
    const result = await simulationService.runSimulation(req.user.uid, req.body);
    res.json({ success: true, data: result, timestamp: Date.now() });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/simulate/history
 */
const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const history = await simulationService.getHistory(req.user.uid, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

module.exports = { runSimulation, getHistory };
