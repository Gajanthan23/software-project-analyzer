# Machine Learning Model Evaluation Report

This document details the model training, comparative performance evaluation, feature importance analysis, and model selection for Phase 24 ML engineering maturity prediction.

---

## 1. Dataset Characteristics & Limitations

> [!IMPORTANT]
> **Dataset Size & Reliability Notice**: The Phase 23 dataset consists of **16 labeled repositories**. While the static analysis pipeline extracts 17 high-dimensional feature metrics per repository, a dataset of 16 samples is relatively small. Evaluation metrics (100% Accuracy/F1) reflect complete linear separability on the test set, but true real-world statistical generalization requires scaling the dataset to 100+ repositories in future iterations.

- **Total Samples**: 16 open-source repositories.
- **Train / Test Split**: 12 training samples (75%) / 4 test samples (25%).
- **Class Breakdown**:
  - `Intermediate`: 13 repositories (81.2%)
  - `Advanced`: 3 repositories (18.8%)

---

## 2. Comparative Model Evaluation Results

Three scikit-learn classification algorithms were trained and evaluated on the holdout test set using standardized metrics (Accuracy, Precision, Recall, Weighted F1-Score, and Confusion Matrix):

| Model Algorithm | Accuracy | Precision (Weighted) | Recall (Weighted) | F1-Score (Weighted) | Top Contributing Features |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Decision Tree Classifier** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | `max_complexity` (45.5%), `dependency_count` (30.0%), `source_files` (24.5%) |
| **Random Forest Classifier** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | `total_files` (13.3%), `source_files` (13.0%), `total_loc` (12.8%) |
| **Gradient Boosting Classifier** | **100.00%** | **100.00%** | **100.00%** | **100.00%** | `max_complexity` (59.0%), `dependency_count` (13.8%), `avg_complexity` (10.6%) |

### Confusion Matrix (All Models on Test Set)
```
                Predicted: Advanced   Predicted: Intermediate
Actual: Advanced           1                     0
Actual: Intermediate       0                     3
```

---

## 3. Winning Model Selection & Rationale

**Selected Winning Model**: `DecisionTreeClassifier` (serialized to `analyzer/app/ml/model.pkl`).

### Rationale:
1. **Model Interpretability**: Decision Trees provide clear, human-understandable threshold rules for explaining why a repository was classified as `Beginner`, `Intermediate`, or `Advanced`.
2. **Computational Speed**: Zero-overhead inference time ($< 1\text{ ms}$) during static analysis runs.
3. **Feature Importance Transparency**: Enables direct extraction of top contributing feature importance weights (`max_complexity`, `dependency_count`, `source_files`) to present in the user-facing UI prediction breakdown.

---

## 4. Model Artifact Serialization

The winning model payload is serialized using `joblib` and stored at:
- `analyzer/app/ml/model.pkl`

The serialized dictionary object contains:
- `model_name`: Algorithm identifier (`DecisionTree` / `RandomForest`)
- `model`: Trained scikit-learn classifier object
- `feature_columns`: List of 17 input feature column names
- `target_classes`: Class labels list (`['Advanced', 'Intermediate']`)
- `metrics`: Evaluation metric dictionary
- `feature_importances`: Ranked list of feature importance weights
