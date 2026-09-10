"""
analyzer/tests/test_scoring_engine.py

Phase 26: Unit tests for the multi-dimensional software quality scoring engine.
Tests each sub-score calculator and the overall calculate_scores function.
"""

import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.scoring.scoring_engine import (
    calculate_code_quality_score,
    calculate_maintainability_score,
    calculate_complexity_score,
    calculate_architecture_score,
    calculate_testing_score,
    calculate_security_score,
    calculate_documentation_score,
    get_score_band,
    calculate_scores,
    SCORE_WEIGHTS,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helper fixtures
# ─────────────────────────────────────────────────────────────────────────────

def good_metrics():
    return {
        "total_loc": 5000, "code_loc": 4000, "comment_loc": 600,
        "test_files": 20, "source_files": 80
    }

def good_duplication():
    return {"duplication_percentage": 2.0, "duplicated_blocks": 1}

def good_complexity():
    return {
        "avg_complexity": 3.0, "max_complexity": 7,
        "high_complexity_count": 0, "total_functions": 50
    }

def good_architecture():
    return {"detected_pattern": "MVC", "confidence_score": 85.0, "layer_violations_count": 0}

def good_testing():
    return {
        "has_tests": True, "test_files_count": 20,
        "test_to_source_file_ratio": 0.25,
        "has_coverage_report": True, "coverage_percentage": 75.0,
    }

def good_security():
    return {
        "total_findings": 0,
        "severity_counts": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
    }

def good_documentation():
    return {"documentation_score": 80.0, "has_readme": True}


# ─────────────────────────────────────────────────────────────────────────────
# calculate_code_quality_score
# ─────────────────────────────────────────────────────────────────────────────

class TestCodeQualityScore:
    def test_perfect_code_is_high(self):
        score = calculate_code_quality_score(good_metrics(), good_duplication())
        assert score >= 70.0

    def test_score_in_valid_range(self):
        score = calculate_code_quality_score(good_metrics(), good_duplication())
        assert 0.0 <= score <= 100.0

    def test_high_duplication_lowers_score(self):
        high_dup = {"duplication_percentage": 45.0, "duplicated_blocks": 30}
        score = calculate_code_quality_score(good_metrics(), high_dup)
        low_dup_score = calculate_code_quality_score(good_metrics(), good_duplication())
        assert score < low_dup_score

    def test_zero_loc_does_not_crash(self):
        empty = {"total_loc": 0, "code_loc": 0, "comment_loc": 0, "test_files": 0, "source_files": 0}
        score = calculate_code_quality_score(empty, {"duplication_percentage": 0})
        assert 0.0 <= score <= 100.0


# ─────────────────────────────────────────────────────────────────────────────
# calculate_testing_score
# ─────────────────────────────────────────────────────────────────────────────

class TestTestingScore:
    def test_well_tested_project_scores_high(self):
        score = calculate_testing_score(good_testing())
        assert score >= 60.0

    def test_no_tests_scores_zero_or_low(self):
        no_tests = {
            "has_tests": False, "test_files_count": 0,
            "test_to_source_file_ratio": 0.0,
            "has_coverage_report": False, "coverage_percentage": None,
        }
        score = calculate_testing_score(no_tests)
        assert score <= 20.0

    def test_score_in_valid_range(self):
        score = calculate_testing_score(good_testing())
        assert 0.0 <= score <= 100.0


# ─────────────────────────────────────────────────────────────────────────────
# calculate_security_score
# ─────────────────────────────────────────────────────────────────────────────

class TestSecurityScore:
    def test_no_findings_is_100(self):
        score = calculate_security_score(good_security())
        assert score == 100.0

    def test_critical_finding_lowers_score(self):
        sec = {
            "total_findings": 1,
            "severity_counts": {"Critical": 1, "High": 0, "Medium": 0, "Low": 0}
        }
        score = calculate_security_score(sec)
        assert score < 100.0

    def test_score_never_goes_below_zero(self):
        sec = {
            "total_findings": 50,
            "severity_counts": {"Critical": 10, "High": 10, "Medium": 10, "Low": 10}
        }
        score = calculate_security_score(sec)
        assert score >= 0.0

    def test_score_in_valid_range(self):
        score = calculate_security_score(good_security())
        assert 0.0 <= score <= 100.0


# ─────────────────────────────────────────────────────────────────────────────
# calculate_complexity_score
# ─────────────────────────────────────────────────────────────────────────────

class TestComplexityScore:
    def test_simple_code_scores_high(self):
        score = calculate_complexity_score(good_complexity())
        assert score >= 60.0

    def test_very_complex_code_scores_low(self):
        complex_data = {
            "avg_complexity": 18.0, "max_complexity": 40,
            "high_complexity_count": 20, "total_functions": 50
        }
        score = calculate_complexity_score(complex_data)
        simple_score = calculate_complexity_score(good_complexity())
        assert score < simple_score

    def test_score_in_valid_range(self):
        score = calculate_complexity_score(good_complexity())
        assert 0.0 <= score <= 100.0


# ─────────────────────────────────────────────────────────────────────────────
# calculate_architecture_score
# ─────────────────────────────────────────────────────────────────────────────

class TestArchitectureScore:
    def test_high_confidence_scores_high(self):
        score = calculate_architecture_score(good_architecture())
        assert score >= 60.0

    def test_score_in_valid_range(self):
        score = calculate_architecture_score(good_architecture())
        assert 0.0 <= score <= 100.0

    def test_low_confidence_scores_lower(self):
        low_conf = {"detected_pattern": "Flat", "confidence_score": 0.1, "layer_violations_count": 5}
        score_low = calculate_architecture_score(low_conf)
        score_high = calculate_architecture_score(good_architecture())
        assert score_low < score_high


# ─────────────────────────────────────────────────────────────────────────────
# get_score_band
# ─────────────────────────────────────────────────────────────────────────────

class TestGetScoreBand:
    def test_100_is_excellent(self):
        assert get_score_band(100.0) == "Excellent"

    def test_90_is_excellent(self):
        assert get_score_band(90.0) == "Excellent"

    def test_89_is_advanced(self):
        assert get_score_band(89.0) == "Advanced"

    def test_75_is_advanced(self):
        assert get_score_band(75.0) == "Advanced"

    def test_74_is_proficient(self):
        assert get_score_band(74.0) == "Proficient"

    def test_60_is_proficient(self):
        assert get_score_band(60.0) == "Proficient"

    def test_59_is_developing(self):
        assert get_score_band(59.0) == "Developing"

    def test_40_is_developing(self):
        assert get_score_band(40.0) == "Developing"

    def test_39_is_needs_improvement(self):
        assert get_score_band(39.0) == "Needs Improvement"

    def test_0_is_needs_improvement(self):
        assert get_score_band(0.0) == "Needs Improvement"


# ─────────────────────────────────────────────────────────────────────────────
# SCORE_WEIGHTS
# ─────────────────────────────────────────────────────────────────────────────

class TestScoreWeights:
    def test_weights_sum_to_one(self):
        total = sum(SCORE_WEIGHTS.values())
        assert abs(total - 1.0) < 0.001

    def test_all_required_categories_present(self):
        required = {"code_quality", "maintainability", "architecture", "testing", "security", "documentation"}
        assert required.issubset(set(SCORE_WEIGHTS.keys()))

    def test_all_weights_positive(self):
        for key, val in SCORE_WEIGHTS.items():
            assert val > 0.0, f"Weight for {key} should be positive"


# ─────────────────────────────────────────────────────────────────────────────
# calculate_scores (integration)
# ─────────────────────────────────────────────────────────────────────────────

class TestCalculateScores:
    def _good_inputs(self):
        return dict(
            metrics=good_metrics(),
            complexity=good_complexity(),
            duplication=good_duplication(),
            testing=good_testing(),
            documentation=good_documentation(),
            dependencies={"total_dependency_count": 15},
            security=good_security(),
            architecture=good_architecture(),
            git_history={"total_commits": 200, "contributor_count": 5},
        )

    def test_returns_overall_score(self):
        result = calculate_scores(**self._good_inputs())
        assert "overall_score" in result
        assert 0.0 <= result["overall_score"] <= 100.0

    def test_returns_score_band(self):
        result = calculate_scores(**self._good_inputs())
        assert "score_band" in result
        assert result["score_band"] in (
            "Excellent", "Advanced", "Proficient", "Developing", "Needs Improvement"
        )

    def test_returns_sub_scores(self):
        result = calculate_scores(**self._good_inputs())
        sub = result.get("sub_scores", {})
        for key in ("code_quality", "maintainability", "architecture", "testing", "security", "documentation"):
            assert key in sub, f"sub_scores missing: {key}"

    def test_good_project_scores_above_50(self):
        result = calculate_scores(**self._good_inputs())
        assert result["overall_score"] >= 50.0
