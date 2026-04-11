"""
DrishtiFlow — XGBoost Model Training & ONNX Export
===================================================
Trains the supply chain disruption prediction model and exports
it to ONNX format for fast, portable inference.

Follows CLAUDE.md architecture:
- ORCHESTRATION.RISK_ENGINE: Feature importance, confidence scoring
- EXECUTION layer: Model training, evaluation, export

Usage:
    # Step 1: Generate training data
    python generate_sample_data.py --samples 15000

    # Step 2: Train and export model
    python train_model.py --data data/training_data.csv --export-onnx

    # Step 3: Evaluate model
    python train_model.py --data data/training_data.csv --evaluate-only
"""

import argparse
import json
import time
import numpy as np
import pandas as pd
import pickle
from pathlib import Path
from typing import Dict, Tuple

import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix
)
from sklearn.calibration import CalibratedClassifierCV
from loguru import logger

from config import (
    FEATURE_COLUMNS, MODEL_PARAMS, XGBOOST_MODEL_PATH,
    ONNX_MODEL_PATH, FEATURE_NAMES_PATH, MODEL_DIR
)
from feature_engineering import FeatureEngineer


def load_and_prepare_data(
    data_path: str,
    test_size: float = 0.2,
    seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, FeatureEngineer]:
    """
    Load CSV data and prepare train/test split with feature engineering.
    
    Returns:
        X_train, X_test, y_train, y_test, fitted FeatureEngineer
    """
    logger.info(f"Loading data from {data_path}")
    df = pd.read_csv(data_path)
    
    logger.info(f"Dataset: {len(df)} rows, disruption rate: {df['disrupted'].mean():.2%}")
    
    # Split before fitting to prevent data leakage
    train_df, test_df = train_test_split(df, test_size=test_size, random_state=seed, stratify=df["disrupted"])
    
    # Fit feature engineer on training data only
    fe = FeatureEngineer()
    X_train = fe.fit_transform(train_df)
    X_test = fe.transform(test_df)
    
    y_train = train_df["disrupted"].values
    y_test = test_df["disrupted"].values
    
    logger.info(f"Train: {len(X_train)} samples | Test: {len(X_test)} samples")
    
    return X_train, X_test, y_train, y_test, fe


def train_xgboost(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    calibrate: bool = True
) -> xgb.XGBClassifier:
    """
    Train XGBoost classifier with optional probability calibration.
    
    Calibration ensures predicted probabilities are well-aligned with
    actual disruption frequencies (critical for risk scoring).
    """
    logger.info("🚀 Training XGBoost model...")
    start_time = time.time()
    
    model = xgb.XGBClassifier(**MODEL_PARAMS)
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    train_time = time.time() - start_time
    logger.info(f"✅ Model trained in {train_time:.1f}s")
    
    if calibrate:
        logger.info("📐 Calibrating probabilities (isotonic regression)...")
        calibrated = CalibratedClassifierCV(model, cv=3, method="isotonic")
        calibrated.fit(X_train, y_train)
        
        # Store the base model for feature importance
        calibrated._base_model = model
        return calibrated
    
    return model


def evaluate_model(
    model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: list
) -> Dict:
    """
    Comprehensive model evaluation with metrics and feature importance.
    """
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred)),
        "recall": float(recall_score(y_test, y_pred)),
        "f1_score": float(f1_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
    }
    
    # Feature importance
    base_model = getattr(model, "_base_model", model)
    if hasattr(base_model, "feature_importances_"):
        importance = base_model.feature_importances_
        feature_importance = {
            name: float(imp) 
            for name, imp in sorted(
                zip(feature_names, importance),
                key=lambda x: x[1],
                reverse=True
            )
        }
    else:
        feature_importance = {}
    
    logger.info("=" * 50)
    logger.info("📊 MODEL EVALUATION RESULTS")
    logger.info("=" * 50)
    for metric, value in metrics.items():
        logger.info(f"  {metric:>12}: {value:.4f}")
    logger.info("-" * 50)
    logger.info("🔍 Feature Importance (Top 5):")
    for i, (feat, imp) in enumerate(list(feature_importance.items())[:5]):
        logger.info(f"  {i+1}. {feat}: {imp:.4f}")
    logger.info("=" * 50)
    
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["On-Time", "Disrupted"]))
    
    return {**metrics, "feature_importance": feature_importance}


