"""Calories are computed here, never by the AI (CLAUDE.md rule 1)."""

from dataclasses import dataclass
from typing import Literal

from app.nutrition.foods import Food

OilLevel = Literal["light", "normal", "very"]

# Multiplier on an oily dish's energy for the user's answer to "How oily was it?".
OIL_FACTOR: dict[str, float] = {"light": 0.75, "normal": 1.0, "very": 1.4}


@dataclass(frozen=True)
class Nutrients:
    kcal: float
    kcal_low: float
    kcal_high: float
    protein: float
    carbs: float
    fat: float


def nutrients(food: Food, grams: float, grams_low: float, grams_high: float, oil: OilLevel = "normal") -> Nutrients | None:
    """Energy and macros for a portion. None when the food has no kcal value yet."""
    if food.kcal_per_100g is None:
        return None
    factor = OIL_FACTOR[oil] if food.oily else 1.0
    per_g = food.kcal_per_100g / 100 * factor
    extra_fat = (factor - 1) * food.kcal_per_100g / 100 / 9  # added oil is fat
    lo, hi = min(grams_low, grams), max(grams_high, grams)
    return Nutrients(
        kcal=grams * per_g,
        kcal_low=lo * per_g,
        kcal_high=hi * per_g,
        protein=grams * (food.protein_g or 0) / 100,
        carbs=grams * (food.carbs_g or 0) / 100,
        fat=max(0.0, grams * ((food.fat_g or 0) / 100 + extra_fat)),
    )


def oil_from_visible(level: str | None) -> OilLevel:
    return {"none": "light", "low": "light", "medium": "normal", "high": "very"}.get(level or "", "normal")  # type: ignore[return-value]
