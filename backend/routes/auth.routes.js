/**
 * DrishtiFlow — Auth Routes
 * ===========================
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate, schemas } = require("../middlewares/validate.middleware");

// Public routes
router.post("/register", validate(schemas.register), authController.register);
router.post("/login", validate(schemas.login), authController.login);
router.post("/logout", authController.logout);

// Protected routes
router.get("/me", authenticate, authController.getProfile);
router.patch("/profile", authenticate, authController.updateProfile);

module.exports = router;
