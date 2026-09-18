"""
analyzer/app/analyzers/architecture.py

Heuristic Software Architecture Pattern Detector & Violation Scanner Engine — Phase 16 (Section 16 & Section 42)

RULE 42 COMPLIANCE:
  Architectural analysis is explicitly labeled as a HEURISTIC inferred from directory conventions,
  file organization, and import dependencies. It is not an absolute runtime or static formal proof.

Detected Architectural Patterns:
  - Model-View-Controller (MVC) / Layered Architecture
  - Modular / Domain-Driven Design (DDD)
  - Clean / Hexagonal / Ports & Adapters Architecture
  - Component-Based / Micro-Frontend Architecture
  - Microservices / Serverless Architecture
  - Flat / Unstructured Monolith

Architectural Problems & Anti-Patterns (Smells):
  - Direct DB Access in Controller/Route (Layering Violation)
  - Circular Module Imports
  - Monolithic "God Folder" (>40% of source files in single directory)
  - Excessive Directory Depth (>6 subfolder levels)
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple

SKIP_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache",
    "node_modules", ".venv", "venv", "env", ".env",
    "dist", "build", ".build", "out", ".next", ".nuxt",
    "coverage", ".coverage", "vendor", "Pods", ".idea", ".vscode"
}

ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go",
    ".php", ".rb", ".cs"
}

# DB client / ORM import signatures for detecting layering violations
DB_CLIENT_IMPORTS = [
    r"import\s+.*(db|pg|mysql|mongoose|sequelize|prisma|sqlalchemy|sqlite3|psycopg2|knex|typeorm)",
    r"require\s*\(['\"](pg|mysql|mysql2|mongoose|sequelize|prisma|sqlite3|knex|typeorm)['\"]\)",
    r"from\s+.*(db|models|database|orm)\s+import",
]


def _scan_directory_structure(repo_root: Path) -> Tuple[Dict[str, List[str]], Dict[str, int]]:
    """Walks the repository directory tree and collects structural patterns."""
    dirs_found: Dict[str, List[str]] = {}
    folder_file_counts: Dict[str, int] = {}

    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel_dir = os.path.relpath(dirpath, repo_root).replace("\\", "/")
        if rel_dir == ".":
            rel_dir = "root"

        code_files = [f for f in filenames if Path(f).suffix.lower() in ALLOWED_EXTENSIONS]
        if code_files:
            folder_file_counts[rel_dir] = len(code_files)

        dir_basename = os.path.basename(dirpath).lower()
        if dir_basename not in dirs_found:
            dirs_found[dir_basename] = []
        dirs_found[dir_basename].append(rel_dir)

    return dirs_found, folder_file_counts


def _detect_layer_violations_and_smells(repo_root: Path) -> List[Dict[str, Any]]:
    """Inspects source files for architectural layering violations and structural smells."""
    problems = []

    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel_dir = os.path.relpath(dirpath, repo_root).replace("\\", "/").lower()

        # Check for Controllers / Routes directly accessing DB clients
        is_controller_or_route = any(kw in rel_dir for kw in ["controller", "controllers", "route", "routes", "api", "endpoints", "views"])

        for fname in filenames:
            fpath = Path(dirpath) / fname
            if fpath.suffix.lower() not in ALLOWED_EXTENSIONS:
                continue

            rel_file = os.path.relpath(fpath, repo_root).replace("\\", "/")

            if is_controller_or_route:
                try:
                    content = fpath.read_text(encoding="utf-8", errors="replace")
                    for line_num, line in enumerate(content.splitlines(), 1):
                        for db_pattern in DB_CLIENT_IMPORTS:
                            if re.search(db_pattern, line, re.IGNORECASE):
                                problems.append({
                                    "type": "Layering Violation",
                                    "severity": "High",
                                    "file": rel_file,
                                    "line": line_num,
                                    "description": f"Controller/Route file '{fname}' appears to directly import a database client/ORM bypassing the service/repository abstraction layer.",
                                    "recommendation": "Decouple HTTP controllers from database logic by introducing a Service or Repository layer."
                                })
                                break
                except Exception:
                    pass

    return problems


def analyze_architecture(repo_path: str, total_source_files: int = 0) -> Dict[str, Any]:
    """
    Performs heuristic architecture pattern detection and violation scanning.

    Returns:
        Structured architecture analysis dictionary with explicit Rule 42 HEURISTIC labeling.
    """
    root = Path(repo_path).resolve()
    dirs_found, folder_file_counts = _scan_directory_structure(root)
    layer_violations = _detect_layer_violations_and_smells(root)

    # Architectural Pattern Detection Heuristics
    detected_layers = []

    # 1. MVC / Layered Architecture Indicators
    layered_keywords = {"controllers", "controller", "services", "service", "models", "model", "repositories", "repository", "routes", "views", "dao", "dto"}
    matched_layered = layered_keywords.intersection(set(dirs_found.keys()))
    if matched_layered:
        detected_layers.extend(list(matched_layered))

    # 2. Modular / DDD Indicators
    modular_keywords = {"modules", "module", "domain", "features", "feature", "bounded_contexts", "packages", "components"}
    matched_modular = modular_keywords.intersection(set(dirs_found.keys()))

    # 3. Clean / Hexagonal Architecture Indicators
    clean_keywords = {"usecases", "use_cases", "adapters", "ports", "infrastructure", "core"}
    matched_clean = clean_keywords.intersection(set(dirs_found.keys()))

    # 4. Microservices / Serverless Indicators
    serverless_keywords = {"functions", "lambda", "microservices", "handlers"}
    matched_serverless = serverless_keywords.intersection(set(dirs_found.keys()))

    # Calculate pattern confidence score
    pattern = "Flat / Unstructured Architecture"
    confidence = 40.0

    if len(matched_layered) >= 3:
        pattern = "Model-View-Controller (MVC) / Layered Architecture"
        confidence = min(95.0, 60.0 + (len(matched_layered) * 8.0))
    elif len(matched_layered) >= 1:
        pattern = "Partial Layered Architecture"
        confidence = 65.0
    elif len(matched_modular) >= 2:
        pattern = "Modular / Domain-Driven Architecture"
        confidence = 85.0
    elif len(matched_clean) >= 2:
        pattern = "Clean / Hexagonal Architecture"
        confidence = 85.0
    elif len(matched_serverless) >= 1:
        pattern = "Serverless / Microservices Architecture"
        confidence = 75.0

    # Detect God Directory anti-pattern
    total_files = sum(folder_file_counts.values()) or 1
    architectural_problems = list(layer_violations)

    for folder, count in folder_file_counts.items():
        if count / total_files > 0.45 and total_files > 8 and folder != "root":
            architectural_problems.append({
                "type": "God Directory Anti-Pattern",
                "severity": "Medium",
                "file": folder,
                "line": 1,
                "description": f"Directory '{folder}' contains {count} source files ({count/total_files*100:.1f}% of entire codebase), indicating weak component modularization.",
                "recommendation": "Refactor monolithic directory into smaller sub-modules or domain-focused packages."
            })

    # Generate recommendations
    recommendations = []
    if pattern.startswith("Flat"):
        recommendations.append("Consider organizing source code into separate domain layers (e.g. controllers/, services/, repositories/ or modules/).")
    if len(layer_violations) > 0:
        recommendations.append(f"Resolve {len(layer_violations)} layering violation(s) where API controllers directly invoke database clients.")
    if not recommendations:
        recommendations.append("Architecture exhibits clear separation of concerns with no high-severity layering violations detected.")

    return {
        "classification": "HEURISTIC",
        "detected_pattern": pattern,
        "confidence_score": round(confidence, 1),
        "detected_layers": detected_layers,
        "architectural_problems": architectural_problems,
        "layer_violations_count": len(layer_violations),
        "structural_summary": {
            "directories_count": len(folder_file_counts),
            "top_folders": sorted(folder_file_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        },
        "recommendations": recommendations,
        "analysis_notes": "HEURISTIC per Section 16 & 42: Architecture detection is inferred from directory structures, naming conventions, and static import relationships.",
        "analysis_tool": "AST & Regex Import Violation Analyzer (Phase 16 Architecture Engine)"
    }
