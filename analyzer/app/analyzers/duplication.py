"""
analyzer/app/analyzers/duplication.py

Code Duplication Detection Engine — Phase 11 (Section 11)

Algorithm & Methodology Citation:
  We implement a Normalized Token/Line N-Gram Block Matching Algorithm
  (Rolling Hash / Rabin-Karp sliding window clone detection), which is the
  foundational methodology used by industry-standard clone detection tools
  like PMD CPD (Copy-Paste-Detector) and jscpd.

  How it works:
  1. Strip single-line & multi-line comments and whitespace padding from source files
     to normalize syntax.
  2. Slide an N-line window (default: MIN_BLOCK_LINES = 6) across each file to compute
     a normalized block fingerprint.
  3. Identify matching fingerprints across files (or across different line spans in the
     same file) and greedily expand matching boundaries to find maximal duplicate blocks.
  4. Deduplicate subsumed/overlapping matches so each clone block is reported once at its
     maximum length.
  5. Aggregate distinct duplicated lines, calculate project-wide duplication percentage,
     and generate actionable architectural refactoring recommendations.
"""

import os
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Any, Set

SKIP_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache",
    "node_modules", ".venv", "venv", "env", ".env",
    "dist", "build", ".build", "out", ".next", ".nuxt",
    "coverage", ".coverage", "htmlcov", ".tox", "eggs",
    ".eggs", "*.egg-info", ".idea", ".vscode", ".vs",
    "vendor", "Pods",
}

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java",
    ".c", ".cpp", ".cc", ".h", ".cs", ".go",
    ".php", ".rb", ".rs", ".kt", ".swift", ".scala",
    ".html", ".css", ".scss", ".sql"
}

MIN_BLOCK_LINES = 6  # Minimum contiguous lines to classify as duplicate block


def _normalize_line(line: str) -> str:
    """Strips whitespace, indentation, and common single-line comment headers."""
    s = line.strip()
    for prefix in ("//", "#", "/*", "*", "<!--", "--"):
        if s.startswith(prefix):
            return ""
    return " ".join(s.split())


def _read_normalized_file(filepath: str) -> List[Tuple[int, str, str]]:
    """
    Reads a file and returns a list of (original_line_num, raw_line, normalized_line).
    Filters out empty lines for block hashing while preserving 1-based original line numbers.
    """
    entries: List[Tuple[int, str, str]] = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            for idx, line in enumerate(f, start=1):
                raw = line.rstrip("\r\n")
                norm = _normalize_line(raw)
                if norm:
                    entries.append((idx, raw, norm))
    except (OSError, PermissionError):
        pass
    return entries


