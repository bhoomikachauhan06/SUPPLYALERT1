/**
 * DrishtiFlow — Shipment Controller
 * ====================================
 */

const shipmentService = require("../services/shipment.service");

/**
 * GET /api/shipments
 */
const getShipments = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await shipmentService.getShipments(req.user.uid, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/shipments/:shipmentId
 */
const getShipmentById = async (req, res, next) => {
  try {
    const shipment = await shipmentService.getShipmentById(
      req.params.shipmentId,
      req.user.uid
    );
    res.json({ success: true, data: shipment });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/shipments
 */
const createShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.createShipment(req.user.uid, req.body);
    res.status(201).json({ success: true, data: shipment });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/shipments/:shipmentId/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const result = await shipmentService.updateStatus(
      req.params.shipmentId,
      req.user.uid,
      req.body.status
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/shipments/stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await shipmentService.getDashboardStats(req.user.uid);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/shipments/sync-vessels
 */
const syncVessels = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    await shipmentService.syncVesselData(io);
    res.json({ success: true, message: "Vessel sync initiated successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShipments,
  getShipmentById,
  createShipment,
  updateStatus,
  getDashboardStats,
  syncVessels,
};
