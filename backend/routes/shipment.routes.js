/**
 * DrishtiFlow — Shipment Routes
 * ================================
 */

const express = require("express");
const router = express.Router();
const shipmentController = require("../controllers/shipment.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate, schemas } = require("../middlewares/validate.middleware");

// All shipment routes require auth
router.use(authenticate);

router.get("/stats", shipmentController.getDashboardStats);
router.get("/", shipmentController.getShipments);
router.get("/:shipmentId", shipmentController.getShipmentById);
router.post("/", validate(schemas.createShipment), shipmentController.createShipment);
router.patch("/:shipmentId/status", shipmentController.updateStatus);
router.post("/sync-vessels", shipmentController.syncVessels);

module.exports = router;
