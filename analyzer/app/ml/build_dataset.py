"""
analyzer/app/ml/build_dataset.py

Phase 23: Machine Learning Dataset Construction Script.
Clones repository URLs from dataset_repos.txt, executes the static analysis
pipeline (Phases 9–19) against each workspace, extracts Section 21 features,
assigns human rubric-aligned engineering maturity labels (Beginner/Intermediate/Advanced),
and saves the dataset to CSV format.
"""

import os
import sys
import csv
import shutil
import tempfile
import subprocess
from pathlib import Path

# Add analyzer root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.analyzers.repository import analyze_repository
from app.analyzers.complexity import analyze_complexity
from app.analyzers.duplication import analyze_duplication
from app.analyzers.testing import analyze_testing
from app.analyzers.documentation import analyze_documentation
from app.analyzers.dependencies import analyze_dependencies
from app.analyzers.security import analyze_security
from app.analyzers.architecture import analyze_architecture
from app.analyzers.git_history import analyze_git_history
from app.scoring.scoring_engine import calculate_scores


def clone_repo(repo_url: str, dest_dir: str) -> bool:
    """Clones a GitHub repository into dest_dir using depth 1 for speed."""
    try:
        cmd = ["git", "clone", "--depth", "1", repo_url, dest_dir]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120)
        return result.returncode == 0
    except Exception as e:
        print(f"  [ERROR] Git clone failed for {repo_url}: {e}")
        return False


def assign_maturity_label(overall_score: float, test_files: int, test_file_ratio: float, dup_pct: float, sec_findings: int) -> str:
    """
    Assigns engineering maturity label based on ml-labeling-rubric.md:
      - Advanced: Overall score > 70.0, low duplication (< 10%), security findings == 0, test_files > 0
      - Intermediate: Overall score 45.0 - 70.0 or has basic structure/tests
      - Beginner: Overall score < 45.0, 0 test files, high duplication or flat layout
    """
    if overall_score >= 70.0 and test_files > 0 and sec_findings == 0 and dup_pct < 10.0:
        return "Advanced"
    elif overall_score >= 45.0 or test_files > 0 or test_file_ratio >= 0.05:
        return "Intermediate"
    else:
        return "Beginner"


def process_repository(repo_url: str):
    """Clones and executes full analysis pipeline for a repository URL."""
    clean_url = repo_url.strip()
    if not clean_url or clean_url.startswith("#"):
        return None

    # Derive repo name (e.g. expressjs/express)
    parts = clean_url.rstrip("/").replace(".git", "").split("/")
    repo_identifier = "/".join(parts[-2:]) if len(parts) >= 2 else parts[-1]

    print(f"\n[+] Analyzing repository: {repo_identifier} ({clean_url})")

    temp_dir = tempfile.mkdtemp(prefix="ml_repo_")
    try:
        cloned = clone_repo(clean_url, temp_dir)
        if not cloned:
            print(f"  [!] Failed to clone {clean_url}. Skipping.")
            return None

        # Execute Phase 9-19 analysis pipeline engines
        metrics_data = analyze_repository(temp_dir)
        complexity_data = analyze_complexity(temp_dir)
        duplication_data = analyze_duplication(temp_dir, total_code_loc=metrics_data.get("code_loc", 0))
        testing_data = analyze_testing(temp_dir)
        doc_data = analyze_documentation(
            temp_dir,
            code_loc=metrics_data.get("code_loc", 0),
            comment_loc=metrics_data.get("comment_loc", 0)
        )
        dep_data = analyze_dependencies(temp_dir)
        security_data = analyze_security(temp_dir)
        arch_data = analyze_architecture(temp_dir)
        git_data = analyze_git_history(temp_dir)

        # Calculate scores
        scores = calculate_scores(
            metrics=metrics_data,
            complexity=complexity_data,
            duplication=duplication_data,
            testing=testing_data,
            documentation=doc_data,
            dependencies=dep_data,
            security=security_data,
            architecture=arch_data,
            git_history=git_data
        )

        overall_score = float(scores.get("overall_score", 0.0))
        source_files = int(metrics_data.get("source_files", 0))
        test_files = int(metrics_data.get("test_files", 0))
        test_file_ratio = float(testing_data.get("test_file_ratio", 0.0))
        dup_pct = float(duplication_data.get("duplication_percentage", 0.0))
        sec_findings = int(security_data.get("total_findings", 0))

        label = assign_maturity_label(overall_score, test_files, test_file_ratio, dup_pct, sec_findings)

        record = {
            "repo_name": repo_identifier,
            "repo_url": clean_url,
            "total_loc": int(metrics_data.get("total_loc", 0)),
            "code_loc": int(metrics_data.get("code_loc", 0)),
            "total_files": int(metrics_data.get("total_files", 0)),
            "source_files": source_files,
            "test_files": test_files,
            "functions": int(metrics_data.get("functions", 0)),
            "classes": int(metrics_data.get("classes", 0)),
            "avg_complexity": round(float(complexity_data.get("avg_complexity", 0.0)), 2),
            "max_complexity": int(complexity_data.get("max_complexity", 0)),
            "duplication_percentage": round(dup_pct, 2),
            "test_file_ratio": round(test_file_ratio, 4),
            "dependency_count": int(metrics_data.get("dependency_count", 0)),
            "documentation_score": round(float(doc_data.get("documentation_score", 0.0)), 2),
            "security_findings_count": sec_findings,
            "architecture_confidence": round(float(arch_data.get("confidence_score", 0.0)), 2),
            "total_commits": int(git_data.get("total_commits", 0)),
            "overall_score": round(overall_score, 2),
            "maturity_label": label
        }

        print(f"  [OK] Complete! Score: {overall_score:.2f} | Label: {label}")
        return record

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def build_dataset(input_file: str, output_csv_paths: list):
    """Reads repo URLs, runs pipeline, and exports features to CSV."""
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: Input file {input_file} does not exist.")
        sys.exit(1)

    urls = [line.strip() for line in input_path.read_text().splitlines() if line.strip() and not line.startswith("#")]
    print(f"Loaded {len(urls)} repository URLs from {input_file}")

    records = []
    for url in urls:
        res = process_repository(url)
        if res:
            records.append(res)

    if not records:
        print("No repository data extracted. Exiting.")
        sys.exit(1)

    fieldnames = list(records[0].keys())

    for csv_path_str in output_csv_paths:
        csv_path = Path(csv_path_str)
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)
        print(f"\n[OK] Exported dataset with {len(records)} rows to {csv_path}")

    # Display dataset summary & distribution
    label_counts = {}
    for r in records:
        lbl = r["maturity_label"]
        label_counts[lbl] = label_counts.get(lbl, 0) + 1

    print("\n================ DATASET MATURITY LABEL DISTRIBUTION ================")
    for lbl, count in label_counts.items():
        print(f"  - {lbl}: {count} repositories ({count / len(records) * 100:.1f}%)")
    print("======================================================================\n")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    base_dir = os.path.dirname(__file__)
    input_repos = os.path.join(base_dir, "dataset_repos.txt")
    output_csv_1 = os.path.join(base_dir, "dataset.csv")
    output_csv_2 = os.path.abspath(os.path.join(base_dir, "../../../docs/requirements/dataset.csv"))

    build_dataset(input_repos, [output_csv_1, output_csv_2])
