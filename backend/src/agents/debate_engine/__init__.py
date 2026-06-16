import json
import structlog

from src.agents.base import BaseAgent
from src.core.constants import AgentStatus
from src.models.schemas import AgentOutput, Finding, Evidence, DebateEntry, DebateResult
from src.services.llm_client import llm_client

logger = structlog.get_logger()


PERSONAS = {
    "conservative": {
        "name": "Conservative Officer",
        "bias": "REJECT",
        "focus": "Risk minimization. Customer must prove innocence.",
        "instructions": "You are a conservative compliance officer. Your default stance is REJECT. You scrutinize every finding for risk. You are skeptical of insufficient evidence. You demand absolute certainty before approval.",
    },
    "growth": {
        "name": "Growth Officer",
        "bias": "APPROVE",
        "focus": "Business enablement. Avoid false positives.",
        "instructions": "You are a growth-focused compliance officer. Your default stance is APPROVE. You look for reasons to approve. You note that minor inconsistencies are common in legitimate customers. You advocate for proportional response.",
    },
    "investigator": {
        "name": "Investigator",
        "bias": "REQUEST EVIDENCE",
        "focus": "Reducing uncertainty through additional investigation.",
        "instructions": "You are a forensic investigator. Your default stance is REQUEST EVIDENCE. You never jump to conclusions. You identify gaps in evidence. You recommend specific additional checks before any decision.",
    },
}


def _summarize_evidence_for_debate(agent_outputs: list[dict]) -> str:
    lines = ["=== EVIDENCE SUMMARY FOR DEBATE ==="]
    for o in agent_outputs:
        if not isinstance(o, dict):
            continue
        name = o.get("agent_name", "unknown")
        status = o.get("status", "UNKNOWN")
        conf = o.get("confidence", 0)
        rec = o.get("recommendation", "")
        findings = o.get("findings", [])
        lines.append(f"\n--- {name} (status={status}, confidence={conf:.2f}, recommendation={rec}) ---")
        for f in findings[:3]:
            if isinstance(f, dict):
                lines.append(f"  - {f.get('finding_type', '')}: {f.get('description', '')} (conf={f.get('confidence', 0):.2f})")
        uncs = o.get("uncertainties", [])
        for u in uncs[:2]:
            if isinstance(u, str):
                lines.append(f"  ? {u}")
    return "\n".join(lines)


