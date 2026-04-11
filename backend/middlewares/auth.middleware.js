/**
 * DrishtiFlow — Auth Middleware
 * ==============================
 * Verifies Firebase ID tokens from httpOnly cookies.
 * 
 * Architecture (CLAUDE.md):
 * - DIRECTIVES.RULES.SECURITY: httpOnly cookies only, no localStorage
 * - ORCHESTRATION.AUTH_FLOW: Validate credentials → attach user
 * - EXECUTION.authenticateUser: Verify JWT from cookies → attach user
 */

const { auth, db } = require("../config/firebase.config");
const config = require("../config/app.config");

/**
 * Authenticate user from Firebase token in httpOnly cookie.
 * Attaches user info to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from httpOnly cookie or Authorization header
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. No token provided.",
      });
    }

    // Demo mode bypass
    if (!auth) {
      console.warn("⚠️ Firebase Auth not initialized — using demo user");
      req.user = {
        uid: "demo-user-001",
        email: "demo@drishtiflow.com",
        name: "Demo User",
        role: "USER",
      };
      return next();
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);

    // Fetch user profile from Firestore
    const userDoc = await db
      .collection(config.collections.users)
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        error: "User profile not found. Please complete registration.",
      });
    }

    const userData = userDoc.data();

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: userData.name || decodedToken.name,
      role: userData.role || "USER",
      company: userData.company,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        error: "Token expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Invalid authentication token.",
    });
  }
};

/**
 * Role-based access control.
 * 
 * Architecture (CLAUDE.md):
 * - ORCHESTRATION.ROLE_ENGINE: Permission checking
 * - EXECUTION.authorizeRole: Throw if unauthorized
 * 
 * @param  {...string} roles - Allowed roles (e.g., "ADMIN", "USER")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      console.warn(
        `Access denied: ${req.user.email} (${req.user.role}) tried to access ${req.method} ${req.path}`
      );
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

/**
 * Optional authentication — doesn't block if no token.
 * Attaches user if token is valid, otherwise continues.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token || !auth) {
      return next();
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db
      .collection(config.collections.users)
      .doc(decodedToken.uid)
      .get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: userData.name || decodedToken.name,
        role: userData.role || "USER",
      };
    }
  } catch {
    // Silent fail for optional auth
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
