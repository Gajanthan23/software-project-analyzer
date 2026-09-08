"""
app/main.py

FastAPI Application Entry Point for the Python Analysis Microservice.
Exposes:
  - GET  /health
  - POST /analyze  (Phase 8: contract; Phase 9: metrics; Phase 10: complexity; Phase 11: duplication; Phase 12: testing; Phase 13: documentation; Phase 14: dependencies; Phase 15: security)
"""

import os
from fastapi import FastAPI, HTTPException, status
from app.schemas import AnalysisRequest, AnalysisResponse
from app.analyzers.repository import analyze_repository
from app.analyzers.complexity import analyze_complexity
from app.analyzers.duplication import analyze_duplication
from app.analyzers.testing import analyze_testing
from app.analyzers.documentation import analyze_documentation
from app.analyzers.dependencies import analyze_dependencies
from app.analyzers.security import analyze_security
from app.analyzers.architecture import analyze_architecture
from app.analyzers.git_history import analyze_git_history
from app.scoring import calculate_scores, generate_recommendations
from app.ml.predict import predict_maturity

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

    # 5. Phase 12 — Run real testing suite & coverage analysis
    try:
        testing_data = analyze_testing(repo_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Testing analysis failed: {str(exc)}"
        )

    # 6. Phase 13 — Run real documentation completeness analysis (HEURISTIC)
    try:
        documentation_data = analyze_documentation(
            repo_path,
            code_loc=metrics_data.get("code_loc", 0),
            comment_loc=metrics_data.get("comment_loc", 0)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Documentation analysis failed: {str(exc)}"
        )

    # 7. Phase 14 — Run real multi-ecosystem dependency analysis
    try:
        dependencies_data = analyze_dependencies(repo_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dependency analysis failed: {str(exc)}"
        )

    # 8. Phase 15 — Run real static security & secret scanning analysis
    try:
        security_data = analyze_security(repo_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Security analysis failed: {str(exc)}"
        )

    # 9. Phase 16 — Run real heuristic architecture pattern analysis
    try:
        architecture_data = analyze_architecture(
            repo_path,
            total_source_files=metrics_data.get("source_files", 0)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Architecture analysis failed: {str(exc)}"
        )

    # 10. Phase 17 — Run real Git history & contributor commit log analysis
    try:
        git_history_data = analyze_git_history(repo_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Git history analysis failed: {str(exc)}"
        )

    # 11. Phase 18 — Run real multi-dimensional quality scoring engine
    try:
        scores_data = calculate_scores(
            metrics=metrics_data,
            complexity=complexity_data,
            duplication=duplication_data,
            testing=testing_data,
            documentation=documentation_data,
            dependencies=dependencies_data,
            security=security_data,
            architecture=architecture_data,
            git_history=git_history_data
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scoring engine calculation failed: {str(exc)}"
        )

    # 12. Phase 19 — Run real actionable recommendation engine
    try:
        recommendations_data = generate_recommendations(
            metrics=metrics_data,
            complexity=complexity_data,
            duplication=duplication_data,
            testing=testing_data,
            documentation=documentation_data,
            dependencies=dependencies_data,
            security=security_data,
            architecture=architecture_data,
            git_history=git_history_data,
            scores=scores_data
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation engine failed: {str(exc)}"
        )

    # Update dependency_count in metrics if parsed from manifests
    if dependencies_data.get("total_dependency_count", 0) > 0:
        metrics_data["dependency_count"] = dependencies_data["total_dependency_count"]

    # 13. Phase 24 — Run ML maturity prediction engine
    try:
        prediction_data = predict_maturity(
            metrics=metrics_data,
            complexity=complexity_data,
            duplication=duplication_data,
            testing=testing_data,
            documentation=documentation_data,
            dependencies=dependencies_data,
            security=security_data,
            architecture=architecture_data,
            git_history=git_history_data,
            scores=scores_data
        )
    except Exception as exc:
        prediction_data = {
            "status": "unavailable",
            "prediction": None,
            "confidence": None,
            "message": f"ML Prediction calculation failed: {str(exc)}",
            "disclaimer": "Model prediction — not an objective fact",
            "top_contributing_features": []
        }

    # 14. Build response — real values for repository, metrics, complexity, duplication, testing, documentation, dependencies, security, architecture, git_history, scores, recommendations, prediction
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

        # ── Phase 12: REAL values ────────────────────────────────────────
        testing={
            "status":                     "ok",
            "has_tests":                  testing_data["has_tests"],
            "test_files_count":           testing_data["test_files_count"],
            "source_files_count":         testing_data["source_files_count"],
            "test_to_source_file_ratio":  testing_data["test_to_source_file_ratio"],
            "test_loc":                   testing_data["test_loc"],
            "source_loc":                 testing_data["source_loc"],
            "test_to_source_loc_ratio":   testing_data["test_to_source_loc_ratio"],
            "test_frameworks":            testing_data["test_frameworks"],
            "has_coverage_report":        testing_data["has_coverage_report"],
            "coverage_percentage":        testing_data["coverage_percentage"],
            "coverage_status":            testing_data["coverage_status"],
            "coverage_message":           testing_data["coverage_message"],
            "test_directories":           testing_data["test_directories"],
            "test_files":                 testing_data["test_files"],
            "analysis_tool":              testing_data["analysis_tool"],
        },

        # ── Phase 13: REAL values (HEURISTIC) ────────────────────────────
        documentation={
            "status":                     "ok",
            "classification":             documentation_data["classification"],
            "documentation_score":        documentation_data["documentation_score"],
            "score_breakdown":            documentation_data["score_breakdown"],
            "has_readme":                 documentation_data["has_readme"],
            "readme_file":                documentation_data["readme_file"],
            "readme_size_bytes":          documentation_data["readme_size_bytes"],
            "readme_sections":            documentation_data["readme_sections"],
            "has_docs_dir":               documentation_data["has_docs_dir"],
            "docs_files_count":           documentation_data["docs_files_count"],
            "docs_sample_files":          documentation_data["docs_sample_files"],
            "governance_files":           documentation_data["governance_files"],
            "comment_density_pct":        documentation_data["comment_density_pct"],
            "recommendations":            documentation_data["recommendations"],
            "analysis_notes":             documentation_data["analysis_notes"],
            "analysis_tool":              documentation_data["analysis_tool"],
        },

        # ── Phase 14: REAL values ────────────────────────────────────────
        dependencies={
            "status":                     "ok",
            "production_dependency_count":dependencies_data["production_dependency_count"],
            "dev_dependency_count":       dependencies_data["dev_dependency_count"],
            "total_dependency_count":     dependencies_data["total_dependency_count"],
            "ecosystems":                 dependencies_data["ecosystems"],
            "manifest_files":             dependencies_data["manifest_files"],
            "dependencies_by_file":       dependencies_data["dependencies_by_file"],
            "top_dependencies":           dependencies_data["top_dependencies"],
            "recommendations":            dependencies_data["recommendations"],
            "vulnerability_notes":        dependencies_data["vulnerability_notes"],
            "analysis_tool":              dependencies_data["analysis_tool"],
        },

        # ── Phase 15: REAL values ────────────────────────────────────────
        security={
            "status":                     "ok",
            "total_findings":             security_data["total_findings"],
            "severity_counts":            security_data["severity_counts"],
            "findings":                   security_data["findings"],
            "recommendations":            security_data["recommendations"],
            "analysis_notes":             security_data["analysis_notes"],
            "analysis_tool":              security_data["analysis_tool"],
        },

        # ── Phase 16: REAL values (HEURISTIC) ────────────────────────────
        architecture={
            "status":                     "ok",
            "classification":             architecture_data["classification"],
            "detected_pattern":           architecture_data["detected_pattern"],
            "confidence_score":           architecture_data["confidence_score"],
            "detected_layers":            architecture_data["detected_layers"],
            "architectural_problems":     architecture_data["architectural_problems"],
            "layer_violations_count":     architecture_data["layer_violations_count"],
            "structural_summary":         architecture_data["structural_summary"],
            "recommendations":            architecture_data["recommendations"],
            "analysis_notes":             architecture_data["analysis_notes"],
            "analysis_tool":              architecture_data["analysis_tool"],
        },

        # ── Phase 17: REAL values ────────────────────────────────────────
        git_history={
            "status":                     "ok",
            "is_git_repository":          git_history_data["is_git_repository"],
            "total_commits":              git_history_data["total_commits"],
            "contributor_count":          git_history_data["contributor_count"],
            "repository_age_days":        git_history_data["repository_age_days"],
            "recent_commits_30d":         git_history_data["recent_commits_30d"],
            "recent_commits_90d":         git_history_data["recent_commits_90d"],
            "branch_count":               git_history_data["branch_count"],
            "commit_frequency_per_week":  git_history_data["commit_frequency_per_week"],
            "top_contributors":          git_history_data["top_contributors"],
            "first_commit_date":          git_history_data["first_commit_date"],
            "latest_commit_date":         git_history_data["latest_commit_date"],
            "analysis_notes":             git_history_data["analysis_notes"],
            "analysis_tool":              git_history_data["analysis_tool"],
        },

        # ── Phase 18: REAL values ────────────────────────────────────────
        scores={
            "status":         "ok",
            "overall_score":  scores_data["overall_score"],
            "score_band":     scores_data["score_band"],
            "sub_scores":     scores_data["sub_scores"],
            "score_weights":  scores_data["score_weights"],
            "analysis_notes": scores_data["analysis_notes"],
            "analysis_tool":  scores_data["analysis_tool"],
        },

        # ── Phase 19: REAL values ────────────────────────────────────────
        recommendations=recommendations_data,

        # ── Phase 24: REAL values ─────────────────────────────────────────
        prediction=prediction_data
    )
