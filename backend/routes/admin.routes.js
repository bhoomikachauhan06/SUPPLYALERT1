/**
 * DrishtiFlow — Admin Routes
 * ============================
 * Admin-only routes, protected by ADMIN role.
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

router.get("/users", adminController.listUsers);
router.delete("/users/:uid", adminController.deleteUser);
router.get("/stats", adminController.getPlatformStats);
router.get("/uploads", adminController.getRecentUploads);

module.exports = router;
