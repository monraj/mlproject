"""Model output → matched foods → calories with ranges."""

import io
import uuid
from typing import Any

from PIL import Image, ImageOps

from app.nutrition.calc import nutrients, oil_from_visible
from app.nutrition.matcher import AUTO_ACCEPT, match
from app.vision.schema import AnalysisItem, MealAnalysis

LOW_CONFIDENCE = 0.6


def prepare_image(data: bytes, max_side: int = 1024) -> bytes:
    """Re-encode as JPEG ≤ max_side px. Re-encoding drops EXIF/GPS (CLAUDE.md rule 6)."""
    img: Image.Image = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((max_side, max_side))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


def build_item(ai: AnalysisItem, idx: int) -> dict[str, Any]:
    cands = match(ai.food_name, ai.local_aliases, ai.catalog_id)
    top = cands[0] if cands else None
    food = top.food if top and top.score >= AUTO_ACCEPT else None
    lo, hi = sorted((ai.grams_low, ai.grams_high))
    grams = min(max(ai.grams_estimate, lo), hi)

    kind = "grams"
    count: int | None = None
    if food and food.count_g and (ai.count or food.category in ("protein", "snack", "drink", "fruit", "fast_food")):
        kind = "count"
        count = max(1, ai.count or round(grams / food.count_g))
        grams, lo, hi = count * food.count_g, (count - 0.25) * food.count_g, (count + 0.25) * food.count_g
    elif food and food.oily:
        kind = "oil"
    oil = oil_from_visible(ai.visible_oil_level)

    low = ai.confidence < LOW_CONFIDENCE or food is None
    if food is None:
        hint = "Pick the closest match"
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
        "food_id": food.id if food else None,
        "ai_food_id": food.id if food else None,
        "grams": round(grams),
        "grams_low": round(lo),
        "grams_high": round(hi),
        "ai_grams": round(grams),
        "kind": kind,
        "count": count,
        "count_g": food.count_g if food else None,
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
        "candidates": [{"food_id": c.food.id, "name": c.food.name, "detail": c.food.detail, "score": c.score} for c in cands[:3]],
        "cooking_method": ai.cooking_method,
        "bbox": ai.bbox if ai.bbox and len(ai.bbox) == 4 else None,
    }


def build_scan(analysis: MealAnalysis, provider: str, prompt_version: str) -> dict[str, Any]:
    items = [build_item(it, i) for i, it in enumerate(analysis.items[:15])] if analysis.is_food else []
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
