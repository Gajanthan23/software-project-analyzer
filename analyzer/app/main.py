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

    # 3. Build response — real values for repository + metrics sections,
    #    explicit not_implemented for all later phases (Rule 4: no fake data).
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

        # ── Phases 10–24: still not_implemented (Rule 4) ─────────────────
        complexity={
            "status": "not_implemented",
            "message": "Cyclomatic complexity via radon/lizard arrives in Phase 10."
        },
        duplication={
            "status": "not_implemented",
            "message": "Code duplication detection arrives in Phase 11."
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
        recommendations=[],
        prediction={
            "status": "not_implemented",
            "message": "ML maturity prediction model arrives in Phase 24."
        }
    )
