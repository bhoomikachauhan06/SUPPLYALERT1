"""
DrishtiFlow — Prediction Engine (Core Inference)
=================================================
High-performance prediction engine with ONNX runtime.

Architecture compliance (CLAUDE.md):
- ORCHESTRATION.RISK_ENGINE: Returns disruption probability + feature importance
- EXECUTION.predictRisk: Fast inference with caching
- DIRECTIVES.RULES: Input validation, error handling, transparency

Supports two modes:
1. PRODUCTION: Uses ONNX runtime for 2-5x faster inference
2. DEMO: Returns realistic mock predictions for showcasing
"""

import json
import time
import hashlib
import numpy as np
import pickle
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from cachetools import TTLCache
from loguru import logger

from config import (
    FEATURE_COLUMNS, FEATURE_DISPLAY_NAMES,
    XGBOOST_MODEL_PATH, ONNX_MODEL_PATH,
    MODEL_DIR, RISK_THRESHOLDS,
    PREDICTION_CACHE_TTL, PREDICTION_CACHE_MAX_SIZE,
    DEMO_MODE, FEATURE_NAMES_PATH
)
from feature_engineering import FeatureEngineer


@dataclass
class PredictionResult:
    """
    Structured prediction output.
    
    This is what the API returns for every prediction request.
    Designed to be chart-ready for the frontend dashboard.
    """
    shipment_id: str
    disruption_probability: float          # 0-100%
    risk_level: str                        # "low" | "medium" | "high"
    risk_color: str                        # "#22c55e" | "#eab308" | "#ef4444"
    confidence_score: float                # 0-100%
    feature_importance: List[Dict]         # [{name, display_name, value, contribution}]
    top_risk_factors: List[str]            # Human-readable risk factors
    estimated_delay_days: float            # Predicted delay range
    model_version: str                     # Model tracking
    prediction_latency_ms: float           # Transparency metric
    mode: str                              # "production" | "demo"
    explanation: str                       # Natural language summary