class DebateEngine(BaseAgent):
    agent_name = "debate_engine"

    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        agent_outputs = payload.get("agent_outputs", [])
        evidence_summary = _summarize_evidence_for_debate(agent_outputs)

        # Check if there are any critical document errors in the agent outputs
        has_critical_doc_error = False
        doc_error_desc = ""
        for o in agent_outputs:
            if isinstance(o, dict) and o.get("agent_name") == "document_intelligence":
                for f in o.get("findings", []):
                    if isinstance(f, dict) and f.get("finding_type") in ("DOCUMENT_TYPE_MISMATCH", "DOCUMENT_INVALID"):
                        has_critical_doc_error = True
                        doc_error_desc = f.get("description", "Critical document mismatch/invalid finding.")
                        break

        transcript = []
        for persona_key, persona in PERSONAS.items():
            entry = await self._generate_persona_response(persona, evidence_summary, transcript)
            if has_critical_doc_error:
                entry.stance = "ESCALATE" if persona_key != "conservative" else "REJECT"
                entry.argument = f"[Compliance Override] severe document verification error: {doc_error_desc}. Automatic policy rules mandate immediate escalation."
                entry.evidence = ["Severe document validation failure"]
            transcript.append(entry)

        rebuttals = self._generate_rebuttals(transcript)
        transcript.extend(rebuttals)

        if has_critical_doc_error:
            consensus = "ESCALATE"
            consensus_confidence = 1.0
        else:
            consensus, consensus_confidence = self._reach_consensus(transcript)

        needs_human = (consensus_confidence < 0.7) or has_critical_doc_error

        findings = [
            Finding(
                finding_type="DEBATE_COMPLETED",
                description=f"Three-persona debate reached {consensus} consensus (confidence: {consensus_confidence:.2%})",
                confidence=consensus_confidence,
                evidence=[Evidence(
                    source="Debate Engine",
                    content=f"Conservative: {transcript[0].stance}, Growth: {transcript[1].stance}, Investigator: {transcript[2].stance}",
                    confidence=consensus_confidence,
                )],
            ),
        ]

        if needs_human:
            findings.append(Finding(
                finding_type="HUMAN_REVIEW_REQUIRED",
                description="Human review required due to low consensus confidence or severe validation override.",
                confidence=1.0,
            ))

        evidence_list = [
            Evidence(
                source="Debate Transcript",
                content=json.dumps([e.model_dump() for e in transcript]),
                confidence=consensus_confidence,
            ),
        ]

        return AgentOutput(
            agent_name=self.agent_name,
            status=AgentStatus.SUCCESS,
            confidence=consensus_confidence,
            findings=findings,
            evidence=evidence_list,
            uncertainties=[] if not needs_human else ["Low consensus confidence or compliance validation override"],
            recommendation=consensus,
        )

    async def _generate_persona_response(
        self, persona: dict, evidence: str, transcript: list[DebateEntry]
    ) -> DebateEntry:
        previous_args = "\n".join([f"{e.agent}: {e.argument[:200]}" for e in transcript[-2:]]) if transcript else "No previous arguments."

        prompt = f"""{persona['instructions']}

Evidence to analyze:
{evidence}

Previous arguments:
{previous_args}

Based on the evidence, state your:
1. Position (APPROVE/REVIEW/ESCALATE/REQUEST_EVIDENCE)
2. Key argument with evidence references
3. List specific evidence items that support your position

Return as JSON:
{{"stance": "your stance", "argument": "detailed argument", "evidence": ["evidence item 1", "evidence item 2"]}}"""

        try:
            result = await llm_client.generate_json(prompt, temperature=0.4)
            if result and "error" not in result:
                return DebateEntry(
                    agent=persona["name"],
                    stance=result.get("stance", persona["bias"]),
                    argument=result.get("argument", "Analysis based on available evidence."),
                    evidence=result.get("evidence", []),
                )
        except Exception as e:
            logger.error("persona_response_failed", persona=persona["name"], error=str(e))

        return DebateEntry(
            agent=persona["name"],
            stance=persona["bias"],
            argument=f"Based on my role as {persona['name']}, I recommend {persona['bias']} as the appropriate course of action. My focus on {persona['focus']} guides this assessment.",
            evidence=["Evidence reviewed per constitutional compliance framework"],
        )

    def _generate_rebuttals(self, transcript: list[DebateEntry]) -> list[DebateEntry]:
        rebuttals = []
        for i, entry in enumerate(transcript):
            for j, other in enumerate(transcript):
                if i != j and other.stance != entry.stance:
                    rebuttals.append(DebateEntry(
                        agent=f"{entry.agent} (rebuttal)",
                        stance=entry.stance,
                        argument=f"In response to {other.agent}'s {other.stance} position: "
                                 f"While I respect the alternative viewpoint, the evidence supports {entry.stance} "
                                 f"because the risk indicators cannot be dismissed without further verification.",
                        evidence=entry.evidence[:2],
                    ))
                    break
        return rebuttals[:3]

    def _reach_consensus(self, transcript: list[DebateEntry]) -> tuple[str, float]:
        stances = [e.stance for e in transcript if "rebuttal" not in e.agent.lower()]
        if not stances:
            return "REVIEW", 0.5

        approve_count = stances.count("APPROVE")
        reject_count = stances.count("REJECT")
        review_count = stances.count("REVIEW")
        request_evidence = stances.count("REQUEST_EVIDENCE")
        escalate_count = stances.count("ESCALATE")

        if escalate_count >= 2:
            return "ESCALATE", 0.8 + (escalate_count * 0.1)
        if reject_count >= 2:
            return "ESCALATE", 0.75
        if approve_count >= 2:
            return "APPROVE", 0.7 + (approve_count * 0.1)
        if request_evidence >= 2 or review_count >= 2:
            return "REVIEW", 0.65
        if escalate_count == 1 or reject_count == 1:
            return "REVIEW", 0.6

        return "REVIEW", 0.5
