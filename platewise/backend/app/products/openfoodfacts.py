"""Barcode lookup in Open Food Facts (open database; values carry an `off:` source)."""

from typing import Any

import httpx

from app.config import get_settings


class LookupUnavailable(Exception):
    """The product database couldn't be reached (as opposed to the product not existing)."""


def lookup(barcode: str) -> dict[str, Any] | None:
    s = get_settings()
    url = f"{s.openfoodfacts_url}/api/v2/product/{barcode}.json"
    params = {"fields": "product_name,brands,nutriments,serving_quantity,serving_size,quantity"}
    try:
        r = httpx.get(url, params=params, timeout=10, headers={"User-Agent": "PlateWise/0.1 (calorie tracker)"})
    except httpx.HTTPError as e:
        raise LookupUnavailable from e
    if r.status_code == 404:
        return None
    if r.status_code != 200:
        raise LookupUnavailable(f"status {r.status_code}")
    data = r.json()
    p = data.get("product") if data.get("status") == 1 else None
    if not p:
        return None
    n = p.get("nutriments") or {}

    def num(key: str) -> float | None:
        v = n.get(key)
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    kcal = num("energy-kcal_100g")
    if kcal is None and num("energy_100g") is not None:
        kcal = round((num("energy_100g") or 0) / 4.184, 1)  # kJ → kcal
    name = " ".join(x for x in [p.get("brands", "").split(",")[0].strip(), p.get("product_name", "").strip()] if x) or "Product"
    serving = p.get("serving_quantity")
    try:
        serving_g = float(serving) if serving else None
    except (TypeError, ValueError):
        serving_g = None
    return {
        "barcode": barcode,
        "name": name,
        "per100": {"kcal": kcal, "protein": num("proteins_100g"), "carbs": num("carbohydrates_100g"), "fat": num("fat_100g")},
        "serving_g": serving_g,
        "serving_label": p.get("serving_size") or "1 serving",
        "source": f"off:{barcode}",
        "needs_review": kcal is None,
    }
