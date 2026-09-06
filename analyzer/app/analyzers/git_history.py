"""
analyzer/app/analyzers/git_history.py

Git History & Contributor Analytics Engine — Phase 17 (Section 17)

Data Source Decision & Architecture:
  1. Local Git Commit Graph Extraction (Python Microservice):
     Extracted directly from the cloned repository workspace using git subprocess / GitPython calls:
       - total_commits
       - contributor_count
       - repository_age_days
       - recent_commits_30d & recent_commits_90d
       - branch_count
       - commit_frequency_per_week
       - top_contributors (name, email, commit_count)
       - first_commit_date & latest_commit_date
  2. GitHub API Metadata Integration (Node Backend Layer):
     Pull Request and Issue statistics are pulled via GitHub API in the Node backend service (Phase 6)
     and merged into the final database persistence layer, as GitHub API tokens are managed in Node.
"""

import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional


def _run_git_cmd(repo_path: str, args: List[str]) -> Optional[str]:
    """Helper to run a git command in the repository workspace."""
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=30,
            encoding="utf-8",
            errors="replace"
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def analyze_git_history(repo_path: str) -> Dict[str, Any]:
    """
    Analyzes local Git history commit log and contributor statistics.

    Returns:
        Structured dictionary of git metrics.
    """
    root = Path(repo_path).resolve()

    # Verify directory is a git repo
    if not (root / ".git").exists():
        return {
            "status": "ok",
            "is_git_repository": False,
            "total_commits": 0,
            "contributor_count": 0,
            "repository_age_days": 0,
            "recent_commits_30d": 0,
            "recent_commits_90d": 0,
            "branch_count": 1,
            "commit_frequency_per_week": 0.0,
            "top_contributors": [],
            "first_commit_date": None,
            "latest_commit_date": None,
            "analysis_notes": "Not a git repository directory.",
            "analysis_tool": "Git Commit Log Scanner (Phase 17 Engine)"
        }

    # Check if shallow clone
    shallow_raw = _run_git_cmd(repo_path, ["rev-parse", "--is-shallow-repository"])
    is_shallow = (shallow_raw == "true")

    # 1. Total Commits
    commit_count_raw = _run_git_cmd(repo_path, ["rev-list", "--count", "HEAD"])
    total_commits = int(commit_count_raw) if commit_count_raw and commit_count_raw.isdigit() else 0

    # 2. Contributors (Unique Authors)
    shortlog_raw = _run_git_cmd(repo_path, ["shortlog", "-sn", "--all"])
    top_contributors = []
    contributor_count = 0

    AUTHOR_ALIASES = {
        "suthankan": "Suthankan1",
        "suthankan balenthiran": "Suthankan1",
        "suthankan1": "Suthankan1",
        "gajanthan": "Gajanthan23",
        "gajanthan23": "Gajanthan23",
        "thuvarahan": "thuvarahan-t",
        "thuvarahan thayalan": "thuvarahan-t",
        "thuvarahan-t": "thuvarahan-t",
        "pushmitha": "pushmitha20",
        "pushmitha20": "pushmitha20",
        "sinthuha": "Sinthuha-n",
        "sinthuha nadesan": "Sinthuha-n",
        "sinthuha-n": "Sinthuha-n"
    }

    if shortlog_raw:
        lines = shortlog_raw.splitlines()
        grouped = {}
        for line in lines:
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                count = int(parts[0].strip()) if parts[0].strip().isdigit() else 0
                raw_name = parts[1].strip()
                clean_key = raw_name.lower().split("<")[0].split("@")[0].strip()
                username = AUTHOR_ALIASES.get(clean_key, raw_name.split("<")[0].split("@")[0].strip())
                grouped[username] = grouped.get(username, 0) + count

        sorted_contribs = sorted(grouped.items(), key=lambda x: x[1], reverse=True)
        contributor_count = len(sorted_contribs)
        for name, count in sorted_contribs[:10]:
            clean_name = name or "Unknown"
            top_contributors.append({
                "author": clean_name,
                "commits": count,
                "avatar_url": f"https://github.com/{clean_name}.png" if clean_name != "Unknown" else None,
                "github_url": f"https://github.com/{clean_name}" if clean_name != "Unknown" else None
            })

    # 3. First and Latest Commit Dates (ISO Format & Age Calculation)
    latest_date_raw = _run_git_cmd(repo_path, ["log", "-1", "--format=%ct"])
    first_date_raw = _run_git_cmd(repo_path, ["log", "--reverse", "-1", "--format=%ct"])

    first_commit_date = None
    latest_commit_date = None
    repository_age_days = 0

    if first_date_raw and latest_date_raw:
        try:
            first_ts = int(first_date_raw)
            latest_ts = int(latest_date_raw)

            first_dt = datetime.fromtimestamp(first_ts, tz=timezone.utc)
            latest_dt = datetime.fromtimestamp(latest_ts, tz=timezone.utc)

            first_commit_date = first_dt.isoformat()
            latest_commit_date = latest_dt.isoformat()

            delta_days = (latest_dt - first_dt).days
            repository_age_days = max(1, delta_days)
        except Exception:
            pass

    # 4. Recent Commits (30 Days & 90 Days)
    commits_30d_raw = _run_git_cmd(repo_path, ["rev-list", "--count", "--since=30.days.ago", "HEAD"])
    recent_commits_30d = int(commits_30d_raw) if commits_30d_raw and commits_30d_raw.isdigit() else 0

    commits_90d_raw = _run_git_cmd(repo_path, ["rev-list", "--count", "--since=90.days.ago", "HEAD"])
    recent_commits_90d = int(commits_90d_raw) if commits_90d_raw and commits_90d_raw.isdigit() else 0

    # 5. Branch Count
    branch_raw = _run_git_cmd(repo_path, ["branch", "-a"])
    branch_count = len(branch_raw.splitlines()) if branch_raw else 1

    # 6. Commit Frequency per Week
    weeks = max(1.0, repository_age_days / 7.0)
    commit_frequency_per_week = round(total_commits / weeks, 2)

    analysis_notes = (
        "Shallow git clone detected (--depth 1). Commit count & history reflect shallow tip; full git clone required for complete historical commit graph."
        if is_shallow else
        "Git commit graph & contributor statistics extracted from full local repository log."
    )

    return {
        "status": "ok",
        "is_git_repository": True,
        "is_shallow_clone": is_shallow,
        "total_commits": total_commits,
        "contributor_count": contributor_count,
        "repository_age_days": repository_age_days,
        "recent_commits_30d": recent_commits_30d,
        "recent_commits_90d": recent_commits_90d,
        "branch_count": branch_count,
        "commit_frequency_per_week": commit_frequency_per_week,
        "top_contributors": top_contributors,
        "first_commit_date": first_commit_date,
        "latest_commit_date": latest_commit_date,
        "analysis_notes": analysis_notes,
        "analysis_tool": "Git Commit Log Scanner (Phase 17 Engine)"
    }
