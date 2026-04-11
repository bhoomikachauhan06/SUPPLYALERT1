/**
 * DrishtiFlow — Error Handler Middleware
 * ========================================
 * Centralized error handling for all routes.
 */

/**
 * 404 handler for undefined routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global error handler.
 * Catches all errors and returns consistent JSON responses.
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  // Log error (skip 404s in production)
  if (statusCode !== 404 || process.env.NODE_ENV !== "production") {
    console.error(`❌ [${statusCode}] ${req.method} ${req.path}:`, message);
    if (statusCode === 500) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      path: req.path,
    }),
  });
};

module.exports = { notFound, errorHandler };
