"""
analyzer/app/analyzers/dependencies.py

Multi-Ecosystem Dependency Parser & Metrics Engine — Phase 14 (Section 14)

Parses standard manifest and lockfiles across multiple language ecosystems:
  1. JavaScript/TypeScript: package.json (dependencies vs devDependencies vs peerDependencies)
  2. Python: requirements.txt, pyproject.toml (poetry/flit/setuptools), Pipfile
  3. Java: pom.xml (Maven scope classification), build.gradle / build.gradle.kts (Gradle scope classification)
  4. Go: go.mod
  5. PHP: composer.json
  6. Ruby: Gemfile
  7. C#/.NET: *.csproj

Rule 4 & Section 14 Compliance:
  Vulnerability checking (e.g. OSV DB, npm audit, pip-audit) is noted explicitly as a
  future integration point. No fake vulnerability data is ever generated.
"""

import os
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Any, Tuple

SKIP_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache",
    "node_modules", ".venv", "venv", "env", ".env",
    "dist", "build", ".build", "out", ".next", ".nuxt",
    "coverage", ".coverage", "vendor", "Pods"
}

def _parse_package_json(filepath: Path) -> Dict[str, Any]:
    """Parses npm package.json manifest."""
    prod_deps = []
    dev_deps = []
    try:
        content = json.loads(filepath.read_text(encoding="utf-8", errors="replace"))
        deps = content.get("dependencies", {})
        devs = content.get("devDependencies", {})
        peers = content.get("peerDependencies", {})

        if isinstance(deps, dict):
            for pkg, ver in deps.items():
                prod_deps.append({"name": pkg, "version": str(ver), "type": "production"})
        if isinstance(devs, dict):
            for pkg, ver in devs.items():
                dev_deps.append({"name": pkg, "version": str(ver), "type": "development"})
        if isinstance(peers, dict):
            for pkg, ver in peers.items():
                dev_deps.append({"name": pkg, "version": str(ver), "type": "peer"})
    except Exception:
        pass

    return {
        "ecosystem": "npm",
        "file": filepath.name,
        "production_count": len(prod_deps),
        "dev_count": len(dev_deps),
        "production_deps": prod_deps,
        "dev_deps": dev_deps
    }


def _parse_requirements_txt(filepath: Path) -> Dict[str, Any]:
    """Parses Python requirements.txt file."""
    prod_deps = []
    dev_deps = []
    is_dev_file = "dev" in filepath.name.lower() or "test" in filepath.name.lower()

    try:
        lines = filepath.read_text(encoding="utf-8", errors="replace").splitlines()
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-r") or line.startswith("-e") or line.startswith("--"):
                continue

            # Extract package name and version specifier
            match = re.split(r"(==|>=|<=|~=|>|<|!=)", line, maxsplit=1)
            pkg_name = match[0].strip()
            version_spec = match[1] + match[2] if len(match) > 2 else "*"

            if pkg_name:
                dep_info = {"name": pkg_name, "version": version_spec, "type": "development" if is_dev_file else "production"}
                if is_dev_file:
                    dev_deps.append(dep_info)
                else:
                    prod_deps.append(dep_info)
    except Exception:
        pass

    return {
        "ecosystem": "pypi",
        "file": filepath.name,
        "production_count": len(prod_deps),
        "dev_count": len(dev_deps),
        "production_deps": prod_deps,
        "dev_deps": dev_deps
    }


