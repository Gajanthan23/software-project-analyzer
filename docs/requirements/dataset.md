# Machine Learning Dataset Specification

This document details the dataset source, selection criteria, feature set schema, labeling methodology, planned train/test split, and evaluation strategy for Phase 23 ML dataset creation.

---

## 1. Dataset Source & Selection Criteria

The machine learning dataset consists of open-source software repositories sourced from GitHub. To ensure model generalization across real-world projects, selection criteria enforce diversity in:

- **Ecosystem & Languages**: JavaScript (Node.js/React), TypeScript, Python, Go, Java, and C/C++.
- **Project Scale**: Ranging from small utility packages ($< 500$ LOC) to medium web applications ($2,000 - 15,000$ LOC) and large frameworks ($> 30,000$ LOC).
- **Engineering Maturity Spectrum**:
  - *Beginner*: Tutorial projects, single-file scripts, early-stage student repositories, un-tested codebases.
  - *Intermediate*: Community utilities, medium-sized active projects with basic testing and documentation.
  - *Advanced*: Production-grade open-source projects (e.g., Express, Flask, Lodash, Axios, Commander) with high test coverage, strict architectural organization, and thorough documentation.

---

## 2. Extracted Feature Set Schema (Section 21 Specifications)

For each repository in the dataset, the static analysis pipeline (Phases 9–19) extracts 17 continuous and discrete feature metrics, alongside 1 categorical target label:

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `repo_name` | String | Repository name / URL identifier |
| `total_loc` | Integer | Total lines of code across all files |
| `code_loc` | Integer | Source code lines of code (excluding comments/blank lines) |
| `total_files` | Integer | Total files in repository workspace |
| `source_files` | Integer | Total source code files |
| `test_files` | Integer | Total test files detected |
| `functions` | Integer | Total function/method definitions |
| `classes` | Integer | Total class definitions |
| `avg_complexity` | Float | Average cyclomatic complexity per function |
| `max_complexity` | Integer | Maximum cyclomatic complexity recorded |
| `duplication_percentage` | Float | Percentage of duplicated code blocks ($0.0 - 100.0$) |
| `test_file_ratio` | Float | Ratio of test files to source files (`test_files / max(1, source_files)`) |
| `dependency_count` | Integer | Total declared external dependencies |
| `documentation_score` | Float | Documentation completeness score ($0.0 - 100.0$) |
| `security_findings_count` | Integer | Total static security findings detected |
| `architecture_confidence` | Float | Architectural pattern detection confidence score ($0.0 - 100.0$) |
| `total_commits` | Integer | Total Git commit count recorded |
| `overall_score` | Float | Multi-dimensional quality score ($0.0 - 100.0$) |
| **`maturity_label`** | Categorical | Target label: `Beginner`, `Intermediate`, or `Advanced` |

---

## 3. Labeling Methodology

1. **Automated Feature Extraction**: Run `analyzer/app/ml/build_dataset.py` to clone repository sources and calculate raw metric values.
2. **Rubric Evaluation**: Evaluate extracted metrics against the rules in [`docs/requirements/ml-labeling-rubric.md`](file:///c:/Users/sivaa/Desktop/SW_Analyse/software-project-analyzer/docs/requirements/ml-labeling-rubric.md).
3. **Human Verification**: Review repository structure, test directory presence, and documentation completeness to confirm label accuracy.

---

## 4. Planned Train / Test Split Strategy

- **Split Ratio**: 80% Training Set / 20% Test Set.
- **Stratification**: Stratified random sampling based on `maturity_label` distribution to preserve class balance (`Beginner`, `Intermediate`, `Advanced`).
- **Reproducibility**: Random seed (`random_state=42`) fixed during Phase 24 model training.

---

## 5. Planned Evaluation Methodology

For Phase 24 model training, evaluation will be conducted using standard classification metrics:

1. **Accuracy**: Overall proportion of correctly predicted maturity labels.
2. **Precision, Recall & F1-Score**: Macro-averaged and weighted F1-scores across `Beginner`, `Intermediate`, and `Advanced` classes.
3. **Confusion Matrix**: Inspection of classification confusion (e.g. distinguishing `Beginner` vs `Intermediate`).
