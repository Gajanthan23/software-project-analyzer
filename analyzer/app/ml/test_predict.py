import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.ml.predict import predict_maturity

sample_metrics = {"total_loc": 20000, "code_loc": 15000, "total_files": 200, "source_files": 50, "test_files": 90, "functions": 100, "classes": 10, "dependency_count": 99}
sample_complexity = {"avg_complexity": 1.16, "max_complexity": 23}
sample_duplication = {"duplication_percentage": 12.4}
sample_testing = {"test_file_ratio": 0.45}
sample_doc = {"documentation_score": 75.0}
sample_dep = {}
sample_sec = {"total_findings": 0}
sample_arch = {"confidence_score": 85.0}
sample_git = {"total_commits": 50}
sample_scores = {"overall_score": 73.19}

res = predict_maturity(
    metrics=sample_metrics,
    complexity=sample_complexity,
    duplication=sample_duplication,
    testing=sample_testing,
    documentation=sample_doc,
    dependencies=sample_dep,
    security=sample_sec,
    architecture=sample_arch,
    git_history=sample_git,
    scores=sample_scores
)

print("Prediction Engine Output:")
import json
print(json.dumps(res, indent=2))
