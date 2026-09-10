"""
analyzer/tests/test_ml_pipeline.py

Phase 26: Unit & integration tests for ML dataset loading, feature preprocessing,
model training, and prediction engine.
"""

import os
import sys
import tempfile
import pandas as pd
import pytest
from pathlib import Path

# Add analyzer app root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ml.train import train_and_evaluate_models, FEATURE_COLUMNS, TARGET_COLUMN
from app.ml.predict import predict_maturity, load_model_payload


def test_dataset_loading_and_features():
    """Verify that dataset.csv exists, loads properly, and contains required feature columns."""
    dataset_path = Path(__file__).resolve().parent.parent / "app" / "ml" / "dataset.csv"
    assert dataset_path.exists(), "dataset.csv should exist"

    df = pd.read_csv(dataset_path)
    assert len(df) > 0, "dataset.csv should not be empty"

    for col in FEATURE_COLUMNS:
        assert col in df.columns, f"Missing feature column: {col}"
    assert TARGET_COLUMN in df.columns, f"Missing target column: {TARGET_COLUMN}"


def test_model_training_flow():
    """Verify training pipeline on a dummy synthetic dataset CSV."""
    n_samples = 18
    dummy_data = {col: [float(i * 10) for i in range(n_samples)] for col in FEATURE_COLUMNS}
    dummy_data[TARGET_COLUMN] = ["Beginner"] * 6 + ["Intermediate"] * 6 + ["Advanced"] * 6
    dummy_data["repo_url"] = [f"https://github.com/test/repo{i}" for i in range(n_samples)]

    df = pd.DataFrame(dummy_data)

    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = os.path.join(tmpdir, "test_dataset.csv")
        model_path = os.path.join(tmpdir, "test_model.pkl")
        df.to_csv(csv_path, index=False)

        results, best_name = train_and_evaluate_models(csv_path, model_path)

        assert os.path.exists(model_path), "Model file should be saved after training"
        assert best_name in ["DecisionTree", "RandomForest", "GradientBoosting"]
        assert "DecisionTree" in results
        assert "RandomForest" in results
        assert "GradientBoosting" in results


def test_predict_maturity_structure():
    """Verify predict_maturity execution and return schema."""
    metrics = {"total_loc": 500, "code_loc": 400, "total_files": 10, "source_files": 8, "test_files": 2, "functions": 15, "classes": 3, "dependency_count": 5}
    complexity = {"avg_complexity": 2.5, "max_complexity": 8}
    duplication = {"duplication_percentage": 5.0}
    testing = {"test_file_ratio": 0.25}
    documentation = {"documentation_score": 80.0}
    dependencies = {"dependency_count": 5}
    security = {"findings_count": 0}
    architecture = {"confidence_score": 85.0}
    git_history = {"total_commits": 25}
    scores = {"overall_score": 78.5}

    result = predict_maturity(
        metrics, complexity, duplication, testing, documentation,
        dependencies, security, architecture, git_history, scores
    )

    assert isinstance(result, dict)
    assert "status" in result
    assert "disclaimer" in result
    assert result["disclaimer"] == "Model prediction — not an objective fact"

    # If model is loaded successfully
    if result["status"] == "available":
        assert result["prediction"] in ["Beginner", "Intermediate", "Advanced"]
        assert isinstance(result["confidence"], float)
        assert isinstance(result["top_contributing_features"], list)
