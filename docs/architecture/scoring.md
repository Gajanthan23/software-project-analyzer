# Software Quality & Engineering Scoring Engine Specification

> **DISCLAIMER & METHODOLOGY NOTE**
> The scoring formulas, component weights, sub-score algorithms, and score bands documented herein represent **this project's custom analytical methodology and quality model**. They are NOT official international standards (such as ISO/IEC 25010 or IEEE 1061), but rather a structured, rule-based heuristic framework designed for reproducible software repository benchmarking.

---

## 1. Executive Summary & Composite Formula

The Software Project Analyzer calculates an **Overall Software Engineering Score** on a 0–100 scale using a weighted average of 6 core sub-scores:

$$\text{Overall Score} = \sum (\text{Sub-Score}_i \times \text{Weight}_i)$$

### Configurable Component Weights

| Sub-Score Dimension | Configurable Weight | Description |
| :--- | :---: | :--- |
| **Code Quality** | **25%** (`0.25`) | Evaluates comment density, duplication penalties, and LOC balance. |
| **Maintainability** | **20%** (`0.20`) | Evaluates cyclomatic complexity averages and high-complexity function density. |
| **Architecture** | **20%** (`0.20`) | Evaluates inferred structural patterns, layering violations, and smells. |
| **Testing** | **15%** (`0.15`) | Evaluates test suite presence, test-to-source file ratios, and coverage. |
| **Security** | **10%** (`0.10`) | Evaluates secret leakage and SAST findings weighted by severity. |
| **Documentation** | **10%** (`0.10`) | Evaluates README sections, docs/ folder presence, and governance files. |

---

## 2. Performance & Score Bands

Based on the final composite score ($0.0 \le S \le 100.0$), the repository is categorized into one of 5 project-defined rating bands:

| Score Range | Score Band | Qualitative Description |
| :---: | :---: | :--- |
| **90.0 – 100.0** | **Excellent** | State-of-the-art codebase with exceptional testing, clean architecture, and minimal technical debt. |
| **75.0 – 89.9** | **Advanced** | Strong production-grade repository with minor refactoring opportunities. |
| **60.0 – 74.9** | **Proficient** | Solid foundation with noticeable technical debt, missing tests, or architectural layering smells. |
| **40.0 – 59.9** | **Developing** | High technical debt, low comment density, elevated complexity, or security findings present. |
| **0.0 – 39.9** | **Needs Improvement** | Severe structural deficiencies, lacking documentation, high duplication, or critical vulnerabilities. |

---

## 3. Sub-Score Formulas & Calculation Rules

### 3.1 Code Quality Score (25% Weight)
- **Base Score:** `100.0`
- **Deductions:**
  - *Duplication Penalty:* $-2.0$ points per $1\%$ code duplication (capped at $-40.0$ pts).
  - *Low Comment Density Penalty:*
    - If $\frac{\text{Comment LOC}}{\text{Total LOC}} < 5\%$: $-15.0$ pts.
    - If $5\% \le \text{Comment Ratio} < 10\%$: $-7.5$ pts.
  - *Function Length Penalty:* If $\frac{\text{Code LOC}}{\text{Functions}} > 60$: $-15.0$ pts.

### 3.2 Maintainability Score (20% Weight)
- **Base Score:** `100.0`
- **Deductions:**
  - *Average Complexity Penalty:* If $\text{Avg Complexity} > 5.0$, deduct $5.0 \times (\text{Avg Complexity} - 5.0)$ pts (capped at $-35.0$ pts).
  - *High Complexity Ratio Penalty:* Deduct $40.0 \times \left(\frac{\text{High Complexity Functions}}{\text{Total Functions}}\right)$ pts (capped at $-40.0$ pts).
  - *Duplication Penalty:* $-1.5$ points per $1\%$ code duplication (capped at $-25.0$ pts).

### 3.3 Complexity Score (0–100 Helper Dimension)
- **Base Score:** `100.0` (Simpler code = Higher score)
- **Deductions:**
  - *Max Complexity Penalty:* If $\text{Max Complexity} > 15$, deduct $2.0 \times (\text{Max Complexity} - 15)$ pts (capped at $-30.0$ pts).
  - *High Complexity Function Penalty:* $-5.0$ pts per function with Cyclomatic Complexity $> 10$ (capped at $-40.0$ pts).
  - *Average Complexity Threshold:* If $\text{Avg Complexity} > 10.0$: $-20.0$ pts; if $> 6.0$: $-10.0$ pts.

### 3.4 Architecture Score (20% Weight)
- **Base Score:** Derived from pattern confidence score ($\ge 40.0$).
- **Adjustments:**
  - *Structured Pattern Bonus:* $+20.0$ pts for MVC, Modular, or Clean architecture detection.
  - *Layer Violations Penalty:* $-20.0$ pts per detected layering violation (e.g. Controller directly importing database client) (capped at $-40.0$ pts).
  - *Architectural Smells Penalty:* $-12.5$ pts per detected structural problem (capped at $-25.0$ pts).

### 3.5 Testing Score (15% Weight)
- **Base Score:** `0.0` if no test suite detected.
- **Bonus Calculation:**
  - *Test Presence Base:* $+50.0$ pts for having test files.
  - *Test File Ratio Bonus:* $+60.0 \times \left(\frac{\text{Test Files}}{\text{Source Files}}\right)$ (capped at $+30.0$ pts).
  - *Coverage Report Bonus:* $+0.20 \times \text{Coverage Percentage}$ (capped at $+20.0$ pts). If no coverage report exists, default $+10.0$ pts bonus for basic test suite presence.

### 3.6 Security Score (10% Weight)
- **Base Score:** `100.0`
- **Severity-Weighted Deductions:**
  - *Critical Finding:* $-25.0$ pts per finding
  - *High Finding:* $-15.0$ pts per finding
  - *Medium Finding:* $-5.0$ pts per finding
  - *Low Finding:* $-2.0$ pts per finding

### 3.7 Documentation Score (10% Weight)
- **Calculation:** Directly uses the heuristic score derived from Phase 13 (README existence, section detection, docs/ folder presence, comment density).
