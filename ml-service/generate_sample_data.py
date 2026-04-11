"""
DrishtiFlow — Sample Training Data Generator
=============================================
Generates realistic synthetic supply chain disruption data
for training the XGBoost risk prediction model.

The data simulates real-world correlations:
- Bad weather + complex routes → higher disruption probability
- Reliable carriers + low congestion → lower risk
- Geopolitical instability compounding with seasonal demand

Usage:
    python generate_sample_data.py --samples 10000 --output data/training_data.csv
"""

import argparse
import numpy as np
import pandas as pd
from pathlib import Path


def generate_supply_chain_data(n_samples: int = 10000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic supply chain data with realistic correlations.
    
    Each row represents a shipment with 10 risk features and a binary
    disruption label (1 = disrupted, 0 = on-time).
    """
    rng = np.random.RandomState(seed)
    
    # ── Base Feature Generation ────────────────────────
    # Generate features on 0-10 scale with realistic distributions
    
    # Weather severity: skewed right (most days are fine)
    weather_severity = np.clip(rng.exponential(2.5, n_samples), 0, 10)
    
    # Geopolitical risk: mostly low, occasional spikes
    geopolitical_risk = np.clip(rng.beta(2, 5, n_samples) * 10, 0, 10)
    
    # Route complexity: roughly normal
    route_complexity = np.clip(rng.normal(5, 2, n_samples), 0, 10)
    
    # Carrier reliability: most carriers are decent (inverted: high = unreliable)
    carrier_reliability = np.clip(rng.beta(3, 2, n_samples) * 10, 0, 10)
    
    # Port congestion: seasonal patterns
    port_congestion = np.clip(rng.gamma(3, 1.5, n_samples), 0, 10)
    
    # Seasonal demand: bimodal (peak seasons)
    seasonal_demand = np.clip(
        np.where(
            rng.random(n_samples) > 0.6,
            rng.normal(7, 1.5, n_samples),          # peak season
            rng.normal(3, 1.5, n_samples)            # off-peak
        ), 0, 10
    )
    
    # Lead time variance
    lead_time_variance = np.clip(rng.normal(4, 2, n_samples), 0, 10)
    
    # Supplier risk score
    supplier_risk_score = np.clip(rng.beta(2, 4, n_samples) * 10, 0, 10)
    
    # Customs complexity
    customs_complexity = np.clip(rng.normal(4.5, 2.5, n_samples), 0, 10)
    
    # Historical disruptions on route
    historical_disruptions = np.clip(rng.exponential(2, n_samples), 0, 10)
    
    # ── Generate Target Variable ───────────────────────
    # Realistic disruption probability using weighted features
    
    logit = (
        0.35 * weather_severity +
        0.30 * geopolitical_risk +
        0.15 * route_complexity +
        0.20 * carrier_reliability +
        0.25 * port_congestion +
        0.10 * seasonal_demand +
        0.15 * lead_time_variance +
        0.20 * supplier_risk_score +
        0.10 * customs_complexity +
        0.25 * historical_disruptions +
        # Interaction terms (compound risks)
        0.08 * weather_severity * route_complexity / 10 +
        0.05 * geopolitical_risk * supplier_risk_score / 10 +
        0.06 * port_congestion * seasonal_demand / 10 +
        # Noise
        rng.normal(0, 0.8, n_samples)
        - 4.5  # offset to center disruption rate around 25-30%
    )
    
    # Convert to probability
    disruption_probability = 1 / (1 + np.exp(-logit))
    
    # Binary label
    disrupted = (rng.random(n_samples) < disruption_probability).astype(int)
    
    # ── Build DataFrame ────────────────────────────────
    df = pd.DataFrame({
        "shipment_id": [f"SHP-{i:06d}" for i in range(n_samples)],
        "weather_severity": np.round(weather_severity, 2),
        "geopolitical_risk": np.round(geopolitical_risk, 2),
        "route_complexity": np.round(route_complexity, 2),
        "carrier_reliability": np.round(carrier_reliability, 2),
        "port_congestion": np.round(port_congestion, 2),
        "seasonal_demand": np.round(seasonal_demand, 2),
        "lead_time_variance": np.round(lead_time_variance, 2),
        "supplier_risk_score": np.round(supplier_risk_score, 2),
        "customs_complexity": np.round(customs_complexity, 2),
        "historical_disruptions": np.round(historical_disruptions, 2),
        "disrupted": disrupted,
    })
    
    # ── Add Metadata Columns ───────────────────────────
    origins = ["Shanghai", "Shenzhen", "Singapore", "Rotterdam", "Mumbai", 
               "Busan", "Hamburg", "Los Angeles", "Dubai", "Tokyo"]
    destinations = ["New York", "London", "Sydney", "São Paulo", "Lagos",
                    "Toronto", "Frankfurt", "Mexico City", "Nairobi", "Bangkok"]
    carriers = ["MaerskLine", "MSC", "CMA-CGM", "COSCO", "Hapag-Lloyd",
                "Evergreen", "ONE", "YangMing", "ZIM", "HMM"]
    
    df["origin"] = rng.choice(origins, n_samples)
    df["destination"] = rng.choice(destinations, n_samples)
    df["carrier"] = rng.choice(carriers, n_samples)
    df["shipment_value_usd"] = np.round(rng.lognormal(10, 1.5, n_samples), 2)
    df["transit_days_expected"] = rng.randint(5, 45, n_samples)
    
    return df


def main():
    parser = argparse.ArgumentParser(description="Generate sample supply chain data")
    parser.add_argument("--samples", type=int, default=10000, help="Number of samples")
    parser.add_argument("--output", type=str, default="data/training_data.csv", help="Output path")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()
    
    output_path = Path(__file__).parent / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"🏭 Generating {args.samples} synthetic supply chain records...")
    df = generate_supply_chain_data(n_samples=args.samples, seed=args.seed)
    
    df.to_csv(output_path, index=False)
    
    # Print statistics
    disruption_rate = df["disrupted"].mean() * 100
    print(f"✅ Data saved to: {output_path}")
    print(f"📊 Total records: {len(df)}")
    print(f"⚠️  Disruption rate: {disruption_rate:.1f}%")
    print(f"\n📋 Feature Statistics:")
    print(df.describe().round(2).to_string())
    
    # Print sample
    print(f"\n🔍 Sample Records:")
    print(df.head(3).to_string())


if __name__ == "__main__":
    main()
