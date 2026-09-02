"""
analyzer/app/analyzers/documentation.py

Documentation Completeness & Quality Heuristics Engine — Phase 13 (Section 13 & 42)

Classification: HEURISTIC (Rule 42)
  This module evaluates project documentation completeness via structural pattern heuristics:
  - Heading and keyword detection in README files (Description, Installation, Usage, Examples, API, Contributing).
  - Presence of dedicated documentation directories (docs/, doc/, documentation/).
  - Presence of standard open-source governance files (LICENSE, CONTRIBUTING.md, CHANGELOG.md).
  - Inline comment density ratio calculated from source code metrics.
  - Future Improvement Note: NLP-based documentation comprehension, semantic quality assessment,
    and API docstring coverage analysis are planned for future enhancement.

Transparent Scoring Formula (Total: 100 points):
  1. README presence & baseline substance: 20 points
  2. README structural section completeness: up to 30 points (5 points per key section:
     description, installation, usage, examples, api_docs, contributing)
  3. Dedicated docs/ directory: up to 20 points (10 pts for directory + up to 10 pts for doc files)
  4. Governance files: up to 15 points (5 pts each for LICENSE, CONTRIBUTING, CHANGELOG)
  5. Inline comment ratio: up to 15 points (scaled linearly to 15 pts for >= 10% comment-to-code ratio)
"""

import os
import re
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

# Section keyword heuristics for README parsing
SECTION_HEURISTICS = {
    "description": [
        r"overview", r"about", r"introduction", r"description", r"what is", r"features"
    ],
    "installation": [
        r"install", r"installation", r"getting started", r"setup", r"build", r"prerequisites", r"requirements"
    ],
    "usage": [
        r"usage", r"quick start", r"how to use", r"running", r"basic usage", r"start"
    ],
    "examples": [
        r"example", r"examples", r"demo", r"sample", r"use cases", r"tutorial"
    ],
    "api_documentation": [
        r"api", r"api reference", r"endpoints", r"methods", r"sdk", r"documentation", r"routes"
    ],
    "contributing": [
        r"contribut", r"development", r"pull request", r"code of conduct", r"guidelines", r"author"
    ],
    "license": [
        r"license", r"copyright", r"copying"
    ]
}

README_FILENAMES = ["readme.md", "readme.rst", "readme.txt", "readme"]
DOCS_DIR_NAMES = {"docs", "doc", "documentation", "guide", "guides"}
DOC_EXTENSIONS = {".md", ".rst", ".txt", ".adoc", ".pdf", ".html"}


def _find_readme(root: Path) -> Optional[Path]:
    """Finds the primary README file at the root level."""
    for name in README_FILENAMES:
        candidate = root / name
        if candidate.is_file():
            return candidate
    # Case-insensitive fallback
    try:
        for p in root.iterdir():
            if p.is_file() and p.stem.lower() == "readme":
                return p
    except Exception:
        pass
    return None


def _detect_readme_sections(readme_path: Path) -> Dict[str, bool]:
    """
    Scans README content for markdown headings and bold section titles matching key topics.
    Heuristic: Looks for '#+ <title>' or '**<title>**' or '<title>\n===='.
    """
    sections = {k: False for k in SECTION_HEURISTICS}
    try:
        content = readme_path.read_text(encoding="utf-8", errors="replace")
        lines = content.splitlines()

        # Check headings and bold tags
        headings = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            # Markdown heading (# ...)
            if stripped.startswith("#"):
                headings.append(stripped.lstrip("#").strip().lower())
            # Bold title line (**...**)
            elif stripped.startswith("**") and stripped.endswith("**"):
                headings.append(stripped.strip("*").strip().lower())
            # Underlined markdown heading (=== or ---)
            elif i > 0 and (stripped.startswith("===") or stripped.startswith("---")):
                prev_line = lines[i - 1].strip().lower()
                if prev_line:
                    headings.append(prev_line)

        # Match headings to sections
        for section_name, patterns in SECTION_HEURISTICS.items():
            pattern_regex = re.compile("|".join(patterns), re.IGNORECASE)
            for heading in headings:
                if pattern_regex.search(heading):
                    sections[section_name] = True
                    break

        # If README exists and has content > 100 chars, description is at least implicitly present
        if len(content.strip()) > 100 and not sections["description"]:
            sections["description"] = True

    except Exception:
        pass
    return sections


def _find_docs_directory(root: Path) -> Tuple[bool, int, List[str]]:
    """Checks for docs/ directory and counts documentation files within it."""
    for d_name in DOCS_DIR_NAMES:
        candidate = root / d_name
        if candidate.is_dir():
            doc_files = []
            for dp, dnames, fnames in os.walk(candidate):
                dnames[:] = [d for d in dnames if d not in SKIP_DIRS]
                for f in fnames:
                    if Path(f).suffix.lower() in DOC_EXTENSIONS:
                        rel = os.path.relpath(os.path.join(dp, f), root).replace("\\", "/")
                        doc_files.append(rel)
            return True, len(doc_files), doc_files[:30]
    return False, 0, []


