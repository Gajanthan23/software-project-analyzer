# Software Project Complexity & Quality Analyzer

> A full-stack application that accepts a public GitHub repository URL and produces
> a comprehensive software-engineering assessment — measuring code complexity,
> maintainability, testing practices, documentation, security findings, and
> architectural patterns — then surfaces results in an interactive dashboard.

---

## Purpose

GitHub shows *what* languages a project uses. This system answers the deeper
questions:

- **How complex** is the codebase?
- **How maintainable** is it over time?
- **How well-tested** is the project?
- **How complete** is the documentation?
- **Are there potential security issues?**
- **What architectural pattern is in use?**
- **How has the project evolved** through its Git history?

Every metric is clearly labelled as one of three types:

| Type | Meaning | Example |
|------|---------|---------|
| **FACT** | Directly measured from the repository | Lines of code, file count |
| **HEURISTIC** | Rule-based interpretation | Documentation score, architecture pattern |
| **ML PREDICTION** | Output of a trained model | Predicted engineering maturity |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Axios, Recharts, Tailwind CSS |
| Backend | Node.js, Express.js, JWT, bcrypt |
| Database | PostgreSQL 15 |
| Analyzer | Python 3.11, FastAPI, Pandas, NumPy, Scikit-learn, radon, lizard, bandit |
| Infrastructure | Docker Compose, GitHub Actions |

---

## Repository Structure

```
software-project-analyzer/
│
├── frontend/                   # React + Vite user-facing application
│   └── src/
│       ├── components/         # Reusable UI components
│       ├── pages/              # Route-level page components
│       ├── services/           # Axios API client modules
│       ├── hooks/              # Custom React hooks
│       └── utils/              # Helper functions and constants
│
├── backend/                    # Node.js + Express REST API
│   └── src/
│       ├── controllers/        # Request handlers (thin layer, delegates to services)
│       ├── routes/             # Express route definitions
│       ├── services/           # Business logic (auth, GitHub, analysis orchestration)
│       ├── middleware/         # JWT auth, rate limiting, error handling
│       ├── models/             # Database query functions (no ORM, plain SQL via pg)
│       └── utils/              # Validation, helpers, logger
│
├── analyzer/                   # Python FastAPI analysis micro-service
│   └── app/
│       ├── analyzers/          # Individual analysis modules:
│       │   ├── repository.py   #   → File counts, LOC, structure (FACTS)
│       │   ├── complexity.py   #   → Cyclomatic complexity via radon/lizard (FACTS)
│       │   ├── duplication.py  #   → Code duplication detection (FACTS)
│       │   ├── testing.py      #   → Test file detection, coverage parsing (FACTS)
│       │   ├── documentation.py#   → README / docs / comment analysis (HEURISTIC)
│       │   ├── dependencies.py #   → Package file parsing (FACTS)
│       │   ├── security.py     #   → Static security scan via bandit/semgrep (HEURISTIC)
│       │   ├── architecture.py #   → Pattern detection heuristics (HEURISTIC)
│       │   └── git_history.py  #   → Commit/contributor stats (FACTS)
│       ├── scoring/
│       │   └── scoring_engine.py # Weighted rule-based score calculation (HEURISTIC)
│       └── ml/
│           ├── train.py        # Model training pipeline (Decision Tree / RF / GBM)
│           └── predict.py      # Inference wrapper (ML PREDICTION)
│
├── database/
│   ├── schema.sql              # Table definitions (users, projects, analysis_runs, …)
│   └── seed.sql                # Optional seed data for local development
│
├── docs/
│   ├── requirements/           # Functional & non-functional requirements
│   ├── architecture/           # Architecture decision records (ADRs)
│   └── diagrams/               # System diagrams (draw.io / Mermaid sources)
│
├── .github/
│   └── workflows/              # GitHub Actions CI/CD pipelines
│
├── docker-compose.yml          # Multi-service orchestration (Phase 27)
├── .gitignore
└── README.md                   # ← You are here
```

---

## Development Phases

The project is built incrementally across 29 phases:

| Phase | Description |
|-------|-------------|
| 1 | Project setup & repository structure ← **current** |
| 2 | React frontend (Vite scaffold, routing, Tailwind) |
| 3 | Node.js backend (Express, env config) |
| 4 | PostgreSQL schema |
| 5 | Authentication (register / login / JWT) |
| 6 | GitHub API integration |
| 7 | Repository downloading |
| 8 | Python FastAPI analyzer service |
| 9 | Repository metrics |
| 10 | Complexity analysis |
| 11 | Duplication analysis |
| 12 | Testing analysis |
| 13 | Documentation analysis |
| 14 | Dependency analysis |
| 15 | Security analysis |
| 16 | Architecture analysis |
| 17 | Git history analysis |
| 18 | Scoring engine |
| 19 | Recommendation engine |
| 20 | Dashboard |
| 21 | Analysis history |
| 22 | Project comparison |
| 23 | Dataset creation |
| 24 | Machine learning |
| 25 | PDF report |
| 26 | Testing |
| 27 | Docker |
| 28 | CI/CD |
| 29 | Deployment |

---

## Getting Started (placeholder — will be expanded per phase)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/software-project-analyzer.git
cd software-project-analyzer

# Instructions for each service will appear in their respective folders
# as they are implemented phase by phase.
```

---

## Security Notes

- Passwords are never stored as plain text (bcrypt)
- All secrets are loaded from environment variables — never committed
- Repository contents are treated as **untrusted input** at all times
- The analyzer **never executes** repository code
- Temporary workspaces are isolated and cleaned up after every analysis

---

## License

MIT — see [LICENSE](LICENSE) for details.