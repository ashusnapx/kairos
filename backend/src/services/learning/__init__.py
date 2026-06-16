from src.storage.postgres import async_session, HumanReview, LearningInsight, Case
from sqlalchemy import select, func


async def analyze_review_patterns() -> list[dict]:
    async with async_session() as session:
        result = await session.execute(
            select(HumanReview.action, func.count(HumanReview.id)).group_by(HumanReview.action)
        )
        patterns = [{"action": action, "count": count} for action, count in result.all()]

        recent_overrides = await session.execute(
            select(HumanReview).order_by(HumanReview.created_at.desc()).limit(20)
        )
        overrides = [
            {
                "case_id": r.case_id,
                "action": r.action,
                "reasoning": r.reasoning[:200] if r.reasoning else "",
                "timestamp": r.created_at.isoformat(),
            }
            for r in recent_overrides.scalars().all()
        ]

        return {"patterns": patterns, "recent_overrides": overrides}
