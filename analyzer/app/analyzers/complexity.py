"""
analyzer/app/analyzers/complexity.py

Complexity Analyzer — Phase 10 (Section 10)

Calculates Cyclomatic Complexity (McCabe CC), Function Length (NLOC),
and File Complexity across Python, JavaScript, TypeScript, Java, and other languages.

Tool & Metric Citations:
  - Multi-Language Engine: `lizard` (https://github.com/terryyin/lizard)
    Lizard calculates standard McCabe Cyclomatic Complexity by counting decision points
    (if, for, while, case, catch, &&, ||, ?, etc.) across 15+ programming languages.
  - Python Verification: `radon` (https://radon.readthedocs.io/)
  - Complexity Thresholds (Industry Standard per McCabe & NIST 500-235):
      * 1 - 5   : Low Risk (Clean, easy to test and maintain)
      * 6 - 10  : Moderate Risk (Moderately complex)
      * 11 - 20 : High Risk (Complex, difficult to test thoroughly) [Warning Threshold: > 10]
      * 21+     : Very High / Extreme Risk (Untestable, high defect probability)
"""

import os
from pathlib import Path
from typing import Dict, List, Any
import lizard

# Directory exclusions matching repository analyzer
SKIP_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache",
    "node_modules", ".venv", "venv", "env", ".env",
    "dist", "build", ".build", "out", ".next", ".nuxt",
    "coverage", ".coverage", "htmlcov", ".tox", "eggs",
    ".eggs", "*.egg-info", ".idea", ".vscode", ".vs",
    "vendor", "Pods",
}

# Recognized code extensions for complexity analysis
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java",
    ".c", ".cpp", ".cc", ".h", ".cs", ".go",
    ".php", ".rb", ".rs", ".kt", ".swift", ".scala"
}

HIGH_COMPLEXITY_THRESHOLD = 10  # CC > 10 is considered high risk

def get_severity_label(complexity: int) -> str:
    """Classifies cyclomatic complexity according to standard McCabe tiers."""
    if complexity <= 5:
        return "low"
    elif complexity <= 10:
        return "moderate"
    elif complexity <= 20:
        return "high"
    else:
        return "very_high"


def analyze_complexity(repo_path: str) -> Dict[str, Any]:
    """
    Scans source files in repo_path and computes cyclomatic complexity metrics.

    Returns:
        {
            "total_functions": int,
            "avg_complexity": float,
            "max_complexity": int,
            "high_complexity_count": int,
            "high_complexity_threshold": int,
            "complexity_distribution": {
                "low": int,        # 1-5
                "moderate": int,   # 6-10
                "high": int,       # 11-20
                "very_high": int   # 21+
            },
            "top_complex_functions": [
                {
                    "name": str,
                    "file": str,
                    "line": int,
                    "end_line": int,
                    "complexity": int,
                    "nloc": int,
                    "parameters": int,
                    "severity": str
                }, ...
            ],
            "file_complexity": [
                {
                    "file": str,
                    "functions_count": int,
                    "avg_complexity": float,
                    "max_complexity": int,
                    "nloc": int
                }, ...
            ],
            "analysis_tool": str
        }
    """
    root = Path(repo_path).resolve()

    all_functions: List[Dict[str, Any]] = []
    file_summaries: List[Dict[str, Any]] = []

    distribution = {
        "low": 0,
        "moderate": 0,
        "high": 0,
        "very_high": 0
    }

    for dirpath, dirnames, filenames in os.walk(root):
        # Filter directories in-place
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and not d.endswith(".egg-info")
        ]

        for filename in filenames:
            fname_lower = filename.lower()
            if fname_lower.endswith(".min.js") or fname_lower.endswith(".bundle.js") or fname_lower.endswith("-min.js") or fname_lower.endswith(".pack.js"):
                continue
            ext = Path(filename).suffix.lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            full_path = os.path.join(dirpath, filename)
            try:
                rel_path = os.path.relpath(full_path, root).replace("\\", "/")
            except ValueError:
                rel_path = full_path.replace("\\", "/")

            try:
                file_info = lizard.analyze_file(full_path)
            except Exception:
                continue

            if not file_info or not file_info.function_list:
                continue

            file_complexities = []
            for func in file_info.function_list:
                cc = int(func.cyclomatic_complexity)
                nloc = int(func.nloc)
                param_count = len(func.parameters) if hasattr(func, "parameters") and func.parameters else 0
                severity = get_severity_label(cc)

                distribution[severity] += 1
                file_complexities.append(cc)

                all_functions.append({
                    "name": func.name or "<anonymous>",
                    "file": rel_path,
                    "line": int(func.start_line),
                    "end_line": int(func.end_line),
                    "complexity": cc,
                    "nloc": nloc,
                    "parameters": param_count,
                    "severity": severity
                })

            if file_complexities:
                file_avg_cc = round(sum(file_complexities) / len(file_complexities), 2)
                file_max_cc = max(file_complexities)
                file_summaries.append({
                    "file": rel_path,
                    "functions_count": len(file_complexities),
                    "avg_complexity": file_avg_cc,
                    "max_complexity": file_max_cc,
                    "nloc": int(file_info.nloc)
                })

    total_funcs = len(all_functions)
    if total_funcs > 0:
        total_cc = sum(f["complexity"] for f in all_functions)
        avg_cc = round(total_cc / total_funcs, 2)
        max_cc = max(f["complexity"] for f in all_functions)
    else:
        avg_cc = 0.0
        max_cc = 0

    high_complexity_count = distribution["high"] + distribution["very_high"]

    # Sort top complex functions descending by complexity, then nloc
    top_complex_functions = sorted(
        all_functions,
        key=lambda x: (x["complexity"], x["nloc"]),
        reverse=True
    )[:20]

    # Sort top complex files descending by max complexity, then avg complexity
    top_complex_files = sorted(
        file_summaries,
        key=lambda x: (x["max_complexity"], x["avg_complexity"]),
        reverse=True
    )[:15]

    return {
        "total_functions": total_funcs,
        "avg_complexity": avg_cc,
        "max_complexity": max_cc,
        "high_complexity_count": high_complexity_count,
        "high_complexity_threshold": HIGH_COMPLEXITY_THRESHOLD,
        "complexity_distribution": {
            "low": distribution["low"],
            "moderate": distribution["moderate"],
            "high": distribution["high"],
            "very_high": distribution["very_high"],
            "1_5": distribution["low"],
            "6_10": distribution["moderate"],
            "11_20": distribution["high"],
            "21_plus": distribution["very_high"]
        },
        "top_complex_functions": top_complex_functions,
        "file_complexity": top_complex_files,
        "analysis_tool": "lizard (multi-language McCabe Cyclomatic Complexity analyzer supporting JS, TS, Python, Java, C/C++, Go, Rust, PHP)"
    }