def analyze_duplication(repo_path: str, total_code_loc: int = 0) -> Dict[str, Any]:
    """
    Scans the repository for duplicate code blocks using normalized n-gram hashing.

    Args:
        repo_path: Root filesystem path of the repository.
        total_code_loc: Optional total code LOC from Phase 9 for exact percentage calculation.

    Returns:
        {
            "duplicated_blocks": int,
            "duplicated_loc": int,
            "duplication_percentage": float,
            "duplicated_files_count": int,
            "duplicated_files": List[str],
            "duplicate_instances": List[Dict],
            "recommendations": List[str],
            "analysis_tool": str
        }
    """
    root = Path(repo_path).resolve()

    file_records: Dict[str, List[Tuple[int, str, str]]] = {}
    total_loc_observed = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and not d.endswith(".egg-info")
        ]

        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            full_path = os.path.join(dirpath, filename)
            try:
                rel_path = os.path.relpath(full_path, root).replace("\\", "/")
            except ValueError:
                rel_path = full_path.replace("\\", "/")

            records = _read_normalized_file(full_path)
            if len(records) >= MIN_BLOCK_LINES:
                file_records[rel_path] = records
                total_loc_observed += len(records)

    # Hash table mapping: block_hash -> List[(file_rel_path, start_index_in_records)]
    hash_to_occurrences: Dict[str, List[Tuple[str, int]]] = {}

    for rel_path, records in file_records.items():
        if len(records) < MIN_BLOCK_LINES:
            continue
        for i in range(len(records) - MIN_BLOCK_LINES + 1):
            block_lines = [r[2] for r in records[i : i + MIN_BLOCK_LINES]]
            block_text = "\n".join(block_lines)
            block_hash = hashlib.md5(block_text.encode("utf-8")).hexdigest()

            if block_hash not in hash_to_occurrences:
                hash_to_occurrences[block_hash] = []
            hash_to_occurrences[block_hash].append((rel_path, i))

    raw_clones: List[Dict[str, Any]] = []
    duplicated_lines_set: Set[Tuple[str, int]] = set()
    duplicated_files_set: Set[str] = set()

    for block_hash, occurrences in hash_to_occurrences.items():
        if len(occurrences) < 2:
            continue

        for i in range(len(occurrences)):
            for j in range(i + 1, len(occurrences)):
                file_a, idx_a = occurrences[i]
                file_b, idx_b = occurrences[j]

                # If same file, ensure non-overlapping blocks
                if file_a == file_b and abs(idx_a - idx_b) < MIN_BLOCK_LINES:
                    continue

                recs_a = file_records[file_a]
                recs_b = file_records[file_b]

                # Greedily expand matching window forward
                match_len = 0
                while (
                    idx_a + match_len < len(recs_a)
                    and idx_b + match_len < len(recs_b)
                    and recs_a[idx_a + match_len][2] == recs_b[idx_b + match_len][2]
                ):
                    match_len += 1

                if match_len < MIN_BLOCK_LINES:
                    continue

                start_line_a = recs_a[idx_a][0]
                end_line_a = recs_a[idx_a + match_len - 1][0]
                start_line_b = recs_b[idx_b][0]
                end_line_b = recs_b[idx_b + match_len - 1][0]

                # Generate code snippet preview
                preview_lines = [recs_a[idx_a + k][1] for k in range(min(4, match_len))]
                fragment_preview = "\n".join(preview_lines)
                if match_len > 4:
                    fragment_preview += "\n..."

                raw_clones.append({
                    "file_a": file_a,
                    "idx_a": idx_a,
                    "start_line_a": start_line_a,
                    "end_line_a": end_line_a,
                    "file_b": file_b,
                    "idx_b": idx_b,
                    "start_line_b": start_line_b,
                    "end_line_b": end_line_b,
                    "lines_count": match_len,
                    "fragment_preview": fragment_preview
                })

    # Deduplicate subsumed clones (keep longest maximal clones)
    # Sort descending by length
    raw_clones.sort(key=lambda x: x["lines_count"], reverse=True)
    maximal_clones: List[Dict[str, Any]] = []

    for clone in raw_clones:
        fa, sa, ea = clone["file_a"], clone["start_line_a"], clone["end_line_a"]
        fb, sb, eb = clone["file_b"], clone["start_line_b"], clone["end_line_b"]

        # Check if already covered by an existing maximal clone
        subsumed = False
        for m in maximal_clones:
            if (
                m["file_a"] == fa and m["file_b"] == fb
                and m["start_line_a"] <= sa and m["end_line_a"] >= ea
                and m["start_line_b"] <= sb and m["end_line_b"] >= eb
            ):
                subsumed = True
                break
        if not subsumed:
            maximal_clones.append(clone)
            recs_a = file_records[clone["file_a"]]
            recs_b = file_records[clone["file_b"]]
            for k in range(clone["lines_count"]):
                duplicated_lines_set.add((clone["file_a"], recs_a[clone["idx_a"] + k][0]))
                duplicated_lines_set.add((clone["file_b"], recs_b[clone["idx_b"] + k][0]))
            duplicated_files_set.add(clone["file_a"])
            duplicated_files_set.add(clone["file_b"])

    # Clean internal index keys before returning
    clean_clones = []
    for c in maximal_clones[:25]:
        clean_clones.append({
            "file_a": c["file_a"],
            "start_line_a": c["start_line_a"],
            "end_line_a": c["end_line_a"],
            "file_b": c["file_b"],
            "start_line_b": c["start_line_b"],
            "end_line_b": c["end_line_b"],
            "lines_count": c["lines_count"],
            "fragment_preview": c["fragment_preview"]
        })

    total_dup_loc = len(duplicated_lines_set)
    reference_loc = total_code_loc if total_code_loc > 0 else total_loc_observed
    if reference_loc > 0:
        dup_percentage = round((total_dup_loc / reference_loc) * 100, 2)
        dup_percentage = min(dup_percentage, 100.0)
    else:
        dup_percentage = 0.0

    # Generate concrete actionable recommendations
    recommendations: List[str] = []
    if len(clean_clones) > 0:
        worst_clone = clean_clones[0]
        if worst_clone["file_a"] == worst_clone["file_b"]:
            recommendations.append(
                f"Found {worst_clone['lines_count']} duplicated lines within '{worst_clone['file_a']}' "
                f"(lines {worst_clone['start_line_a']}-{worst_clone['end_line_a']} and {worst_clone['start_line_b']}-{worst_clone['end_line_b']}). "
                f"Extract repeated block into a helper function."
            )
        else:
            recommendations.append(
                f"Found {worst_clone['lines_count']} identical lines shared between '{worst_clone['file_a']}' "
                f"(lines {worst_clone['start_line_a']}-{worst_clone['end_line_a']}) and '{worst_clone['file_b']}' "
                f"(lines {worst_clone['start_line_b']}-{worst_clone['end_line_b']}). "
                f"Extract shared logic into a common shared utility or module."
            )

        if dup_percentage > 10.0:
            recommendations.append(
                f"Overall code duplication is {dup_percentage}%, exceeding the 10% threshold. "
                f"Refactor recurring patterns across {len(duplicated_files_set)} duplicated files to reduce maintenance cost."
            )
    else:
        recommendations.append("No significant code duplication detected (0 duplicate blocks exceeding 6 lines).")

    return {
        "duplicated_blocks": len(maximal_clones),
        "duplicated_loc": total_dup_loc,
        "duplication_percentage": dup_percentage,
        "duplicated_files_count": len(duplicated_files_set),
        "duplicated_files": sorted(list(duplicated_files_set)),
        "duplicate_instances": clean_clones,
        "recommendations": recommendations,
        "analysis_tool": "Normalized Rabin-Karp N-Gram Sliding Window Clone Detector (PMD CPD / jscpd methodology)"
    }
