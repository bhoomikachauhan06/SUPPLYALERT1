/**
 * DrishtiFlow — Upload Controller
 * ==================================
 */

const uploadService = require("../services/upload.service");
const riskScoringService = require("../services/riskScoring.service");

/**
 * POST /api/upload/csv
 */
const uploadCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Send a CSV file.",
      });
    }

    if (!req.file.originalname.endsWith(".csv")) {
      return res.status(400).json({
        success: false,
        error: "Only CSV files are accepted.",
      });
    }

    const result = await uploadService.processCSVUpload(req.user.uid, req.file);

    res.json({
      success: true,
      data: {
        uploadId: result.id,
        fileName: result.fileName,
        rowCount: result.rowCount,
        status: result.status,
        storageUrl: result.storageUrl,
      },
      message: `Successfully processed ${result.rowCount} records`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/upload/csv/predict
 * Upload CSV and get predictions for all rows.
 */
const uploadAndPredict = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded.",
      });
    }

    // Process upload
    const upload = await uploadService.processCSVUpload(req.user.uid, req.file);

    // Map CSV records to prediction features
    const featureKeys = [
      "weather_severity", "geopolitical_risk", "route_complexity",
      "carrier_reliability", "port_congestion", "seasonal_demand",
      "lead_time_variance", "supplier_risk_score", "customs_complexity",
      "historical_disruptions",
    ];

    const shipments = upload.records.slice(0, 100).map((row, i) => {
      const features = {};
      for (const key of featureKeys) {
        const val = parseFloat(row[key]);
        if (!isNaN(val)) features[key] = Math.min(Math.max(val, 0), 10);
      }

      return {
        shipment_id: row.shipment_id || `CSV-${String(i + 1).padStart(4, "0")}`,
        features,
      };
    });

    const predictions = await riskScoringService.predictBatch(shipments);

    res.json({
      success: true,
      data: {
        uploadId: upload.id,
        predictions,
        count: predictions.length,
        total_rows: upload.rowCount,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/upload/history
 */
const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const history = await uploadService.getUploadHistory(req.user.uid, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadCSV, uploadAndPredict, getHistory };
