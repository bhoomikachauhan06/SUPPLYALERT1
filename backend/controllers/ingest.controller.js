/**
 * DrishtiFlow — Ingest Controller
 * ===============================
 * Handles external data ingestion via API Key.
 */

const shipmentService = require("../services/shipment.service");
const riskScoringService = require("../services/riskScoring.service");
const { logger } = require("../libs/logger");

class IngestController {
  /**
   * Universal ingestion endpoint.
   * Accepts raw shipment data from external tools.
   */
  async ingestShipment(req, res) {
    try {
      const externalData = req.body;
      const userId = req.user.uid;

      // 1. Map external data to DrishtiFlow schema
      // This is a flexible mapping layer
      const shipmentData = {
        userId,
        origin: externalData.origin || externalData.origin_port,
        destination: externalData.destination || externalData.destination_port,
        status: "IN_TRANSIT",
        priority: externalData.priority || "MEDIUM",
        carrier: externalData.carrier || "EXTERNAL_API",
        vesselName: externalData.vessel_name || externalData.vessel,
        containerId: externalData.container_id || externalData.container,
        estimatedArrival: externalData.eta || externalData.estimated_arrival,
        
        // Metadata from external source
        metadata: {
          source: externalData.source || "API_INGEST",
          externalId: externalData.id || externalData.shipment_id,
          apiKeyId: req.apiKeyId,
          raw: externalData,
        },
        
        // Risk Features (if provided)
        riskFeatures: externalData.risk_metrics || {
          weatherSeverity: externalData.weather_severity,
          geopoliticalRisk: externalData.geopolitical_risk,
        }
      };

      // 2. Create the shipment
      const shipment = await shipmentService.createShipment(shipmentData);

      // 3. Trigger immediate risk assessment (async)
      riskScoringService.getPrediction(shipment.id).catch(err => {
        console.error(`Post-ingestion risk scoring failed for ${shipment.id}:`, err);
      });

      return res.status(201).json({
        success: true,
        message: "Discovery: Data ingestion successful.",
        shipmentId: shipment.id,
      });

    } catch (error) {
      console.error("Ingestion error:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to ingest data.",
      });
    }
  }
}

module.exports = new IngestController();
