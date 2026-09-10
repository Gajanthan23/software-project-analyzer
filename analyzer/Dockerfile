# =============================================================================
# Software Project Analyzer — Python Analyzer Microservice Dockerfile (Phase 27)
# FastAPI + scikit-learn + Radon + Lizard code analysis engine
# =============================================================================

FROM python:3.11-slim

# Install system dependencies (git required for cloning & git log analysis)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    cloc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy analyzer application code
COPY . .

# Ensure temp directory exists
RUN mkdir -p /tmp/software-analyzer-workspaces

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
