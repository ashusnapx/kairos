import json
import structlog

from src.agents.base import BaseAgent
from src.core.constants import AgentStatus
from src.models.schemas import AgentOutput, Finding, Evidence, ScreeningFinding
from src.services.llm_client import llm_client

logger = structlog.get_logger()

SANCTIONS_DATABASE = [
    {"name": "John Doe", "type": "SANCTIONS", "list": "UNSC", "id": "SDN-001"},
    {"name": "Jane Smith", "type": "PEP", "list": "Global PEP", "id": "PEP-001"},
    {"name": "Abdul Corporation", "type": "SANCTIONS", "list": "OFAC", "id": "SDN-002"},
]

REGULATORY_POLICIES = {
    "FATF Recommendation 10": "Customer due diligence required for all business relationships.",
    "FATF Recommendation 11": "Record-keeping of transaction data for at least 5 years.",
    "FATF Recommendation 12": "PEPs require enhanced due diligence.",
    "FATF Recommendation 16": "Beneficial ownership information must be obtained.",
    "RBI KYC Master Direction 2026": "Aadhaar-based eKYC permitted for low-risk customers.",
    "OFAC Sanctions 2026": "Prohibited transactions with sanctioned entities.",
}


def screen_against_databases(customer_name: str, customer_id: str) -> list[ScreeningFinding]:
    findings = []
    for entry in SANCTIONS_DATABASE:
        from rapidfuzz import fuzz
        score = fuzz.token_sort_ratio(customer_name.lower(), entry["name"].lower()) / 100.0
        if score > 0.8:
            from src.core.constants import DocumentType
            import random
            regulation = "FATF Recommendation 12" if entry["type"] == "PEP" else "OFAC Sanctions 2026"
            findings.append(ScreeningFinding(
                finding_type=f"{entry['type']}_MATCH",
                confidence=score,
                regulation=regulation,
                recommended_action="EDD_REQUIRED" if entry["type"] == "PEP" else "BLOCK",
            ))
    if not findings:
        findings.append(ScreeningFinding(
            finding_type="NO_MATCH",
            confidence=0.95,
            regulation="Standard Due Diligence",
            recommended_action="PROCEED",
        ))
    return findings


class ComplianceScreeningAgent(BaseAgent):
    agent_name = "compliance_screening"

    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        customer_name = payload.get("customer_name", "")
        customer_id = payload.get("customer_id", "")

        findings = []
        evidence_list = []
        uncertainties = []
        policies_used = set()

        db_findings = screen_against_databases(customer_name, customer_id)
        for sf in db_findings:
            policies_used.add(sf.regulation)
            findings.append(Finding(
                finding_type=sf.finding_type,
                description=f"{sf.finding_type}: {sf.regulation} -> {sf.recommended_action}",
                confidence=sf.confidence,
                evidence=[Evidence(source="Sanctions Database", content=f"Match against {sf.regulation}", confidence=sf.confidence)],
            ))
            evidence_list.append(Evidence(
                source="Compliance Database",
                content=json.dumps({"finding": sf.finding_type, "regulation": sf.regulation, "action": sf.recommended_action}),
                confidence=sf.confidence,
            ))

        try:
            llm_prompt = f"""Analyze this customer for AML compliance risk:
Name: {customer_name}
ID: {customer_id}

Database findings: {json.dumps([f.model_dump() for f in db_findings])}

Provide a compliance risk assessment. Consider:
- PEP exposure
- Sanctions risk
- Adverse media potential
- Regulatory concerns under FATF and local regulations

Return as JSON:
{{"risk_level": "LOW|MEDIUM|HIGH", "key_concerns": [], "recommended_actions": []}}"""
            llm_result = await llm_client.generate_json(llm_prompt, system="You are an AML compliance expert.")
            if llm_result and "error" not in llm_result:
                findings.append(Finding(
                    finding_type="AML_LLM_ASSESSMENT",
                    description=f"LLM risk assessment: {llm_result.get('risk_level', 'UNKNOWN')}",
                    confidence=0.7,
                    evidence=[Evidence(source="LLM Compliance Analysis", content=str(llm_result), confidence=0.7)],
                ))
        except Exception as e:
            uncertainties.append(f"LLM assessment unavailable: {e}")

        has_edd = any(f.finding_type in ("PEP_MATCH", "SANCTIONS_MATCH") for f in findings)
        recommendation = "PROCEED"
        status = AgentStatus.SUCCESS
        for f in findings:
            if f.finding_type == "PEP_MATCH" and f.confidence > 0.85:
                recommendation = "ESCALATE"
                status = AgentStatus.REVIEW
            elif f.finding_type == "SANCTIONS_MATCH" and f.confidence > 0.9:
                recommendation = "ESCALATE"
                status = AgentStatus.FAILURE

        overall_confidence = 1.0 - (0.2 if has_edd else 0)

        return AgentOutput(
            agent_name=self.agent_name,
            status=status,
            confidence=overall_confidence,
            findings=findings,
            evidence=evidence_list,
            uncertainties=uncertainties,
            recommendation=recommendation,
            policy_versions_used=list(policies_used),
        )
