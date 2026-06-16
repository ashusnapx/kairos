import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.core.constants import CaseStatus
from src.core.event_bus import event_bus
from src.core.tracing import get_trace_id
from src.storage.postgres import async_session, Case, Document, HumanReview

logger = structlog.get_logger()
router = APIRouter(prefix="/api/review", tags=["review"])


class ReviewAction(BaseModel):
    reviewer_id: str
    action: str  # APPROVE, REJECT, ESCALATE, REQUEST_INFO
    reasoning: str = ""
    notes: str = ""


@router.post("/{case_id}")
async def submit_review(case_id: str, body: ReviewAction):
    async with async_session() as session:
        case = await session.get(Case, case_id)
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        status_map = {
            "APPROVE": CaseStatus.APPROVED,
            "REJECT": CaseStatus.REVIEW,
            "ESCALATE": CaseStatus.ESCALATED,
            "REQUEST_INFO": CaseStatus.REVIEW,
        }
        case.status = status_map.get(body.action, CaseStatus.REVIEW)
        case.decision = body.action

        review = HumanReview(
            case_id=case_id,
            reviewer_id=body.reviewer_id,
            action=body.action,
            reasoning=body.reasoning,
            notes=body.notes,
        )
        session.add(review)
        await session.commit()

    await event_bus.publish("human:reviewed", {
        "case_id": case_id,
        "action": body.action,
        "reviewer_id": body.reviewer_id,
        "trace_id": get_trace_id(),
    })

    return {"status": "ok", "case_id": case_id, "action": body.action}
