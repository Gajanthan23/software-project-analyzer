"""
analyzer/app/analyzers/testing.py

Testing Suite & Coverage Analyzer — Phase 12 (Section 12)

Detects:
  1. Test files & directories using standard naming patterns across Python, JS/TS, Java, Go, C#, Ruby, PHP.
  2. Test frameworks in use via dependency files and source file imports (Jest, PyTest, JUnit, Mocha, etc.).
  3. Real coverage report files (lcov.info, coverage.xml, clover.xml, jacoco.xml, coverage-summary.json).
  4. Test-to-source file ratios and test-to-source LOC ratios.
  5. Strict Rule 4 Compliance: If no coverage report file is present on disk, coverage is explicitly marked
     as 'Coverage data unavailable' with None percentage — no estimation or fabricated numbers.
"""

import os
import re
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

SKIP_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache",
    "node_modules", ".venv", "venv", "env", ".env",
    "dist", "build", ".build", "out", ".next", ".nuxt",
    "coverage", ".coverage", "htmlcov", ".tox", "eggs",
    ".eggs", "*.egg-info", ".idea", ".vscode", ".vs",
    "vendor", "Pods",
}

# Supported source file extensions
SOURCE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java",
    ".c", ".cpp", ".cc", ".h", ".cs", ".go",
    ".php", ".rb", ".rs", ".kt", ".swift", ".scala"
}

# Test filename patterns
TEST_FILE_PATTERNS = [
    # Python
    r"^test_.+\.py$",
    r"^.+_test\.py$",
    # JavaScript / TypeScript
    r"^.+\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$",
    # Java / Kotlin / Scala
    r"^.+Test(s|Case)?\.(java|kt|scala)$",
    r"^Test.+\.(java|kt|scala)$",
    # Go
    r"^.+_test\.go$",
    # C#
    r"^.+Test(s)?\.cs$",
    # Ruby
    r"^.+_(test|spec)\.rb$",
    # PHP
    r"^.+Test\.php$",
]
TEST_FILE_REGEX = re.compile("|".join(TEST_FILE_PATTERNS), re.IGNORECASE)

# Test directory patterns (e.g. tests/, __tests__/, spec/)
TEST_DIR_REGEX = re.compile(r"(^|[/\\])(tests?|__tests__|specs?|test_suite)([/\\]|$)", re.IGNORECASE)

# Known test frameworks by dependency/import token
FRAMEWORK_SIGNATURES = {
    # JavaScript / TypeScript
    "jest": ["jest", "@jest/core", "ts-jest", "babel-jest"],
    "mocha": ["mocha"],
    "chai": ["chai"],
    "vitest": ["vitest"],
    "jasmine": ["jasmine", "jasmine-core"],
    "cypress": ["cypress"],
    "playwright": ["@playwright/test", "playwright"],
    "ava": ["ava"],
    "supertest": ["supertest"],
    "tape": ["tape"],
    # Python
    "pytest": ["pytest", "pytest-cov", "pytest-asyncio", "pytest-mock"],
    "unittest": ["unittest"],
    "nose": ["nose", "nose2"],
    "robotframework": ["robotframework"],
    "behave": ["behave"],
    # Java
    "junit": ["junit", "org.junit.jupiter", "org.junit.Test"],
    "testng": ["org.testng", "testng"],
    "mockito": ["org.mockito", "mockito-core"],
    # Go
    "testing": ['"testing"'],
    "testify": ["github.com/stretchr/testify"],
    "ginkgo": ["github.com/onsi/ginkgo"],
    # PHP
    "phpunit": ["phpunit/phpunit", "PHPUnit\\Framework"],
    # Ruby
    "rspec": ["rspec", "rspec-core"],
    "minitest": ["minitest"],
}


def _count_file_lines(filepath: str) -> int:
    """Counts non-empty lines in a file."""
    count = 0
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if line.strip():
                    count += 1
    except (OSError, PermissionError):
        pass
    return count


