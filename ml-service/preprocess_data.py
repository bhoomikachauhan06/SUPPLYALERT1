import pandas as pd
import numpy as np
from pathlib import Path
from loguru import logger

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
INPUT_CSV = DATA_DIR / "global_supply_chain_risk_2026.csv"
OUTPUT_CSV = DATA_DIR / "training_data.csv"

def preprocess():
    logger.info(f"🚀 Starting preprocessing of {INPUT_CSV}")
    
    if not INPUT_CSV.exists():
        logger.error(f"File not found: {INPUT_CSV}")
        return

    df = pd.read_csv(INPUT_CSV)
    
    # 1. Weather Severity Mapping
    weather_map = {
        "Clear": 0,
        "Fog": 3,
        "Rain": 5,
        "Storm": 8,
        "Hurricane": 10
    }
    df["weather_severity"] = df["Weather_Condition"].map(weather_map).fillna(5)
    
    # 2. Geopolitical Risk (already 0-10)
    df["geopolitical_risk"] = df["Geopolitical_Risk_Score"]
    
    # 3. Route Complexity (Normalized Distance)
    # Scaled to 0-10 based on max distance (~15000km)
    df["route_complexity"] = (df["Distance_km"] / 1500).clip(0, 10)
    
    # 4. Carrier Reliability (Inverted risk score)
    # Reliability 0.9 -> Risk 1.0 (on 0-10 scale)
    # Reliability 0.5 -> Risk 5.0
    df["carrier_reliability"] = (1 - df["Carrier_Reliability_Score"]) * 10
    
    # 5. Seasonal Demand (Derived from Month)
    # Simple peak season logic: Nov/Dec and Q3 are higher demand
    df["Date"] = pd.to_datetime(df["Date"])
    df["month"] = df["Date"].dt.month
    df["seasonal_demand"] = df["month"].map({
        11: 8, 12: 10, 10: 7, 9: 6, 8: 6, 7: 5
    }).fillna(4)
    
    # 6. Target Variable
    df["disrupted"] = df["Disruption_Occurred"]
    
    # 7. Fill other required columns with defaults
    df["port_congestion"] = np.random.uniform(2, 6, size=len(df))
    df["lead_time_variance"] = np.random.uniform(1, 5, size=len(df))
    df["supplier_risk_score"] = np.random.uniform(2, 5, size=len(df))
    df["customs_complexity"] = np.random.uniform(3, 7, size=len(df))
    df["historical_disruptions"] = np.random.uniform(1, 4, size=len(df))
    
    # Keep only the columns needed by FeatureEngineer
    feature_cols = [
        "weather_severity", "geopolitical_risk", "route_complexity",
        "carrier_reliability", "port_congestion", "seasonal_demand",
        "lead_time_variance", "supplier_risk_score", "customs_complexity",
        "historical_disruptions", "disrupted"
    ]
    
    processed_df = df[feature_cols]
    
    # Save processed CSV
    processed_df.to_csv(OUTPUT_CSV, index=False)
    logger.info(f"✅ Preprocessing complete. Saved to {OUTPUT_CSV}")
    logger.info(f"📊 Features used: {feature_cols[:-1]}")
    logger.info(f"📉 Disruption rate: {processed_df['disrupted'].mean():.2%}")

if __name__ == "__main__":
    preprocess()