class PredictionEngine:
    """
    Core prediction engine for supply chain disruption risk.
    
    Features:
    - ONNX runtime inference (primary)
    - XGBoost native fallback
    - Result caching (TTL-based)
    - Demo mode for showcasing
    - Full explainability pipeline
    """
    
    def __init__(self):
        self.model = None
        self.onnx_session = None
        self.feature_engineer = FeatureEngineer()
        self.model_version = "1.0.0"
        self.cache = TTLCache(
            maxsize=PREDICTION_CACHE_MAX_SIZE,
            ttl=PREDICTION_CACHE_TTL
        )
        self._feature_importance_base = None
        self._load_model()
    
    def _load_model(self):
        """Load model with ONNX > XGBoost > Demo fallback chain."""
        
        # Try ONNX first (fastest)
        if ONNX_MODEL_PATH.exists():
            try:
                import onnxruntime as ort
                self.onnx_session = ort.InferenceSession(
                    str(ONNX_MODEL_PATH),
                    providers=["CPUExecutionProvider"]
                )
                logger.info(f"✅ ONNX model loaded: {ONNX_MODEL_PATH}")
                self.model_version = "1.0.0-onnx"
                self._load_feature_importance()
                return
            except Exception as e:
                logger.warning(f"ONNX load failed: {e}")
        
        # Fallback to native XGBoost
        if XGBOOST_MODEL_PATH.exists():
            try:
                import xgboost as xgb
                self.model = xgb.XGBClassifier()
                self.model.load_model(str(XGBOOST_MODEL_PATH))
                logger.info(f"✅ XGBoost model loaded: {XGBOOST_MODEL_PATH}")
                self.model_version = "1.0.0-xgb"
                self._feature_importance_base = dict(
                    zip(FEATURE_COLUMNS, self.model.feature_importances_)
                )
                return
            except Exception as e:
                logger.warning(f"XGBoost load failed: {e}")
        
        # Calibrated model
        calibrated_path = MODEL_DIR / "calibrated_model.pkl"
        if calibrated_path.exists():
            try:
                with open(calibrated_path, "rb") as f:
                    self.model = pickle.load(f)
                logger.info(f"✅ Calibrated model loaded")
                self.model_version = "1.0.0-calibrated"
                base = getattr(self.model, "_base_model", None)
                if base and hasattr(base, "feature_importances_"):
                    self._feature_importance_base = dict(
                        zip(FEATURE_COLUMNS, base.feature_importances_)
                    )
                return
            except Exception as e:
                logger.warning(f"Calibrated model load failed: {e}")
        
        # Demo mode
        logger.warning("⚠️ No trained model found. Running in DEMO mode.")
        logger.info("  Train a model with: python train_model.py --data data/training_data.csv")
    
    def _load_feature_importance(self):
        """Load base feature importance from evaluation results."""
        eval_path = MODEL_DIR / "eval_results.json"
        if eval_path.exists():
            with open(eval_path) as f:
                results = json.load(f)
                self._feature_importance_base = results.get("feature_importance", {})
    
    @property
    def is_production_ready(self) -> bool:
        """Check if a trained model is available."""
        return self.onnx_session is not None or self.model is not None
    
    def predict(
        self,
        input_data: Dict[str, float],
        shipment_id: str = "UNKNOWN",
        use_cache: bool = True
    ) -> PredictionResult:
        """
        Generate risk prediction for a single shipment.
        
        Args:
            input_data: Dict with feature values (0-10 scale)
            shipment_id: Tracking identifier
            use_cache: Whether to check/update cache
            
        Returns:
            PredictionResult with full explainability data
        """
        start_time = time.time()
        
        # Cache lookup
        cache_key = self._compute_cache_key(input_data)
        if use_cache and cache_key in self.cache:
            cached = self.cache[cache_key]
            cached.prediction_latency_ms = round((time.time() - start_time) * 1000, 2)
            cached.shipment_id = shipment_id
            logger.debug(f"Cache hit for {shipment_id}")
            return cached
        
        # Route to appropriate engine
        if DEMO_MODE and not self.is_production_ready:
            result = self._predict_demo(input_data, shipment_id)
        else:
            result = self._predict_production(input_data, shipment_id)
        
        result.prediction_latency_ms = round((time.time() - start_time) * 1000, 2)
        
        # Cache result
        if use_cache:
            self.cache[cache_key] = result
        
        logger.info(
            f"Prediction: {shipment_id} → {result.disruption_probability:.1f}% "
            f"({result.risk_level}) in {result.prediction_latency_ms}ms"
        )
        
        return result
    
    def predict_batch(
        self,
        batch_data: List[Dict[str, Any]],
    ) -> List[PredictionResult]:
        """
        Batch prediction for multiple shipments.
        
        Optimized for throughput with vectorized ONNX inference.
        """
        results = []
        
        if self.onnx_session and len(batch_data) > 1:
            # Vectorized ONNX inference
            features_list = []
            for item in batch_data:
                features = item.get("features", item)
                feat_array = self.feature_engineer.transform_single(features)
                features_list.append(feat_array[0])
            
            batch_features = np.array(features_list, dtype=np.float32)
            
            input_name = self.onnx_session.get_inputs()[0].name
            output = self.onnx_session.run(None, {input_name: batch_features})
            probabilities = output[1][:, 1]  # probability of disruption
            
            for i, item in enumerate(batch_data):
                prob = float(probabilities[i])
                sid = item.get("shipment_id", f"BATCH-{i:04d}")
                features = item.get("features", item)
                result = self._build_result(
                    probability=prob,
                    input_data=features,
                    shipment_id=sid,
                    mode="production"
                )
                results.append(result)
        else:
            # Fallback to individual predictions
            for item in batch_data:
                features = item.get("features", item)
                sid = item.get("shipment_id", f"BATCH-{len(results):04d}")
                result = self.predict(features, shipment_id=sid, use_cache=False)
                results.append(result)
        
        return results
    
    def _predict_production(
        self, input_data: Dict[str, float], shipment_id: str
    ) -> PredictionResult:
        """Production prediction using ONNX or XGBoost."""
        
        features = self.feature_engineer.transform_single(input_data)
        
        if self.onnx_session:
            # ONNX inference (fastest)
            features_float = features.astype(np.float32)
            input_name = self.onnx_session.get_inputs()[0].name
            output = self.onnx_session.run(None, {input_name: features_float})
            probability = float(output[1][0][1])  # P(disrupted)
        elif self.model:
            # XGBoost fallback
            probability = float(self.model.predict_proba(features)[0][1])
        else:
            return self._predict_demo(input_data, shipment_id)
        
        return self._build_result(probability, input_data, shipment_id, "production")
    
    def _predict_demo(
        self, input_data: Dict[str, float], shipment_id: str
    ) -> PredictionResult:
        """
        Demo prediction with realistic synthetic results.
        
        Uses a weighted formula that mimics trained model behavior
        for demonstration purposes without a trained model.
        """
        # Compute weighted risk score
        weights = {
            "weather_severity": 0.20,
            "geopolitical_risk": 0.18,
            "port_congestion": 0.15,
            "historical_disruptions": 0.12,
            "carrier_reliability": 0.10,
            "supplier_risk_score": 0.08,
            "route_complexity": 0.07,
            "lead_time_variance": 0.05,
            "customs_complexity": 0.03,
            "seasonal_demand": 0.02,
        }
        
        score = 0
        for feature, weight in weights.items():
            value = float(input_data.get(feature, 5.0))
            score += value * weight
        
        # Normalize to probability (0-1)
        probability = min(max(score / 10, 0.01), 0.99)
        
        # Add slight randomness for realism
        rng = np.random.RandomState(hash(shipment_id) % 2**31)
        probability = np.clip(probability + rng.normal(0, 0.03), 0.01, 0.99)
        
        return self._build_result(probability, input_data, shipment_id, "demo")
    
    def _build_result(
        self,
        probability: float,
        input_data: Dict[str, float],
        shipment_id: str,
        mode: str
    ) -> PredictionResult:
        """Build a complete PredictionResult with explainability."""
        
        # Risk classification
        risk_level, risk_color = self._classify_risk(probability)
        
        # Confidence score (based on feature completeness + model certainty)
        confidence = self._compute_confidence(probability, input_data)
        
        # Feature importance breakdown
        feature_importance = self._compute_feature_importance(input_data)
        
        # Top risk factors (human-readable)
        top_factors = self._extract_top_factors(input_data, feature_importance)
        
        # Estimated delay
        delay = self._estimate_delay(probability, input_data)
        
        # Natural language explanation
        explanation = self._generate_explanation(
            probability, risk_level, top_factors, delay
        )
        
        return PredictionResult(
            shipment_id=shipment_id,
            disruption_probability=round(probability * 100, 2),
            risk_level=risk_level,
            risk_color=risk_color,
            confidence_score=round(confidence, 2),
            feature_importance=feature_importance,
            top_risk_factors=top_factors,
            estimated_delay_days=round(delay, 1),
            model_version=self.model_version,
            prediction_latency_ms=0,  # Set later
            mode=mode,
            explanation=explanation,
        )
    
    def _classify_risk(self, probability: float) -> tuple:
        """Map probability to risk level and color."""
        if probability < RISK_THRESHOLDS["low"]:
            return "low", "#22c55e"     # green
        elif probability < RISK_THRESHOLDS["medium"]:
            return "medium", "#eab308"  # yellow
        else:
            return "high", "#ef4444"    # red
    
    def _compute_confidence(
        self, probability: float, input_data: Dict[str, float]
    ) -> float:
        """
        Compute prediction confidence (0-100).
        
        High confidence when:
        - Model is certain (probability near 0 or 1)
        - All features are provided (not defaults)
        - Feature values are in normal range
        """
        # Certainty component (how far from 50%)
        certainty = abs(probability - 0.5) * 2  # 0-1 scale
        
        # Completeness component
        provided_features = sum(
            1 for col in FEATURE_COLUMNS
            if col in input_data and input_data[col] is not None
        )
        completeness = provided_features / len(FEATURE_COLUMNS)
        
        # Combined confidence
        confidence = (0.6 * certainty + 0.4 * completeness) * 100
        
        return min(max(confidence, 15), 98)  # Floor 15%, cap 98%
    
    def _compute_feature_importance(
        self, input_data: Dict[str, float]
    ) -> List[Dict]:
        """
        Compute per-feature importance with actual values.
        
        Returns chart-ready data for the frontend bar chart.
        """
        importance_list = []
        
        # Use trained model importance if available, otherwise use defaults
        base_importance = self._feature_importance_base or {
            "weather_severity": 0.18,
            "geopolitical_risk": 0.16,
            "port_congestion": 0.14,
            "historical_disruptions": 0.12,
            "carrier_reliability": 0.10,
            "supplier_risk_score": 0.08,
            "route_complexity": 0.07,
            "lead_time_variance": 0.06,
            "customs_complexity": 0.05,
            "seasonal_demand": 0.04,
        }
        
        # Normalize importance values
        total_imp = sum(base_importance.values()) or 1
        
        for feature in FEATURE_COLUMNS:
            value = float(input_data.get(feature, 5.0))
            raw_importance = base_importance.get(feature, 0.05)
            normalized_importance = raw_importance / total_imp
            
            # Contribution = importance × normalized value
            contribution = normalized_importance * (value / 10)
            
            importance_list.append({
                "name": feature,
                "display_name": FEATURE_DISPLAY_NAMES.get(feature, feature),
                "value": round(value, 2),
                "importance": round(normalized_importance * 100, 2),
                "contribution": round(contribution * 100, 2),
            })
        
        # Sort by contribution descending
        importance_list.sort(key=lambda x: x["contribution"], reverse=True)
        
        return importance_list
    
    def _extract_top_factors(
        self,
        input_data: Dict[str, float],
        feature_importance: List[Dict]
    ) -> List[str]:
        """Generate human-readable risk factor descriptions."""
        
        factors = []
        severity_labels = {
            (0, 3): "low",
            (3, 6): "moderate",
            (6, 8): "high",
            (8, 11): "critical",
        }
        
        def get_severity(value):
            for (low, high), label in severity_labels.items():
                if low <= value < high:
                    return label
            return "unknown"
        
        for feat in feature_importance[:4]:  # Top 4
            value = feat["value"]
            if value >= 5:  # Only report elevated factors
                severity = get_severity(value)
                display = feat["display_name"]
                factors.append(f"{severity.capitalize()} {display} ({value:.1f}/10)")
        
        if not factors:
            factors.append("No significant risk factors detected")
        
        return factors
    
    def _estimate_delay(
        self, probability: float, input_data: Dict[str, float]
    ) -> float:
        """Estimate days of delay based on risk probability and factors."""
        
        if probability < 0.2:
            return 0.0
        
        # Base delay from probability
        base_delay = probability * 14  # Max ~14 days at 100% risk
        
        # Modifiers
        weather = input_data.get("weather_severity", 5)
        port = input_data.get("port_congestion", 5)
        
        modifier = 1.0
        if weather > 7:
            modifier += 0.3  # Severe weather adds delay
        if port > 7:
            modifier += 0.2  # Heavy congestion adds delay
        
        return min(base_delay * modifier, 21)  # Cap at 21 days
    
    def _generate_explanation(
        self,
        probability: float,
        risk_level: str,
        top_factors: List[str],
        delay: float
    ) -> str:
        """Generate natural language explanation of the prediction."""
        
        pct = round(probability * 100, 1)
        
        if risk_level == "low":
            prefix = f"This shipment has a low risk of disruption ({pct}%)."
            action = "No immediate action required. Continue standard monitoring."
        elif risk_level == "medium":
            prefix = f"This shipment faces moderate disruption risk ({pct}%)."
            action = "Consider activating contingency plans and monitoring closely."
        else:
            prefix = f"⚠️ HIGH RISK: This shipment has a {pct}% probability of disruption."
            action = "Immediate intervention recommended. Activate backup routes or suppliers."
        
        factors_str = ", ".join(top_factors[:3]) if top_factors else "general market conditions"
        
        explanation = f"{prefix} Key drivers: {factors_str}."
        
        if delay > 0:
            explanation += f" Estimated delay: {delay:.1f} days."
        
        explanation += f" {action}"
        
        return explanation
    
    def _compute_cache_key(self, input_data: Dict[str, float]) -> str:
        """Compute deterministic cache key from input features."""
        sorted_items = sorted(input_data.items())
        key_str = json.dumps(sorted_items)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get_model_info(self) -> Dict:
        """Return model metadata for API consumers."""
        return {
            "version": self.model_version,
            "is_production": self.is_production_ready,
            "mode": "production" if self.is_production_ready else "demo",
            "features": FEATURE_COLUMNS,
            "feature_display_names": FEATURE_DISPLAY_NAMES,
            "risk_thresholds": RISK_THRESHOLDS,
            "cache_ttl": PREDICTION_CACHE_TTL,
            "cache_size": len(self.cache),
        }
    
    def to_dict(self, result: PredictionResult) -> Dict:
        """Convert PredictionResult to JSON-serializable dict."""
        return asdict(result)
