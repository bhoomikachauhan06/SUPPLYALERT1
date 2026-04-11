"""
DrishtiFlow Prediction Engine — Configuration
==============================================
Central configuration for the ML service.
All tunable parameters live here.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
MODEL_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# ── Model Files ────────────────────────────────────────
XGBOOST_MODEL_PATH = MODEL_DIR / "risk_model.json"
ONNX_MODEL_PATH = MODEL_DIR / "risk_model.onnx"
FEATURE_SCALER_PATH = MODEL_DIR / "feature_scaler.pkl"
FEATURE_NAMES_PATH = MODEL_DIR / "feature_names.json"

# ── Feature Configuration ──────────────────────────────
FEATURE_COLUMNS = [
    "weather_severity",        # 0-10: severity of weather along route
    "geopolitical_risk",       # 0-10: political instability index
    "route_complexity",        # 0-10: number of transshipment points, distance
    "carrier_reliability",     # 0-10: historical on-time performance (inverted)
    "port_congestion",         # 0-10: current congestion at destination port
    "seasonal_demand",         # 0-10: demand surge indicator
    "lead_time_variance",      # 0-10: historical variance in lead times
    "supplier_risk_score",     # 0-10: supplier financial health (inverted)
    "customs_complexity",      # 0-10: regulatory/customs difficulty
    "historical_disruptions",  # 0-10: past disruption frequency on this route
]

FEATURE_DISPLAY_NAMES = {
    "weather_severity": "Weather Severity",
    "geopolitical_risk": "Geopolitical Risk",
    "route_complexity": "Route Complexity",
    "carrier_reliability": "Carrier Reliability",
    "port_congestion": "Port Congestion",
    "seasonal_demand": "Seasonal Demand",
    "lead_time_variance": "Lead Time Variance",
    "supplier_risk_score": "Supplier Risk Score",
    "customs_complexity": "Customs Complexity",
    "historical_disruptions": "Historical Disruptions",
}

# ── Model Hyperparameters ──────────────────────────────
MODEL_PARAMS = {
    "n_estimators": 200,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "objective": "binary:logistic",
    "eval_metric": "logloss",
    "random_state": 42,
    "n_jobs": -1,
}

# ── Server Configuration ───────────────────────────────
API_HOST = os.getenv("ML_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("ML_API_PORT", "8000"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ── Prediction Settings ────────────────────────────────
PREDICTION_CACHE_TTL = 300  # 5 minutes
PREDICTION_CACHE_MAX_SIZE = 1000
CONFIDENCE_CALIBRATION = True

# ── Risk Thresholds ────────────────────────────────────
RISK_THRESHOLDS = {
    "low": 0.30,       # < 30% = Low Risk (Green)
    "medium": 0.60,    # 30-60% = Medium Risk (Yellow)
    "high": 1.0,       # 60-100% = High Risk (Red)
}

# ── Demo Mode ──────────────────────────────────────────
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

# ── Logging ────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = LOGS_DIR / "prediction_engine.log"
