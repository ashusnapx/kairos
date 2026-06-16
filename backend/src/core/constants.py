from enum import StrEnum


class CaseStatus(StrEnum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    APPROVED = "APPROVED"
    REVIEW = "REVIEW"
    ESCALATED = "ESCALATED"


class Decision(StrEnum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    ESCALATE = "ESCALATE"


class AgentStatus(StrEnum):
    SUCCESS = "SUCCESS"
    REVIEW = "REVIEW"
    FAILURE = "FAILURE"


class DocumentType(StrEnum):
    PASSPORT = "PASSPORT"
    AADHAAR = "AADHAAR"
    DRIVING_LICENSE = "DRIVING_LICENSE"
    UTILITY_BILL = "UTILITY_BILL"
    PAN_CARD = "PAN_CARD"
    BANK_STATEMENT = "BANK_STATEMENT"
    TAX_DOCUMENT = "TAX_DOCUMENT"


class EventType(StrEnum):
    CASE_CREATED = "case:created"
    DOCUMENT_UPLOADED = "document:uploaded"
    DOCUMENT_ANALYZED = "document:analyzed"
    IDENTITY_RESOLVED = "identity:resolved"
    COMPLIANCE_SCREENED = "compliance:screened"
    FINANCIAL_PROFILED = "financial:profiled"
    GRAPH_INTELLIGENCE = "graph:intelligence"
    EVIDENCE_FUSED = "evidence:fused"
    DEBATE_COMPLETED = "debate:completed"
    HUMAN_REVIEWED = "human:reviewed"
    DECISION_FINALIZED = "decision:finalized"
    AUDIT_RECORDED = "audit:recorded"


EVENT_STREAM = "kairos:events"
