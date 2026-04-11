/**
 * DrishtiFlow — Auth Controller
 * ================================
 * Handles request/response only. Logic delegated to auth.service.
 * 
 * Architecture (CLAUDE.md):
 * - DIRECTIVES.SEPARATION_OF_CONCERNS: Controller → request/response only
 */

const authService = require("../services/auth.service");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: "Registration successful",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Receives Firebase ID token from client-side auth,
 * verifies it, creates session cookie.
 */
const login = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const user = await authService.verifyAndLogin(idToken);

    // Set httpOnly cookie
    res.cookie("accessToken", idToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
      },
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken", { path: "/" });
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user profile.
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.uid);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.uid, req.body);
    res.json({
      success: true,
      data: user,
      message: "Profile updated",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
};
