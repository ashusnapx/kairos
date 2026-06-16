import json
import structlog
from redis.asyncio import Redis

from src.config import settings
from src.core.constants import EVENT_STREAM

logger = structlog.get_logger()


class EventBus:
    def __init__(self):
        self.redis: Redis | None = None

    async def connect(self):
        self.redis = Redis.from_url(settings.redis_url, decode_responses=True)
        await self.redis.ping()
        logger.info("event_bus_connected")

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def publish(self, event_type: str, payload: dict) -> str:
        if not self.redis:
            await self.connect()
        event = {"type": event_type, "payload": json.dumps(payload)}
        msg_id = await self.redis.xadd(EVENT_STREAM, event)
        logger.info("event_published", event_type=event_type, msg_id=msg_id)
        return msg_id

    async def subscribe(self, group: str, consumer: str, batch_size: int = 10):
        try:
            await self.redis.xgroup_create(EVENT_STREAM, group, mkstream=True)
        except Exception:
            pass
        while True:
            msgs = await self.redis.xreadgroup(
                group, consumer, {EVENT_STREAM: ">"}, count=batch_size
            )
            for _stream_name, entries in msgs:
                for msg_id, data in entries:
                    yield msg_id, data
                    await self.redis.xack(EVENT_STREAM, group, msg_id)


event_bus = EventBus()
