import datetime as dt
import re
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.api.models import CoachRequest, IdeasRequest, ParseRequest
from app.config import get_settings
from app.nutrition.calc import nutrients
from app.nutrition.foods import get_food, load_foods
from app.nutrition.matcher import search
from app.products.openfoodfacts import LookupUnavailable, lookup
from app.safety.rules import calorie_floor
from app.vision.pipeline import build_scan, prepare_image
from app.vision.prompts import LABEL_PROMPT, PROMPT_VERSION, coach_system, ideas_prompt, photo_prompt, scan_system, text_prompt
from app.vision.provider import ProviderError, Turn, get_provider
from app.vision.schema import COACH_SCHEMA, IDEAS_SCHEMA, LABEL_SCHEMA, MEAL_SCHEMA, CoachAnswer, Ideas, LabelRead, MealAnalysis

router = APIRouter()


def _ai(system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
    try:
        return get_provider().generate_json(system=system, turns=turns, schema=schema, image=image)
    except ProviderError as e:
        raise HTTPException(502, "The AI service didn't answer. Try again in a moment.") from e


async def _read_image(image: UploadFile) -> bytes:
    data = await image.read()
    if len(data) > get_settings().max_image_bytes:
        raise HTTPException(413, "Photo is too large (8 MB max).")
    try:
        return prepare_image(data)
    except Exception as e:
        raise HTTPException(400, "That file isn't a photo we can read.") from e


@router.get("/health")
def health() -> dict[str, Any]:
    p = get_provider()
    return {"status": "ok", "ai": p.name, "demo": p.name == "demo", "foods": len(load_foods()), "prompt_version": PROMPT_VERSION}


@router.get("/foods")
def foods() -> dict[str, Any]:
    return {"foods": [f.public() for f in load_foods().values()]}


@router.get("/foods/search")
def foods_search(q: str) -> dict[str, Any]:
    return {"foods": [f.public() for f in search(q)]}


@router.post("/scans")
async def scan(image: UploadFile = File(...), meal: str | None = Form(None), note: str | None = Form(None)) -> dict[str, Any]:
    jpeg = await _read_image(image)  # held in memory only; never stored (CLAUDE.md rule 6)
    raw = _ai(scan_system(), [Turn("user", photo_prompt(meal, note))], MEAL_SCHEMA, jpeg)
    try:
        analysis = MealAnalysis.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(502, "The AI answer was unreadable. Try again.") from e
    return build_scan(analysis, get_provider().last_used, PROMPT_VERSION)


@router.post("/parse")
def parse(req: ParseRequest) -> dict[str, Any]:
    raw = _ai(scan_system(), [Turn("user", text_prompt(req.text, req.lang))], MEAL_SCHEMA)
    try:
        analysis = MealAnalysis.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(502, "The AI answer was unreadable. Try again.") from e
    return build_scan(analysis, get_provider().last_used, PROMPT_VERSION)


@router.post("/coach")
def coach(req: CoachRequest) -> dict[str, Any]:
    floor = calorie_floor(req.sex)
    turns = [Turn(m.role, m.content) for m in req.messages]
    if turns[0].role != "user" or turns[-1].role != "user":
        raise HTTPException(422, "Conversation must start and end with a user message.")
    raw = _ai(coach_system(req.context, floor, req.hide_numbers), turns, COACH_SCHEMA)
    try:
        ans = CoachAnswer.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(502, "The AI answer was unreadable. Try again.") from e
    plan = None
    if ans.flex_plan:
        today = dt.date.today()
        days = []
        for d in ans.flex_plan.days[:10]:
            try:
                day = dt.date.fromisoformat(d.date)
            except ValueError:
                continue
            if 0 <= (day - today).days <= 21:
                days.append({"date": d.date, "kcal": max(floor, int(round(d.kcal / 10) * 10))})  # safety floor always wins
        if days:
            plan = {"reason": ans.flex_plan.reason[:80], "days": days}
    return {"reply": ans.reply, "flex_plan": plan}


@router.post("/ideas")
def ideas(req: IdeasRequest) -> dict[str, Any]:
    raw = _ai(
        "You plan realistic Ghanaian meals from a food catalogue.",
        [Turn("user", ideas_prompt(req.kcal_left, req.protein_left, req.greens_today, req.meal, req.category))],
        IDEAS_SCHEMA,
    )
    try:
        parsed = Ideas.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(502, "The AI answer was unreadable. Try again.") from e
    out = []
    for n, idea in enumerate(parsed.ideas[:4]):
        portions = [(f, max(5.0, min(it.grams, 2000.0))) for it in idea.items if (f := get_food(it.catalog_id)) and f.kcal_per_100g is not None]
        total = sum((f.kcal_per_100g or 0.0) * g / 100 for f, g in portions)
        # Models often overshoot; shrink every portion so the meal fits what's left.
        scale = min(1.0, req.kcal_left * 0.95 / total) if total else 1.0
        items, kcal, protein = [], 0.0, 0.0
        for food, g0 in portions:
            g = max(5.0, round(g0 * scale / 5) * 5)
            nut = nutrients(food, g, g, g)
            assert nut is not None
            kcal += nut.kcal
            protein += nut.protein
            items.append({"food_id": food.id, "name": food.name, "grams": round(g)})
        if items:
            out.append(
                {
                    "id": f"idea{n}",
                    "name": idea.name,
                    "detail": idea.detail,
                    "badge": idea.badge,
                    "category": idea.category,
                    "kcal": round(kcal),
                    "protein": round(protein),
                    "items": items,
                }
            )
    return {"ideas": out, "tip": parsed.tip}


@router.get("/products/{barcode}")
def product(barcode: str) -> dict[str, Any]:
    if not re.fullmatch(r"\d{6,14}", barcode):
        raise HTTPException(422, "Barcode should be 6–14 digits.")
    try:
        found = lookup(barcode)
    except LookupUnavailable as e:
        raise HTTPException(503, "The product database can't be reached right now. Photograph the nutrition label instead.") from e
    if not found:
        raise HTTPException(404, "Product not found.")
    return found


@router.post("/products/label")
async def product_label(image: UploadFile = File(...)) -> dict[str, Any]:
    jpeg = await _read_image(image)
    raw = _ai("You read food packaging accurately.", [Turn("user", LABEL_PROMPT)], LABEL_SCHEMA, jpeg)
    try:
        r = LabelRead.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(502, "The AI answer was unreadable. Try again.") from e
    if not r.found:
        raise HTTPException(404, "That doesn't look like a food package.")
    code = re.sub(r"\D", "", r.barcode or "")
    return {
        "barcode": code or None,
        "name": r.name or "Product",
        "per100": {"kcal": r.kcal_per_100g, "protein": r.protein_g, "carbs": r.carbs_g, "fat": r.fat_g},
        "serving_g": r.serving_g,
        "serving_label": r.serving_label or "1 serving",
        "source": "label:photo" if r.from_label else "label:unread",
        "needs_review": True,
    }
