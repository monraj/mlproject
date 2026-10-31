"""In-memory request activity for the admin console. Paths and timings only: never meal text or photos."""

import re
import threading
import time
from collections import deque
from dataclasses import asdict, dataclass
from typing import Any

STARTED = time.time()


@dataclass(frozen=True)
class Event:
    t: float
    method: str
    route: str
    status: int
    ms: float


_events: deque[Event] = deque(maxlen=1000)
_lock = threading.Lock()


def route_of(path: str) -> str:
    return re.sub(r"^/products/\d+$", "/products/{barcode}", path)


def record(method: str, path: str, status: int, ms: float) -> None:
    with _lock:
        _events.append(Event(time.time(), method, route_of(path), status, round(ms, 1)))


def reset() -> None:
    with _lock:
        _events.clear()


def _p95(xs: list[float]) -> float:
    if not xs:
        return 0.0
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(0.95 * (len(xs) - 1))))]


def summary(window_s: float = 24 * 3600) -> dict[str, Any]:
    now = time.time()
    with _lock:
        events = [e for e in _events if now - e.t <= window_s]
    routes: dict[str, list[Event]] = {}
    for e in events:
        routes.setdefault(f"{e.method} {e.route}", []).append(e)
    per_route = []
    for key, evs in sorted(routes.items(), key=lambda kv: -len(kv[1])):
        ms = [e.ms for e in evs]
        per_route.append({
            "route": key,
            "count": len(evs),
            "errors": sum(1 for e in evs if e.status >= 500 or e.status in (400, 413, 422)),
            "refused": sum(1 for e in evs if e.status in (401, 429)),
            "avg_ms": round(sum(ms) / len(ms), 1),
            "p95_ms": _p95(ms),
        })
    last_hour = [e for e in events if now - e.t <= 3600]
    return {
        "uptime_s": round(now - STARTED),
        "window_s": window_s,
        "total": len(events),
        "last_hour": len(last_hour),
        "errors_last_hour": sum(1 for e in last_hour if e.status >= 500),
        "avg_ms_last_hour": round(sum(e.ms for e in last_hour) / len(last_hour), 1) if last_hour else None,
        "routes": per_route,
        "recent": [asdict(e) for e in reversed(events[-60:])],
    }
