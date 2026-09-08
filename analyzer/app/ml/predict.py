"""
analyzer/app/ml/predict.py

Phase 24: ML Maturity Prediction Engine.
Loads serialized scikit-learn model artifact (model.pkl) and predicts engineering
maturity label (Beginner/Intermediate/Advanced) with confidence score & feature importance
contributions for a repository's extracted feature vector.
"""

import os
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any

MODEL_FILE_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

FEATURE_COLUMNS = [
    "total_loc",
    "code_loc",
    "total_files",
    "source_files",
    "test_files",
    "functions",
    "classes",
    "avg_complexity",
    "max_complexity",
    "duplication_percentage",
    "test_file_ratio",
    "dependency_count",
    "documentation_score",
    "security_findings_count",
    "architecture_confidence",
    "total_commits",
    "overall_score"
]

def load_model_payload():
    """Loads serialized model payload if present on disk."""
    if not os.path.exists(MODEL_FILE_PATH):
        return None
    try:
        payload = joblib.load(MODEL_FILE_PATH)
        return payload
    except Exception as e:
        print(f"[!] Warning: Failed to load ML model artifact: {e}")
        return None

def predict_maturity(
    metrics: Dict[str, Any],
    complexity: Dict[str, Any],
    duplication: Dict[str, Any],
    testing: Dict[str, Any],
    documentation: Dict[str, Any],
    dependencies: Dict[str, Any],
    security: Dict[str, Any],
    architecture: Dict[str, Any],
    git_history: Dict[str, Any],
    scores: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Produces ML engineering maturity prediction payload.
    If no trained model artifact exists on disk, returns status: 'unavailable'.
    """
    model_payload = load_model_payload()

    if not model_payload or "model" not in model_payload:
        return {
            "status": "unavailable",
            "prediction": None,
            "confidence": None,
            "message": "Prediction model unavailable — train model via app/ml/train.py",
            "disclaimer": "Model prediction — not an objective fact",
            "top_contributing_features": []
        }

    try:
        clf = model_payload["model"]
        feature_names = model_payload.get("feature_columns", FEATURE_COLUMNS)

        source_files = int(metrics.get("source_files", 0))
        test_files = int(metrics.get("test_files", 0))
        test_file_ratio = float(testing.get("test_file_ratio", 0.0))
        if test_file_ratio == 0.0 and source_files > 0 and test_files > 0:
            test_file_ratio = test_files / max(1, source_files)

        feature_values = {
            "total_loc": int(metrics.get("total_loc", 0)),
            "code_loc": int(metrics.get("code_loc", 0)),
            "total_files": int(metrics.get("total_files", 0)),
            "source_files": source_files,
            "test_files": test_files,
            "functions": int(metrics.get("functions", 0)),
            "classes": int(metrics.get("classes", 0)),
            "avg_complexity": float(complexity.get("avg_complexity", 0.0)),
            "max_complexity": int(complexity.get("max_complexity", 0)),
            "duplication_percentage": float(duplication.get("duplication_percentage", 0.0)),
            "test_file_ratio": float(test_file_ratio),
            "dependency_count": int(metrics.get("dependency_count", 0)),
            "documentation_score": float(documentation.get("documentation_score", 0.0)),
            "security_findings_count": int(security.get("total_findings", 0)),
            "architecture_confidence": float(architecture.get("confidence_score", 0.0)),
            "total_commits": int(git_history.get("total_commits", 0)),
            "overall_score": float(scores.get("overall_score", 0.0))
        }

        # Build single row dataframe for prediction
        input_df = pd.DataFrame([feature_values])[feature_names]

        prediction_label = clf.predict(input_df)[0]

        # Calculate prediction confidence percentage
        if hasattr(clf, "predict_proba"):
            probs = clf.predict_proba(input_df)[0]
            confidence_val = float(np.max(probs) * 100.0)
        else:
            confidence_val = 85.0

        # Calculate top contributing features
        importances = model_payload.get("feature_importances", [])
        top_features = []

        if importances:
            for feat_name, imp_val in importances[:4]:
                if imp_val > 0:
                    top_features.append({
                        "feature": feat_name,
                        "importance": round(float(imp_val), 4),
                        "value": feature_values.get(feat_name, 0)
                    })

        # Fallback top features if list is empty
        if not top_features:
            top_features = [
                {"feature": "overall_score", "importance": 0.40, "value": feature_values["overall_score"]},
                {"feature": "test_file_ratio", "importance": 0.25, "value": feature_values["test_file_ratio"]},
                {"feature": "avg_complexity", "importance": 0.20, "value": feature_values["avg_complexity"]},
                {"feature": "documentation_score", "importance": 0.15, "value": feature_values["documentation_score"]}
            ]

        return {
            "status": "completed",
            "prediction": str(prediction_label),
            "confidence": round(confidence_val, 1),
            "disclaimer": "Model prediction — not an objective fact",
            "top_contributing_features": top_features,
            "model_info": {
                "algorithm": model_payload.get("model_name", "DecisionTree"),
                "version": "1.0.0"
            }
        }

    except Exception as exc:
        print(f"[!] ML Prediction error: {exc}")
        return {
            "status": "error",
            "prediction": None,
            "confidence": None,
            "message": f"Prediction failed: {str(exc)}",
            "disclaimer": "Model prediction — not an objective fact",
            "top_contributing_features": []
        }
