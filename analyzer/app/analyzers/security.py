"""
analyzer/app/analyzers/security.py

Multi-Language Static Security Analysis & Secret Scanner Engine — Phase 15 (Section 15)

Tool Selection Rationale:
  1. Bandit (Python): AST-based static security analysis for Python codebases, detecting unsafe deserialization,
     hardcoded passwords, shell execution, SQL string formatting, and weak crypto.
  2. TruffleHog / detect-secrets Style Secret Scanner: Shannon entropy calculation and pattern matching for
     hardcoded credentials (AWS keys, GitHub tokens, JWTs, RSA private keys, DB connection strings).
  3. Pattern-Based SAST Engine: Multi-language regex inspection for SQL injection patterns, dangerous functions
     (eval, exec, innerHTML, dangerouslySetInnerHTML), weak hashing (MD5, SHA1), and unsafe configuration.

MANDATORY SECTION 15 RULE:
  Every finding MUST be titled/worded starting with: "Potential security issue..."
  Never claim a confirmed vulnerability.
"""

import os
import re
import math
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional

SKIP_DIRS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache",
    "node_modules", ".venv", "venv", "env", ".env",
    "dist", "build", ".build", "out", ".next", ".nuxt",
    "coverage", ".coverage", "vendor", "Pods"
}

ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go",
    ".php", ".rb", ".cs", ".json", ".yml", ".yaml", ".env.example", ".xml"
}

# Regex patterns for hardcoded credentials (TruffleHog/detect-secrets style)
SECRET_PATTERNS = [
    (r"AKIA[0-9A-Z]{16}", "Critical", "Hardcoded AWS Access Key ID", "Move AWS credentials to environment variables or AWS Secrets Manager."),
    (r"(?i)aws_secret_access_key\s*=\s*['\"][A-Za-z0-9/+=]{40}['\"]", "Critical", "Hardcoded AWS Secret Access Key", "Store AWS Secret Access Key in encrypted environment secrets."),
    (r"ghp_[a-zA-Z0-9]{36}", "Critical", "Hardcoded GitHub Personal Access Token", "Revoke token immediately and use environment variables."),
    (r"gho_[a-zA-Z0-9]{36}", "Critical", "Hardcoded GitHub OAuth Access Token", "Revoke OAuth token and migrate to secure secret store."),
    (r"eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+", "High", "Hardcoded JWT Token", "Do not hardcode bearer tokens in source code."),
    (r"-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----", "Critical", "Hardcoded Private Key", "Remove private key file or inline string from code repository immediately."),
    (r"(?i)(api_key|apikey|secret_key|app_secret|auth_token)\s*[:=]\s*['\"]([a-zA-Z0-9_\-]{16,})['\"]", "High", "Hardcoded API Key / Secret", "Use environment variables (e.g. process.env or os.getenv) for API secrets.")
]

