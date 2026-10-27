"""The food table: the only source of nutrient values the app uses."""

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

FOODS_PATH = Path(__file__).with_name("foods.json")


@dataclass(frozen=True)
class Food:
    id: str
    name: str
    aliases: tuple[str, ...]
    category: str
    detail: str
    kcal_per_100g: float | None
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None
    typical_portion_g: float
    typical_portion_label: str
    count_g: float | None
    oily: bool
    greens: bool
    source: str
    needs_review: bool

    def public(self) -> dict[str, object]:
        return {
            "id": self.id,
            "name": self.name,
            "aliases": list(self.aliases),
            "category": self.category,
            "detail": self.detail,
            "per100": {"kcal": self.kcal_per_100g, "protein": self.protein_g, "carbs": self.carbs_g, "fat": self.fat_g},
            "portion_g": self.typical_portion_g,
            "portion_label": self.typical_portion_label,
            "count_g": self.count_g,
            "oily": self.oily,
            "greens": self.greens,
            "source": self.source,
            "needs_review": self.needs_review,
        }


@lru_cache
def load_foods() -> dict[str, Food]:
    raw = json.loads(FOODS_PATH.read_text())
    foods: dict[str, Food] = {}
    for r in raw["foods"]:
        if not r.get("source"):
            raise ValueError(f"food {r.get('id')} has no source")
        foods[r["id"]] = Food(
            id=r["id"],
            name=r["name"],
            aliases=tuple(r.get("aliases", [])),
            category=r["category"],
            detail=r.get("detail", ""),
            kcal_per_100g=r.get("kcal_per_100g"),
            protein_g=r.get("protein_g"),
            carbs_g=r.get("carbs_g"),
            fat_g=r.get("fat_g"),
            typical_portion_g=float(r["typical_portion_g"]),
            typical_portion_label=r["typical_portion_label"],
            count_g=r.get("count_g"),
            oily=bool(r.get("oily")),
            greens=bool(r.get("greens")),
            source=r["source"],
            needs_review=bool(r.get("needs_review", True)),
        )
    return foods


def get_food(food_id: str | None) -> Food | None:
    return load_foods().get(food_id) if food_id else None