def _detect_frameworks(repo_path: Path) -> List[str]:
    """Inspects package.json, requirements.txt, pyproject.toml, pom.xml, and imports for test frameworks."""
    detected = set()

    # 1. Inspect package.json
    pkg_json = repo_path / "package.json"
    if pkg_json.is_file():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8", errors="replace"))
            deps = {
                **data.get("dependencies", {}),
                **data.get("devDependencies", {}),
                **data.get("peerDependencies", {})
            }
            scripts = data.get("scripts", {})
            for fw, signatures in FRAMEWORK_SIGNATURES.items():
                for sig in signatures:
                    if sig in deps:
                        detected.add(fw)
                    for script_cmd in scripts.values():
                        if sig in script_cmd.split():
                            detected.add(fw)
        except Exception:
            pass

    # 2. Inspect requirements.txt / pyproject.toml / Pipfile
    for req_file in ["requirements.txt", "requirements-dev.txt", "pyproject.toml", "Pipfile"]:
        rf = repo_path / req_file
        if rf.is_file():
            try:
                content = rf.read_text(encoding="utf-8", errors="replace").lower()
                for fw, signatures in FRAMEWORK_SIGNATURES.items():
                    for sig in signatures:
                        if sig.lower() in content:
                            detected.add(fw)
            except Exception:
                pass

    # 3. Inspect pom.xml / build.gradle
    for b_file in ["pom.xml", "build.gradle", "build.gradle.kts"]:
        bf = repo_path / b_file
        if bf.is_file():
            try:
                content = bf.read_text(encoding="utf-8", errors="replace").lower()
                for fw, signatures in FRAMEWORK_SIGNATURES.items():
                    for sig in signatures:
                        if sig.lower() in content:
                            detected.add(fw)
            except Exception:
                pass

    return sorted(list(detected))


def _parse_coverage_report(repo_path: Path) -> Dict[str, Any]:
    """
    Looks for coverage artifacts (lcov.info, coverage.xml, clover.xml, jacoco.xml, coverage-summary.json)
    and parses exact coverage percentage if present on disk.
    Strictly reports 'unavailable' if no file exists.
    """
    coverage_candidates = [
        ("lcov", ["coverage/lcov.info", "lcov.info", ".coverage/lcov.info"]),
        ("cobertura", ["coverage.xml", "cobertura.xml", "coverage/cobertura-coverage.xml"]),
        ("clover", ["coverage/clover.xml", "clover.xml"]),
        ("jacoco", ["target/site/jacoco/jacoco.xml", "jacoco.xml"]),
        ("json", ["coverage/coverage-summary.json", "coverage-summary.json"])
    ]

    for format_type, paths in coverage_candidates:
        for rel_p in paths:
            full_p = repo_path / rel_p
            if full_p.is_file():
                try:
                    if format_type == "lcov":
                        # Parse lcov LF (lines found) and LH (lines hit)
                        total_found = 0
                        total_hit = 0
                        with open(full_p, "r", encoding="utf-8", errors="replace") as f:
                            for line in f:
                                if line.startswith("LF:"):
                                    total_found += int(line.split(":")[1].strip())
                                elif line.startswith("LH:"):
                                    total_hit += int(line.split(":")[1].strip())
                        if total_found > 0:
                            pct = round((total_hit / total_found) * 100, 2)
                            return {
                                "has_coverage_report": True,
                                "status": "available",
                                "coverage_percentage": pct,
                                "report_file": rel_p,
                                "format": "LCOV",
                                "lines_found": total_found,
                                "lines_hit": total_hit,
                                "message": f"Coverage of {pct}% parsed from {rel_p}."
                            }

                    elif format_type in ("cobertura", "clover"):
                        tree = ET.parse(full_p)
                        root_elem = tree.getroot()
                        line_rate = root_elem.get("line-rate")
                        if line_rate is not None:
                            pct = round(float(line_rate) * 100, 2)
                            return {
                                "has_coverage_report": True,
                                "status": "available",
                                "coverage_percentage": pct,
                                "report_file": rel_p,
                                "format": format_type.upper(),
                                "message": f"Coverage of {pct}% parsed from {rel_p}."
                            }

                    elif format_type == "json":
                        data = json.loads(full_p.read_text(encoding="utf-8", errors="replace"))
                        total_stats = data.get("total", {})
                        lines_pct = total_stats.get("lines", {}).get("pct")
                        if lines_pct is not None:
                            return {
                                "has_coverage_report": True,
                                "status": "available",
                                "coverage_percentage": float(lines_pct),
                                "report_file": rel_p,
                                "format": "Istanbul JSON",
                                "message": f"Coverage of {lines_pct}% parsed from {rel_p}."
                            }
                except Exception:
                    pass

    return {
        "has_coverage_report": False,
        "status": "unavailable",
        "coverage_percentage": None,
        "report_file": None,
        "message": "Coverage data unavailable (no coverage report found on disk)."
    }


