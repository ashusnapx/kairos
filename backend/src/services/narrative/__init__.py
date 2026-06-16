import json
import structlog

from src.services.llm_client import llm_client

logger = structlog.get_logger()


class NarrativeEngine:
    async def generate_investigation_report(self, case_id: str, case_data: dict, agent_outputs: list[dict]) -> str:
        narrative = f"""# KAIROS Investigation Report — Case {case_id[:8]}

## Customer
**Name:** {case_data.get('customer_name', 'Unknown')}
**ID:** {case_data.get('customer_id', 'N/A')}

## Investigation Summary

"""

        for output in agent_outputs:
            if not isinstance(output, dict):
                continue
            name = output.get("agent_name", "unknown")
            status = output.get("status", "UNKNOWN")
            conf = output.get("confidence", 0)
            recommendation = output.get("recommendation", "")

            narrative += f"### {name.replace('_', ' ').title()}\n"
            narrative += f"- **Status:** {status} (confidence: {conf:.1%})\n"
            narrative += f"- **Recommendation:** {recommendation}\n"

            for finding in output.get("findings", []):
                if isinstance(finding, dict):
                    narrative += f"- {finding.get('description', '')}\n"

            for ev in output.get("evidence", []):
                if isinstance(ev, dict):
                    narrative += f"  - Evidence: {ev.get('content', '')[:100]}...\n"

            if output.get("uncertainties"):
                narrative += f"- **Uncertainties:** {'; '.join(output['uncertainties'][:3])}\n"
            narrative += "\n"

        try:
            llm_narrative = await llm_client.generate(
                f"Convert this investigation data into a clear, professional narrative suitable for a compliance officer review:\n{narrative[:3000]}",
                system="You are a compliance reporting specialist. Write concise professional narratives.",
                temperature=0.3,
            )
            if llm_narrative and len(llm_narrative) > 50:
                narrative += "## AI-Generated Narrative\n\n" + llm_narrative + "\n"
        except Exception as e:
            logger.warning("llm_narrative_failed", error=str(e))

        return narrative


narrative_engine = NarrativeEngine()
