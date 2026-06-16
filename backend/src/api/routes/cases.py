import json
import structlog
import uuid
from pydantic import BaseModel
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


from fastapi import UploadFile, File, Form
import random

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    customer_name: str = Form(None),
    doc_type: str = Form("PASSPORT")
):
    try:
        contents = await file.read()
        hex_bytes = contents.hex()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    # Generate a random transaction profile and details to trigger a full agent pipeline
    name = customer_name or file.filename.split(".")[0].replace("_", " ").title()
    income = random.randint(45000, 180000)
    tx_count = random.randint(10, 22)
    transactions = [random.randint(1000, 12000) for _ in range(tx_count)]

    # Make structuring likely for demo if the name contains suspicious triggers
    if "structured" in name.lower() or "mule" in name.lower():
        transactions = [random.randint(8500, 9900) for _ in range(tx_count)]

    case_payload = {
        "customer_name": name,
        "customer_id": f"CUST-{uuid.uuid4().hex[:8].upper()}",
        "address": "123 Financial Center Blvd, Suite 400",
        "income": income,
        "transactions": transactions,
        "deposits": [t for t in transactions if t > 0],
        "document_bytes": hex_bytes,
        "doc_type": doc_type,
    }

    result = await run_case(case_payload)
    case_id = result.get("case_id", "")
    if not case_id:
        raise HTTPException(status_code=500, detail="Failed to run workflow on uploaded file")

    # Persist the document details in PostgreSQL
    async with async_session() as session:
        from src.storage.postgres import Document
        from src.core.constants import DocumentType
        import os

        # Save mock file path
        file_dir = "/app/data/uploads"
        os.makedirs(file_dir, exist_ok=True)
        file_path = os.path.join(file_dir, f"{case_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(contents)

        doc = Document(
            case_id=case_id,
            doc_type=DocumentType(doc_type) if doc_type in DocumentType._value2member_map_ else DocumentType.PASSPORT,
            file_path=file_path,
            extracted_data={"full_name": name, "file_size": len(contents)},
            ocr_confidence=0.88,
        )
        session.add(doc)
        await session.commit()

    return {"case_id": case_id, "status": "processed", "trace_id": result.get("trace_id", "")}


class CounterfactualSimulation(BaseModel):
    income_proof_submitted: bool = False
    address_verified: bool = False
    additional_collateral: bool = False
    pattern_explained: bool = False


@router.post("/{case_id}/simulate-counterfactual")
async def simulate_counterfactual(case_id: str, body: CounterfactualSimulation):
    async with async_session() as session:
        case = await session.get(Case, case_id)
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        original_risk = case.risk_score
        original_decision = case.decision or "REVIEW"

        simulated_risk = original_risk
        if body.income_proof_submitted:
            simulated_risk -= 30
        if body.address_verified:
            simulated_risk -= 15
        if body.additional_collateral:
            simulated_risk -= 10
        if body.pattern_explained:
            simulated_risk -= 20

        simulated_risk = max(5.0, min(100.0, simulated_risk))

        simulated_decision = "APPROVE"
        if simulated_risk > 60:
            simulated_decision = "REVIEW"
        if simulated_risk > 80:
            simulated_decision = "ESCALATE"

        return {
            "case_id": case_id,
            "original_risk": original_risk,
            "simulated_risk": simulated_risk,
            "original_decision": original_decision,
            "simulated_decision": simulated_decision,
        }
