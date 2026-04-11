"""
DrishtiFlow — Feature Engineering Pipeline
==========================================
Transforms raw shipment data + live signals into model-ready features.

Follows the ORCHESTRATION layer's RISK_ENGINE specification:
- Normalize all features to 0-10 scale
- Handle missing values with domain-aware defaults  
- Add derived interaction features
- Support both batch (training) and single-row (inference) modes
"""

import numpy as np
import pandas as pd
import pickle
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from sklearn.preprocessing import MinMaxScaler
from loguru import logger

from config import FEATURE_COLUMNS, FEATURE_SCALER_PATH


class FeatureEngineer:
    """
    Feature engineering pipeline for supply chain risk prediction.
    
    Handles:
    1. Raw CSV data → normalized features
    2. Live signal injection (weather API, geopolitical feeds)
    3. Derived interaction features
    4. Missing value imputation with domain defaults
    """
    
    # Domain-aware defaults when data is missing
    DEFAULT_VALUES = {
        "weather_severity": 3.0,       # Assume moderate weather
        "geopolitical_risk": 2.0,      # Assume stable region
        "route_complexity": 5.0,       # Assume average route
        "carrier_reliability": 4.0,    # Assume average carrier
        "port_congestion": 4.0,       # Assume moderate congestion
        "seasonal_demand": 5.0,        # Assume normal demand
        "lead_time_variance": 3.0,     # Assume low variance
        "supplier_risk_score": 3.0,    # Assume healthy supplier
        "customs_complexity": 4.0,     # Assume moderate customs
        "historical_disruptions": 2.0, # Assume few past issues
    }
    
    def __init__(self):
        self.scaler: Optional[MinMaxScaler] = None
        self.is_fitted = False
        self._load_scaler()
    
    def _load_scaler(self):
        """Load pre-fitted scaler if available."""
        if FEATURE_SCALER_PATH.exists():
            try:
                with open(FEATURE_SCALER_PATH, "rb") as f:
                    self.scaler = pickle.load(f)
                self.is_fitted = True
                logger.info("Loaded pre-fitted feature scaler")
            except Exception as e:
                logger.warning(f"Could not load scaler: {e}")
    
    def save_scaler(self):
        """Persist the fitted scaler."""
        if self.scaler is not None:
            with open(FEATURE_SCALER_PATH, "wb") as f:
                pickle.dump(self.scaler, f)
            logger.info(f"Scaler saved to {FEATURE_SCALER_PATH}")
    
    def fit(self, df: pd.DataFrame) -> "FeatureEngineer":
        """
        Fit the feature pipeline on training data.
        
        Args:
            df: Training DataFrame with raw feature columns
            
        Returns:
            self for chaining
        """
        features = self._extract_base_features(df)
        
        self.scaler = MinMaxScaler(feature_range=(0, 10))
        self.scaler.fit(features)
        self.is_fitted = True
        self.save_scaler()
        
        logger.info(f"Feature pipeline fitted on {len(df)} samples")
        return self
    
    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transform raw data into model-ready features.
        
        Args:
            df: DataFrame with feature columns (can have missing values)
            
        Returns:
            numpy array of shape (n_samples, n_features) scaled to 0-10
        """
        features = self._extract_base_features(df)
        
        if self.is_fitted and self.scaler is not None:
            features_scaled = self.scaler.transform(features)
        else:
            # If no scaler, clip to 0-10 range
            features_scaled = np.clip(features, 0, 10)
            logger.warning("Using raw features (no scaler fitted)")
        
        return features_scaled
    
    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fit and transform in one step."""
        self.fit(df)
        return self.transform(df)
    
    def transform_single(self, input_data: Dict[str, float]) -> np.ndarray:
        """
        Transform a single prediction request into model-ready features.
        
        Args:
            input_data: Dict with feature names as keys and values as floats.
                       Missing features will be filled with domain defaults.
                       
        Returns:
            numpy array of shape (1, n_features)
        """
        # Fill missing values with domain defaults
        complete_data = {}
        for col in FEATURE_COLUMNS:
            value = input_data.get(col, self.DEFAULT_VALUES.get(col, 5.0))
            complete_data[col] = float(value)
        
        df = pd.DataFrame([complete_data])
        return self.transform(df)
    
    def _extract_base_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Extract and impute base features from DataFrame.
        
        Handles graceful fallback for missing columns.
        """
        features = pd.DataFrame()
        
        for col in FEATURE_COLUMNS:
            if col in df.columns:
                features[col] = pd.to_numeric(df[col], errors="coerce")
                features[col] = features[col].fillna(self.DEFAULT_VALUES.get(col, 5.0))
            else:
                features[col] = self.DEFAULT_VALUES.get(col, 5.0)
                logger.debug(f"Column '{col}' not found, using default: {self.DEFAULT_VALUES.get(col, 5.0)}")
        
        # Clip all values to reasonable range
        features = features.clip(0, 10)
        
        return features.values
    
    @staticmethod
    def from_csv_upload(csv_content: str) -> Tuple[pd.DataFrame, List[str]]:
        """
        Parse a user-uploaded CSV and map columns to features.
        
        Returns:
            Tuple of (processed DataFrame, list of unmapped columns)
        """
        from io import StringIO
        df = pd.read_csv(StringIO(csv_content))
        
        # Column name mapping (flexible input handling)
        column_aliases = {
            "weather_severity": ["weather", "weather_score", "weather_risk", "weather_index"],
            "geopolitical_risk": ["geopolitical", "geo_risk", "political_risk", "geo_score"],
            "route_complexity": ["route_risk", "route_score", "route_difficulty", "transit_complexity"],
            "carrier_reliability": ["carrier_risk", "carrier_score", "carrier_performance"],
            "port_congestion": ["port_risk", "port_delay", "port_score", "congestion"],
            "seasonal_demand": ["demand", "demand_index", "demand_score", "peak_season"],
            "lead_time_variance": ["lead_time", "lt_variance", "delivery_variance"],
            "supplier_risk_score": ["supplier_risk", "vendor_risk", "supplier_score"],
            "customs_complexity": ["customs", "customs_risk", "regulatory_risk"],
            "historical_disruptions": ["past_disruptions", "disruption_history", "hist_risk"],
        }
        
        # Try to map columns
        mapped = set()
        for target_col, aliases in column_aliases.items():
            if target_col in df.columns:
                mapped.add(target_col)
                continue
            for alias in aliases:
                if alias in df.columns:
                    df = df.rename(columns={alias: target_col})
                    mapped.add(target_col)
                    break
        
        unmapped = [col for col in FEATURE_COLUMNS if col not in mapped]
        
        return df, unmapped
    
    @staticmethod
    def inject_live_signals(
        base_features: Dict[str, float],
        weather_data: Optional[Dict] = None,
        geopolitical_data: Optional[Dict] = None,
        port_data: Optional[Dict] = None,
    ) -> Dict[str, float]:
        """
        Overlay live signal data onto base features.
        
        This enriches user-provided data with real-time intelligence.
        When live data is available, it overrides or blends with base values.
        """
        enriched = dict(base_features)
        
        if weather_data:
            # Map weather API response to severity score
            severity_map = {
                "clear": 1.0, "clouds": 2.0, "rain": 5.0,
                "snow": 7.0, "thunderstorm": 8.0, "hurricane": 10.0,
                "typhoon": 10.0, "cyclone": 9.5,
            }
            condition = weather_data.get("condition", "").lower()
            if condition in severity_map:
                enriched["weather_severity"] = severity_map[condition]
            
            # Wind speed contribution
            wind_speed = weather_data.get("wind_speed_kmh", 0)
            if wind_speed > 80:
                enriched["weather_severity"] = max(
                    enriched.get("weather_severity", 0),
                    min(wind_speed / 15, 10)
                )
        
        if geopolitical_data:
            risk_level = geopolitical_data.get("risk_level", 0)
            enriched["geopolitical_risk"] = min(float(risk_level), 10)
        
        if port_data:
            congestion = port_data.get("congestion_index", 0)
            enriched["port_congestion"] = min(float(congestion), 10)
        
        return enriched
