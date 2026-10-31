"""Read stated amounts ("two balls of kenkey", "half a plate of jollof") straight from what the
person said, so the grams come from the food table's portion size rather than the model's guess."""

import re

from app.nutrition.foods import Food

NUMBERS = {
    "a": 1.0, "an": 1.0, "one": 1.0, "single": 1.0, "two": 2.0, "three": 3.0, "four": 4.0, "five": 5.0, "six": 6.0,
    "half": 0.5, "1/2": 0.5, "quarter": 0.25, "couple": 2.0,
}
UNITS = {
    "ball", "plate", "bowl", "piece", "slice", "cup", "mug", "pack", "handful", "ladle", "tbsp", "tablespoon",
    "spoon", "wrap", "finger", "stick", "bottle", "can", "egg", "fish", "portion", "serving", "medium", "side",
}
SIZE = {"small": 0.75, "big": 1.35, "large": 1.35, "full": 1.0, "generous": 1.2}

_QTY = r"(\d+(?:\.\d+)?|" + "|".join(sorted(NUMBERS, key=len, reverse=True)) + r")"
_UNIT = r"(" + "|".join(sorted(UNITS, key=len, reverse=True)) + r")(?:e?s)?"


def _singular(word: str) -> str:
    word = word.lower()
    if word.endswith("ches") or word.endswith("shes"):
        return word[:-2]
    return word[:-1] if word.endswith("s") and not word.endswith("ss") else word


def _qty(word: str) -> float:
    return float(word) if re.fullmatch(r"\d+(?:\.\d+)?", word) else NUMBERS[word.lower()]


def _names(food: Food) -> list[str]:
    names = {food.name.lower(), food.id.replace("_", " "), *(a.lower() for a in food.aliases)}
    # "Plain rice, cooked" -> also "plain rice"; "Omo tuo (rice balls)" -> "omo tuo"
    names |= {re.split(r"[,(]", n)[0].strip() for n in list(names)}
    return sorted((n for n in names if len(n) >= 3), key=len, reverse=True)


def _per_unit(food: Food, unit: str) -> float | None:
    m = re.match(r"(\d+(?:\.\d+)?)\s+(.+)", food.typical_portion_label)
    n, label_unit = (float(m.group(1)), _singular(m.group(2))) if m else (1.0, _singular(food.typical_portion_label))
    unit = {"tablespoon": "tbsp", "spoon": "tbsp", "serving": "portion"}.get(unit, unit)
    if unit == label_unit:
        return food.typical_portion_g / n
    if unit == "piece" and food.count_g:
        return food.count_g
    if unit in ("portion", "serving") or (unit in ("plate", "bowl") and label_unit in ("plate", "bowl", "portion")):
        return food.typical_portion_g / n
    return None


def _whole_item(food: Food, name: str) -> float | None:
    """Grams in one whole item (an egg, an avocado), when the food is counted that way."""
    if food.count_g:
        return food.count_g
    if food.typical_portion_label.strip().lower() == "half":
        return food.typical_portion_g * 2
    return _per_unit(food, _singular(name.split()[-1]))


def stated_grams(text: str, food: Food) -> float | None:
    """Grams the person stated for this food, or None when they didn't give an amount we can read."""
    low = " " + re.sub(r"[^a-z0-9/. -]+", " ", text.lower()) + " "
    for name in _names(food):
        for hit in re.finditer(r"(?<![a-z])" + re.escape(name) + r"(?![a-z])", low):
            before = low[: hit.start()].rstrip()
            words = before.split()[-6:]
            window = " ".join(words)
            # "two balls of kenkey", "half a plate of jollof", "a small bowl of red red"
            m = re.search(_QTY + r"(?:\s+a)?(?:\s+(small|big|large|full|generous))?\s+" + _UNIT + r"(?:\s+of)?(?:\s+\w+)?$", window)
            if m:
                per = _per_unit(food, _singular(m.group(3)))
                if per:
                    return _qty(m.group(1)) * SIZE.get(m.group(2) or "", 1.0) * per
            # "two boiled eggs", "an egg", "half an avocado": a bare count of whole items
            m = re.search(r"(?:(half)\s+(?:a|an)|" + _QTY + r")(?:\s+(?:boiled|fried|grilled|small|big|large))?$", window)
            whole = _whole_item(food, name)
            if m and whole:
                return (0.5 if m.group(1) else _qty(m.group(2))) * whole
    return None
