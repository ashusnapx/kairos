from src.storage.postgres import async_session, AuditLog
from src.core.tracing import get_trace_id


async def record_event(case_id: str, event_type: str, payload: dict):
    async with async_session() as session:
        log = AuditLog(
            case_id=case_id,
            event_type=event_type,
            payload=payload,
            trace_id=get_trace_id(),
        )
        session.add(log)
        await session.commit()
        return log.id


async def get_case_events(case_id: str) -> list[dict]:
    from sqlalchemy import select
    async with async_session() as session:
        result = await session.execute(
            select(AuditLog).where(AuditLog.case_id == case_id).order_by(AuditLog.created_at)
        )
        return [
            {"id": log.id, "event_type": log.event_type, "payload": log.payload, "timestamp": log.created_at.isoformat(), "trace_id": log.trace_id}
            for log in result.scalars().all()
        ]
