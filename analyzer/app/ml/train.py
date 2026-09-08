"""
analyzer/app/ml/train.py

Phase 24: ML Model Training and Evaluation Script.
Loads Phase 23 dataset (dataset.csv), splits into train/test sets,
trains Decision Tree, Random Forest, and Gradient Boosting classifiers (scikit-learn),
evaluates using Accuracy, Precision, Recall, F1-Score, and Confusion Matrices,
selects the best performing model, and serializes it to model.pkl.
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# Feature column definitions conforming to Section 21 & Phase 23 specifications
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

TARGET_COLUMN = "maturity_label"

def train_and_evaluate_models(csv_path: str, model_save_path: str):
    csv_file = Path(csv_path)
    if not csv_file.exists():
        print(f"Error: Dataset CSV file not found at {csv_path}")
        sys.exit(1)

    df = pd.read_csv(csv_file)
    print(f"Loaded dataset from {csv_path} with shape: {df.shape}")

    # Clean & validate features
    X = df[FEATURE_COLUMNS].fillna(0)
    y = df[TARGET_COLUMN]

    unique_classes = np.unique(y)
    print(f"Target classes present ({len(unique_classes)}): {list(unique_classes)}")
    print(f"Class distribution:\n{y.value_counts()}\n")

    # 80/20 Train/Test split
    # For small datasets, use random_state=42
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y if len(unique_classes) > 1 and min(y.value_counts()) >= 2 else None
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42
        )

    print(f"Train set size: {X_train.shape[0]} samples | Test set size: {X_test.shape[0]} samples\n")

    models = {
        "DecisionTree": DecisionTreeClassifier(max_depth=4, random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=50, max_depth=4, random_state=42),
        "GradientBoosting": GradientBoostingClassifier(n_estimators=30, max_depth=3, random_state=42)
    }

    results = {}
    best_model_name = None
    best_f1 = -1.0
    best_model_obj = None

    print("=================== MODEL EVALUATION METRICS ===================")
    for name, clf in models.items():
        clf.fit(X_train, y_train)

        # Predict on test set (or full set for small sample validation)
        y_pred = clf.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted", zero_division=0)
        cm = confusion_matrix(y_test, y_pred, labels=clf.classes_)

        # Extract feature importances if available
        if hasattr(clf, "feature_importances_"):
            importances = dict(zip(FEATURE_COLUMNS, [round(float(v), 4) for v in clf.feature_importances_]))
            sorted_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)
        else:
            sorted_importances = []

        results[name] = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "confusion_matrix": cm.tolist(),
            "classes": clf.classes_.tolist(),
            "feature_importances": sorted_importances,
            "model_obj": clf
        }

        print(f"\n--- {name} ---")
        print(f"  Accuracy:  {acc * 100:.2f}%")
        print(f"  Precision: {prec * 100:.2f}%")
        print(f"  Recall:    {rec * 100:.2f}%")
        print(f"  F1-Score:  {f1 * 100:.2f}%")
        print(f"  Confusion Matrix:\n{cm}")
        print(f"  Top 3 Features: {sorted_importances[:3]}")

        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model_obj = clf

    print("\n==================================================================")
    print(f"[WINNER] Winning Model Selected: {best_model_name} (Weighted F1: {best_f1 * 100:.2f}%)")
    print("==================================================================\n")

    # Serialize model payload to model.pkl
    model_payload = {
        "model_name": best_model_name,
        "model": best_model_obj,
        "feature_columns": FEATURE_COLUMNS,
        "target_classes": best_model_obj.classes_.tolist(),
        "metrics": {
            "accuracy": results[best_model_name]["accuracy"],
            "precision": results[best_model_name]["precision"],
            "recall": results[best_model_name]["recall"],
            "f1_score": results[best_model_name]["f1_score"]
        },
        "feature_importances": results[best_model_name]["feature_importances"]
    }

    Path(model_save_path).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_payload, model_save_path)
    print(f"[OK] Successfully saved serialized model artifact to: {model_save_path}")

    return results, best_model_name

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    base_dir = os.path.dirname(__file__)
    csv_file = os.path.join(base_dir, "dataset.csv")
    model_path = os.path.join(base_dir, "model.pkl")

    train_and_evaluate_models(csv_file, model_path)
