from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import structlog
from src.core.event_bus import event_bus

logger = structlog.get_logger()
from src.storage.neo4j import neo4j_client
from src.storage.postgres import init_db
from src.api.routes.cases import router as cases_router
from src.api.routes.review import router as review_router
from src.api.routes.judge import router as judge_router
from src.api.routes.observability import router as observability_router
from src.api.routes.policies import router as policies_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await event_bus.connect()
    try:
        await neo4j_client.connect()
    except Exception as e:
        logger.warning("neo4j_unavailable", error=str(e))
    await init_db()
    await seed_default_policies()
    yield
    await event_bus.disconnect()
    await neo4j_client.close()


app = FastAPI(
    title="KAIROS API",
    description="KYC Autonomous Intelligence & Risk Oversight System",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)
app.include_router(review_router)
app.include_router(judge_router)
app.include_router(observability_router)
app.include_router(policies_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kairos-backend", "version": "0.1.0"}


async def seed_default_policies():
    from src.services.policy import POLICIES
    from src.storage.postgres import async_session, Policy
    from sqlalchemy import select, func

    async with async_session() as session:
        count = await session.scalar(select(func.count(Policy.id)))
        if count and count > 0:
            return
        for p in POLICIES:
            from datetime import datetime
            policy = Policy(
                name=p["name"],
                version=p["version"],
                content=p["content"],
                effective_date=datetime.fromisoformat(p["effective_date"]),
                status="ACTIVE",
            )
            session.add(policy)
        await session.commit()
