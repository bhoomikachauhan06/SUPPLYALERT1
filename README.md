# DrishtiFlow — Prediction Engine

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐      │
│  │ Dashboard    │  │ Simulator    │  │ UI Components │      │
│  │ Components   │  │ Panel        │  │               │      │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘      │
│         │                │                   │               │
└─────────┼────────────────┼───────────────────┼───────────────┘
          │                │                   │ HTTP (JSON) / WebSockets
┌─────────▼────────────────▼───────────────────▼──────────────┐
│                  Node.js Express Backend                      │
│  ┌────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Auth &      │  │ Shipment &       │  │ Prediction      │  │
│  │ Users       │  │ Simulation       │  │ Controller      │  │
│  └─────┬──────┘  └────────┬─────────┘  └────────┬────────┘  │
│        │                  │                      │           │
└────────┼──────────────────┼──────────────────────┼───────────┘
         │                  │                      │ HTTP (JSON)
┌────────┼──────────────────┼──────────────────────▼──────────┐
│        │                  │         Python ML Microservice  │
│        │                  │        ┌─────────────────────┐  │
│        │                  │        │ FastAPI Core        │  │
│        │                  │        │ (ONNX / XGBoost)    │  │
│        │                  │        └─────────────────────┘  │
└────────┼──────────────────┼─────────────────────────────────┘
         │                  │
    ┌────▼──────────────────▼──┐
    │ Firebase / Prisma DB     │
    │ (Firestore, Storage)     │
    └──────────────────────────┘
```

## Quick Start

### 1. Generate Training Data

```bash
cd ml-service
pip install -r requirements.txt
python generate_sample_data.py --samples 15000
```

This creates `data/training_data.csv` with 15,000 synthetic supply chain records featuring:
- 10 risk features (weather, geopolitical, port congestion, etc.)
- Binary disruption labels with ~27% disruption rate
- Realistic feature correlations and interaction effects

### 2. Train the XGBoost Model

```bash
python train_model.py --data data/training_data.csv --export-onnx
```

This will:
- ✅ Train an XGBoost classifier with probability calibration
- ✅ Evaluate on held-out test set (AUC-ROC, F1, precision, recall)
- ✅ Export to both native XGBoost (`.json`) and ONNX (`.onnx`) formats
- ✅ Save feature scaler and importance rankings
- ✅ Generate evaluation report

Expected output:
```
📊 MODEL EVALUATION RESULTS
     accuracy: 0.8234
    precision: 0.7891
       recall: 0.7456
     f1_score: 0.7667
      roc_auc: 0.8912
```

### 3. Start the ML Service

```bash
python main.py
# or
uvicorn main:app --reload --port 8000
```

API documentation: http://localhost:8000/docs

### 4. Start the Next.js Frontend

```bash
cd ../frontend
npm run dev
```

The frontend will:
1. Try to connect to the Python ML service at `http://localhost:8000`
2. If unavailable, automatically fall back to **demo mode** (client-side predictions)

## API Endpoints

### `POST /api/predict` — Single Prediction

```json
// Request
{
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
    "historical_disruptions": 5.0
  }
}

// Response
{
  "success": true,
  "data": {
    "shipment_id": "SHP-001234",
    "disruption_probability": 62.4,
    "risk_level": "high",
    "risk_color": "#ef4444",
    "confidence_score": 78.5,
    "feature_importance": [
      {"name": "port_congestion", "display_name": "Port Congestion", "value": 8.0, "importance": 15.2, "contribution": 12.16},
      {"name": "weather_severity", "display_name": "Weather Severity", "value": 7.5, "importance": 20.1, "contribution": 15.08}
    ],
    "top_risk_factors": [
      "High Port Congestion (8.0/10)",
      "High Weather Severity (7.5/10)"
    ],
    "estimated_delay_days": 10.2,
    "model_version": "1.0.0-onnx",
    "prediction_latency_ms": 2.34,
    "mode": "production",
    "explanation": "⚠️ HIGH RISK (62.4%). Key drivers: High Port Congestion, High Weather Severity. Estimated delay: 10.2 days. Immediate intervention recommended."
  }
}
```

