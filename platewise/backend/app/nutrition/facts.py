"""Ground coach answers in the food table. Mirrored in mobile/src/ai/facts.ts."""

import re

from app.nutrition.matcher import match

AMOUNT = re.compile(r"(\d[\d,.]*)(?:\s?(?:-|–|to)\s?(\d[\d,.]*))?\s?(?:kcal|calories|cal\b|g\b|grams?)", re.I)


def food_facts(question: str, limit: int = 4) -> list[str]:
    """What the food table says about foods named in the question, as whole-portion figures."""
    words = re.sub(r"[^a-z0-9 -]+", " ", question.lower()).split()
    terms = [f"{a} {b}" for a, b in zip(words, words[1:], strict=False)] + words
    seen: set[str] = set()
    out: list[str] = []
    for term in terms:
        if len(term) < 4:
            continue
        cands = match(term, limit=1)
        if not cands or cands[0].score < 0.9 or cands[0].food.id in seen:
            continue
        f = cands[0].food
        seen.add(f.id)
        kcal = round((f.kcal_per_100g or 0) * f.typical_portion_g / 100) if f.kcal_per_100g is not None else None
        protein = round((f.protein_g or 0) * f.typical_portion_g / 100) if f.protein_g is not None else None
        numbers = f", about {kcal} kcal" + (f" and {protein} g protein" if protein is not None else "") if kcal is not None else ""
        sure = {"proxy": " These figures come from a similar West African dish, so treat them as a guide.",
                "estimate": " No published figures exist for this dish yet; these are PlateWise estimates."}.get(f.confidence, "")
        out.append(f"{f.name} ({f.detail}): a usual portion is {f.typical_portion_label}, about {f.typical_portion_g:g} g{numbers}.{sure}")
        if len(out) >= limit:
            break
    return out


def strip_unverified_numbers(reply: str, given: str) -> str:
    """Drop calorie/gram figures that aren't in what the model was given, with their clause."""
    allowed = {n.replace(",", "") for n in re.findall(r"\d[\d,.]*", re.sub(r"\d{4}-\d{2}-\d{2}", " ", given))}

    def known(n: str | None) -> bool:
        return not n or n.replace(",", "").rstrip(".") in allowed

    def unverified(text: str) -> bool:
        return any(not known(m.group(1)) or not known(m.group(2)) for m in AMOUNT.finditer(text))

    def clean(paragraph: str) -> str:
        text = re.sub(r"\s*\([^)]*\)", lambda m: "" if unverified(m.group(0)) else m.group(0), paragraph)
        kept: list[str] = []
        for sentence in re.findall(r"[^.!?]+[.!?]*", text) or [text]:
            if not unverified(sentence):
                kept.append(sentence)
                continue
            parts = re.split(r"\s+[–—-]\s+|,\s+", sentence)
            if unverified(parts[0]):
                continue
            keep = [parts[0]]
            for p in parts[1:]:
                if unverified(p):
                    break
                keep.append(p)
            kept.append(", ".join(keep).rstrip(".!? ") + ".")
        return re.sub(r"[ \t]+", " ", " ".join(kept)).strip()

    # Paragraph by paragraph, so line breaks survive.
    cleaned = "\n\n".join(c for c in (clean(p) for p in re.split(r"\n\s*\n|\n", reply)) if c)
    return cleaned or AMOUNT.sub("", reply).strip()
