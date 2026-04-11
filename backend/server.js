/**
 * DrishtiFlow — Express Server Entry Point
 * ============================================
 * Main server file that wires everything together.
 * 
 * Architecture (CLAUDE.md):
 * - SYSTEM_FLOW: Request → Middleware → Controller → Service → Database
 * 
 * Start: npm run dev (development) | npm start (production)
 */

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const dotenv = require("dotenv");

// Load env variables
dotenv.config();

const config = require("./config/app.config");
const { notFound, errorHandler } = require("./middlewares/error.middleware");
const setupSocketIO = require("./sockets/dashboard.socket");

// ── Create Express App ────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setupSocketIO(io);

// Make io accessible in controllers
app.set("io", io);

// ── Global Middleware ─────────────────────────────────

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});
app.use("/api/", limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookies
app.use(cookieParser());

// Logging
if (config.isDev) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ── API Routes ────────────────────────────────────────

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/predict", require("./routes/prediction.routes"));
app.use("/api/shipments", require("./routes/shipment.routes"));
app.use("/api/simulate", require("./routes/simulation.routes"));
app.use("/api/upload", require("./routes/upload.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

// Ingestion & Keys
app.use("/api/v1/ingest", require("./routes/ingest.routes"));
app.use("/api/v1/keys", require("./routes/apiKey.routes"));

// ── Health Check ──────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "DrishtiFlow Backend API",
    version: "1.0.0",
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// ── API Documentation ─────────────────────────────────

app.get("/api", (req, res) => {
  res.json({
    success: true,
    service: "DrishtiFlow Backend API",
    version: "1.0.0",
    endpoints: {
      auth: {
        "POST /api/auth/register": "Register new user",
        "POST /api/auth/login": "Login with Firebase token",
        "POST /api/auth/logout": "Logout",
        "GET /api/auth/me": "Get current user profile",
        "PATCH /api/auth/profile": "Update profile",
      },
      predictions: {
        "POST /api/predict": "Single prediction",
        "POST /api/predict/batch": "Batch prediction (max 100)",
        "GET /api/predict/demo": "Demo prediction",
        "GET /api/predict/history": "Prediction history",
        "GET /api/predict/health": "ML service status",
      },
      shipments: {
        "GET /api/shipments": "List shipments",
        "GET /api/shipments/stats": "Dashboard stats",
        "GET /api/shipments/:id": "Get shipment",
        "POST /api/shipments": "Create shipment",
        "PATCH /api/shipments/:id/status": "Update status",
      },
      simulations: {
        "POST /api/simulate": "Run simulation",
        "GET /api/simulate/history": "Simulation history",
      },
      uploads: {
        "POST /api/upload/csv": "Upload CSV file",
        "POST /api/upload/csv/predict": "Upload & predict",
        "GET /api/upload/history": "Upload history",
      },
      admin: {
        "GET /api/admin/users": "List all users (Admin)",
        "DELETE /api/admin/users/:uid": "Delete user (Admin)",
        "GET /api/admin/stats": "Platform stats (Admin)",
        "GET /api/admin/uploads": "Recent uploads (Admin)",
      },
    },
  });
});

// ── Error Handling ────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────

server.listen(config.port, () => {
  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log("  🚀 DrishtiFlow Backend API");
  console.log("═══════════════════════════════════════════════");
  console.log(`  🌐 Server:    http://localhost:${config.port}`);
  console.log(`  📚 API Docs:  http://localhost:${config.port}/api`);
  console.log(`  🏥 Health:    http://localhost:${config.port}/api/health`);
  console.log(`  🔌 Socket.IO: ws://localhost:${config.port}`);
  console.log(`  🌍 Frontend:  ${config.frontendUrl}`);
  console.log(`  📦 Mode:      ${config.nodeEnv}`);
  console.log("═══════════════════════════════════════════════");
  console.log("");

  // Initialize Vessel Sync Polling (5m)
  const shipmentService = require("./services/shipment.service");
  setInterval(() => {
    shipmentService.syncVesselData(io).catch(err => {
      console.error("[Scheduler] Vessel sync failed:", err.message);
    });
  }, config.aisHub.pollInterval);
  
  // Initial sync on startup
  setTimeout(() => shipmentService.syncVesselData(io).catch(() => {}), 10000);
});

module.exports = { app, server, io };
