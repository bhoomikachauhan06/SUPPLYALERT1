"""
DrishtiFlow — FastAPI Prediction Service
=========================================
Production-grade ML prediction API.

Endpoints:
  POST /api/predict           — Single shipment prediction
  POST /api/predict/batch     — Batch predictions (up to 100)
  POST /api/predict/csv       — Predict from CSV upload
  GET  /api/model/info        — Model metadata
  GET  /api/health             — Health check

Architecture compliance:
  - EXECUTION.predictRisk → /api/predict
  - ORCHESTRATION.RISK_ENGINE → Full pipeline
  - DIRECTIVES.RULES → Input validation + error handling
"""

import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from loguru import logger

from config import (
    API_HOST, API_PORT, CORS_ORIGINS,
    FEATURE_COLUMNS, LOG_LEVEL, LOG_FILE, DEMO_MODE
)
from prediction_engine import PredictionEngine
from feature_engineering import FeatureEngineer


# ── Logging Setup ──────────────────────────────────────
logger.add(
    str(LOG_FILE),
    rotation="10 MB",
    retention="7 days",
    level=LOG_LEVEL,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {message}"
)


# ── Singleton Engine ───────────────────────────────────
engine: Optional[PredictionEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize prediction engine on startup."""
    global engine
    logger.info("🚀 Starting DrishtiFlow Prediction Service...")
    engine = PredictionEngine()
    
    if engine.is_production_ready:
        logger.info("✅ Production model loaded")
    else:
        logger.warning("⚠️ Running in DEMO mode (no trained model)")
    
    yield
    
    logger.info("👋 Shutting down prediction service")


# ── FastAPI App ────────────────────────────────────────
app = FastAPI(
    title="DrishtiFlow Prediction Engine",
    description="Supply chain disruption risk prediction API powered by XGBoost + ONNX",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ────────────────────────────

class PredictionRequest(BaseModel):
    """Single prediction request."""
    shipment_id: str = Field(default="SHP-000001", description="Shipment tracking ID")
    features: Dict[str, float] = Field(
        ...,
        description="Feature values (0-10 scale). Keys from: " + ", ".join(FEATURE_COLUMNS)
    )
    
    @field_validator("features")
    @classmethod
    def validate_features(cls, v):
        for key, value in v.items():
            if key not in FEATURE_COLUMNS:
                logger.warning(f"Unknown feature '{key}' will be ignored")
            if not isinstance(value, (int, float)):
                raise ValueError(f"Feature '{key}' must be numeric, got {type(value)}")
            if value < 0 or value > 10:
                raise ValueError(f"Feature '{key}' must be 0-10, got {value}")
        return v
    
    model_config = {
        "json_schema_extra": {
            "examples": [{
                "shipment_id": "SHP-001234",
                "features": {
                    "weather_severity": 7.5,
                    "geopolitical_risk": 3.0,
                    "route_complexity": 6.0,
                    "carrier_reliability": 4.0,
                    "port_congestion": 8.0,
                    "seasonal_demand": 5.5,
                    "lead_time_variance": 3.0,
                    "supplier_risk_score": 2.5,
                    "customs_complexity": 4.0,
                    "historical_disruptions": 5.0,
                }
            }]
        }
    }


class BatchPredictionRequest(BaseModel):
    """Batch prediction request."""
    shipments: List[PredictionRequest] = Field(
        ...,
        max_length=100,
        description="Up to 100 shipments"
    )


class PredictionResponse(BaseModel):
    """Prediction response."""
    success: bool
    data: Dict[str, Any]
    timestamp: float


class BatchPredictionResponse(BaseModel):
    """Batch prediction response."""
    success: bool
    data: List[Dict[str, Any]]
    count: int
    timestamp: float


# ── Endpoints ──────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check with model status."""
    return {
        "status": "healthy",
        "model_loaded": engine.is_production_ready if engine else False,
        "mode": "production" if (engine and engine.is_production_ready) else "demo",
        "timestamp": time.time(),
    }


@app.get("/api/model/info")
async def model_info():
    """Return model metadata and capabilities."""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    return {
        "success": True,
        "data": engine.get_model_info(),
        "timestamp": time.time(),
    }


@app.post("/api/predict", response_model=PredictionResponse)
async def predict_single(request: PredictionRequest):
    """
    Predict disruption risk for a single shipment.
    
    **Input**: Feature values on 0-10 scale  
    **Output**: Disruption probability, risk level, feature importance, explanation
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        result = engine.predict(
            input_data=request.features,
            shipment_id=request.shipment_id
        )
        
        return PredictionResponse(
            success=True,
            data=engine.to_dict(result),
            timestamp=time.time(),
        )
    
    except Exception as e:
        logger.error(f"Prediction failed for {request.shipment_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/api/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """
    Batch prediction for multiple shipments (up to 100).
    
    Uses vectorized ONNX inference for optimal throughput.
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        batch_data = [
            {"features": s.features, "shipment_id": s.shipment_id}
            for s in request.shipments
        ]
        
        results = engine.predict_batch(batch_data)
        
        return BatchPredictionResponse(
            success=True,
            data=[engine.to_dict(r) for r in results],
            count=len(results),
            timestamp=time.time(),
        )
    
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch prediction failed: {str(e)}"
        )


