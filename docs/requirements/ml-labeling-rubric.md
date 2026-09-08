# Machine Learning Repository Labeling Rubric

This document defines the standardized rubric for evaluating software repositories and assigning a single project-level engineering maturity label (**Beginner**, **Intermediate**, or **Advanced**) as part of Phase 23 ML dataset construction.

---

## 1. Quality Dimension Ratings

Each repository is evaluated across 7 key engineering quality dimensions extracted by the static analysis pipeline:

### 1.1 Cyclomatic Complexity & Maintainability
- **High Quality (80–100)**: Average complexity $< 3.0$, maximum complexity $< 10$, zero functions exceeding high complexity threshold ($>10$). Code is clean and modular.
- **Moderate Quality (50–79)**: Average complexity $3.0 - 6.0$, maximum complexity $10 - 25$, few functions exceeding threshold.
- **Low Quality (< 50)**: Average complexity $> 6.0$, maximum complexity $> 25$, multiple deeply nested or monolithic functions.

### 1.2 Code Duplication
- **High Quality (80–100)**: Code duplication percentage $< 5\%$. Minimal redundant code blocks.
- **Moderate Quality (50–79)**: Duplication percentage $5\% - 15\%$. Minor block duplication across utilities.
- **Low Quality (< 50)**: Duplication percentage $> 15\%$. Heavy copy-pasted code blocks across source files.

### 1.3 Testing Suite Completeness
- **Comprehensive (80–100)**: Test file ratio $\ge 15\%$, dedicated `test/` or `__tests__/` directory, active test runner configuration (Jest, Pytest, Mocha).
- **Basic / Partial (40–79)**: Test file ratio $5\% - 14\%$, basic unit tests present.
- **No Testing (0)**: Zero test files detected ($0\%$ test file ratio), no test suite.

### 1.4 Documentation Quality
- **Comprehensive (80–100)**: Detailed README with setup instructions, usage examples, badges, license, API reference, and comment LOC ratio $\ge 10\%$.
- **Basic (40–79)**: Basic README present with title and minimal installation instructions.
- **Minimal / Missing (< 40)**: Missing or near-empty README, negligible inline code comments.

### 1.5 Architectural Pattern & Structure
- **Structured (80–100)**: Clear architectural pattern detected (Layered MVC, Modular, Microservice, Clean Architecture) with confidence score $\ge 80\%$.
- **Unstructured / Flat (< 80)**: Flat directory hierarchy, mixed concerns in single files, no distinct separation of data/logic/presentation.

### 1.6 Security & Hardcoded Secrets
- **Secure (100)**: Zero static security issues or hardcoded secrets/API keys detected.
- **Vulnerable (< 70)**: Presence of hardcoded credentials, dangerous code evaluation (`eval()`), insecure HTTP URLs, or SQL injection vectors.

---

## 2. Maturity Level Mapping Rules

Based on the multi-dimensional feature extraction, repositories are categorized into one of three project-level maturity labels:

| Maturity Label | Criteria & Characteristics | Overall Quality Score Range |
| :--- | :--- | :--- |
| **Beginner** | • Flat or unstructured project layout<br>• Zero or negligible unit test coverage ($< 3\%$ test ratio)<br>• Minimal or missing README documentation<br>• High duplication ($> 15\%$) or unhandled security findings<br>• Small codebase size ($< 1,000$ LOC) or single-file scripts | **$< 45.0$** |
| **Intermediate** | • Organized directory structure with basic separation of concerns<br>• Basic README documentation with setup & run commands<br>• Moderate cyclomatic complexity (avg $< 5.0$)<br>• Partial unit testing ($3\% - 15\%$ test ratio)<br>• Zero critical security vulnerabilities | **$45.0 - 70.0$** |
| **Advanced** | • Well-defined architectural pattern (MVC, Layered, Modular, Clean Architecture)<br>• Comprehensive test suite ($> 15\%$ test ratio)<br>• Thorough README documentation with setup, usage, API specs & license<br>• Low cyclomatic complexity (avg $< 3.5$) and $< 5\%$ code duplication<br>• Zero security issues and active commit history | **$> 70.0$** |

---

## 3. Human Reviewer Process

1. **Static Analysis Extraction**: Run the Phase 9–19 analyzer pipeline against the target repository to compute raw feature metrics.
2. **Dimension Evaluation**: Review feature metrics against the criteria in Section 1.
3. **Maturity Assignment**: Assign the initial maturity label according to Section 2 rules.
4. **Manual Verification**: Review repository structure, README, and test directory to verify the automated label alignment and manually record the verified label in `dataset.csv`.
