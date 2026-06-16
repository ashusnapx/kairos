from datetime import datetime
from pydantic import BaseModel, Field

from src.core.constants import CaseStatus, Decision, AgentStatus


class Evidence(BaseModel):
    source: str = ""
    content: str = ""
    confidence: float = Field(default=0, ge=0, le=1)


class Finding(BaseModel):
    finding_type: str = ""
    description: str = ""
    confidence: float = Field(default=0, ge=0, le=1)
    evidence: list[Evidence] = []


class AgentOutput(BaseModel):
    agent_name: str = ""
    status: AgentStatus = AgentStatus.SUCCESS
    confidence: float = Field(default=0, ge=0, le=1)
    findings: list[Finding] = []
    evidence: list[Evidence] = []
    uncertainties: list[str] = []
    recommendation: str = ""
    execution_time_ms: int = 0
    policy_versions_used: list[str] = []
    trace_id: str = ""


class TamperingResult(BaseModel):
    tampering_detected: bool = False
    tampering_type: str = ""
    confidence: float = Field(default=0, ge=0, le=1)
    evidence: list[str] = []


class IdentityCluster(BaseModel):
    identity_cluster_id: str = ""
    confidence: float = Field(default=0, ge=0, le=1)
    resolved_entities: list[str] = []
    memory_matches: list[str] = []


class ScreeningFinding(BaseModel):
    finding_type: str = ""
    confidence: float = Field(default=0, ge=0, le=1)
    regulation: str = ""
    recommended_action: str = ""


class Counterfactual(BaseModel):
    scenario: str = ""
    new_risk: float = Field(default=0, ge=0, le=100)


class FinancialProfile(BaseModel):
    anomaly: str = ""
    confidence: float = Field(default=0, ge=0, le=1)
    current_risk: float = Field(default=0, ge=0, le=100)
    future_risk: float = Field(default=0, ge=0, le=100)
    counterfactuals: list[Counterfactual] = []


class GraphFinding(BaseModel):
    suspicious_pattern: str = ""
    entities_involved: int = 0
    confidence: float = Field(default=0, ge=0, le=1)


class DebateEntry(BaseModel):
    agent: str = ""
    stance: str = ""
    argument: str = ""
    evidence: list[str] = []


class DebateResult(BaseModel):
    transcript: list[DebateEntry] = []
    consensus: str = ""
    consensus_confidence: float = Field(default=0, ge=0, le=1)


class CaseCreate(BaseModel):
    customer_name: str
    customer_id: str = ""
    documents: list[str] = []


class CaseResponse(BaseModel):
    id: str
    status: CaseStatus
    customer_name: str
    risk_score: float = 0
    decision: Decision | None = None
    trace_id: str = ""
    created_at: datetime
    updated_at: datetime


class EvidenceSummary(BaseModel):
    source: str = ""
    weight: float = Field(default=0, ge=0, le=1)
    key_findings: list[str] = []


class RegulatoryReference(BaseModel):
    regulation: str = ""
    finding: str = ""
    action: str = ""


class HumanAction(BaseModel):
    reviewer_id: str = ""
    action: str = ""
    reasoning: str = ""
    timestamp: datetime | None = None


class FinalDecision(BaseModel):
    decision: Decision
    confidence: float = Field(default=0, ge=0, le=1)
    stability_score: float = Field(default=0, ge=0, le=1)
    evidence_summary: list[EvidenceSummary] = []
    counterfactuals: list[Counterfactual] = []
    regulatory_references: list[RegulatoryReference] = []
    human_actions: list[HumanAction] = []
    audit_reference: str = ""
    trace_id: str = ""


class CaseDetail(BaseModel):
    case: CaseResponse
    documents: list = []
    agent_results: list[dict] = []
    debate: DebateResult | None = None
    human_reviews: list[HumanAction] = []
    final_decision: FinalDecision | None = None
