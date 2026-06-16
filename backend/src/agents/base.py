import time
from abc import ABC, abstractmethod

from src.core.constants import AgentStatus
from src.core.tracing import get_trace_id
from src.models.schemas import AgentOutput


class BaseAgent(ABC):
    agent_name: str = "base"

    @abstractmethod
    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        ...

    async def execute(self, case_id: str, payload: dict) -> AgentOutput:
        start = time.monotonic()
        try:
            result = await self.run(case_id, payload)
            result.agent_name = self.agent_name
            result.trace_id = get_trace_id()
            result.execution_time_ms = int((time.monotonic() - start) * 1000)
            return result
        except Exception as e:
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.FAILURE,
                confidence=0.0,
                findings=[],
                uncertainties=[str(e)],
                recommendation="FAILURE",
                execution_time_ms=int((time.monotonic() - start) * 1000),
                trace_id=get_trace_id(),
            )
