/**
 * DrishtiFlow — Shipment Service
 * =================================
 * CRUD operations for shipments + Firestore persistence.
 */

const { db } = require("../config/firebase.config");
const config = require("../config/app.config");
const { v4: uuidv4 } = require("uuid");
const weatherService = require("./weather.service");
const riskScoringService = require("./riskScoring.service");
const aisHubService = require("./aisHub.service");

// Mock data for demo mode
const MOCK_SHIPMENTS = [
  {
    id: "mock-1",
    shipment_id: "SHP-001234",
    origin: "Shanghai",
    destination: "Los Angeles",
    carrier: "MaerskLine",
    shipment_value_usd: 125000,
    transit_days_expected: 28,
    status: "IN_TRANSIT",
    origin_lat: 31.2304,
    origin_lng: 121.4737,
    dest_lat: 33.9425,
    dest_lng: -118.408,
    weather_severity: 7.5,
    geopolitical_risk: 3.0,
    route_complexity: 6.0,
    carrier_reliability: 4.0,
    port_congestion: 8.0,
    seasonal_demand: 5.5,
    lead_time_variance: 3.0,
    supplier_risk_score: 2.5,
    customs_complexity: 4.0,
    historical_disruptions: 5.0,
  },
  {
    id: "mock-2",
    shipment_id: "SHP-001235",
    origin: "Rotterdam",
    destination: "New York",
    carrier: "MSC",
    shipment_value_usd: 89000,
    transit_days_expected: 14,
    status: "IN_TRANSIT",
    origin_lat: 51.9225,
    origin_lng: 4.4792,
    dest_lat: 40.6413,
    dest_lng: -74.0781,
    weather_severity: 2.0,
    geopolitical_risk: 1.5,
    route_complexity: 3.0,
    carrier_reliability: 2.0,
    port_congestion: 4.5,
    seasonal_demand: 3.0,
    lead_time_variance: 2.0,
    supplier_risk_score: 1.5,
    customs_complexity: 3.0,
    historical_disruptions: 1.0,
  },
  {
    id: "mock-3",
    shipment_id: "SHP-001236",
    origin: "Mumbai",
    destination: "Hamburg",
    carrier: "Hapag-Lloyd",
    shipment_value_usd: 67000,
    transit_days_expected: 21,
    status: "DELAYED",
    origin_lat: 19.076,
    origin_lng: 72.8777,
    dest_lat: 53.5511,
    dest_lng: 9.9937,
    weather_severity: 8.5,
    geopolitical_risk: 5.0,
    route_complexity: 7.5,
    carrier_reliability: 5.5,
    port_congestion: 7.0,
    seasonal_demand: 8.0,
    lead_time_variance: 6.0,
    supplier_risk_score: 4.0,
    customs_complexity: 6.0,
    historical_disruptions: 7.0,
  },
  {
    id: "mock-4",
    shipment_id: "SHP-001237",
    origin: "Singapore",
    destination: "Sydney",
    carrier: "CMA-CGM",
    shipment_value_usd: 43000,
    transit_days_expected: 10,
    status: "IN_TRANSIT",
    origin_lat: 1.3521,
    origin_lng: 103.8198,
    dest_lat: -33.8688,
    dest_lng: 151.2093,
    weather_severity: 3.0,
    geopolitical_risk: 1.0,
    route_complexity: 4.0,
    carrier_reliability: 3.0,
    port_congestion: 3.5,
    seasonal_demand: 4.0,
    lead_time_variance: 2.5,
    supplier_risk_score: 2.0,
    customs_complexity: 2.0,
    historical_disruptions: 1.5,
  },
  {
    id: "mock-5",
    shipment_id: "SHP-001238",
    origin: "Busan",
    destination: "São Paulo",
    carrier: "Evergreen",
    shipment_value_usd: 156000,
    transit_days_expected: 35,
    status: "PENDING",
    origin_lat: 35.1796,
    origin_lng: 129.0756,
    dest_lat: -23.5505,
    dest_lng: -46.6333,
    weather_severity: 4.0,
    geopolitical_risk: 3.5,
    route_complexity: 8.0,
    carrier_reliability: 3.5,
    port_congestion: 5.0,
    seasonal_demand: 6.0,
    lead_time_variance: 5.0,
    supplier_risk_score: 3.0,
    customs_complexity: 7.0,
    historical_disruptions: 4.0,
  },
  {
    id: "mock-6",
    shipment_id: "SHP-001239",
    origin: "Singapore",
    destination: "Rotterdam",
    carrier: "OceanNetworkExpress",
    shipment_value_usd: 210000,
    transit_days_expected: 22,
    status: "CRITICAL",
    origin_lat: 1.2903,
    origin_lng: 103.8520,
    dest_lat: 51.9225,
    dest_lng: 4.4792,
    weather_severity: 9.8,
    geopolitical_risk: 8.5,
    route_complexity: 9.0,
    carrier_reliability: 6.0,
    port_congestion: 9.5,
    seasonal_demand: 7.0,
    lead_time_variance: 8.0,
    supplier_risk_score: 5.0,
    customs_complexity: 4.0,
    historical_disruptions: 9.0,
  },
];

