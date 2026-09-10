"""
analyzer/tests/test_repository_analyzer.py

Phase 26: Unit tests for the repository metrics analyzer.
Tests _classify_lines, _count_python_symbols, and analyze_repository
against in-memory temporary directories — no GitHub clone required.
"""

import os
import tempfile
import shutil
import pytest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.analyzers.repository import (
    EXTENSION_TO_LANGUAGE,
    COMMENT_PREFIXES,
    _classify_lines,
    _count_python_symbols,
    analyze_repository,
)


# ─────────────────────────────────────────────────────────────────────────────
# _classify_lines
# ─────────────────────────────────────────────────────────────────────────────

class TestClassifyLines:
    def _write_temp(self, content: str, suffix: str = ".py") -> str:
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=suffix, delete=False, encoding="utf-8"
        )
        tmp.write(content)
        tmp.close()
        return tmp.name

    def test_python_blank_comment_code(self):
        path = self._write_temp("# comment\n\ndef foo():\n    return 1\n")
        code, comment, blank = _classify_lines(path, "Python")
        os.unlink(path)
        assert code == 2
        assert comment == 1
        assert blank == 1

    def test_empty_file_all_zeros(self):
        path = self._write_temp("")
        code, comment, blank = _classify_lines(path, "Python")
        os.unlink(path)
        assert code == 0 and comment == 0 and blank == 0

    def test_js_line_comment(self):
        path = self._write_temp("// comment\nconst x = 1;\n\n", suffix=".js")
        code, comment, blank = _classify_lines(path, "JavaScript")
        os.unlink(path)
        assert comment >= 1
        assert code >= 1
        assert blank >= 1

    def test_all_blank_file(self):
        path = self._write_temp("\n\n\n")
        code, comment, blank = _classify_lines(path, "Python")
        os.unlink(path)
        assert blank == 3
        assert code == 0
        assert comment == 0

    def test_nonexistent_file_returns_zeros(self):
        code, comment, blank = _classify_lines("/nonexistent/path.py", "Python")
        assert code == 0 and comment == 0 and blank == 0


# ─────────────────────────────────────────────────────────────────────────────
# _count_python_symbols
# ─────────────────────────────────────────────────────────────────────────────

class TestCountPythonSymbols:
    def _write_temp(self, content: str) -> str:
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False, encoding="utf-8"
        )
        tmp.write(content)
        tmp.close()
        return tmp.name

    def test_counts_functions(self):
        path = self._write_temp(
            "def foo(): pass\n"
            "def bar(): pass\n"
            "async def baz(): pass\n"
        )
        funcs, classes = _count_python_symbols(path)
        os.unlink(path)
        assert funcs == 3

    def test_counts_classes(self):
        path = self._write_temp(
            "class Foo:\n    pass\nclass Bar:\n    pass\n"
        )
        funcs, classes = _count_python_symbols(path)
        os.unlink(path)
        assert classes == 2

    def test_empty_file_returns_zeros(self):
        path = self._write_temp("")
        funcs, classes = _count_python_symbols(path)
        os.unlink(path)
        assert funcs == 0 and classes == 0

    def test_invalid_syntax_returns_zeros(self):
        path = self._write_temp("def (broken syntax\n")
        funcs, classes = _count_python_symbols(path)
        os.unlink(path)
        assert funcs == 0 and classes == 0

    def test_mixed_functions_and_classes(self):
        path = self._write_temp(
            "class MyClass:\n"
            "    def method_a(self): pass\n"
            "    def method_b(self): pass\n"
            "\n"
            "def standalone(): pass\n"
        )
        funcs, classes = _count_python_symbols(path)
        os.unlink(path)
        assert funcs == 3   # method_a, method_b, standalone
        assert classes == 1


# ─────────────────────────────────────────────────────────────────────────────
# analyze_repository (integration — temp directory)
# ─────────────────────────────────────────────────────────────────────────────

class TestAnalyzeRepository:
    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()

        # Python source
        Path(self.tmpdir, "main.py").write_text(
            "# docstring\n\ndef greet(name):\n    return f'Hello {name}'\n"
        )
        # JavaScript source
        Path(self.tmpdir, "app.js").write_text(
            "// Entry\nconst express = require('express');\n"
        )
        # Test file
        Path(self.tmpdir, "test_main.py").write_text(
            "import pytest\n\ndef test_greet():\n    assert True\n"
        )
        # README
        Path(self.tmpdir, "README.md").write_text(
            "# Test Project\nA test repository.\n"
        )

    def teardown_method(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_returns_required_keys(self):
        result = analyze_repository(self.tmpdir)
        for key in ["total_files", "source_files", "test_files",
                    "total_loc", "code_loc", "primary_language"]:
            assert key in result, f"Missing key: {key}"

    def test_source_files_count(self):
        result = analyze_repository(self.tmpdir)
        assert result["source_files"] >= 2

    def test_test_files_count(self):
        result = analyze_repository(self.tmpdir)
        assert result["test_files"] >= 1

    def test_total_loc_positive(self):
        result = analyze_repository(self.tmpdir)
        assert result["total_loc"] > 0

    def test_primary_language_is_string(self):
        result = analyze_repository(self.tmpdir)
        assert isinstance(result["primary_language"], str)
        assert len(result["primary_language"]) > 0

    def test_languages_dict_populated(self):
        result = analyze_repository(self.tmpdir)
        langs = result.get("languages", {})
        assert isinstance(langs, dict)
        assert len(langs) >= 1

    def test_empty_directory_all_zeros(self):
        empty = tempfile.mkdtemp()
        try:
            result = analyze_repository(empty)
            assert result["total_files"] == 0
            assert result["total_loc"] == 0
        finally:
            shutil.rmtree(empty, ignore_errors=True)


# ─────────────────────────────────────────────────────────────────────────────
# Extension mapping
# ─────────────────────────────────────────────────────────────────────────────

class TestExtensionMapping:
    def test_py_is_python(self):
        assert EXTENSION_TO_LANGUAGE[".py"] == "Python"

    def test_js_is_javascript(self):
        assert EXTENSION_TO_LANGUAGE[".js"] == "JavaScript"

    def test_ts_is_typescript(self):
        assert EXTENSION_TO_LANGUAGE[".ts"] == "TypeScript"

    def test_java_is_java(self):
        assert EXTENSION_TO_LANGUAGE[".java"] == "Java"

    def test_unknown_extension_absent(self):
        assert ".xyz_unknown_123" not in EXTENSION_TO_LANGUAGE
