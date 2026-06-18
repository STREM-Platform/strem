"""In-process agent metrics for production inspection.

Cheap counters/timers for every model call, tool call (by capability), guardrail
block and error — emitted to the structured logs and exposed at
``GET /v1/ai/agent/metrics``. For full per-run traces, LangSmith tracing is wired
in ``app.agent.llm.configure_tracing`` (set ``LANGSMITH_API_KEY``).
"""

from __future__ import annotations

import threading
from dataclasses import asdict, dataclass, field


@dataclass
class _Snapshot:
    model_calls: int = 0
    model_errors: int = 0
    total_model_ms: float = 0.0
    guardrail_blocks: int = 0
    care_redirects: int = 0
    tool_calls: dict[str, int] = field(default_factory=dict)


class AgentMetrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._s = _Snapshot()

    def record_model(self, ms: float, *, error: bool = False) -> None:
        with self._lock:
            self._s.model_calls += 1
            self._s.total_model_ms += ms
            if error:
                self._s.model_errors += 1

    def record_tool(self, capability: str) -> None:
        with self._lock:
            self._s.tool_calls[capability] = self._s.tool_calls.get(capability, 0) + 1

    def record_guardrail_block(self) -> None:
        with self._lock:
            self._s.guardrail_blocks += 1

    def record_care_redirect(self) -> None:
        with self._lock:
            self._s.care_redirects += 1

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            data = asdict(self._s)
        calls = data["model_calls"] or 1
        data["avg_model_ms"] = round(data["total_model_ms"] / calls, 1)
        return data


METRICS = AgentMetrics()