def _check_governance_files(root: Path) -> Dict[str, bool]:
    """Checks for standard repository governance files."""
    files_present = {
        "license": False,
        "contributing": False,
        "changelog": False,
        "code_of_conduct": False
    }
    try:
        for p in root.iterdir():
            if not p.is_file():
                continue
            stem = p.stem.lower()
            if stem in ("license", "copying", "unlicense"):
                files_present["license"] = True
            elif "contributing" in stem:
                files_present["contributing"] = True
            elif "changelog" in stem or "history" in stem or "changes" in stem:
                files_present["changelog"] = True
            elif "code_of_conduct" in stem or "conduct" in stem:
                files_present["code_of_conduct"] = True
    except Exception:
        pass
    return files_present


def analyze_documentation(
    repo_path: str,
    code_loc: int = 0,
    comment_loc: int = 0
) -> Dict[str, Any]:
    """
    Evaluates project documentation completeness and computes a heuristic documentation score.

    Args:
        repo_path: Root filesystem path of repository.
        code_loc: Total code LOC from Phase 9 metrics.
        comment_loc: Total comment LOC from Phase 9 metrics.

    Returns:
        Structured documentation metrics dictionary labeled as HEURISTIC.
    """
    root = Path(repo_path).resolve()

    # 1. README inspection
    readme_file = _find_readme(root)
    has_readme = readme_file is not None
    readme_size_bytes = readme_file.stat().st_size if has_readme else 0
    readme_rel_path = readme_file.name if has_readme else None

    readme_sections = _detect_readme_sections(readme_file) if has_readme else {k: False for k in SECTION_HEURISTICS}

    # 2. Docs directory inspection
    has_docs_dir, docs_files_count, docs_sample_files = _find_docs_directory(root)

    # 3. Governance files
    governance = _check_governance_files(root)

    # 4. Comment density
    comment_density = round((comment_loc / code_loc) * 100, 2) if code_loc > 0 else 0.0

    # 5. Transparent Scoring Formula (0 - 100)
    score_breakdown = {
        "readme_presence": 0,      # max 20
        "readme_sections": 0,      # max 30 (5 pts each for 6 sections)
        "docs_directory": 0,       # max 20
        "governance_files": 0,     # max 15 (5 pts each for license, contributing, changelog)
        "comment_density": 0       # max 15
    }

    if has_readme:
        score_breakdown["readme_presence"] = 20 if readme_size_bytes > 200 else 10

    # 6 key README sections
    core_sections = ["description", "installation", "usage", "examples", "api_documentation", "contributing"]
    detected_core_count = sum(1 for s in core_sections if readme_sections.get(s, False))
    score_breakdown["readme_sections"] = min(30, detected_core_count * 5)

    # Docs directory
    if has_docs_dir:
        score_breakdown["docs_directory"] = 10 + min(10, docs_files_count * 2)

    # Governance files
    gov_pts = 0
    if governance["license"] or readme_sections.get("license", False):
        gov_pts += 5
    if governance["contributing"] or readme_sections.get("contributing", False):
        gov_pts += 5
    if governance["changelog"]:
        gov_pts += 5
    score_breakdown["governance_files"] = gov_pts

    # Comment density (10% density gets full 15 pts)
    score_breakdown["comment_density"] = round(min(15.0, (comment_density / 10.0) * 15.0), 2)

    total_score = round(
        score_breakdown["readme_presence"]
        + score_breakdown["readme_sections"]
        + score_breakdown["docs_directory"]
        + score_breakdown["governance_files"]
        + score_breakdown["comment_density"],
        2
    )

    # Concrete recommendations
    recommendations: List[str] = []
    if not has_readme:
        recommendations.append("Add a README.md to provide an overview, installation instructions, and usage examples.")
    else:
        missing_sections = [s.replace("_", " ").title() for s in core_sections if not readme_sections.get(s, False)]
        if missing_sections:
            recommendations.append(f"Enhance README.md by adding missing sections: {', '.join(missing_sections)}.")

    if not governance["license"]:
        recommendations.append("Add a LICENSE file to clearly specify open-source terms.")

    if not has_docs_dir and docs_files_count == 0 and total_score < 70:
        recommendations.append("Consider creating a dedicated 'docs/' directory for comprehensive guides and architecture diagrams.")

    return {
        "classification": "HEURISTIC",
        "documentation_score": total_score,
        "score_breakdown": score_breakdown,
        "has_readme": has_readme,
        "readme_file": readme_rel_path,
        "readme_size_bytes": readme_size_bytes,
        "readme_sections": readme_sections,
        "has_docs_dir": has_docs_dir,
        "docs_files_count": docs_files_count,
        "docs_sample_files": docs_sample_files,
        "governance_files": governance,
        "comment_density_pct": comment_density,
        "recommendations": recommendations,
        "analysis_notes": "Heuristic structural pattern analysis per Section 42. NLP-based semantic comprehension is a future improvement.",
        "analysis_tool": "Pattern & Heading Documentation Heuristic Evaluator (Rule 42 HEURISTIC)"
    }
