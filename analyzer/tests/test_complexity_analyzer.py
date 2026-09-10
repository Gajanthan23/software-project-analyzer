"""
analyzer/tests/test_complexity_analyzer.py

Phase 26: Unit tests for the cyclomatic complexity analyzer.
Tests get_severity_label and analyze_complexity against temp repos.
"""

import os
import tempfile
import shutil
import pytest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.analyzers.complexity import (
    get_severity_label,
    analyze_complexity,
    HIGH_COMPLEXITY_THRESHOLD,
)


# ─────────────────────────────────────────────────────────────────────────────
# get_severity_label
# ─────────────────────────────────────────────────────────────────────────────

class TestGetSeverityLabel:
    def test_complexity_1_is_low(self):
        assert get_severity_label(1) == "low"

    def test_complexity_5_is_low(self):
        assert get_severity_label(5) == "low"

    def test_complexity_6_is_moderate(self):
        assert get_severity_label(6) == "moderate"

    def test_complexity_10_is_moderate(self):
        assert get_severity_label(10) == "moderate"

    def test_complexity_11_is_high(self):
        assert get_severity_label(11) == "high"

    def test_complexity_20_is_high(self):
        assert get_severity_label(20) == "high"

    def test_complexity_21_is_very_high(self):
        assert get_severity_label(21) == "very_high"

    def test_complexity_50_is_very_high(self):
        assert get_severity_label(50) == "very_high"


# ─────────────────────────────────────────────────────────────────────────────
# HIGH_COMPLEXITY_THRESHOLD constant
# ─────────────────────────────────────────────────────────────────────────────

class TestConstants:
    def test_high_complexity_threshold_is_10(self):
        assert HIGH_COMPLEXITY_THRESHOLD == 10


# ─────────────────────────────────────────────────────────────────────────────
# analyze_complexity — integration with temp directory
# ─────────────────────────────────────────────────────────────────────────────

class TestAnalyzeComplexity:
    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()

        # Simple Python file with one function
        py_path = Path(self.tmpdir, "simple.py")
        py_path.write_text(
            "def add(a, b):\n"
            "    return a + b\n"
            "\n"
            "def is_even(n):\n"
            "    if n % 2 == 0:\n"
            "        return True\n"
            "    return False\n"
        )

    def teardown_method(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_returns_required_keys(self):
        result = analyze_complexity(self.tmpdir)
        for key in [
            "total_functions", "avg_complexity", "max_complexity",
            "high_complexity_count", "high_complexity_threshold",
            "complexity_distribution", "top_complex_functions",
            "file_complexity", "analysis_tool"
        ]:
            assert key in result, f"Missing key: {key}"

    def test_detects_functions(self):
        result = analyze_complexity(self.tmpdir)
        assert result["total_functions"] >= 1

    def test_avg_complexity_is_non_negative(self):
        result = analyze_complexity(self.tmpdir)
        assert result["avg_complexity"] >= 0.0

    def test_max_complexity_is_non_negative(self):
        result = analyze_complexity(self.tmpdir)
        assert result["max_complexity"] >= 0

    def test_complexity_distribution_has_expected_keys(self):
        result = analyze_complexity(self.tmpdir)
        dist = result["complexity_distribution"]
        for key in ("low", "moderate", "high", "very_high"):
            assert key in dist

    def test_empty_directory_returns_zero_functions(self):
        empty = tempfile.mkdtemp()
        try:
            result = analyze_complexity(empty)
            assert result["total_functions"] == 0
            assert result["avg_complexity"] == 0.0
        finally:
            shutil.rmtree(empty, ignore_errors=True)

    def test_high_complexity_threshold_value_in_result(self):
        result = analyze_complexity(self.tmpdir)
        assert result["high_complexity_threshold"] == HIGH_COMPLEXITY_THRESHOLD

    def test_top_complex_functions_is_list(self):
        result = analyze_complexity(self.tmpdir)
        assert isinstance(result["top_complex_functions"], list)
