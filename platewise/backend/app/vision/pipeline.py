"""Model output → matched foods → calories with ranges."""

import io
import uuid
from typing import Any

from PIL import Image, ImageOps

from app.nutrition.calc import nutrients, oil_from_visible
from app.nutrition.guess import GUESS_USE, Guess, compose, guess_dishes, seen_ingredients
from app.nutrition.matcher import AUTO_ACCEPT, Candidate, match
from app.nutrition.portions import stated_grams
from app.vision.schema import AnalysisItem, MealAnalysis

LOW_CONFIDENCE = 0.6
# How far a seen piece may differ from the table's usual piece weight.
PIECE_MIN, PIECE_MAX = 0.4, 2.0


def prepare_image(data: bytes, max_side: int = 1024) -> bytes:
    """Re-encode as JPEG ≤ max_side px. Re-encoding drops EXIF/GPS (CLAUDE.md rule 6)."""
    img: Image.Image = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((max_side, max_side))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


def build_item(ai: AnalysisItem, idx: int, said: str | None = None) -> dict[str, Any]:
    cands = match(ai.food_name, ai.local_aliases, ai.catalog_id)
    top = cands[0] if cands else None
    food = top.food if top and top.score >= AUTO_ACCEPT else None
    # Not sure what the dish is: guess it from the ingredients seen, or work it out from them.
    guessed = mixed = False
    guesses: list[Guess] = []
    if food is None and ai.ingredients:
        seen = seen_ingredients([(i.name, i.share) for i in ai.ingredients])
        guesses = guess_dishes(seen)
        if guesses and guesses[0].score >= GUESS_USE:
            food, guessed = guesses[0].food, True
        elif (built := compose(seen, ai.food_name.strip().capitalize() or "Mixed dish")) is not None:
            food, mixed = built, True
    lo, hi = sorted((ai.grams_low, ai.grams_high))
    grams = min(max(ai.grams_estimate, lo), hi)
    # An amount the person stated ("two balls") beats the model's guess: use the table's portion.
    stated = stated_grams(said, food) if said and food else None
    if stated:
        grams, lo, hi = stated, stated * 0.88, stated * 1.12
        if food and food.count_g:
            ai = ai.model_copy(update={"count": max(1, round(stated / food.count_g))})

    kind = "grams"
    count: int | None = None
    piece_g = food.count_g if food else None
    if food and food.count_g and (ai.count or food.category in ("protein", "snack", "drink", "fruit", "fast_food")):
        kind = "count"
        count = max(1, ai.count or round(grams / food.count_g))
        if not stated:
            # Pieces vary (a small kenkey, a big piece of chicken): size each piece from what the
            # model saw, within sensible limits of the table's usual piece, instead of forcing it.
            piece_g = round(min(max(grams / count, food.count_g * PIECE_MIN), food.count_g * PIECE_MAX))
        assert piece_g is not None  # set from food.count_g above
        grams, lo, hi = count * piece_g, (count - 0.25) * piece_g, (count + 0.25) * piece_g
    elif food and food.oily:
        kind = "oil"
    oil = oil_from_visible(ai.visible_oil_level)

    low = ai.confidence < LOW_CONFIDENCE or food is None or guessed or mixed
    if food is None:
        hint = "Pick the closest match"
    elif guessed:
        hint = f"Looks like {food.name.lower()} from what we can see. Tap to check"
    elif mixed:
        hint = "Worked out from its ingredients. Tap to check"
    elif low:
        hint = f"Is this {food.name.lower()}? Tap to check"
    elif kind == "oil":
        hint = "How oily was it?"
    elif kind == "count":
        unit = food.typical_portion_label.split(" ", 1)[-1]
        hint = f"{count} {unit}{'s' if count and count > 1 and not unit.endswith('s') else ''}"
    else:
        hint = "Looks right"

    n = nutrients(food, grams, lo, hi, oil) if food else None
    return {
        "id": f"i{idx}",
        "name": food.name if food else ai.food_name.strip().capitalize(),
        "ai_name": ai.food_name,
        "food_id": food.id if food and not mixed else None,
        "ai_food_id": food.id if food and not mixed else None,
        "grams": round(grams),
        "grams_low": round(lo),
        "grams_high": round(hi),
        "ai_grams": round(grams),
        "kind": kind,
        "count": count,
        "count_g": piece_g,
        "oil": oil,
        "oily": bool(food and food.oily),
        "greens": bool(food and food.greens),
        "confidence": "low" if low else "ok",
        "hint": hint,
        "per100": food.public()["per100"] if food else None,
        "kcal": round(n.kcal) if n else None,
        "kcal_low": round(n.kcal_low) if n else None,
        "kcal_high": round(n.kcal_high) if n else None,
        "protein": round(n.protein, 1) if n else None,
        "carbs": round(n.carbs, 1) if n else None,
        "fat": round(n.fat, 1) if n else None,
        "candidates": _candidates(guesses, cands),
        "built_from": [i for i in food.ingredients] if mixed and food else None,
        "cooking_method": ai.cooking_method,
        "bbox": ai.bbox if ai.bbox and len(ai.bbox) == 4 else None,
    }


def _candidates(guesses: list[Guess], cands: list[Candidate]) -> list[dict[str, Any]]:
    """Dishes guessed from ingredients first, then name matches; no repeats, at most 4."""
    out: list[dict[str, Any]] = []
    for f, score in [(g.food, g.score) for g in guesses] + [(c.food, c.score) for c in cands]:
        if f.id not in {o["food_id"] for o in out}:
            out.append({"food_id": f.id, "name": f.name, "detail": f.detail, "score": score})
    return out[:4]


def build_scan(analysis: MealAnalysis, provider: str, prompt_version: str, said: str | None = None) -> dict[str, Any]:
    items = [build_item(it, i, said) for i, it in enumerate(analysis.items[:15])] if analysis.is_food else []
    known = [i for i in items if i["kcal"] is not None]
    return {
        "scan_id": uuid.uuid4().hex,
        "is_food": analysis.is_food and bool(items),
        "provider": provider,
        "prompt_version": prompt_version,
        "note": analysis.notes,
        "items": items,
        "totals": {
            "kcal": sum(i["kcal"] for i in known),
            "kcal_low": sum(i["kcal_low"] for i in known),
            "kcal_high": sum(i["kcal_high"] for i in known),
            "protein": round(sum(i["protein"] for i in known), 1),
            "carbs": round(sum(i["carbs"] for i in known), 1),
            "fat": round(sum(i["fat"] for i in known), 1),
            "unmatched": len(items) - len(known),
        },
    }
