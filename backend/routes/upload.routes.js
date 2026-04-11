/**
 * DrishtiFlow — Upload Routes
 * ==============================
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadController = require("../controllers/upload.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Multer memory storage (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

router.use(authenticate);

router.post("/csv", upload.single("file"), uploadController.uploadCSV);
router.post("/csv/predict", upload.single("file"), uploadController.uploadAndPredict);
router.get("/history", uploadController.getHistory);

module.exports = router;
