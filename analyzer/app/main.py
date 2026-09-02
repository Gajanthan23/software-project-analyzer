"""
app/main.py

FastAPI Application Entry Point for the Python Analysis Microservice.
Exposes:
  - GET  /health
  - POST /analyze  (Phase 8: contract shape; Phase 9: real repository + metrics sections)
"""

import os
from fastapi import FastAPI, HTTPException, status
from app.schemas import AnalysisRequest, AnalysisResponse
from app.analyzers.repository import analyze_repository
from app.analyzers.complexity import analyze_complexity
from app.analyzers.duplication import analyze_duplication

app = FastAPI(
    title="Software Project Complexity & Quality Analyzer Engine",
    description="Python Static Analysis & ML Prediction Service",
    version="1.0.0"
)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "python-analyzer",
        "version": "1.0.0"
    }

@app.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    tags=["Analysis"]
)
def analyze(request: AnalysisRequest):
    repo_path = request.repository_path

    # 1. Validate path exists on disk
    if not os.path.exists(repo_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Repository path '{repo_path}' does not exist on disk."
        )

    if not os.path.isdir(repo_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Repository path '{repo_path}' is not a valid directory."
        )

    # 2. Phase 9 — Run real repository metrics analysis
    try:
        metrics_data = analyze_repository(repo_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Repository analysis failed: {str(exc)}"
        )

    # 3. Phase 10 — Run real cyclomatic complexity analysis
    try:
        complexity_data = analyze_complexity(repo_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Complexity analysis failed: {str(exc)}"
        )

    # 4. Phase 11 — Run real code duplication analysis
    try:
        duplication_data = analyze_duplication(
            repo_path,
            total_code_loc=metrics_data.get("code_loc", 0)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Duplication analysis failed: {str(exc)}"
        )

    # Compile recommendations from analyzers
    all_recommendations = []
    for rec in duplication_data.get("recommendations", []):
        all_recommendations.append({
            "category": "duplication",
            "type": "refactor",
            "message": rec
        })

    # 5. Build response — real values for repository, metrics, complexity, duplication
    return AnalysisResponse(
        status="success",
        repository_path=os.path.abspath(repo_path),

        # ── Phase 9: REAL values ─────────────────────────────────────────
        repository={
            "status": "ok",
            "total_files":         metrics_data["total_files"],
            "source_files":        metrics_data["source_files"],
            "test_files":          metrics_data["test_files"],
            "config_files":        metrics_data["config_files"],
            "documentation_files": metrics_data["documentation_files"],
            "other_files":         metrics_data["other_files"],
            "modules":             metrics_data["modules"],
            "directory_depth":     metrics_data["directory_depth"],
            "primary_language":    metrics_data["primary_language"],
            "languages":           metrics_data["languages"],
        },
        metrics={
            "status":           "ok",
            "total_loc":        metrics_data["total_loc"],
            "code_loc":         metrics_data["code_loc"],
            "comment_loc":      metrics_data["comment_loc"],
            "blank_loc":        metrics_data["blank_loc"],
            "functions":        metrics_data["functions"],
            "classes":          metrics_data["classes"],
            "dependency_count": metrics_data["dependency_count"],
            "analysis_tool":    metrics_data["analysis_tool"],
        },

        # ── Phase 10: REAL values ────────────────────────────────────────
        complexity={
            "status":                    "ok",
            "total_functions":           complexity_data["total_functions"],
            "avg_complexity":            complexity_data["avg_complexity"],
            "max_complexity":            complexity_data["max_complexity"],
            "high_complexity_count":     complexity_data["high_complexity_count"],
            "high_complexity_threshold": complexity_data["high_complexity_threshold"],
            "complexity_distribution":   complexity_data["complexity_distribution"],
            "top_complex_functions":     complexity_data["top_complex_functions"],
            "file_complexity":           complexity_data["file_complexity"],
            "analysis_tool":             complexity_data["analysis_tool"],
        },

        # ── Phase 11: REAL values ────────────────────────────────────────
        duplication={
            "status":                 "ok",
            "duplicated_blocks":      duplication_data["duplicated_blocks"],
            "duplicated_loc":         duplication_data["duplicated_loc"],
            "duplication_percentage": duplication_data["duplication_percentage"],
            "duplicated_files_count": duplication_data["duplicated_files_count"],
            "duplicated_files":       duplication_data["duplicated_files"],
            "duplicate_instances":    duplication_data["duplicate_instances"],
            "recommendations":        duplication_data["recommendations"],
            "analysis_tool":          duplication_data["analysis_tool"],
        },
        testing={
            "status": "not_implemented",
            "message": "Test detection & coverage parsing arrives in Phase 12."
        },
        documentation={
            "status": "not_implemented",
            "message": "Documentation completeness scoring arrives in Phase 13."
        },
        dependencies={
            "status": "not_implemented",
            "message": "Dependency file parsing arrives in Phase 14."
        },
        security={
            "status": "not_implemented",
            "message": "Static security scan via bandit/semgrep arrives in Phase 15."
        },
        architecture={
            "status": "not_implemented",
            "message": "Architecture pattern heuristics arrive in Phase 16."
        },
        git_history={
            "status": "not_implemented",
            "message": "Git commit & contributor statistics arrive in Phase 17."
        },
        scores={
            "status": "not_implemented",
            "message": "Category & overall quality scoring engine arrives in Phase 18."
        },
        recommendations=all_recommendations,
        prediction={
            "status": "not_implemented",
            "message": "ML maturity prediction model arrives in Phase 24."
        }
    )
