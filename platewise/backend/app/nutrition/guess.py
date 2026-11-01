"""When a scan can't name a dish: guess it from the ingredients the model saw, or build it from them.

The model lists what it sees in a food (palm oil, kontomire, agushie, smoked fish) with each one's
rough share of the weight. We match those to the food table, compare them with each dish's main
ingredients, and either suggest the closest dishes or work out a value from the ingredients
themselves. Every number still comes from the table (CLAUDE.md rules 1 and 2).
"""

import math
from dataclasses import dataclass, replace
from functools import lru_cache

from app.nutrition.foods import Food, load_foods
from app.nutrition.matcher import match

# A seen ingredient must match a table row at least this well to count. Within PREFER of the best
# match, a row used as an ingredient wins ("kontomire" is the leaves here, not the stew).
INGREDIENT_MATCH = 0.7
PREFER = 0.25
# A dish needs this much overlap and at least two shared ingredients. Overlap is an F1 of seen vs.
# the dish's ingredients, each weighted by how rare it is across dishes: dawadawa or agushie says
# more about a dish than tomato or palm oil, which are in dozens.
GUESS_MIN = 0.5
GUESS_SHARED = 2
# With a strong guess the dish is filled in (still marked for checking); weaker guesses are only offered.
GUESS_USE = 0.7


@dataclass(frozen=True)
class Seen:
    food: Food
    share: float


@dataclass(frozen=True)
class Guess:
    food: Food
    score: float
    shared: tuple[str, ...]


def seen_ingredients(items: list[tuple[str, float]]) -> list[Seen]:
    """Model ingredient names → table rows (best match each, no repeats)."""
    used = {i for f in load_foods().values() for i in f.ingredients}
    out: dict[str, Seen] = {}
    for name, share in items[:8]:
        cands = [c for c in match(name, limit=6) if c.score >= INGREDIENT_MATCH]
        if not cands:
            continue
        near = [c for c in cands if c.score >= cands[0].score - PREFER]
        f = next((c.food for c in near if c.food.category == "ingredient" or c.food.id in used), cands[0].food)
        prev = out.get(f.id)
        out[f.id] = Seen(f, (prev.share if prev else 0) + max(0.0, min(1.0, share)))
    return list(out.values())


@lru_cache
def _weights() -> dict[str, float]:
    dishes = [set(f.ingredients) for f in load_foods().values() if f.ingredients]
    df: dict[str, int] = {}
    for d in dishes:
        for i in d:
            df[i] = df.get(i, 0) + 1
    return {i: math.log(1 + len(dishes) / n) for i, n in df.items()}


def guess_dishes(seen: list[Seen], limit: int = 3) -> list[Guess]:
    ids = {s.food.id for s in seen}
    if len(ids) < GUESS_SHARED:
        return []
    w = _weights()

    def weight(xs: set[str]) -> float:
        return sum(w.get(i, 1.0) for i in xs)

    out: list[Guess] = []
    for f in load_foods().values():
        dish = set(f.ingredients)
        if len(dish) < GUESS_SHARED or f.category == "ingredient":
            continue
        shared = ids & dish
        if len(shared) < GUESS_SHARED:
            continue
        score = 2 * weight(shared) / (weight(ids) + weight(dish))
        if score >= GUESS_MIN:
            out.append(Guess(f, round(score, 3), tuple(sorted(shared))))
    return sorted(out, key=lambda g: (-g.score, g.food.name))[:limit]


def compose(seen: list[Seen], name: str) -> Food | None:
    """A one-off food whose per-100 g values are the share-weighted mix of its ingredients."""
    usable = [s for s in seen if s.food.kcal_per_100g is not None and s.share > 0]
    total = sum(s.share for s in usable)
    if len(usable) < 2 or total <= 0:
        return None

    def mix(attr: str) -> float:
        return round(sum((getattr(s.food, attr) or 0) * s.share for s in usable) / total, 1)

    base = usable[0].food
    return replace(
        base,
        id="mix",
        name=name,
        aliases=(),
        category="mixed",
        detail="Worked out from its ingredients: " + ", ".join(s.food.name.split(" (")[0].lower() for s in usable),
        kcal_per_100g=mix("kcal_per_100g"),
        protein_g=mix("protein_g"),
        carbs_g=mix("carbs_g"),
        fat_g=mix("fat_g"),
        count_g=None,
        oily=any(s.food.oily for s in usable),
        greens=any(s.food.greens for s in usable),
        source="mix:" + "+".join(s.food.id for s in usable),
        needs_review=True,
        confidence="estimate",
        ingredients=tuple(s.food.id for s in usable),
    )
