"""What the models are allowed to return. The models never return calories (CLAUDE.md rule 1)."""

from typing import Any, Literal

from pydantic import BaseModel, Field

CookingMethod = Literal["raw", "boiled", "steamed", "fried", "grilled", "stewed", "baked", "fermented", "other"]
OilVisible = Literal["none", "low", "medium", "high", "unknown"]


class AnalysisItem(BaseModel):
    food_name: str
    catalog_id: str | None = None
    local_aliases: list[str] = Field(default_factory=list)
    grams_estimate: float = Field(gt=0, le=5000)
    grams_low: float = Field(gt=0, le=5000)
    grams_high: float = Field(gt=0, le=5000)
    count: int | None = None
    cooking_method: CookingMethod = "other"
    visible_oil_level: OilVisible = "unknown"
    confidence: float = Field(ge=0, le=1)
    bbox: list[float] | None = None


class MealAnalysis(BaseModel):
    is_food: bool
    items: list[AnalysisItem] = Field(default_factory=list)
    plate_or_reference: str | None = None
    notes: str | None = None


class FlexDay(BaseModel):
    date: str
    kcal: float


class FlexPlan(BaseModel):
    reason: str
    days: list[FlexDay]


class CoachAnswer(BaseModel):
    reply: str
    flex_plan: FlexPlan | None = None


class IdeaItem(BaseModel):
    catalog_id: str
    grams: float


class Idea(BaseModel):
    name: str
    detail: str
    badge: str
    category: Literal["home", "chop", "quick"]
    items: list[IdeaItem]


class Ideas(BaseModel):
    ideas: list[Idea]
    tip: str


class LabelRead(BaseModel):
    found: bool
    barcode: str | None = None
    name: str | None = None
    kcal_per_100g: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    serving_g: float | None = None
    serving_label: str | None = None
    from_label: bool = False


def _nullable(t: str) -> dict[str, Any]:
    return {"anyOf": [{"type": t}, {"type": "null"}]}


def _obj(props: dict[str, Any]) -> dict[str, Any]:
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


# Hand-written JSON Schemas in the subset every provider's structured-output mode accepts.
MEAL_SCHEMA = _obj(
    {
        "is_food": {"type": "boolean"},
        "items": {
            "type": "array",
            "items": _obj(
                {
                    "food_name": {"type": "string"},
                    "catalog_id": _nullable("string"),
                    "local_aliases": {"type": "array", "items": {"type": "string"}},
                    "grams_estimate": {"type": "number"},
                    "grams_low": {"type": "number"},
                    "grams_high": {"type": "number"},
                    "count": _nullable("integer"),
                    "cooking_method": {"type": "string", "enum": ["raw", "boiled", "steamed", "fried", "grilled", "stewed", "baked", "fermented", "other"]},
                    "visible_oil_level": {"type": "string", "enum": ["none", "low", "medium", "high", "unknown"]},
                    "confidence": {"type": "number"},
                    "bbox": {"anyOf": [{"type": "array", "items": {"type": "number"}}, {"type": "null"}]},
                }
            ),
        },
        "plate_or_reference": _nullable("string"),
        "notes": _nullable("string"),
    }
)

COACH_SCHEMA = _obj(
    {
        "reply": {"type": "string"},
        "flex_plan": {
            "anyOf": [
                _obj(
                    {
                        "reason": {"type": "string"},
                        "days": {"type": "array", "items": _obj({"date": {"type": "string"}, "kcal": {"type": "number"}})},
                    }
                ),
                {"type": "null"},
            ]
        },
    }
)

IDEAS_SCHEMA = _obj(
    {
        "ideas": {
            "type": "array",
            "items": _obj(
                {
                    "name": {"type": "string"},
                    "detail": {"type": "string"},
                    "badge": {"type": "string"},
                    "category": {"type": "string", "enum": ["home", "chop", "quick"]},
                    "items": {"type": "array", "items": _obj({"catalog_id": {"type": "string"}, "grams": {"type": "number"}})},
                }
            ),
        },
        "tip": {"type": "string"},
    }
)

LABEL_SCHEMA = _obj(
    {
        "found": {"type": "boolean"},
        "barcode": _nullable("string"),
        "name": _nullable("string"),
        "kcal_per_100g": _nullable("number"),
        "protein_g": _nullable("number"),
        "carbs_g": _nullable("number"),
        "fat_g": _nullable("number"),
        "serving_g": _nullable("number"),
        "serving_label": _nullable("string"),
        "from_label": {"type": "boolean"},
    }
)
