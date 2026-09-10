"""
analyzer/app/scoring/scoring_engine.py

Software Quality & Engineering Scoring Engine — Phase 18 (Section 18)

DISCLAIMER & METHODOLOGY NOTE:
  The scoring formulas, weights, sub-score algorithms, and score bands defined herein
  represent this software project's custom analytical methodology and quality model.
  They are not official international standards (such as ISO/IEC 25010), but rather
  a structured heuristic quality evaluation framework designed for consistent repo benchmarking.

Sub-Score Weights (Configurable Constants):
  - Code Quality Score:   25% (0.25)
  - Maintainability Score: 20% (0.20)
  - Architecture Score:    20% (0.20)
  - Testing Score:         15% (0.15)
  - Security Score:        10% (0.10)
  - Documentation Score:   10% (0.10)

Score Bands:
  - 90.0 to 100.0: Excellent
  - 75.0 to 89.9:  Advanced
  - 60.0 to 74.9:  Proficient
  - 40.0 to 59.9:  Developing
  -  0.0 to 39.9:  Needs Improvement
"""

from typing import Dict, List, Any

# ── CONFIGURABLE WEIGHT CONSTANTS ──────────────────────────────────────────
WEIGHT_CODE_QUALITY   = 0.25
WEIGHT_MAINTAINABILITY = 0.20
WEIGHT_ARCHITECTURE    = 0.20
WEIGHT_TESTING         = 0.15
WEIGHT_SECURITY        = 0.10
WEIGHT_DOCUMENTATION   = 0.10

SCORE_WEIGHTS = {
    "code_quality":   WEIGHT_CODE_QUALITY,
    "maintainability": WEIGHT_MAINTAINABILITY,
    "architecture":    WEIGHT_ARCHITECTURE,
    "testing":         WEIGHT_TESTING,
    "security":        WEIGHT_SECURITY,
    "documentation":   WEIGHT_DOCUMENTATION,
}

# ── SECURITY SEVERITY PENALTY CONSTANTS ─────────────────────────────────────
SECURITY_PENALTY_CRITICAL = 25.0
SECURITY_PENALTY_HIGH     = 15.0
SECURITY_PENALTY_MEDIUM   = 5.0
SECURITY_PENALTY_LOW      = 2.0


def calculate_code_quality_score(metrics: Dict[str, Any], duplication: Dict[str, Any]) -> float:
    """
    Code Quality Score (0-100):
      Base Score: 100
      Penalties:
        - Duplication % penalty: -2.0 points per 1% duplication (max -40 points)
        - Low comment density penalty: if comment_loc / (code_loc + comment_loc) < 5%, -15 points
        - Excessive function length penalty: if code_loc / max(1, functions) > 50, -15 points
    """
    score = 100.0

    dup_pct = float(duplication.get("duplication_percentage", 0.0) or 0.0)
    score -= min(40.0, dup_pct * 2.0)

    code_loc = float(metrics.get("code_loc", 0) or 0)
    comment_loc = float(metrics.get("comment_loc", 0) or 0)
    total_loc = code_loc + comment_loc

    if total_loc > 0:
        comment_ratio = comment_loc / total_loc
        if comment_ratio < 0.05:
            score -= 15.0
        elif comment_ratio < 0.10:
            score -= 7.5

    functions = float(metrics.get("functions", 0) or 0)
    if functions > 0:
        avg_func_loc = code_loc / functions
        if avg_func_loc > 60:
            score -= 15.0
        elif avg_func_loc > 35:
            score -= 7.5

    return round(max(0.0, min(100.0, score)), 2)