# Vulnerability patterns (SAST Engine)
VULN_PATTERNS = [
    # SQL Injection
    (r"(?i)(SELECT|INSERT|UPDATE|DELETE)\s+.*?\s*(\+|\%|\.format|\$\{).*?(req\.|input|param|query|args|body)",
     "High", "SQL Injection", "Potential SQL injection vulnerability via string concatenation. Use parameterized queries or ORM bindings.", "SEC-SQL-01"),

    # Dangerous Functions
    (r"\b(eval|exec)\s*\(",
     "High", "Dangerous Function", "Dynamic execution of string as code via eval/exec. Avoid dynamic code evaluation.", "SEC-DANG-01"),
    (r"dangerouslySetInnerHTML\s*=\s*",
     "Medium", "Dangerous Function", "Bypassing React XSS protections via dangerouslySetInnerHTML. Sanitize HTML using DOMPurify.", "SEC-DANG-02"),
    (r"\binnerHTML\s*=\s*",
     "Medium", "Dangerous Function", "Direct DOM assignment to innerHTML can lead to Cross-Site Scripting (XSS). Use textContent or DOMPurify.", "SEC-DANG-03"),
    (r"subprocess\.(call|Popen|run)\s*\([^)]*shell\s*=\s*True",
     "High", "Dangerous Function", "Subprocess execution with shell=True invites command injection. Pass command arguments as a list.", "SEC-DANG-04"),

    # Insecure Auth / Cryptography
    (r"(?i)createHash\s*\(\s*['\"](md5|sha1)['\"]",
     "Medium", "Insecure Auth", "Weak cryptographic hash algorithm (MD5/SHA1). Upgrade to SHA-256 or bcrypt/argon2 for passwords.", "SEC-AUTH-01"),
    (r"(?i)hashlib\.(md5|sha1)\s*\(",
     "Medium", "Insecure Auth", "Weak hashing function (MD5/SHA1). Use SHA-256 or argon2/pbkdf2 for security-sensitive hashing.", "SEC-AUTH-02"),
    (r"(?i)jwt\.verify\([^)]*secret\s*:\s*['\"][^'\"]+['\"]",
     "High", "Insecure Auth", "Hardcoded JWT verification secret string. Store JWT secret in process.env.JWT_SECRET.", "SEC-AUTH-03"),

    # Unsafe Config
    (r"(?i)NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['\"]?0['\"]?",
     "High", "Unsafe Configuration", "Disabling TLS certificate verification allows Man-In-The-Middle (MITM) attacks. Enable TLS verification.", "SEC-CFG-01"),
    (r"(?i)verify\s*=\s*False\b",
     "Medium", "Unsafe Configuration", "Disabled SSL/TLS certificate verification in HTTP request. Enable SSL verification.", "SEC-CFG-02"),
    (r"DEBUG\s*=\s*True",
     "Low", "Unsafe Configuration", "Debug mode enabled. Ensure debug flags are set to False in production environments.", "SEC-CFG-03"),
]


def _shannon_entropy(data: str) -> float:
    """Calculates Shannon Entropy of a string to detect high-randomness secret candidates."""
    if not data:
        return 0.0
    entropy = 0.0
    for x in set(data):
        p_x = data.count(x) / len(data)
        entropy -= p_x * math.log2(p_x)
    return entropy


def _scan_file_secrets_and_patterns(filepath: Path, repo_root: Path) -> List[Dict[str, Any]]:
    """Scans a single file for hardcoded secrets and dangerous code patterns."""
    findings = []
    rel_path = os.path.relpath(filepath, repo_root).replace("\\", "/")

    try:
        content = filepath.read_text(encoding="utf-8", errors="replace")
        lines = content.splitlines()

        for line_num, line in enumerate(lines, 1):
            line_str = line.strip()
            if not line_str or line_str.startswith("//") or line_str.startswith("#") or line_str.startswith("/*"):
                continue

            # 1. Regex Secret Matching
            for pattern, severity, name, rec in SECRET_PATTERNS:
                if re.search(pattern, line_str):
                    findings.append({
                        "file": rel_path,
                        "line": line_num,
                        "severity": severity,
                        "category": "Hardcoded Secret",
                        "title": f"Potential security issue: {name} detected in source code",
                        "description": f"Potential security issue: Found pattern matching hardcoded credentials on line {line_num}.",
                        "recommendation": rec,
                        "rule_id": "SEC-SECRET-01"
                    })
                    break  # One secret match per line

            # 2. High Entropy String Scan for Password/Key Variable Assignments
            entropy_match = re.search(r"(?i)(password|passwd|secret|token|api_key|private_key)\s*[:=]\s*['\"]([^'\"]{16,})['\"]", line_str)
            if entropy_match:
                candidate = entropy_match.group(2)
                if _shannon_entropy(candidate) > 3.8:
                    findings.append({
                        "file": rel_path,
                        "line": line_num,
                        "severity": "High",
                        "category": "Hardcoded Secret",
                        "title": "Potential security issue: High-entropy hardcoded secret candidate",
                        "description": f"Potential security issue: High entropy string ({_shannon_entropy(candidate):.2f}) assigned to sensitive variable name.",
                        "recommendation": "Extract secret into environment variable configuration.",
                        "rule_id": "SEC-ENTROPY-01"
                    })

            # 3. SAST Pattern Matching
            for pattern, severity, category, name, rec, rule_id in [(p[0], p[1], p[2], p[0], p[3], p[4]) for p in VULN_PATTERNS]:
                if re.search(pattern, line_str):
                    findings.append({
                        "file": rel_path,
                        "line": line_num,
                        "severity": severity,
                        "category": category,
                        "title": f"Potential security issue: {category} - {rec.split('.')[0]}",
                        "description": f"Potential security issue: Detected code pattern matching {category} on line {line_num}.",
                        "recommendation": rec,
                        "rule_id": rule_id
                    })

    except Exception:
        pass

    return findings


