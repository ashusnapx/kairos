import json
import structlog
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from src.models.schemas import CaseCreate, CaseResponse, CaseDetail
from src.orchestrator.workflow import run_case
from src.storage.postgres import async_session, Case, Document, AgentResult, Debate, HumanReview, AuditLog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.post("")
async def create_case(body: CaseCreate):
    result = await run_case(body)
    case_id = result.get("case_id", "")
    if not case_id:
        raise HTTPException(status_code=500, detail="Workflow failed to create case")
    return {"case_id": case_id, "status": "processing", "trace_id": result.get("trace_id", "")}


@router.get("")
async def list_cases():
    async with async_session() as session:
        result = await session.execute(select(Case).order_by(Case.created_at.desc()).limit(50))
        cases = result.scalars().all()
        return [
            CaseResponse(
                id=c.id, status=c.status, customer_name=c.customer_name,
                risk_score=c.risk_score, decision=c.decision, trace_id=c.trace_id,
                created_at=c.created_at, updated_at=c.updated_at,
            ).model_dump() for c in cases
        ]


@router.get("/{case_id}")
async def get_case(case_id: str):
    async with async_session() as session:
        case = await session.get(Case, case_id)
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        doc_result = await session.execute(select(Document).where(Document.case_id == case_id))
        docs = doc_result.scalars().all()

        agent_result = await session.execute(
            select(AgentResult).where(AgentResult.case_id == case_id).order_by(AgentResult.created_at)
        )
        agents = agent_result.scalars().all()

        debate_result = await session.execute(select(Debate).where(Debate.case_id == case_id))
        debates = debate_result.scalars().all()

        review_result = await session.execute(select(HumanReview).where(HumanReview.case_id == case_id))
        reviews = review_result.scalars().all()

        from src.models.schemas import HumanAction
        return CaseDetail(
            case=CaseResponse(
                id=case.id, status=case.status, customer_name=case.customer_name,
                risk_score=case.risk_score, decision=case.decision, trace_id=case.trace_id,
                created_at=case.created_at, updated_at=case.updated_at,
            ),
            documents=[{"id": d.id, "type": d.doc_type, "extracted": d.extracted_data, "tampering": d.tampering_result} for d in docs],
            agent_results=[{
                "agent_name": a.agent_name,
                "status": a.status,
                "confidence": a.confidence,
                "findings": a.findings,
                "evidence": a.evidence,
                "uncertainties": a.uncertainties,
                "recommendation": a.recommendation,
                "execution_time_ms": a.execution_time_ms,
            } for a in agents],
            debate={"transcript": debates[0].transcript, "consensus": debates[0].consensus, "confidence": debates[0].consensus_confidence} if debates else None,
            human_reviews=[HumanAction(reviewer_id=r.reviewer_id, action=r.action, reasoning=r.reasoning) for r in reviews],
        ).model_dump()


@router.get("/{case_id}/timeline")
async def get_timeline(case_id: str):
    async with async_session() as session:
        logs = await session.execute(
            select(AuditLog).where(AuditLog.case_id == case_id).order_by(AuditLog.created_at)
        )
        return [
            {"event": log.event_type, "payload": log.payload, "timestamp": log.created_at.isoformat(), "trace_id": log.trace_id}
            for log in logs.scalars().all()
        ]


@router.get("/{case_id}/graph")
async def get_graph(case_id: str):
    from src.storage.neo4j import neo4j_client
    try:
        paths = await neo4j_client.find_paths(case_id, max_depth=3)
    except Exception:
        return {"nodes": [], "edges": []}
    nodes = {}
    edges = []
    for path_entry in paths:
        path = path_entry.get("path", [])
        for seg in path:
            for node in seg.get("nodes", []):
                nid = node.get("id", "")
                if nid and nid not in nodes:
                    labels = list(node.get("labels", ["Unknown"]))
                    nodes[nid] = {"id": nid, "label": labels[0], "properties": dict(node.get("properties", {}))}
            for rel in seg.get("relationships", []):
                edges.append({
                    "from": rel.get("startNodeElementId", ""),
                    "to": rel.get("endNodeElementId", ""),
                    "type": rel.get("type", ""),
                })
    return {"nodes": list(nodes.values()), "edges": edges}
