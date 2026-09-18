# Software Project Complexity & Quality Analyzer

> A full-stack software analysis platform that accepts any public GitHub repository URL and produces a comprehensive software engineering assessment — measuring cyclomatic complexity, code quality, test coverage, documentation completeness, security vulnerabilities, dependencies, architectural patterns, git contributor statistics, and ML maturity prediction — surfacing insights via an interactive dashboard and exportable PDF reports.

---

## 🎯 Purpose & Design Classification

GitHub displays *what* languages a project uses. This platform answers the deeper questions:
- **How complex** is the codebase?
- **How maintainable** is it over time?
- **How well-tested** is the project?
- **How complete** is the documentation?
- **Are there potential security issues?**
- **What architectural pattern is in use?**
- **How has the project evolved** through its Git history?

Every metric in the platform is strictly classified into one of three categories (Section 42):

| Category | Definition | Metrics / Examples |
| :--- | :--- | :--- |
| **FACT** | Measured directly from repository files with deterministic algorithms | Lines of Code (LOC), file counts, cyclomatic complexity (Radon/Lizard), code duplication %, test file count, dependency list, commit author count |
| **HEURISTIC** | Rule-based interpretations derived from pattern detection | Documentation completeness score, security findings (Bandit/regex), architecture pattern classification, quality sub-scores (0-100), rule-based recommendations |
| **ML PREDICTION** | Output from a trained machine learning model based on extracted feature vectors | Predicted engineering maturity tier (`Beginner`, `Intermediate`, `Advanced`), prediction confidence score, feature importance contributions |

---

## 🏗️ Architecture Overview

The application follows a decoupled microservices architecture:

```
                                 ┌────────────────────────┐
                                 │ React 18 + Vite UI     │
                                 │ (Port 5173 / Port 80)  │
                                 └───────────┬────────────┘
                                             │ HTTP / REST
                                             ▼
                                 ┌────────────────────────┐
                                 │ Express REST API       │
                                 │ (Port 4000)            │
                                 └─────┬──────────────┬───┘
                                       │              │
                       SQL Queries (pg)│              │ HTTP / REST
                                       ▼              ▼
                       ┌──────────────────┐  ┌────────────────────────┐
                       │ PostgreSQL 15    │  │ Python FastAPI Analyzer│
                       │ (Port 5432)      │  │ (Port 8000)            │
                       └──────────────────┘  └────────────────────────┘
```

For detailed architectural decision records (ADRs) and detailed sequence flow diagrams, see the [Architecture Documentation](docs/architecture/).

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, React Router v6, Axios, Recharts, Tailwind CSS, Vitest
- **Backend:** Node.js (v20), Express.js, PostgreSQL (`pg`), JWT Authentication, `bcryptjs`, PDFKit, Jest
- **Python Analyzer:** Python 3.11, FastAPI, Radon, Lizard, Bandit, Pandas, NumPy, Scikit-Learn, Pytest
- **Infrastructure:** Docker, Docker Compose, Nginx, Hadolint, GitHub Actions CI/CD

---

## 📦 Environment Setup

### Option A: Running with Docker Compose (Recommended)

Requires Docker Desktop installed.

```bash
# 1. Clone the repository
git clone https://github.com/Gajanthan23/software-project-analyzer.git
cd software-project-analyzer

# 2. Start all services via Docker Compose
docker compose up --build -d

# 3. Access the web interface
# Open browser at http://localhost (or http://localhost:5173)
```

To stop services:
```bash
docker compose down -v
```

---

### Option B: Local Manual Setup (Without Docker)

#### Prerequisites:
- Node.js v20+ and npm
- Python 3.11+ and pip
- PostgreSQL 15 service running locally on port 5432

#### Step 1: Database Initialization
```bash
# Set up PostgreSQL database schema and seed data
cd backend
npm install
node src/utils/initDb.js
```

#### Step 2: Start Python Analyzer Engine
```bash
cd ../analyzer
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Step 3: Start Node.js Express Backend
```bash
cd ../backend
npm start
# Express running on http://localhost:4000
```

#### Step 4: Start React Frontend
```bash
cd ../frontend
npm install
npm run dev
# React Vite server running on http://localhost:5173
```

---

## 🔐 Default Demo Credentials

- **Email:** `demo@example.com`
- **Password:** `Password123!`

---

## 🧪 Running Automated Tests

```bash
# Frontend Tests (Vitest)
cd frontend
npm test

# Backend Tests (Jest)
cd backend
npm test

# Python Analyzer & ML Tests (Pytest)
cd analyzer
python -m pytest tests/ -v
```

---

## 🤖 Machine Learning Model & Known Limitations

- **Model Architecture:** Random Forest / Decision Tree Classifier (`analyzer/app/ml/model.pkl`)
- **Features Extracted:** 17 quantitative repository metrics (LOC, complexity, test ratio, duplication %, security findings, git commits, quality score)
- **Known Limitations:**
  > [!WARNING]
  > The ML maturity model is currently trained on a curated baseline dataset (`analyzer/app/ml/dataset.csv`). Due to the compact dataset size, predictions are best interpreted as an experimental maturity indicator alongside deterministic FACT metrics and rule-based HEURISTICS.

---

## 🛡️ Security & Resource Limits (End-to-End Enforced)

- **Rate Limiting:** Maximum 10 repository analysis requests per 15-minute window per IP (`express-rate-limit`).
- **Repository Size Limit:** Maximum allowable cloned repository size is **500 MB** (`MAX_REPO_SIZE_MB`). Attempts to analyze repos exceeding this limit return HTTP 413.
- **Analysis Timeout:** Execution timeout strictly enforced at **300 seconds** (`ANALYSIS_TIMEOUT_SECONDS`).
- **Code Execution Safety:** The analyzer treats all code as **untrusted input**. Code in target repositories is **NEVER executed**.

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.