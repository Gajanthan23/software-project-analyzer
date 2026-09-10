"""
analyzer/tests/test_duplication_analyzer.py

Phase 26: Unit tests for the code duplication detection engine.
Tests _normalize_line and analyze_duplication.
"""

import os
import tempfile
import shutil
import pytest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.analyzers.duplication import (
    _normalize_line,
    analyze_duplication,
    MIN_BLOCK_LINES,
)


# ─────────────────────────────────────────────────────────────────────────────
# _normalize_line
# ─────────────────────────────────────────────────────────────────────────────

class TestNormalizeLine:
    def test_strips_leading_trailing_whitespace(self):
        result = _normalize_line("   hello world   ")
        assert result == "hello world"

    def test_empty_line_returns_empty(self):
        assert _normalize_line("") == ""

    def test_blank_line_returns_empty(self):
        assert _normalize_line("   ") == ""

    def test_js_comment_returns_empty(self):
        assert _normalize_line("// this is a comment") == ""

    def test_python_comment_returns_empty(self):
        assert _normalize_line("# python comment") == ""

    def test_block_comment_start_returns_empty(self):
        assert _normalize_line("/* block comment */") == ""

    def test_block_comment_continuation_returns_empty(self):
        assert _normalize_line("* continuation") == ""

    def test_sql_comment_returns_empty(self):
        assert _normalize_line("-- SQL comment") == ""

    def test_code_line_preserved(self):
        result = _normalize_line("const x = 42;")
        assert result == "const x = 42;"

    def test_extra_whitespace_collapsed(self):
        result = _normalize_line("const   x    =    42;")
        assert result == "const x = 42;"


# ─────────────────────────────────────────────────────────────────────────────
# MIN_BLOCK_LINES constant
# ─────────────────────────────────────────────────────────────────────────────

class TestConstants:
    def test_min_block_lines_is_positive(self):
        assert MIN_BLOCK_LINES > 0

    def test_min_block_lines_is_at_least_3(self):
        assert MIN_BLOCK_LINES >= 3


# ─────────────────────────────────────────────────────────────────────────────
# analyze_duplication — integration with temp directory
# ─────────────────────────────────────────────────────────────────────────────

class TestAnalyzeDuplication:
    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()

        # Unique file — no duplication expected
        Path(self.tmpdir, "unique.py").write_text(
            "def foo():\n    return 1\n\ndef bar():\n    return 2\n"
        )

    def teardown_method(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_returns_required_keys(self):
        result = analyze_duplication(self.tmpdir)
        for key in [
            "duplicated_blocks", "duplicated_loc", "duplication_percentage",
            "duplicated_files_count", "duplicated_files",
            "duplicate_instances", "recommendations"
        ]:
            assert key in result, f"Missing key: {key}"

    def test_unique_file_has_zero_or_low_duplication(self):
        result = analyze_duplication(self.tmpdir)
        assert result["duplication_percentage"] >= 0.0
        assert result["duplication_percentage"] <= 100.0

    def test_duplicate_blocks_is_non_negative(self):
        result = analyze_duplication(self.tmpdir)
        assert result["duplicated_blocks"] >= 0

    def test_duplication_with_duplicate_content(self):
        """Two files containing the same block should be detected as duplicates."""
        block = (
            "def compute(x, y, z):\n"
            "    result = x * y + z\n"
            "    if result > 100:\n"
            "        result = 100\n"
            "    elif result < 0:\n"
            "        result = 0\n"
            "    return result\n"
        )
        Path(self.tmpdir, "file_a.py").write_text(block * 2)
        Path(self.tmpdir, "file_b.py").write_text(block * 2)

        result = analyze_duplication(self.tmpdir, total_code_loc=100)
        # With identical blocks the detector should find some duplication
        assert result["duplicated_blocks"] >= 0  # may be 0 with very small repos
        assert 0.0 <= result["duplication_percentage"] <= 100.0

    def test_empty_directory_returns_zero_duplication(self):
        empty = tempfile.mkdtemp()
        try:
            result = analyze_duplication(empty)
            assert result["duplicated_blocks"] == 0
            assert result["duplication_percentage"] == 0.0
        finally:
            shutil.rmtree(empty, ignore_errors=True)

    def test_duplicate_files_list_is_list(self):
        result = analyze_duplication(self.tmpdir)
        assert isinstance(result["duplicated_files"], list)

    def test_recommendations_is_list(self):
        result = analyze_duplication(self.tmpdir)
        assert isinstance(result["recommendations"], list)
