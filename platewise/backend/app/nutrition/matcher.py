"""Match a model's food name to rows in the food table."""

import re
from dataclasses import dataclass
from difflib import SequenceMatcher

from app.nutrition.foods import Food, load_foods

AUTO_ACCEPT = 0.75


@dataclass(frozen=True)
class Candidate:
    food: Food
    score: float


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower()).strip()


def _score(query: str, food: Food) -> float:
    q = _norm(query)
    if not q:
        return 0.0
    names = [_norm(food.name), _norm(food.id.replace("_", " ")), *(_norm(a) for a in food.aliases)]
    best = 0.0
    for n in names:
        if q == n:
            return 1.0
        ratio = SequenceMatcher(None, q, n).ratio()
        if n and (n in q.split(" ") or (len(n) > 3 and n in q)):
            ratio = max(ratio, 0.8)
        if len(q) > 3 and q in n:
            ratio = max(ratio, 0.78)
        best = max(best, ratio)
    return best


def match(name: str, aliases: list[str] | None = None, catalog_id: str | None = None, limit: int = 5) -> list[Candidate]:
    foods = load_foods()
    scored: dict[str, float] = {}
    for f in foods.values():
        s = max([_score(name, f), *(_score(a, f) * 0.95 for a in aliases or [])])
        scored[f.id] = s
    if catalog_id and catalog_id in foods:
        # The model's pick from the catalogue is a strong hint, but the name still has to agree.
        scored[catalog_id] = max(scored[catalog_id], 0.6 + 0.4 * scored[catalog_id], 0.8)
    ranked = sorted(scored.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return [Candidate(foods[fid], round(score, 3)) for fid, score in ranked if score > 0.3]


def search(q: str, limit: int = 10) -> list[Food]:
    return [c.food for c in match(q, limit=limit)]
