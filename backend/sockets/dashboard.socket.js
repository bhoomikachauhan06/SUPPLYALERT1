/**
 * DrishtiFlow — WebSocket Handler
 * ==================================
 * Real-time updates for dashboard, predictions, and alerts.
 * 
 * Architecture (CLAUDE.md):
 * - ORCHESTRATION.REALTIME_ENGINE: Socket events
 * - Events: risk:update, shipment:update, prediction:complete
 */

const setupSocketIO = (io) => {
  // Middleware: auth check for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const userId = socket.handshake.auth?.userId;

    if (userId) {
      socket.userId = userId;
      socket.userRole = socket.handshake.auth?.role || "USER";
      return next();
    }

    // Allow anonymous connections in demo mode
    socket.userId = "anonymous";
    socket.userRole = "USER";
    next();
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (${socket.userId})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // ── Dashboard Events ──────────────────────────

    socket.on("dashboard:subscribe", () => {
      socket.join("dashboard");
      console.log(`📊 ${socket.userId} subscribed to dashboard updates`);

      // Send initial dashboard data
      socket.emit("dashboard:init", {
        connected: true,
        timestamp: Date.now(),
      });
    });

    socket.on("dashboard:unsubscribe", () => {
      socket.leave("dashboard");
    });

    // ── Prediction Events ─────────────────────────

    socket.on("prediction:request", (data) => {
      console.log(`🔮 Prediction requested by ${socket.userId}`);

      // Emit back to the requesting user
      socket.emit("prediction:started", {
        shipment_id: data?.shipment_id,
        timestamp: Date.now(),
      });
    });

    socket.on("prediction:complete", (data) => {
      // Broadcast to dashboard subscribers
      io.to("dashboard").emit("prediction:update", {
        ...data,
        timestamp: Date.now(),
      });
    });

    // ── Shipment Events ───────────────────────────

    socket.on("shipment:update", (data) => {
      // Broadcast to all dashboard subscribers
      io.to("dashboard").emit("shipment:statusChange", {
        ...data,
        timestamp: Date.now(),
      });
    });

    // ── Alert Events ──────────────────────────────

    socket.on("alert:risk", (data) => {
      // Broadcast high-risk alerts
      io.to("dashboard").emit("alert:highRisk", {
        ...data,
        type: "HIGH_RISK",
        timestamp: Date.now(),
      });

      // Also notify admins
      io.to("role:ADMIN").emit("admin:alert", {
        ...data,
        timestamp: Date.now(),
      });
    });

    // ── Keep alive ────────────────────────────────

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // ── Disconnect ────────────────────────────────

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  // ── Utility: Emit to specific user ──────────────
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // ── Utility: Broadcast to dashboard ─────────────
  io.emitToDashboard = (event, data) => {
    io.to("dashboard").emit(event, { ...data, timestamp: Date.now() });
  };

  return io;
};

module.exports = setupSocketIO;
