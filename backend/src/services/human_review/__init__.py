from src.core.constants import CaseStatus
from src.storage.postgres import async_session, Case, HumanReview


async def submit_review(case_id: str, reviewer_id: str, action: str, reasoning: str = "", notes: str = "") -> dict:
    status_map = {
        "APPROVE": CaseStatus.APPROVED,
        "REJECT": CaseStatus.REVIEW,
        "ESCALATE": CaseStatus.ESCALATED,
        "REQUEST_INFO": CaseStatus.REVIEW,
    }
    async with async_session() as session:
        case = await session.get(Case, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")
        case.status = status_map.get(action, CaseStatus.REVIEW)
        case.decision = action

        review = HumanReview(
            case_id=case_id,
            reviewer_id=reviewer_id,
            action=action,
            reasoning=reasoning,
            notes=notes,
        )
        session.add(review)
        await session.commit()
        return {"case_id": case_id, "action": action, "reviewer_id": reviewer_id}


async def get_pending_reviews() -> list[dict]:
    from sqlalchemy import select
    async with async_session() as session:
        result = await session.execute(
            select(Case).where(Case.status.in_([CaseStatus.IN_PROGRESS, CaseStatus.REVIEW])).order_by(Case.updated_at)
        )
        return [
            {"id": c.id, "customer_name": c.customer_name, "status": c.status.value, "risk_score": c.risk_score, "created_at": c.created_at.isoformat()}
            for c in result.scalars().all()
        ]
