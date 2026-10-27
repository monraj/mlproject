"""Demo provider: canned answers so the app works end to end without an API key."""

from typing import Any

from app.vision.provider import Turn
from app.vision.schema import COACH_SCHEMA, IDEAS_SCHEMA, LABEL_SCHEMA, MEAL_SCHEMA


def _item(
    name: str, cid: str, g: float, lo: float, hi: float, conf: float, oil: str = "unknown", count: int | None = None, bbox: list[float] | None = None
) -> dict[str, Any]:
    return {
        "food_name": name,
        "catalog_id": cid,
        "local_aliases": [],
        "grams_estimate": g,
        "grams_low": lo,
        "grams_high": hi,
        "count": count,
        "cooking_method": "other",
        "visible_oil_level": oil,
        "confidence": conf,
        "bbox": bbox,
    }


class DemoProvider:
    name = "demo"

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        last = turns[-1].content.lower() if turns else ""
        if schema is MEAL_SCHEMA:
            if image is not None:
                return {
                    "is_food": True,
                    "plate_or_reference": "standard plate",
                    "notes": "Demo mode: this is a sample answer, not your photo.",
                    "items": [
                        _item("Rice and beans", "waakye", 320, 240, 420, 0.55, bbox=[0.1, 0.35, 0.5, 0.7]),
                        _item("Pepper stew", "pepper_stew", 40, 25, 70, 0.8, oil="medium", bbox=[0.5, 0.55, 0.8, 0.8]),
                        _item("Boiled egg", "egg", 50, 45, 60, 0.9, count=1, bbox=[0.6, 0.25, 0.8, 0.45]),
                        _item("Fried plantain", "fried_plantain", 80, 55, 120, 0.85, bbox=[0.15, 0.7, 0.45, 0.9]),
                    ],
                }
            items = []
            if "kenkey" in last:
                items.append(_item("Kenkey", "kenkey", 660 if "two" in last or "2" in last else 330, 300, 700, 0.85, count=2 if "two" in last else 1))
            if "fish" in last:
                items.append(_item("Fried fish", "fried_fish", 110, 80, 150, 0.8, count=1))
            if "pepper" in last or "shito" in last:
                items.append(_item("Pepper", "shito" if "shito" in last else "fresh_pepper", 20, 5, 40, 0.4))
            if not items:
                items.append(_item("Waakye", "waakye", 300, 220, 400, 0.6))
            return {"is_food": True, "plate_or_reference": None, "notes": "Demo mode: sample interpretation.", "items": items}
        if schema is COACH_SCHEMA:
            plan = None
            if any(w in last for w in ("wedding", "funeral", "party", "festival")):
                plan = None  # the app asks for real dates; demo mode keeps it simple
            return {
                "reply": "Demo mode: connect an AI key on the server for real coaching. Meanwhile: aim for protein at every meal and greens once a day.",
                "flex_plan": plan,
            }
        if schema is IDEAS_SCHEMA:
            return {
                "tip": "At a chop bar, ask for less oil on top and the smaller ball.",
                "ideas": [
                    {
                        "name": "Light soup with tilapia",
                        "detail": "With a small ball of fufu",
                        "badge": "Best fit",
                        "category": "chop",
                        "items": [{"catalog_id": "light_soup", "grams": 350}, {"catalog_id": "tilapia", "grams": 150}, {"catalog_id": "fufu", "grams": 200}],
                    },
                    {
                        "name": "Kontomire stew with yam",
                        "detail": "Adds the greens you're missing",
                        "badge": "Most greens",
                        "category": "home",
                        "items": [{"catalog_id": "kontomire", "grams": 200}, {"catalog_id": "yam", "grams": 200}],
                    },
                    {
                        "name": "Grilled chicken",
                        "detail": "With a half portion of kelewele",
                        "badge": "Most protein",
                        "category": "quick",
                        "items": [{"catalog_id": "chicken", "grams": 150}, {"catalog_id": "kelewele", "grams": 75}],
                    },
                ],
            }
        if schema is LABEL_SCHEMA:
            return {
                "found": False,
                "barcode": None,
                "name": None,
                "kcal_per_100g": None,
                "protein_g": None,
                "carbs_g": None,
                "fat_g": None,
                "serving_g": None,
                "serving_label": None,
                "from_label": False,
            }
        return {}