def analyze_testing(repo_path: str) -> Dict[str, Any]:
    """
    Scans repository for test files, test directories, frameworks, and coverage data.

    Returns:
        {
            "has_tests": bool,
            "test_files_count": int,
            "source_files_count": int,
            "test_to_source_file_ratio": float,
            "test_loc": int,
            "source_loc": int,
            "test_to_source_loc_ratio": float,
            "test_frameworks": List[str],
            "has_coverage_report": bool,
            "coverage_percentage": Optional[float],
            "coverage_status": str,
            "coverage_message": str,
            "test_directories": List[str],
            "test_files": List[str],
            "analysis_tool": str
        }
    """
    root = Path(repo_path).resolve()

    test_files: List[str] = []
    test_dirs: Set[str] = set()
    test_loc = 0
    source_files_count = 0
    source_loc = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and not d.endswith(".egg-info")
        ]

        try:
            rel_dir = os.path.relpath(dirpath, root).replace("\\", "/")
        except ValueError:
            rel_dir = ""

        is_in_test_dir = bool(TEST_DIR_REGEX.search(rel_dir))

        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext not in SOURCE_EXTENSIONS:
                continue

            full_path = os.path.join(dirpath, filename)
            try:
                rel_file = os.path.relpath(full_path, root).replace("\\", "/")
            except ValueError:
                rel_file = filename

            is_test_filename = bool(TEST_FILE_REGEX.search(filename))
            is_test_file = is_test_filename or is_in_test_dir

            file_lines = _count_file_lines(full_path)

            if is_test_file:
                test_files.append(rel_file)
                test_loc += file_lines
                if rel_dir and rel_dir != ".":
                    test_dirs.add(rel_dir)
            else:
                source_files_count += 1
                source_loc += file_lines

    test_files_count = len(test_files)
    has_tests = test_files_count > 0

    # Ratios
    file_ratio = round(test_files_count / source_files_count, 2) if source_files_count > 0 else 0.0
    loc_ratio = round(test_loc / source_loc, 2) if source_loc > 0 else 0.0

    # Framework detection
    detected_frameworks = _detect_frameworks(root)

    # Coverage report parsing (Strict Rule 4: never fabricate numbers)
    coverage_result = _parse_coverage_report(root)

    return {
        "has_tests": has_tests,
        "test_files_count": test_files_count,
        "source_files_count": source_files_count,
        "test_to_source_file_ratio": file_ratio,
        "test_loc": test_loc,
        "source_loc": source_loc,
        "test_to_source_loc_ratio": loc_ratio,
        "test_frameworks": detected_frameworks,
        "has_coverage_report": coverage_result["has_coverage_report"],
        "coverage_percentage": coverage_result["coverage_percentage"],
        "coverage_status": coverage_result["status"],
        "coverage_message": coverage_result["message"],
        "test_directories": sorted(list(test_dirs)),
        "test_files": sorted(test_files)[:50],
        "analysis_tool": "Pattern & AST Test Suite Analyzer with LCOV/Cobertura/Istanbul Coverage Parser"
    }