def _run_bandit_if_available(repo_path: Path) -> List[Dict[str, Any]]:
    """Runs Python Bandit SAST tool if installed in environment."""
    findings = []
    try:
        result = subprocess.run(
            ["bandit", "-r", str(repo_path), "-f", "json", "-q"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.stdout:
            data = json.loads(result.stdout)
            for issue in data.get("results", []):
                sev_map = {"HIGH": "High", "MEDIUM": "Medium", "LOW": "Low"}
                rel_f = os.path.relpath(issue.get("filename", ""), repo_path).replace("\\", "/")
                findings.append({
                    "file": rel_f,
                    "line": issue.get("line_number", 1),
                    "severity": sev_map.get(issue.get("issue_severity"), "Medium"),
                    "category": "Bandit Python SAST",
                    "title": f"Potential security issue: {issue.get('issue_text', 'Bandit security alert')}",
                    "description": f"Potential security issue: Bandit identified issue {issue.get('test_id')} ({issue.get('issue_text')}).",
                    "recommendation": f"Review line {issue.get('line_number')} for secure python practices. Reference: {issue.get('more_info')}",
                    "rule_id": issue.get("test_id", "BANDIT-01")
                })
    except Exception:
        pass
    return findings


def analyze_security(repo_path: str) -> Dict[str, Any]:
    """
    Performs multi-language static security analysis and secret scanning.

    Returns:
        Structured security findings dictionary with all findings explicitly titled
        "Potential security issue...".
    """
    root = Path(repo_path).resolve()
    all_findings: List[Dict[str, Any]] = []

    # 1. Custom SAST & Entropy Secret Scan across repository
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            fpath = Path(dirpath) / fname
            if fpath.suffix.lower() in ALLOWED_EXTENSIONS or fname in (".env", ".env.local", "Dockerfile"):
                file_findings = _scan_file_secrets_and_patterns(fpath, root)
                all_findings.extend(file_findings)

    # 2. Bandit scan for Python files
    bandit_findings = _run_bandit_if_available(root)
    # Deduplicate bandit findings with regex findings on same line
    seen_keys = set((f["file"], f["line"]) for f in all_findings)
    for bf in bandit_findings:
        if (bf["file"], bf["line"]) not in seen_keys:
            all_findings.append(bf)

    # Calculate severity counts
    severity_counts = {
        "Critical": sum(1 for f in all_findings if f["severity"] == "Critical"),
        "High": sum(1 for f in all_findings if f["severity"] == "High"),
        "Medium": sum(1 for f in all_findings if f["severity"] == "Medium"),
        "Low": sum(1 for f in all_findings if f["severity"] == "Low"),
    }

    # Generate security recommendations
    recommendations = []
    if severity_counts["Critical"] > 0:
        recommendations.append(f"CRITICAL: {severity_counts['Critical']} potential high-risk hardcoded secrets or private keys detected. Revoke and rotate exposed credentials immediately.")
    if severity_counts["High"] > 0:
        recommendations.append(f"HIGH: {severity_counts['High']} potential high-severity security issues found (e.g. SQL injection / dangerous eval execution). Refactor to parameterized queries.")
    if not all_findings:
        recommendations.append("No potential static security issues or hardcoded secrets detected in repository source files.")

    return {
        "total_findings": len(all_findings),
        "severity_counts": severity_counts,
        "findings": all_findings,
        "recommendations": recommendations,
        "analysis_notes": "Static pattern & entropy security scan per Section 15. All findings are categorized as potential security issues requiring human developer validation.",
        "analysis_tool": "Bandit Python SAST & TruffleHog/detect-secrets Style Secret Scanner (Section 15 Pattern Engine)"
    }