def calculate_maintainability_score(complexity: Dict[str, Any], duplication: Dict[str, Any]) -> float:
    """
    Maintainability Score (0-100):
      Base Score: 100
      Penalties:
        - Average complexity penalty: if avg_complexity > 5, -5 pts per unit above 5 (max -35 pts)
        - High complexity function ratio penalty: (high_complexity_count / total_functions) * 40 pts
        - Duplication % penalty: -1.5 points per 1% duplication (max -25 points)
    """
    score = 100.0

    avg_comp = float(complexity.get("avg_complexity", 1.0) or 1.0)
    if avg_comp > 5.0:
        score -= min(35.0, (avg_comp - 5.0) * 5.0)

    total_funcs = float(complexity.get("total_functions", 0) or 0)
    high_comp_count = float(complexity.get("high_complexity_count", 0) or 0)

    if total_funcs > 0:
        high_comp_ratio = high_comp_count / total_funcs
        score -= min(40.0, high_comp_ratio * 40.0)

    dup_pct = float(duplication.get("duplication_percentage", 0.0) or 0.0)
    score -= min(25.0, dup_pct * 1.5)

    return round(max(0.0, min(100.0, score)), 2)


def calculate_complexity_score(complexity: Dict[str, Any]) -> float:
    """
    Complexity Score (0-100):
      Base Score: 100 (higher score means healthier/simpler complexity)
      Penalties:
        - Max complexity penalty: if max_complexity > 15, -2 pts per unit above 15 (max -30 pts)
        - High complexity function penalty: -5 pts per high complexity function (max -40 pts)
        - Average complexity threshold: if avg_complexity > 10, -20 pts
    """
    score = 100.0

    max_comp = float(complexity.get("max_complexity", 1) or 1)
    if max_comp > 15:
        score -= min(30.0, (max_comp - 15) * 2.0)

    high_comp_count = float(complexity.get("high_complexity_count", 0) or 0)
    score -= min(40.0, high_comp_count * 5.0)

    avg_comp = float(complexity.get("avg_complexity", 1.0) or 1.0)
    if avg_comp > 10.0:
        score -= 20.0
    elif avg_comp > 6.0:
        score -= 10.0

    return round(max(0.0, min(100.0, score)), 2)


def calculate_architecture_score(architecture: Dict[str, Any]) -> float:
    """
    Architecture Score (0-100):
      Base Score: Derived from confidence_score of detected pattern (default 50 if flat/unstructured)
      Adjustments:
        - Layer violations: -20 pts per violation (max -40 pts)
        - Pattern bonus: +20 pts for clear MVC/Layered, Modular, or Clean architecture
        - God directory anti-pattern penalty: -15 pts if architectural problems exist
    """
    pattern = architecture.get("detected_pattern", "Flat / Unstructured Architecture")
    confidence = float(architecture.get("confidence_score", 40.0) or 40.0)
    if confidence <= 1.0:
        confidence *= 100.0

    score = confidence

    if "Flat" not in pattern and "Unstructured" not in pattern:
        score += 20.0

    violations = int(architecture.get("layer_violations_count", 0) or 0)
    score -= min(40.0, violations * 20.0)

    problems = architecture.get("architectural_problems", [])
    if problems:
        score -= min(25.0, len(problems) * 12.5)

    return round(max(0.0, min(100.0, score)), 2)


def calculate_testing_score(testing: Dict[str, Any]) -> float:
    """
    Testing Score (0-100):
      Base Score: 0 if no tests present.
      If tests present:
        - Base: 50 points for test presence
        - Ratio bonus: test_to_source_file_ratio * 50 pts (max 30 pts)
        - Coverage bonus: coverage_percentage * 0.20 pts (max 20 pts)
    """
    has_tests = testing.get("has_tests", False)
    if not has_tests:
        return 0.0

    score = 50.0

    file_ratio = float(testing.get("test_to_source_file_ratio", 0.0) or 0.0)
    score += min(30.0, file_ratio * 60.0)

    has_cov = testing.get("has_coverage_report", False)
    if has_cov:
        cov_pct = float(testing.get("coverage_percentage", 0.0) or 0.0)
        score += min(20.0, cov_pct * 0.20)
    else:
        score += 10.0  # partial bonus for test suite even without lcov report

    return round(max(0.0, min(100.0, score)), 2)