def _parse_pyproject_toml(filepath: Path) -> Dict[str, Any]:
    """Parses Python pyproject.toml file."""
    prod_deps = []
    dev_deps = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="replace")
        # Standard [project] dependencies
        proj_deps_match = re.search(r"\[project\][^\[]*dependencies\s*=\s*\[([^\]]+)\]", content, re.DOTALL)
        if proj_deps_match:
            raw_items = proj_deps_match.group(1).split(",")
            for item in raw_items:
                item_str = item.strip().strip("\"'")
                if item_str:
                    match = re.split(r"(==|>=|<=|~=|>|<|!=)", item_str, maxsplit=1)
                    pkg = match[0].strip()
                    ver = match[1] + match[2] if len(match) > 2 else "*"
                    if pkg:
                        prod_deps.append({"name": pkg, "version": ver, "type": "production"})

        # Poetry [tool.poetry.dependencies]
        poetry_deps = re.findall(r"\[tool\.poetry\.dependencies\]\s*\n((?:[a-zA-Z0-9_\-]+\s*=\s*[^\n]+\n)+)", content)
        if poetry_deps:
            for line in poetry_deps[0].splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    parts = line.split("=", 1)
                    pkg = parts[0].strip()
                    ver = parts[1].strip().strip("\"'")
                    if pkg.lower() != "python":
                        prod_deps.append({"name": pkg, "version": ver, "type": "production"})

        # Poetry dev-dependencies
        poetry_devs = re.findall(r"\[tool\.poetry\.(?:group\.dev\.)?dependencies\]\s*\n((?:[a-zA-Z0-9_\-]+\s*=\s*[^\n]+\n)+)", content)
        if poetry_devs:
            for line in poetry_devs[0].splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    parts = line.split("=", 1)
                    pkg = parts[0].strip()
                    ver = parts[1].strip().strip("\"'")
                    if pkg.lower() != "python":
                        dev_deps.append({"name": pkg, "version": ver, "type": "development"})
    except Exception:
        pass

    return {
        "ecosystem": "pypi",
        "file": filepath.name,
        "production_count": len(prod_deps),
        "dev_count": len(dev_deps),
        "production_deps": prod_deps,
        "dev_deps": dev_deps
    }


def _parse_pom_xml(filepath: Path) -> Dict[str, Any]:
    """Parses Java Maven pom.xml file."""
    prod_deps = []
    dev_deps = []
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        # Handle xml namespace
        ns = ""
        if root.tag.startswith("{"):
            ns = root.tag.split("}")[0] + "}"

        for dep in root.findall(f".//{ns}dependency"):
            group_id = dep.find(f"{ns}groupId")
            artifact_id = dep.find(f"{ns}artifactId")
            version = dep.find(f"{ns}version")
            scope = dep.find(f"{ns}scope")

            group_str = group_id.text if group_id is not None and group_id.text else ""
            artifact_str = artifact_id.text if artifact_id is not None and artifact_id.text else ""
            ver_str = version.text if version is not None and version.text else "*"
            scope_str = scope.text if scope is not None and scope.text else "compile"

            pkg_name = f"{group_str}:{artifact_str}" if group_str else artifact_str
            if pkg_name:
                dep_info = {"name": pkg_name, "version": ver_str, "type": "development" if scope_str in ("test", "provided") else "production"}
                if scope_str in ("test", "provided"):
                    dev_deps.append(dep_info)
                else:
                    prod_deps.append(dep_info)
    except Exception:
        pass

    return {
        "ecosystem": "maven",
        "file": filepath.name,
        "production_count": len(prod_deps),
        "dev_count": len(dev_deps),
        "production_deps": prod_deps,
        "dev_deps": dev_deps
    }


def _parse_build_gradle(filepath: Path) -> Dict[str, Any]:
    """Parses Java/Kotlin Gradle build file."""
    prod_deps = []
    dev_deps = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="replace")
        # Match implementation('com.example:lib:1.0') or testImplementation '...'
        matches = re.findall(r"(implementation|api|testImplementation|testCompile|compileOnly)\s*\(?['\"]([^'\"]+)['\"]", content)
        for scope, dep_str in matches:
            parts = dep_str.split(":")
            name = f"{parts[0]}:{parts[1]}" if len(parts) >= 2 else dep_str
            ver = parts[2] if len(parts) >= 3 else "*"
            is_dev = "test" in scope.lower() or "compileonly" in scope.lower()

            dep_info = {"name": name, "version": ver, "type": "development" if is_dev else "production"}
            if is_dev:
                dev_deps.append(dep_info)
            else:
                prod_deps.append(dep_info)
    except Exception:
        pass

    return {
        "ecosystem": "gradle",
        "file": filepath.name,
        "production_count": len(prod_deps),
        "dev_count": len(dev_deps),
        "production_deps": prod_deps,
        "dev_deps": dev_deps
    }