class ShipmentService {
  /**
   * Get all shipments for a user.
   */
  async getShipments(userId, { page = 1, limit = 20, status } = {}) {
    if (!db) {
      throw createError("Database not initialized", 500);
    }

    let query = db
      .collection(config.collections.shipments)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const offset = (page - 1) * limit;
    const snapshot = await query.offset(offset).limit(limit).get();

    const shipments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    return { 
      shipments, 
      total,
      page: parseInt(page), 
      limit: parseInt(limit) 
    };
  }

  /**
   * Get a single shipment by ID.
   */
  async getShipmentById(shipmentId, userId) {
    if (!db) throw createError("Database not initialized", 500);

    const snapshot = await db
      .collection(config.collections.shipments)
      .where("shipment_id", "==", shipmentId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw createError("Shipment not found", 404);
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Create a new shipment.
   */
  async createShipment(userId, data) {
    if (!db) throw createError("Database not initialized", 500);

    const shipment = {
      userId,
      shipment_id: data.shipment_id || `SHP-${uuidv4().slice(0, 8).toUpperCase()}`,
      origin: data.origin,
      destination: data.destination,
      carrier: data.carrier || null,
      shipment_value_usd: data.shipment_value_usd || null,
      transit_days_expected: data.transit_days_expected || null,
      status: "PENDING",
      origin_lat: data.origin_lat || null,
      origin_lng: data.origin_lng || null,
      dest_lat: data.dest_lat || null,
      dest_lng: data.dest_lng || null,
      // Vessel identifiers for AIS tracking
      mmsi: data.mmsi || null,
      imo: data.imo || null,
      // Risk features
      weather_severity: data.weather_severity || null,
      geopolitical_risk: data.geopolitical_risk || null,
      route_complexity: data.route_complexity || null,
      carrier_reliability: data.carrier_reliability || null,
      port_congestion: data.port_congestion || null,
      seasonal_demand: data.seasonal_demand || null,
      lead_time_variance: data.lead_time_variance || null,
      supplier_risk_score: data.supplier_risk_score || null,
      customs_complexity: data.customs_complexity || null,
      historical_disruptions: data.historical_disruptions || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db
      .collection(config.collections.shipments)
      .add(shipment);

    const createdShipment = { id: docRef.id, ...shipment };

    // Trigger background enrichment (Async)
    this._enrichAndScoreShipment(userId, createdShipment).catch(console.error);

    return createdShipment;
  }

  /**
   * Helper to fetch live data (weather, etc.) and trigger risk scoring.
   */
  async _enrichAndScoreShipment(userId, shipment) {
    let { origin_lat, origin_lng, dest_lat, dest_lng, weather_severity } = shipment;
    let updatedFields = {};

    // 1. Fetch live weather if not provided manually
    if (weather_severity === null && origin_lat && origin_lng) {
      try {
        const originWeather = await weatherService.getWeatherSeverity(origin_lat, origin_lng);
        const destWeather = (dest_lat && dest_lng) 
          ? await weatherService.getWeatherSeverity(dest_lat, dest_lng)
          : originWeather;
        
        // Take the higher risk of the two
        weather_severity = Math.max(originWeather, destWeather);
        updatedFields.weather_severity = weather_severity;
      } catch (err) {
        console.error("[ShipmentService] Weather enrichment failed:", err.message);
      }
    }

    // 2. Trigger Risk Scoring
    try {
      const features = {
        ...shipment,
        ...updatedFields // Include the new weather score
      };

      const prediction = await riskScoringService.predict(features, shipment.shipment_id);
      
      // Save prediction to Firestore
      await riskScoringService.savePrediction(userId, prediction);

      // Update the shipment with the new weather value in Firestore
      if (Object.keys(updatedFields).length > 0) {
        await db.collection(config.collections.shipments).doc(shipment.id).update(updatedFields);
      }
      
      console.log(`[ShipmentService] Enrichment & scoring complete for ${shipment.shipment_id}`);
    } catch (err) {
      console.error("[ShipmentService] Scoring failed:", err.message);
    }
  }

  /**
   * Update shipment status.
   */
  async updateStatus(shipmentId, userId, status) {
    if (!db) throw createError("Database not initialized", 500);

    const snapshot = await db
      .collection(config.collections.shipments)
      .where("shipment_id", "==", shipmentId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw createError("Shipment not found", 404);
    }

    await snapshot.docs[0].ref.update({
      status,
      updatedAt: new Date().toISOString(),
    });

    return { shipment_id: shipmentId, status };
  }

  /**
   * Get dashboard stats for a user.
   */
  async getDashboardStats(userId) {
    if (!db) throw createError("Database not initialized", 500);

    const snapshot = await db
      .collection(config.collections.shipments)
      .where("userId", "==", userId)
      .get();

    const shipments = snapshot.docs.map((doc) => doc.data());

    return {
      total_shipments: shipments.length,
      in_transit: shipments.filter((s) => s.status === "IN_TRANSIT").length,
      delayed: shipments.filter((s) => s.status === "DELAYED").length,
      delivered: shipments.filter((s) => s.status === "DELIVERED").length,
      pending: shipments.filter((s) => s.status === "PENDING").length,
      at_risk: shipments.filter((s) => s.status === "DELAYED" || s.status === "IN_TRANSIT").length,
      on_time_rate: shipments.length > 0
        ? Math.round(
            (shipments.filter((s) => s.status === "DELIVERED").length /
              shipments.length) * 100 * 10
          ) / 10
        : 0,
    };
  }

  /**
   * Sync all active shipments with AISHub live data.
   */
  async syncVesselData(io) {
    if (!db) return;

    console.log("[ShipmentService] Starting periodic AIS Vessel Sync...");

    try {
      // 1. Get all IN_TRANSIT shipments that have an MMSI or IMO
      const snapshot = await db.collection(config.collections.shipments)
        .where("status", "==", "IN_TRANSIT")
        .get();

      const shipmentsWithVessels = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.mmsi || s.imo);

      if (shipmentsWithVessels.length === 0) {
        console.log("[ShipmentService] No active shipments with vessel IDs found.");
        return;
      }

      const mmsis = shipmentsWithVessels.filter(s => s.mmsi).map(s => s.mmsi);
      const imos = shipmentsWithVessels.filter(s => s.imo).map(s => s.imo);

      // 2. Fetch from AISHub
      const vesselUpdates = await aisHubService.getVesselData({ mmsis, imos });

      if (vesselUpdates.length === 0) return;

      // 3. Update Firestore and emit socket events
      for (const update of vesselUpdates) {
        // Find matching shipment(s)
        const targets = shipmentsWithVessels.filter(s => 
          (s.mmsi && s.mmsi == update.MMSI) || 
          (s.imo && s.imo == update.IMO)
        );

        for (const target of targets) {
          const updatedLat = update.LAT;
          const updatedLng = update.LON;

          // Only update if coordinates changed
          if (updatedLat !== target.origin_lat || updatedLng !== target.origin_lng) {
            await db.collection(config.collections.shipments).doc(target.id).update({
              origin_lat: updatedLat,
              origin_lng: updatedLng,
              updatedAt: new Date().toISOString(),
              ais_last_seen: update.TIME,
              vessel_name: update.NAME,
              sog: update.SOG,
              cog: update.COG,
            });

            // Emit update to dashboard
            if (io) {
              io.emitToDashboard("vessel:position_update", {
                shipment_id: target.shipment_id,
                lat: updatedLat,
                lng: updatedLng,
                vessel_name: update.NAME,
                sog: update.SOG,
                timestamp: Date.now(),
              });
            }
            
            console.log(`[ShipmentService] Updated position for ${target.shipment_id} via AISHub`);
          }
        }
      }
    } catch (err) {
      console.error("[ShipmentService] Vessel sync failed:", err.message);
    }
  }
}

function createError(msg, code) {
  const err = new Error(msg);
  err.statusCode = code;
  return err;
}

module.exports = new ShipmentService();