@app.post("/api/predict/csv")
async def predict_from_csv(
    file: UploadFile = File(..., description="CSV file with shipment features")
):
    """
    Upload CSV and get predictions for all shipments.
    
    The CSV can use flexible column names (e.g., 'weather' maps to 'weather_severity').
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")
    
    try:
        content = await file.read()
        csv_text = content.decode("utf-8")
        
        # Parse and map columns
        df, unmapped = FeatureEngineer.from_csv_upload(csv_text)
        
        # Build batch data
        batch_data = []
        for idx, row in df.iterrows():
            features = {}
            for col in FEATURE_COLUMNS:
                if col in df.columns:
                    features[col] = float(row[col]) if not pd.isna(row[col]) else 5.0
                else:
                    features[col] = 5.0
            
            sid = str(row.get("shipment_id", f"CSV-{idx:04d}"))
            batch_data.append({"features": features, "shipment_id": sid})
        
        results = engine.predict_batch(batch_data)
        
        return {
            "success": True,
            "data": [engine.to_dict(r) for r in results],
            "count": len(results),
            "unmapped_columns": unmapped,
            "total_rows": len(df),
            "timestamp": time.time(),
        }
    
    except Exception as e:
        logger.error(f"CSV prediction failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"CSV processing failed: {str(e)}"
        )


@app.post("/api/predict/demo")
async def predict_demo():
    """
    Generate a demo prediction with pre-set high-risk scenario.
    Useful for frontend development and investor demos.
    """
    demo_features = {
        "weather_severity": 8.5,        # Typhoon approaching
        "geopolitical_risk": 6.0,       # Moderate instability
        "route_complexity": 7.0,        # Complex multi-port route
        "carrier_reliability": 5.5,     # Average carrier
        "port_congestion": 8.0,         # Heavy congestion
        "seasonal_demand": 7.5,         # Peak season
        "lead_time_variance": 4.0,      # Some variance
        "supplier_risk_score": 3.0,     # OK supplier
        "customs_complexity": 5.0,      # Moderate customs
        "historical_disruptions": 6.5,  # History of delays
    }
    
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    result = engine.predict(
        input_data=demo_features,
        shipment_id="DEMO-HIGH-RISK"
    )
    
    return {
        "success": True,
        "data": engine.to_dict(result),
        "scenario": "Typhoon approaching Shanghai port during peak season",
        "timestamp": time.time(),
    }


# ── Import for CSV route ──────────────────────────────
import pandas as pd


# ── Run ────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🌐 Starting server on {API_HOST}:{API_PORT}")
    logger.info(f"📚 API docs: http://localhost:{API_PORT}/docs")
    
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
        log_level="info"
    )
