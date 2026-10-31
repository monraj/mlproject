"""Admin console: status, activity, food table editing. Served at /admin."""

import hmac
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from app.admin import keys, stats
from app.config import get_settings
from app.nutrition.foods import FOODS_PATH, load_foods, read_raw, save_raw
from app.vision.prompts import PROMPT_VERSION
from app.vision.provider import get_provider

STATIC = Path(__file__).with_name("static")
LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient"}

router = APIRouter(prefix="/admin")


def is_admin(request: Request) -> bool:
    password = get_settings().admin_password
    if password:
        return hmac.compare_digest(request.headers.get("x-admin-password", ""), password)
    # No password set: only allow the console from the computer the server runs on.
    host = request.client.host if request.client else ""
    return host in LOCAL_HOSTS and "x-forwarded-for" not in request.headers


def require_admin(request: Request) -> None:
    if not is_admin(request):
        if get_settings().admin_password:
            raise HTTPException(401, "Wrong admin password.")
        raise HTTPException(403, "Set ADMIN_PASSWORD on the server to use the console from another computer.")


@router.get("", include_in_schema=False)
@router.get("/", include_in_schema=False)
def console() -> FileResponse:
    return FileResponse(STATIC / "index.html", headers={"Cache-Control": "no-store"})


@router.get("/api/status", dependencies=[Depends(require_admin)])
def status() -> dict[str, Any]:
    s = get_settings()
    p = get_provider()
    foods = load_foods().values()
    return {
        "ai": p.name,
        "demo": p.name == "demo",
        "provider_calls": p.calls,
        "models": {"gemini": s.gemini_model, "gemini_fallback": s.gemini_fallback_model, "openai": s.openai_model, "anthropic": s.anthropic_model},
        "keys": {"gemini": bool(s.gemini_api_key), "openai": bool(s.openai_api_key), "anthropic": bool(s.anthropic_api_key)},
        "key_hints": {"gemini": keys.hint(s.gemini_api_key), "openai": keys.hint(s.openai_api_key), "anthropic": keys.hint(s.anthropic_api_key)},
        "on_render": keys.on_render(),
        "vision_provider": s.vision_provider,
        "prompt_version": PROMPT_VERSION,
        "foods": len(foods),
        "foods_needing_review": sum(1 for f in foods if f.needs_review),
        "access_code_on": bool(s.app_access_code),
        "admin_password_on": bool(s.admin_password),
        "ai_requests_per_hour": s.ai_requests_per_hour,
        "request_timeout_s": s.request_timeout_s,
        "cors_origins": s.cors_origins,
        "uptime_s": stats.summary()["uptime_s"],
    }


@router.get("/api/stats", dependencies=[Depends(require_admin)])
def activity() -> dict[str, Any]:
    return stats.summary()


@router.get("/api/foods", dependencies=[Depends(require_admin)])
def foods() -> dict[str, Any]:
    return read_raw()


@router.get("/api/foods.json", dependencies=[Depends(require_admin)])
def download() -> Response:
    return Response(FOODS_PATH.read_bytes(), media_type="application/json", headers={"Content-Disposition": 'attachment; filename="foods.json"'})


class FoodIn(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9_]{2,40}$")
    name: str = Field(min_length=1, max_length=80)
    aliases: list[str] = Field(default_factory=list, max_length=20)
    category: str = Field(min_length=1, max_length=30)
    detail: str = Field(default="", max_length=120)
    kcal_per_100g: float | None = Field(default=None, ge=0, le=950)
    protein_g: float | None = Field(default=None, ge=0, le=100)
    carbs_g: float | None = Field(default=None, ge=0, le=100)
    fat_g: float | None = Field(default=None, ge=0, le=100)
    typical_portion_g: float = Field(gt=0, le=3000)
    typical_portion_label: str = Field(min_length=1, max_length=40)
    count_g: float | None = Field(default=None, gt=0, le=3000)
    oily: bool = False
    greens: bool = False
    region: str = "GH"
    source: str = Field(min_length=1, max_length=120)
    needs_review: bool = True


def _row(f: FoodIn) -> dict[str, Any]:
    row = f.model_dump()
    row["aliases"] = [a.strip() for a in f.aliases if a.strip()]
    if f.kcal_per_100g is None:
        row["needs_review"] = True  # no value yet: can't be marked as checked (CLAUDE.md rule 2)
    return row


@router.put("/api/foods/{food_id}", dependencies=[Depends(require_admin)])
def update_food(food_id: str, food: FoodIn) -> dict[str, Any]:
    data = read_raw()
    rows: list[dict[str, Any]] = data["foods"]
    i = next((n for n, r in enumerate(rows) if r["id"] == food_id), None)
    if i is None:
        raise HTTPException(404, "No food with that id.")
    if food.id != food_id and any(r["id"] == food.id for r in rows):
        raise HTTPException(409, "Another food already uses that id.")
    if not food.needs_review and re.match(r"^draft:", food.source):
        raise HTTPException(422, "Before marking a food as checked, replace the draft source with where the values come from, e.g. usda:173424 or fao_wafct2019:01_032.")
    rows[i] = _row(food)
    save_raw(data)
    return rows[i]


@router.post("/api/foods", status_code=201, dependencies=[Depends(require_admin)])
def add_food(food: FoodIn) -> dict[str, Any]:
    data = read_raw()
    if any(r["id"] == food.id for r in data["foods"]):
        raise HTTPException(409, "A food with that id already exists.")
    row = _row(food)
    data["foods"].append(row)
    save_raw(data)
    return row


@router.delete("/api/foods/{food_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_food(food_id: str) -> Response:
    data = read_raw()
    rows = [r for r in data["foods"] if r["id"] != food_id]
    if len(rows) == len(data["foods"]):
        raise HTTPException(404, "No food with that id.")
    data["foods"] = rows
    save_raw(data)
    return Response(status_code=204)


class KeyIn(BaseModel):
    provider: keys.Provider
    key: str = Field(min_length=10, max_length=300)


@router.post("/api/keys", dependencies=[Depends(require_admin)])
def set_key(body: KeyIn) -> dict[str, Any]:
    key = body.key.strip()
    if re.search(r"\s", key):
        raise HTTPException(422, "That key has spaces in it. Copy it again without extra spaces.")
    try:
        keys.check_key(body.provider, key)
    except keys.KeyRejected as e:
        name = keys.NAMES[body.provider]
        if "Connection" in str(e) or "Timeout" in str(e):
            raise HTTPException(422, f"Couldn't reach {name} to check the key ({e}). Check this computer's internet and try again.") from e
        raise HTTPException(422, f"{name} didn't accept that key ({e}). Check you copied the whole key, and that it's active.") from e
    keys.apply_key(body.provider, key)
    return {"ok": True, "provider": body.provider, "hint": keys.hint(key), "ai": get_provider().name}


@router.delete("/api/keys/{provider}", dependencies=[Depends(require_admin)])
def remove_key(provider: keys.Provider) -> dict[str, Any]:
    keys.apply_key(provider, None)
    return {"ok": True, "ai": get_provider().name}
