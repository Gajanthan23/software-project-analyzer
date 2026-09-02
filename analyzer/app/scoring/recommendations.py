"""
analyzer/app/scoring/recommendations.py

Actionable Software Quality Recommendation Engine — Phase 19 (Section 19)

Rule-Based Remediation Generation:
  Evaluates outputs across all analysis dimensions and generates structured,
  prioritized remediation objects (priority, category, problem, explanation, suggested_action).
"""

from typing import Dict, List, Any


def generate_recommendations(
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
) -> List[Dict[str, Any]]:
    """
    Evaluates rule set against repo telemetry and generates prioritized recommendations.

    Returns:
        List of recommendation dictionaries:
        [
          {
            "priority": "HIGH" | "MEDIUM" | "LOW",
            "category": str,
            "problem": str,
            "explanation": str,
            "suggested_action": str
          }, ...
        ]
    """
    recs = []

    # ── Rule 1: High Cyclomatic Complexity ──────────────────────────────────
    max_comp = int(complexity.get("max_complexity", 1) or 1)
    high_comp_count = int(complexity.get("high_complexity_count", 0) or 0)
    top_funcs = complexity.get("top_complex_functions", [])

    if max_comp > 15 or high_comp_count > 0:
        worst_func = top_funcs[0]["name"] if top_funcs else "a key function"
        recs.append({
            "priority": "HIGH" if max_comp > 20 else "MEDIUM",
            "category": "Complexity",
            "problem": f"Elevated function complexity detected (Max Cyclomatic Complexity = {max_comp})",
            "explanation": f"{high_comp_count} function(s) exceed complexity threshold 10. Complex functions (e.g. {worst_func}) have many branching paths, making them exponentially harder to test and prone to regression bugs.",
            "suggested_action": "Decompose complex functions into smaller, single-responsibility helper functions. Refactor nested conditional loops into early guard clauses."
        })

    # ── Rule 2: High Code Duplication ───────────────────────────────────────
    dup_pct = float(duplication.get("duplication_percentage", 0.0) or 0.0)
    dup_blocks = int(duplication.get("duplicated_blocks", 0) or 0)

    if dup_pct > 5.0:
        recs.append({
            "priority": "HIGH" if dup_pct > 15.0 else "MEDIUM",
            "category": "Duplication",
            "problem": f"High code duplication detected ({dup_pct}% duplicated LOC across {dup_blocks} blocks)",
            "explanation": "Duplicated code blocks increase maintenance cost and risk inconsistent bug fixes when logic is updated in one location but missed in copies.",
            "suggested_action": "Extract repetitive code blocks into shared utility functions, reusable component modules, or base classes."
        })

    # ── Rule 3: Weak / Missing Test Suite ───────────────────────────────────
    has_tests = testing.get("has_tests", False)
    test_ratio = float(testing.get("test_to_source_file_ratio", 0.0) or 0.0)

    if not has_tests:
        recs.append({
            "priority": "HIGH",
            "category": "Testing",
            "problem": "No automated test suite detected in repository",
            "explanation": "Repositories without automated unit or integration tests lack automated safety nets, drastically increasing the probability of shipping production regressions.",
            "suggested_action": "Setup a modern test framework (e.g. Jest/Vitest for JS/TS, PyTest for Python, JUnit for Java) and write unit tests for critical business logic."
        })
    elif test_ratio < 0.20:
        recs.append({
            "priority": "MEDIUM",
            "category": "Testing",
            "problem": f"Low test-to-source file coverage ratio ({round(test_ratio * 100, 1)}%)",
            "explanation": "The ratio of test files relative to source code files is below recommended thresholds (20%+).",
            "suggested_action": "Increase automated test coverage by adding unit tests for untested modules and controllers."
        })

    # ── Rule 4: Security Findings Present ───────────────────────────────────
    total_sec = int(security.get("total_findings", 0) or 0)
    sec_counts = security.get("severity_counts", {})
    crit_count = int(sec_counts.get("Critical", 0))
    high_sec_count = int(sec_counts.get("High", 0))

    if total_sec > 0:
        prio = "HIGH" if (crit_count > 0 or high_sec_count > 0) else "MEDIUM"
        recs.append({
            "priority": prio,
            "category": "Security",
            "problem": f"Potential security issues identified ({total_sec} total finding(s): {crit_count} Critical, {high_sec_count} High)",
            "explanation": "Static security scanning detected potential vulnerabilities such as hardcoded secrets, unsafe deserialization, or dynamic execution paths.",
            "suggested_action": "Inspect security findings report, revoke any exposed hardcoded credentials, and apply recommended secure coding fixes."
        })

    # ── Rule 5: Architectural Layering Violations & Smells ──────────────────
    violations = int(architecture.get("layer_violations_count", 0) or 0)
    pattern = architecture.get("detected_pattern", "")

    if violations > 0:
        recs.append({
            "priority": "HIGH",
            "category": "Architecture",
            "problem": f"Architectural layering violations detected ({violations} occurrence(s))",
            "explanation": "Controller/route files were found directly importing database clients or ORM models, bypassing domain service layers.",
            "suggested_action": "Enforce strict layer boundaries. Route database queries through dedicated service or repository interfaces rather than direct controller access."
        })
    elif "Flat" in pattern or "Unstructured" in pattern:
        recs.append({
            "priority": "LOW",
            "category": "Architecture",
            "problem": "Unstructured / Flat repository folder organization",
            "explanation": "Source files reside in root or flat directories without clear domain separation.",
            "suggested_action": "Organize source code into structured layers (e.g. controllers/, services/, models/) or domain modules to improve project navigability."
        })

    # ── Rule 6: Incomplete Documentation ────────────────────────────────────
    has_readme = documentation.get("has_readme", False)
    doc_score = float(documentation.get("documentation_score", 0.0) or 0.0)

    if not has_readme:
        recs.append({
            "priority": "MEDIUM",
            "category": "Documentation",
            "problem": "Missing README.md documentation file",
            "explanation": "A README file is the primary entry point for developers to understand installation, setup, and usage.",
            "suggested_action": "Add a root README.md file containing project overview, installation commands, usage examples, and API references."
        })
    elif doc_score < 60.0:
        recs.append({
            "priority": "LOW",
            "category": "Documentation",
            "problem": f"Documentation completeness score is low ({round(doc_score, 1)}/100)",
            "explanation": "README file is missing standard sections (such as Installation, Usage, or Contribution Guides) or inline comment density is low.",
            "suggested_action": "Expand README.md with clear step-by-step setup guides and document key public API methods."
        })

    # ── Rule 7: High Production Dependency Count ───────────────────────────
    prod_deps = int(dependencies.get("production_dependency_count", 0) or 0)
    if prod_deps > 35:
        recs.append({
            "priority": "LOW",
            "category": "Dependencies",
            "problem": f"Large number of production dependencies ({prod_deps} packages)",
            "explanation": "Excessive direct dependencies increase attack surface area, supply-chain vulnerabilities, and bundle size.",
            "suggested_action": "Audit package manifest files to prune unused or redundant third-party dependencies."
        })

    # Sort recommendations by priority: HIGH -> MEDIUM -> LOW
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recs.sort(key=lambda r: priority_order.get(r["priority"], 3))

    return recs
