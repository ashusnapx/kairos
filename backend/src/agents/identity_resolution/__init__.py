import structlog
from rapidfuzz import fuzz

from src.agents.base import BaseAgent
from src.core.constants import AgentStatus
from src.models.schemas import AgentOutput, Finding, Evidence

logger = structlog.get_logger()

_embedder = None


def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            logger.error("embedder_load_failed", error=str(e))
    return _embedder


def compute_name_similarity(name_a: str, name_b: str) -> float:
    return fuzz.token_sort_ratio(name_a, name_b) / 100.0


def compute_embedding_similarity(texts: list[str]) -> float:
    embedder = get_embedder()
    if embedder is None or len(texts) < 2:
        return 0.5
    try:
        embeddings = embedder.encode(texts)
        from numpy import dot
        from numpy.linalg import norm
        sim = dot(embeddings[0], embeddings[1]) / (norm(embeddings[0]) * norm(embeddings[1]) + 1e-10)
        return float(max(0, min(1, sim)))
    except Exception as e:
        logger.error("embedding_similarity_failed", error=str(e))
        return 0.5


class IdentityResolutionAgent(BaseAgent):
    agent_name = "identity_resolution"

    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        entities = payload.get("entities", [])
        extracted_docs = payload.get("extracted_docs", {})
        known_identities = payload.get("known_identities", [])

        findings = []
        evidence_list = []
        uncertainties = []

        resolved_name = ""
        name_confidence = 0.0
        all_texts = list(extracted_docs.values()) if isinstance(extracted_docs, dict) else []

        if len(all_texts) >= 2:
            sim = compute_embedding_similarity(all_texts)
            name_confidence = sim
            if sim > 0.85:
                resolved_name = all_texts[0][:100]
                findings.append(Finding(
                    finding_type="IDENTITY_RESOLVED",
                    description=f"Documents belong to same individual (similarity: {sim:.2%})",
                    confidence=sim,
                    evidence=[Evidence(source="Embedding Similarity", content=f"Cross-document similarity: {sim:.2%}", confidence=sim)],
                ))
            else:
                uncertainties.append(f"Document similarity low ({sim:.2%})")
                findings.append(Finding(
                    finding_type="IDENTITY_UNCERTAIN",
                    description=f"Document similarity below threshold ({sim:.2%})",
                    confidence=sim,
                ))

        if entities:
            name_scores = []
            for i, a in enumerate(entities):
                for b in entities[i + 1:]:
                    if isinstance(a, str) and isinstance(b, str):
                        ns = compute_name_similarity(a, b)
                        name_scores.append(ns)
                        evidence_list.append(Evidence(
                            source="Fuzzy Name Matching",
                            content=f"'{a}' vs '{b}': {ns:.2%}",
                            confidence=ns,
                        ))

            if name_scores:
                avg_score = sum(name_scores) / len(name_scores)
                name_confidence = max(name_confidence, avg_score)
                if avg_score > 0.9:
                    findings.append(Finding(
                        finding_type="NAME_CONSISTENCY",
                        description=f"All names consistent (avg similarity: {avg_score:.2%})",
                        confidence=avg_score,
                    ))

        memory_matches = []
        if known_identities:
            for kid in known_identities:
                if isinstance(kid, dict):
                    match = compute_name_similarity(resolved_name, kid.get("name", ""))
                    if match > 0.8:
                        memory_matches.append(kid.get("case_id", "unknown"))
                        findings.append(Finding(
                            finding_type="MEMORY_MATCH",
                            description=f"Matches previously seen identity (case: {kid.get('case_id', 'unknown')})",
                            confidence=match,
                        ))

        overall_confidence = name_confidence * 0.7 + (0.3 if not uncertainties else 0.2)

        recommendation = "PROCEED"
        status = AgentStatus.SUCCESS
        if overall_confidence < 0.5:
            recommendation = "REVIEW"
            status = AgentStatus.REVIEW
        if overall_confidence < 0.3:
            recommendation = "ESCALATE"
            status = AgentStatus.FAILURE

        return AgentOutput(
            agent_name=self.agent_name,
            status=status,
            confidence=overall_confidence,
            findings=findings,
            evidence=evidence_list,
            uncertainties=uncertainties,
            recommendation=recommendation,
        )
