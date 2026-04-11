/**
 * DrishtiFlow — Firestore Seeder
 * =================================
 * Populates your Firestore project with initial mock data.
 * 
 * Usage:
 * 1. Ensure backend/.env has valid FIREBASE credentials
 * 2. Run: node scripts/seed-firestore.js
 */

const { db } = require("../config/firebase.config");
const config = require("../config/app.config");

const MOCK_SHIPMENTS = [
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

async function seed() {
  if (!db) {
    console.error("❌ Database not initialized. Check your credentials in .env");
    process.exit(1);
  }

  console.log("🌱 Starting Firestore Seed...");

  try {
    // 1. Seed Shipments
    const shipmentsCol = db.collection(config.collections.shipments);
    
    // Using a generic userId for initial seeding
    const demoUserId = "demo-user-001";

    for (const shipment of MOCK_SHIPMENTS) {
      const data = { ...shipment, userId: demoUserId };
      
      // Check if exists
      const existing = await shipmentsCol
        .where("shipment_id", "==", shipment.shipment_id)
        .limit(1)
        .get();

      if (existing.empty) {
        await shipmentsCol.add(data);
        console.log(`✅ Added Shipment: ${shipment.shipment_id}`);
      } else {
        console.log(`⏩ Skipping Shipment (exists): ${shipment.shipment_id}`);
      }
    }

    // 2. Seed Demo User
    const usersCol = db.collection(config.collections.users);
    const demoUser = {
      email: "demo@drishtiflow.com",
      name: "Demo User",
      role: "USER",
      company: "Fleet Logistics Corp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await usersCol.doc(demoUserId).set(demoUser, { merge: true });
    console.log(`✅ Created/Updated Demo User: ${demoUserId}`);

    console.log("✨ Seeding Completed Successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit();
  }
}

seed();