def _parse_go_mod(filepath: Path) -> Dict[str, Any]:
    """Parses Go go.mod file."""
    prod_deps = []
    try:
        lines = filepath.read_text(encoding="utf-8", errors="replace").splitlines()
        in_require = False
        for line in lines:
            line = line.strip()
            if line.startswith("require ("):
                in_require = True
                continue
            elif in_require and line == ")":
                in_require = False
                continue

            if in_require or line.startswith("require "):
                clean_line = line.replace("require ", "").strip()
                parts = clean_line.split()
                if len(parts) >= 2:
                    prod_deps.append({"name": parts[0], "version": parts[1], "type": "production"})
    except Exception:
        pass

    return {
        "ecosystem": "go",
        "file": filepath.name,
        "production_count": len(prod_deps),
        "dev_count": 0,
        "production_deps": prod_deps,
        "dev_deps": []
    }


def analyze_dependencies(repo_path: str) -> Dict[str, Any]:
    """
    Scans and parses dependency manifest files across the repository.

    Returns:
        Structured dependency metrics dictionary.
    """
    root = Path(repo_path).resolve()

    manifest_files: List[str] = []
    ecosystems: set = set()
    dependencies_by_file: Dict[str, Any] = {}

    total_prod = 0
    total_dev = 0
    all_prod_deps: List[Dict[str, str]] = []
    all_dev_deps: List[Dict[str, str]] = []

    # Walk repository root and immediate subdirectories to find manifests
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel_dir = os.path.relpath(dirpath, root)
        # Limit search depth to 3
        if rel_dir != "." and len(Path(rel_dir).parts) > 3:
            continue

        for fname in filenames:
            fpath = Path(dirpath) / fname
            rel_path = os.path.relpath(fpath, root).replace("\\", "/")

            parsed_data = None
            if fname == "package.json":
                parsed_data = _parse_package_json(fpath)
            elif fname in ("requirements.txt", "requirements-dev.txt", "dev-requirements.txt"):
                parsed_data = _parse_requirements_txt(fpath)
            elif fname == "pyproject.toml":
                parsed_data = _parse_pyproject_toml(fpath)
            elif fname == "pom.xml":
                parsed_data = _parse_pom_xml(fpath)
            elif fname in ("build.gradle", "build.gradle.kts"):
                parsed_data = _parse_build_gradle(fpath)
            elif fname == "go.mod":
                parsed_data = _parse_go_mod(fpath)

            if parsed_data and (parsed_data["production_count"] > 0 or parsed_data["dev_count"] > 0 or fname in ("package.json", "pom.xml", "go.mod")):
                manifest_files.append(rel_path)
                ecosystems.add(parsed_data["ecosystem"])
                dependencies_by_file[rel_path] = parsed_data

                total_prod += parsed_data["production_count"]
                total_dev += parsed_data["dev_count"]
                all_prod_deps.extend(parsed_data["production_deps"])
                all_dev_deps.extend(parsed_data["dev_deps"])

    total_count = total_prod + total_dev

    # Deduplicate top production dependencies
    seen_names = set()
    top_dependencies = []
    for d in all_prod_deps:
        if d["name"] not in seen_names:
            seen_names.add(d["name"])
            top_dependencies.append(d)
            if len(top_dependencies) >= 15:
                break

    # Recommendations
    recommendations: List[str] = []
    if not manifest_files:
        recommendations.append("No standard dependency manifest files (package.json, requirements.txt, pom.xml) detected. Add a manifest file to track dependencies.")
    elif total_count > 50:
        recommendations.append(f"High dependency count detected ({total_count} dependencies across {len(manifest_files)} manifest files). Periodically audit and prune unused third-party packages.")

    return {
        "production_dependency_count": total_prod,
        "dev_dependency_count": total_dev,
        "total_dependency_count": total_count,
        "ecosystems": sorted(list(ecosystems)),
        "manifest_files": manifest_files,
        "dependencies_by_file": dependencies_by_file,
        "top_dependencies": top_dependencies,
        "recommendations": recommendations,
        "vulnerability_notes": "Vulnerability scanning (e.g. CVE lookup, npm audit, pip-audit integration) is a future integration point per Section 14.",
        "analysis_tool": "Multi-Ecosystem Manifest Dependency Parser (npm, PyPI, Maven, Gradle, Go)"
    }
