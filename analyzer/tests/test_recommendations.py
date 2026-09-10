"""
analyzer/tests/test_recommendations.py

Phase 26: Unit tests for the actionable software quality recommendation engine.
Tests generate_recommendations with various metric combinations.
"""

import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.scoring.recommendations import generate_recommendations


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures — minimal valid payloads
# ─────────────────────────────────────────────────────────────────────────────

def base_inputs():
    return dict(
        metrics={
            "total_loc": 3000, "code_loc": 2500, "comment_loc": 250,
            "test_files": 5, "source_files": 40, "dependency_count": 15
        },
        complexity={
            "avg_complexity": 3.5, "max_complexity": 8,
            "high_complexity_count": 0, "top_complex_functions": []
        },
        duplication={
            "duplication_percentage": 3.0, "duplicated_blocks": 1, "duplicated_loc": 50
        },
        testing={
            "has_tests": True, "test_files_count": 5,
            "test_to_source_file_ratio": 0.12,
            "has_coverage_report": False, "coverage_percentage": None,
            "test_frameworks": ["pytest"]
        },
        documentation={
            "has_readme": True, "documentation_score": 65.0,
            "has_docs_dir": False, "comment_density_pct": 8.0
        },
        dependencies={
            "total_dependency_count": 15, "production_dependency_count": 12,
            "vulnerability_notes": None
        },
        security={
            "total_findings": 0,
            "findings": [],
            "severity_counts": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        },
        architecture={
            "detected_pattern": "MVC", "confidence_score": 0.75,
            "layer_violations_count": 0, "architectural_problems": []
        },
        git_history={
            "total_commits": 150, "contributor_count": 3,
            "recent_commits_30d": 10
        },
        scores={
            "overall_score": 65.0, "score_band": "Proficient",
            "code_quality_score": 70.0, "testing_score": 55.0
        }
    )


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestGenerateRecommendations:
    def test_returns_a_list(self):
        result = generate_recommendations(**base_inputs())
        assert isinstance(result, list)

    def test_each_rec_has_required_fields(self):
        result = generate_recommendations(**base_inputs())
        for rec in result:
            assert "priority" in rec
            assert "category" in rec
            assert "problem" in rec
            assert "suggested_action" in rec

    def test_priority_values_are_valid(self):
        result = generate_recommendations(**base_inputs())
        valid_priorities = {"HIGH", "MEDIUM", "LOW"}
        for rec in result:
            assert rec["priority"] in valid_priorities, f"Invalid priority: {rec['priority']}"

    def test_high_complexity_triggers_recommendation(self):
        inputs = base_inputs()
        inputs["complexity"]["max_complexity"] = 25
        inputs["complexity"]["high_complexity_count"] = 5
        inputs["complexity"]["top_complex_functions"] = [{"name": "big_function"}]
        result = generate_recommendations(**inputs)
        cats = [r["category"] for r in result]
        assert "Complexity" in cats

    def test_no_tests_triggers_testing_recommendation(self):
        inputs = base_inputs()
        inputs["testing"]["has_tests"] = False
        inputs["testing"]["test_files_count"] = 0
        inputs["testing"]["test_to_source_file_ratio"] = 0.0
        result = generate_recommendations(**inputs)
        cats = [r["category"] for r in result]
        assert "Testing" in cats

    def test_security_findings_trigger_recommendation(self):
        inputs = base_inputs()
        inputs["security"]["total_findings"] = 3
        inputs["security"]["findings"] = [
            {"severity": "High", "title": "SQL Injection", "file": "db.py",
             "line": 10, "description": "test", "recommendation": "fix"},
        ]
        inputs["security"]["severity_counts"] = {"Critical": 0, "High": 1, "Medium": 2, "Low": 0}
        result = generate_recommendations(**inputs)
        cats = [r["category"] for r in result]
        assert "Security" in cats

    def test_high_duplication_triggers_recommendation(self):
        inputs = base_inputs()
        inputs["duplication"]["duplication_percentage"] = 30.0
        inputs["duplication"]["duplicated_blocks"] = 20
        result = generate_recommendations(**inputs)
        cats = [r["category"] for r in result]
        assert "Duplication" in cats

    def test_perfect_project_returns_few_or_no_recommendations(self):
        inputs = base_inputs()
        # Make everything perfect
        inputs["complexity"]["max_complexity"] = 3
        inputs["complexity"]["high_complexity_count"] = 0
        inputs["duplication"]["duplication_percentage"] = 0.5
        inputs["testing"]["has_tests"] = True
        inputs["testing"]["test_to_source_file_ratio"] = 0.5
        inputs["testing"]["has_coverage_report"] = True
        inputs["testing"]["coverage_percentage"] = 90.0
        inputs["security"]["total_findings"] = 0
        inputs["documentation"]["has_readme"] = True
        inputs["documentation"]["documentation_score"] = 90.0
        inputs["architecture"]["confidence_score"] = 0.95
        inputs["architecture"]["layer_violations_count"] = 0
        result = generate_recommendations(**inputs)
        # A well-structured project should generate fewer recommendations
        assert len(result) <= 5

    def test_no_crash_with_empty_inputs(self):
        """generate_recommendations should not crash on empty/missing sub-dicts."""
        result = generate_recommendations(
            metrics={}, complexity={}, duplication={},
            testing={}, documentation={}, dependencies={},
            security={"total_findings": 0, "findings": [], "severity_counts": {}},
            architecture={}, git_history={}, scores={}
        )
        assert isinstance(result, list)