def calculate_security_score(security: Dict[str, Any]) -> float:
    """
    Security Score (0-100):
      Base Score: 100
      Deductions by Severity (excluding generated test/build artifacts):
        - Critical Finding: -25 pts each
        - High Finding:     -15 pts each
        - Medium Finding:   -5 pts each
        - Low Finding:      -2 pts each
    """
    score = 100.0
    findings = security.get("findings", [])

    if findings:
        # Exclude auto-generated test report bundles and build artifacts
        source_findings = [f for f in findings if not f.get("is_generated_artifact", False)]
        counts = {
            "Critical": sum(1 for f in source_findings if f.get("severity") == "Critical"),
            "High": sum(1 for f in source_findings if f.get("severity") == "High"),
            "Medium": sum(1 for f in source_findings if f.get("severity") == "Medium"),
            "Low": sum(1 for f in source_findings if f.get("severity") == "Low"),
        }
    else:
        counts = security.get("severity_counts", {})

    score -= float(counts.get("Critical", 0)) * SECURITY_PENALTY_CRITICAL
    score -= float(counts.get("High", 0)) * SECURITY_PENALTY_HIGH
    score -= float(counts.get("Medium", 0)) * SECURITY_PENALTY_MEDIUM
    score -= float(counts.get("Low", 0)) * SECURITY_PENALTY_LOW

    return round(max(0.0, min(100.0, score)), 2)


def calculate_documentation_score(documentation: Dict[str, Any]) -> float:
    """
    Documentation Score (0-100):
      Directly forwards documentation_score heuristic from Phase 13 module.
    """
    raw_score = float(documentation.get("documentation_score", 0.0) or 0.0)
    return round(max(0.0, min(100.0, raw_score)), 2)


def get_score_band(overall_score: float) -> str:
    """
    Categorizes overall score into standard project-defined quality bands.
    """
    if overall_score >= 90.0:
        return "Excellent"
    elif overall_score >= 75.0:
        return "Advanced"
    elif overall_score >= 60.0:
        return "Proficient"
    elif overall_score >= 40.0:
        return "Developing"
    else:
        return "Needs Improvement"


def calculate_scores(
    metrics: Dict[str, Any],
    complexity: Dict[str, Any],
    duplication: Dict[str, Any],
    testing: Dict[str, Any],
    documentation: Dict[str, Any],
    dependencies: Dict[str, Any],
    security: Dict[str, Any],
    architecture: Dict[str, Any],
    git_history: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculates sub-scores (0-100) and weighted overall quality score.

    Returns:
        Structured dictionary containing overall_score, score_band, sub_scores, and score_weights.
    """
    code_quality_score   = calculate_code_quality_score(metrics, duplication)
    maintainability_score = calculate_maintainability_score(complexity, duplication)
    complexity_score      = calculate_complexity_score(complexity)
    architecture_score   = calculate_architecture_score(architecture)
    testing_score        = calculate_testing_score(testing)
    security_score       = calculate_security_score(security)
    documentation_score  = calculate_documentation_score(documentation)

    # Calculate Composite Overall Score using Configurable Weights
    overall_score = (
        (code_quality_score   * WEIGHT_CODE_QUALITY) +
        (maintainability_score * WEIGHT_MAINTAINABILITY) +
        (architecture_score   * WEIGHT_ARCHITECTURE) +
        (testing_score        * WEIGHT_TESTING) +
        (security_score       * WEIGHT_SECURITY) +
        (documentation_score  * WEIGHT_DOCUMENTATION)
    )
    overall_score = round(max(0.0, min(100.0, overall_score)), 2)
    score_band = get_score_band(overall_score)

    sub_scores = {
        "code_quality":   code_quality_score,
        "maintainability": maintainability_score,
        "complexity":      complexity_score,
        "architecture":    architecture_score,
        "testing":         testing_score,
        "security":        security_score,
        "documentation":   documentation_score,
    }

    return {
        "status": "ok",
        "overall_score": overall_score,
        "score_band": score_band,
        "sub_scores": sub_scores,
        "score_weights": SCORE_WEIGHTS,
        "analysis_notes": (
            "Overall quality score calculated via weighted composite of 6 core quality sub-scores. "
            "Note: Scoring rules and weights represent this analyzer project's proprietary methodology, not an ISO standard."
        ),
        "analysis_tool": "Multi-Dimensional Software Quality Scoring Engine (Phase 18)"
    }
