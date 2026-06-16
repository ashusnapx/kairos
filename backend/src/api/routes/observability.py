import structlog
from fastapi import APIRouter
from sqlalchemy import select, func

from src.storage.postgres import async_session, Case, AgentResult, AuditLog

logger = structlog.get_logger()
router = APIRouter(prefix="/api/observability", tags=["observability"])


@router.get("/metrics")
async def get_metrics():
    async with async_session() as session:
        total_cases = await session.scalar(select(func.count(Case.id)))
        approved = await session.scalar(select(func.count(Case.id)).where(Case.decision == "APPROVE"))
        escalated = await session.scalar(select(func.count(Case.id)).where(Case.decision == "ESCALATE"))
        reviewed = await session.scalar(select(func.count(Case.id)).where(Case.decision == "REVIEW"))

        avg_exec = await session.scalar(select(func.avg(AgentResult.execution_time_ms)))
        total_events = await session.scalar(select(func.count(AuditLog.id)))

    return {
        "cases": {
            "total": total_cases or 0,
            "approved": approved or 0,
            "escalated": escalated or 0,
            "reviewed": reviewed or 0,
        },
        "agents": {
            "avg_execution_time_ms": round(avg_exec or 0, 2),
        },
        "audit": {
            "total_events": total_events or 0,
        },
        "system": {
            "service": "kairos-backend",
            "version": "0.1.0",
        },
    }