### `POST /api/predict/batch` — Batch Prediction

```json
{
  "shipments": [
    {"shipment_id": "SHP-001", "features": {...}},
    {"shipment_id": "SHP-002", "features": {...}}
  ]
}
```

### `POST /api/predict/csv` — CSV Upload Prediction

Upload a CSV file with `multipart/form-data`. Flexible column mapping supported.

### `POST /api/simulate` — What-If Simulation (Next.js)

```json
{
  "scenario_type": "cyclone",
  "severity": 8,
  "affected_region": "South China Sea",
  "duration_days": 5,
  "base_features": {...}
}
```

## Feature Reference

| Feature | Range | Description |
|---------|-------|-------------|
| `weather_severity` | 0-10 | Severity of weather conditions along route |
| `geopolitical_risk` | 0-10 | Political instability index of regions |
| `route_complexity` | 0-10 | Number of transshipment points, distance |
| `carrier_reliability` | 0-10 | Historical carrier performance (high = unreliable) |
| `port_congestion` | 0-10 | Current congestion at ports |
| `seasonal_demand` | 0-10 | Demand surge indicator |
| `lead_time_variance` | 0-10 | Historical variance in lead times |
| `supplier_risk_score` | 0-10 | Supplier financial health (high = risky) |
| `customs_complexity` | 0-10 | Regulatory/customs difficulty |
| `historical_disruptions` | 0-10 | Past disruption frequency on route |

## Model Update Guide

### Retraining with New Data

1. Collect new shipment outcome data (CSV with same feature columns + `disrupted` label)
2. Generate combined dataset or use new data:
   ```bash
   python train_model.py --data data/new_data.csv --export-onnx
   ```
3. Restart the ML service to load the new model

### Using Real Data (Kaggle)

Recommended datasets:
- [Supply Chain Shipment Dataset](https://www.kaggle.com/datasets/laurinbrechter/supply-chain-data)
- [DataCo Supply Chain Dataset](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis)

Map your dataset columns to the 10 features using `FeatureEngineer.from_csv_upload()` for automatic column mapping.

## File Structure

```
DrishtiFlow/
├── ml-service/                          # Python ML Microservice
│   ├── config.py                        # Configuration & feature definitions
│   ├── generate_sample_data.py          # Synthetic data generator
│   ├── feature_engineering.py           # Feature pipeline
│   ├── train_model.py                   # XGBoost training + ONNX export
│   ├── prediction_engine.py             # Core inference engine
│   ├── main.py                          # FastAPI server
│   ├── requirements.txt                 # Python dependencies
│   ├── .env                             # Environment config
│   ├── models/                          # Saved models (auto-created)
│   │   ├── risk_model.json              # XGBoost native
│   │   ├── risk_model.onnx              # ONNX optimized
│   │   ├── feature_scaler.pkl           # Fitted scaler
│   │   └── eval_results.json            # Evaluation metrics
│   └── data/                            # Training data (auto-created)
│       └── training_data.csv
│
├── backend/                             # Node.js Express Backend
│   ├── config/                          # Firebase and App Config
│   ├── controllers/                     # Route Handlers
│   ├── middlewares/                     # Auth, Validation, Error Handling
│   ├── routes/                          # Express Rotues
│   ├── services/                        # Business Logic
│   ├── sockets/                         # WebSocket Handlers
│   ├── package.json
│   └── server.js                        # Main Entry Point
│
├── frontend/                            # Next.js 15 Frontend
│   ├── src/
│   │   ├── app/
│   │   │   └── api/
│   │   │       ├── predict/route.ts     # Prediction API route
│   │   │       └── simulate/route.ts    # Simulation API route
│   │   ├── services/
│   │   │   └── riskScoring.service.ts   # Service layer (singleton)
│   │   └── types/
│   │       └── prediction.ts            # TypeScript type definitions
│   └── prisma/
│       └── schema.prisma                # Database schema
│
└── CLAUDE.md                            # Architecture blueprint
```
