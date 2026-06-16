import uuid
from contextvars import ContextVar

trace_id_var: ContextVar[str] = ContextVar("trace_id", default="")


def generate_trace_id() -> str:
    return f"trace_{uuid.uuid4().hex[:16]}"


def get_trace_id() -> str:
    return trace_id_var.get()


def set_trace_id(tid: str | None = None) -> str:
    tid = tid or generate_trace_id()
    trace_id_var.set(tid)
    return tid
