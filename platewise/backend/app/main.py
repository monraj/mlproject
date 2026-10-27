import hmac
import logging
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import get_settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PlateWise API", version="0.1.0")
app.include_router(router)

OPEN_PATHS = {"/health", "/docs", "/openapi.json"}
AI_PATHS = ("/scans", "/parse", "/coach", "/ideas", "/products/label")
_hits: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def guard(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    s = get_settings()
    path = request.url.path
    if request.method != "OPTIONS" and path not in OPEN_PATHS:
        code = s.app_access_code
        if code and not hmac.compare_digest(request.headers.get("x-platewise-code", ""), code):
            return JSONResponse({"detail": "Wrong or missing access code. Enter it in the app under Me → PlateWise server."}, status_code=401)
        if s.ai_requests_per_hour and path.startswith(AI_PATHS):
            ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
            now = time.monotonic()
            q = _hits[ip]
            while q and now - q[0] > 3600:
                q.popleft()
            if len(q) >= s.ai_requests_per_hour:
                return JSONResponse({"detail": "Too many requests this hour. Try again later."}, status_code=429)
            q.append(now)
    return await call_next(request)


# Added last so it wraps everything, including the guard's 401/429 replies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)
