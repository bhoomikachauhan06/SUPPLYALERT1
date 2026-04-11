/**
 * DrishtiFlow — Admin Controller
 * =================================
 */

const adminService = require("../services/admin.service");

/**
 * GET /api/admin/users
 */
const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await adminService.listUsers({
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/stats
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const stats = await adminService.getPlatformStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/uploads
 */
const getRecentUploads = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const result = await adminService.getRecentUploads({
      limit: parseInt(limit),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:uid
 */
const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.uid);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { listUsers, getPlatformStats, getRecentUploads, deleteUser };
