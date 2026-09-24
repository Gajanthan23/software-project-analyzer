"""
app/schemas.py

Pydantic request and response schemas for the Python Analysis FastAPI service.
Conforms strictly to Section 33 specification shape.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional


class AnalysisRequest(BaseModel):
    repository_path: str = Field(
        ...,
        description="Absolute filesystem path to the isolated repository workspace to analyze.",
        example="/tmp/software-analyzer-workspaces/analysis-12345"
    )


class ModulePlaceholder(BaseModel):
    status: str = Field(default="not_implemented", description="Module implementation status")
    message: str = Field(default="Module analysis engine scheduled for future phase.", description="Description")
    facts: Dict[str, Any] = Field(default_factory=dict, description="FACT metrics measured directly")
    heuristics: Dict[str, Any] = Field(default_factory=dict, description="HEURISTIC rule interpretations")


class PredictionPlaceholder(BaseModel):
    status: str = Field(default="not_implemented", description="ML Model status")
    message: str = Field(default="ML maturity prediction model arrives in Phase 24.", description="Description")
    prediction: Optional[str] = None
    confidence: Optional[float] = None


class AnalysisResponse(BaseModel):
    status: str = Field(default="success", description="Overall API execution status")
    repository_path: str = Field(..., description="Path analyzed")
    repository: Dict[str, Any] = Field(..., description="Repository metrics (FACTS) — Phase 9")
    metrics: Dict[str, Any] = Field(..., description="General LOC & structural breakdown — Phase 9")
    complexity: Dict[str, Any] = Field(..., description="Cyclomatic complexity analysis — Phase 10")
    duplication: Dict[str, Any] = Field(..., description="Code duplication detection — Phase 11")
    testing: Dict[str, Any] = Field(..., description="Test files & coverage analysis — Phase 12")
    documentation: Dict[str, Any] = Field(..., description="Documentation completeness — Phase 13")
    dependencies: Dict[str, Any] = Field(..., description="Dependency parsing — Phase 14")
    security: Dict[str, Any] = Field(..., description="Static security scan findings — Phase 15")
    architecture: Dict[str, Any] = Field(..., description="Architecture pattern heuristics — Phase 16")
    git_history: Dict[str, Any] = Field(..., description="Git commit & contributor statistics — Phase 17")
    scores: Dict[str, Any] = Field(..., description="Category & overall quality scoring — Phase 18")
    recommendations: List[Dict[str, Any]] = Field(..., description="Rule-based recommendations — Phase 19")
    prediction: Dict[str, Any] = Field(..., description="ML Maturity Prediction — Phase 24")
