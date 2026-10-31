import hmac
import logging
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.admin import stats
from app.admin.routes import is_admin
from app.admin.routes import router as admin_router
from app.api.routes import router
from app.config import get_settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PlateWise API", version="0.1.0")
app.include_router(router)
app.include_router(admin_router)

OPEN_PATHS = {"/health", "/docs", "/openapi.json"}
AI_PATHS = ("/scans", "/parse", "/coach", "/ideas", "/products/label")
_hits: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def guard(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    s = get_settings()
    path = request.url.path
    track = request.method != "OPTIONS" and not path.startswith("/admin") and path not in ("/docs", "/openapi.json")
    started = time.perf_counter()

    def done(resp: Response) -> Response:
        if track:
            stats.record(request.method, path, resp.status_code, (time.perf_counter() - started) * 1000)
        return resp

    # The console checks its own password; the app's routes check the access code
    # (the admin password also works, so the console's "Try it" page can call them).
    if request.method != "OPTIONS" and path not in OPEN_PATHS and not path.startswith("/admin"):
        code = s.app_access_code
        if code and not hmac.compare_digest(request.headers.get("x-platewise-code", ""), code) and not (s.admin_password and is_admin(request)):
            return done(JSONResponse({"detail": "Wrong or missing access code. Enter it in the app under Me → PlateWise server."}, status_code=401))
        if s.ai_requests_per_hour and path.startswith(AI_PATHS) and not (s.admin_password and is_admin(request)):
            ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
            now = time.monotonic()
            q = _hits[ip]
            while q and now - q[0] > 3600:
                q.popleft()
            if len(q) >= s.ai_requests_per_hour:
                return done(JSONResponse({"detail": "Too many requests this hour. Try again later."}, status_code=429))
            q.append(now)
    return done(await call_next(request))


# Added last so it wraps everything, including the guard's 401/429 replies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)
