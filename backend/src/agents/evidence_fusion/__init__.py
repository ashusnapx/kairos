import structlog

from src.agents.base import BaseAgent
from src.core.constants import AgentStatus
from src.models.schemas import AgentOutput, Finding, Evidence, EvidenceSummary

logger = structlog.get_logger()

EVIDENCE_WEIGHTS = {
    "document_intelligence": 0.30,
    "identity_resolution": 0.20,
    "compliance_screening": 0.20,
    "financial_profiling": 0.15,
    "graph_intelligence": 0.15,
}


class EvidenceFusionAgent(BaseAgent):
    agent_name = "evidence_fusion"

    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        agent_outputs = payload.get("agent_outputs", [])

        findings = []
        evidence_list = []
        uncertainties = []
        summaries = []
        total_weighted_confidence = 0.0
        total_weight = 0.0
        risks = []
        mitigations = []

        for output in agent_outputs:
            if not isinstance(output, dict):
                continue
            name = output.get("agent_name", "unknown")
            weight = EVIDENCE_WEIGHTS.get(name, 0.10)
            conf = output.get("confidence", 0.0)
            total_weighted_confidence += conf * weight
            total_weight += weight

            key_findings = []
            for finding in output.get("findings", []):
                if isinstance(finding, dict):
                    key_findings.append(finding.get("description", ""))
                    if finding.get("confidence", 0) > 0.7:
                        risks.append(f"{name}: {finding.get('description', '')}")

            summaries.append(EvidenceSummary(
                source=name,
                weight=weight,
                key_findings=key_findings[:3],
            ))

            for ev in output.get("evidence", []):
                if isinstance(ev, dict):
                    evidence_list.append(Evidence(
                        source=f"{name}: {ev.get('source', 'unknown')}",
                        content=ev.get("content", ""),
                        confidence=ev.get("confidence", 0),
                    ))

            for unc in output.get("uncertainties", []):
                if isinstance(unc, str):
                    uncertainties.append(f"{name}: {unc}")

        self._detect_conflicts(agent_outputs, findings)
        self._deduplicate_findings(findings)

        aggregate_confidence = total_weighted_confidence / max(total_weight, 0.01)
        major_risks = risks[:5] if risks else ["No significant risks identified"]
        major_mitigations = [
            "Enhanced due diligence recommended",
            "Additional identity verification suggested",
            "Source of funds documentation required",
        ]

        recommendation = "PROCEED"
        status = AgentStatus.SUCCESS
        if aggregate_confidence < 0.5:
            recommendation = "REVIEW"
            status = AgentStatus.REVIEW
        if aggregate_confidence < 0.3:
            recommendation = "ESCALATE"
            status = AgentStatus.FAILURE
        has_conflicts = any(f.finding_type == "EVIDENCE_CONFLICT" for f in findings)
        if has_conflicts:
            recommendation = "REVIEW"
            if status == AgentStatus.SUCCESS:
                status = AgentStatus.REVIEW

        return AgentOutput(
            agent_name=self.agent_name,
            status=status,
            confidence=aggregate_confidence,
            findings=findings,
            evidence=evidence_list,
            uncertainties=uncertainties,
            recommendation=recommendation,
            policy_versions_used=self._collect_policies(agent_outputs),
        )

    def _detect_conflicts(self, outputs: list[dict], findings: list):
        recommendations = {}
        for o in outputs:
            if isinstance(o, dict):
                name = o.get("agent_name", "unknown")
                rec = o.get("recommendation", "")
                recommendations[name] = rec

        recs = list(recommendations.values())
        if len(set(recs)) > 1:
            if "ESCALATE" in recs and "PROCEED" in recs:
                findings.append(Finding(
                    finding_type="EVIDENCE_CONFLICT",
                    description=f"Conflicting recommendations: {recommendations}",
                    confidence=0.8,
                    evidence=[Evidence(
                        source="Consistency Check",
                        content=f"Agents disagree: {recommendations}",
                        confidence=0.8,
                    )],
                ))

    def _deduplicate_findings(self, findings: list):
        seen = set()
        unique = []
        for f in findings:
            key = f"{f.finding_type}:{f.description[:50]}"
            if key not in seen:
                seen.add(key)
                unique.append(f)
        findings.clear()
        findings.extend(unique)

    def _collect_policies(self, outputs: list[dict]) -> list[str]:
        policies = set()
        for o in outputs:
            for p in o.get("policy_versions_used", []):
                if isinstance(p, str):
                    policies.add(p)
        return sorted(policies)