def export_to_onnx(model, feature_names: list):
    """
    Export XGBoost model to ONNX format for fast inference.
    
    ONNX provides:
    - 2-5x faster inference than native XGBoost
    - Cross-platform compatibility
    - No Python dependency needed for inference
    """
    try:
        from onnxmltools import convert_xgboost
        from onnxmltools.convert.common.data_types import FloatTensorType
    except ImportError:
        logger.error("onnxmltools not installed. Run: pip install onnxmltools skl2onnx")
        return False
    
    logger.info("📦 Exporting model to ONNX format...")
    
    # Get the base XGBoost model (unwrap calibration if present)
    base_model = getattr(model, "_base_model", model)
    if not isinstance(base_model, xgb.XGBClassifier):
        base_model = model
    
    n_features = len(feature_names)
    initial_type = [("features", FloatTensorType([None, n_features]))]
    
    try:
        onnx_model = convert_xgboost(
            base_model,
            initial_types=initial_type,
            target_opset=12
        )
        
        with open(ONNX_MODEL_PATH, "wb") as f:
            f.write(onnx_model.SerializeToString())
        
        logger.info(f"✅ ONNX model saved to {ONNX_MODEL_PATH}")
        logger.info(f"   File size: {ONNX_MODEL_PATH.stat().st_size / 1024:.1f} KB")
        return True
        
    except Exception as e:
        logger.error(f"ONNX export failed: {e}")
        logger.info("Falling back to native XGBoost JSON format")
        return False


def save_model(model, feature_names: list):
    """Save model in both native XGBoost and ONNX formats."""
    
    # Save base XGBoost model
    base_model = getattr(model, "_base_model", model)
    if isinstance(base_model, xgb.XGBClassifier):
        base_model.save_model(str(XGBOOST_MODEL_PATH))
        logger.info(f"✅ XGBoost model saved to {XGBOOST_MODEL_PATH}")
    
    # Save calibrated model (full pipeline)
    calibrated_path = MODEL_DIR / "calibrated_model.pkl"
    with open(calibrated_path, "wb") as f:
        pickle.dump(model, f)
    logger.info(f"✅ Calibrated model saved to {calibrated_path}")
    
    # Save feature names
    with open(FEATURE_NAMES_PATH, "w") as f:
        json.dump(feature_names, f, indent=2)
    logger.info(f"✅ Feature names saved to {FEATURE_NAMES_PATH}")


def main():
    parser = argparse.ArgumentParser(description="Train DrishtiFlow risk prediction model")
    parser.add_argument("--data", type=str, default="data/training_data.csv", help="Path to training CSV")
    parser.add_argument("--export-onnx", action="store_true", help="Export model to ONNX")
    parser.add_argument("--evaluate-only", action="store_true", help="Only evaluate existing model")
    parser.add_argument("--no-calibrate", action="store_true", help="Skip probability calibration")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio")
    args = parser.parse_args()
    
    data_path = Path(__file__).parent / args.data
    
    if not data_path.exists():
        logger.error(f"Data file not found: {data_path}")
        logger.info("Run: python generate_sample_data.py --samples 15000")
        return
    
    # Load and prepare data
    X_train, X_test, y_train, y_test, fe = load_and_prepare_data(
        str(data_path), test_size=args.test_size
    )
    
    if args.evaluate_only and XGBOOST_MODEL_PATH.exists():
        logger.info("Loading existing model for evaluation...")
        model = xgb.XGBClassifier()
        model.load_model(str(XGBOOST_MODEL_PATH))
        evaluate_model(model, X_test, y_test, FEATURE_COLUMNS)
        return
    
    # Train model
    model = train_xgboost(
        X_train, y_train, X_test, y_test,
        calibrate=not args.no_calibrate
    )
    
    # Evaluate
    eval_results = evaluate_model(model, X_test, y_test, FEATURE_COLUMNS)
    
    # Save
    save_model(model, FEATURE_COLUMNS)
    
    # Export to ONNX
    if args.export_onnx:
        export_to_onnx(model, FEATURE_COLUMNS)
    
    # Save evaluation results
    results_path = MODEL_DIR / "eval_results.json"
    with open(results_path, "w") as f:
        json.dump(eval_results, f, indent=2)
    logger.info(f"📊 Evaluation results saved to {results_path}")
    
    print("\n" + "=" * 50)
    print("🎉 MODEL TRAINING COMPLETE")
    print("=" * 50)
    print(f"  AUC-ROC:  {eval_results['roc_auc']:.4f}")
    print(f"  F1 Score: {eval_results['f1_score']:.4f}")
    print(f"  Model:    {XGBOOST_MODEL_PATH}")
    if args.export_onnx:
        print(f"  ONNX:     {ONNX_MODEL_PATH}")
    print("=" * 50)


if __name__ == "__main__":
    main()
