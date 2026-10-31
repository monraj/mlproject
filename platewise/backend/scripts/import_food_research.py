"""Rebuild app/nutrition/foods.json from the sourced table in the food research report.

    .venv/bin/python scripts/import_food_research.py "../mobile/reports/Ghanaian food calories database.md"

Rules (CLAUDE.md rule 2): nutrient values come only from the report's appendix, each with its
source code. Foods the research could not find keep their previous value but are marked
confidence "estimate" and needs_review, so the app and the AI can say so. Proxies (a West African
or USDA stand-in) are marked needs_review too. Portions, aliases and categories are app metadata.
"""

import json
import re
import sys
from pathlib import Path
from typing import Any

FOODS = Path(__file__).resolve().parents[1] / "app" / "nutrition" / "foods.json"

# Existing app foods -> appendix row. None = not found in the research (keep, flag as estimate).
EXISTING: dict[str, str | None] = {
    "waakye": "waakye", "rice_beans": "waakye", "jollof": "jollof_spaghetti", "rice": "rice_white_boiled",
    "fried_rice": "fried_rice", "omo_tuo": None, "banku": None, "kenkey": "kenkey_ga", "fufu": "fufu_cassava_unripe_plantain",
    "tuo_zaafi": "tuo_zaafi", "kokonte": None, "yam": "yam_boiled", "ampesi": "plantain_unripe_boiled",
    "kelewele": "kelewele", "fried_plantain": "plantain_ripe_fried", "red_red": "red_red", "gari": "gari_dry",
    "talia": "spaghetti_boiled", "indomie": "indomie_prepared", "bread": "bread_white",
    "light_soup": "light_soup_gardenegg_plain", "groundnut_soup": "groundnut_soup_plain", "palmnut_soup": "palmnut_soup_plain",
    "okro": "okro_soup_fresh", "kontomire": "kontomire_stew", "garden_egg": "garden_egg_stew", "pepper_stew": "tomato_stew_meat",
    "shito": None, "fresh_pepper": None, "vegetables": None, "salad": None, "hausa_koko": "hausa_koko_unsweetened",
    "koose": "koose", "bofrot": "bofrot", "rice_water": "rice_water", "oats": "oats_porridge_water",
    "tilapia": "tilapia_grilled", "fried_fish": None, "chicken": "chicken_dark_grilled", "fried_chicken": "chicken_fried",
    "goat": "goat_stewed", "beef": "beef_stewed", "wele": None, "chichinga": None, "egg": "egg_boiled",
    "fried_egg": "egg_fried", "beans": "cowpea_boiled", "avocado": "avocado", "groundnuts": "groundnuts_roasted",
    "banana": "banana_yellow", "orange": "orange", "pineapple": "pineapple", "pawpaw": "pawpaw", "mango": "mango_orange",
    "milo": "milo_with_milk", "tea": None, "malt": "malta_guinness", "soda": "cola", "sobolo": None,
    "yogurt": "yoghurt_sweetened", "pizza": None, "burger": None, "fries": None,
}

# New foods from the research: appendix row -> app metadata. Portions without a source are app
# defaults and say so in portion_source.
NEW: dict[str, dict[str, Any]] = {
    "eba": dict(id="eba", aliases=["gari eba"], category="staple", portion=("1 ball", 300), source_portion="atlas M 532 g"),
    "akple": dict(id="akple", aliases=["akpele"], category="staple", portion=("1 ball", 300)),
    "oblayo": dict(id="oblayo", aliases=["koko", "corn porridge", "maize porridge"], category="porridge", portion=("1 cup", 300)),
    "cocoyam_boiled": dict(id="cocoyam", aliases=["boiled cocoyam", "mankani"], category="staple", portion=("2 pieces", 200)),
    "cassava_boiled": dict(id="cassava", aliases=["boiled cassava", "bankye"], category="staple", portion=("2 pieces", 200)),
    "water_yam_boiled": dict(id="water_yam", aliases=["afaso"], category="staple", portion=("2 slices", 200)),
    "plantain_roasted": dict(id="roasted_plantain", aliases=["kofi brokeman", "boli", "roast plantain"], category="snack", portion=("1 finger", 180)),
    "plantain_chips": dict(id="plantain_chips", aliases=["chips plantain"], category="snack", portion=("1 pack", 50), oily=True),
    "yam_fried": dict(id="fried_yam", aliases=["yam chips", "fried yam"], category="side", portion=("1 portion", 200), oily=True),
    "light_soup_fish": dict(id="light_soup_fish", aliases=["fish light soup"], category="soup", portion=("1 bowl", 350)),
    "groundnut_soup_chicken": dict(id="groundnut_soup_chicken", aliases=["nkatenkwan with chicken"], category="soup", portion=("1 bowl", 350), oily=True),
    "palmnut_soup_fish": dict(id="palmnut_soup_fish", aliases=["abenkwan with fish"], category="soup", portion=("1 bowl", 350), oily=True),
    "okro_soup_dry_beef": dict(id="okro_dry", aliases=["dry okro soup"], category="soup", portion=("1 bowl", 300), oily=True),
    "ayoyo_soup_fish": dict(id="ayoyo", aliases=["ayoyo soup", "ademe", "jute leaf soup"], category="soup", portion=("1 bowl", 300), oily=True, greens=True),
    "palava_sauce": dict(id="palava_sauce", aliases=["palaver sauce"], category="stew", portion=("1 ladle", 200), oily=True, greens=True),
    "agushie_stew": dict(id="agushie", aliases=["egusi stew", "agushi"], category="stew", portion=("1 ladle", 200), oily=True),
    "fante_fante": dict(id="fante_fante", aliases=["fanti fanti", "fish stew"], category="stew", portion=("1 ladle", 200), oily=True),
    "beans_stew": dict(id="beans_stew", aliases=["bean stew"], category="stew", portion=("1 bowl", 250), oily=True),
    "mackerel_grilled": dict(id="mackerel", aliases=["salmon", "titus"], category="protein", portion=("1 piece", 120), count=120),
    "horse_mackerel_grilled": dict(id="kpanla", aliases=["horse mackerel"], category="protein", portion=("1 piece", 120), count=120),
    "redfish_grilled": dict(id="redfish", aliases=["red fish"], category="protein", portion=("1 piece", 120), count=120),
    "anchovy_smoked": dict(id="smoked_anchovy", aliases=["keta school boys", "smoked anchovies"], category="protein", portion=("1 handful", 30)),
    "sardinella_smoked": dict(id="smoked_herring", aliases=["smoked fish", "smoked herring", "smoked sardinella"], category="protein", portion=("1 piece", 60), count=60),
    "tilapia_salted": dict(id="salted_tilapia", aliases=["koobi", "salted fish"], category="protein", portion=("1 piece", 40), count=40),
    "shrimp_dried": dict(id="dried_shrimp", aliases=["crayfish", "dried shrimps"], category="protein", portion=("1 tbsp", 10)),
    "crab_boiled": dict(id="crab", aliases=["crabs"], category="protein", portion=("1 crab", 100), count=100),
    "snail_cooked": dict(id="snail", aliases=["nwaw", "snails"], category="protein", portion=("2 snails", 80), count=40),
    "guinea_fowl_grilled": dict(id="guinea_fowl", aliases=["akonfem"], category="protein", portion=("1 piece", 120), count=120),
    "beef_tripe_boiled": dict(id="tripe", aliases=["towel", "beef tripe"], category="protein", portion=("3 pieces", 100)),
    "corned_beef": dict(id="corned_beef", aliases=["corn beef"], category="protein", portion=("2 tbsp", 50)),
    "omelette": dict(id="omelette", aliases=["omelet", "egg fry"], category="protein", portion=("1 omelette", 120), oily=True),
    "soya_bean_boiled": dict(id="soya_beans", aliases=["soy beans"], category="protein", portion=("1 cup", 150)),
    "bambara_boiled": dict(id="bambara_beans", aliases=["aboboi", "bambara"], category="protein", portion=("1 cup", 150)),
    "chin_chin": dict(id="chin_chin", aliases=["chinchin"], category="snack", portion=("1 handful", 40), oily=True),
    "meat_pie": dict(id="meat_pie", aliases=["pie"], category="snack", portion=("1 pie", 120), count=120, oily=True),
    "maize_boiled": dict(id="boiled_corn", aliases=["boiled maize", "corn"], category="snack", portion=("1 cob", 150), count=150),
    "maize_roasted": dict(id="roasted_corn", aliases=["roast corn", "roasted maize"], category="snack", portion=("1 cob", 150), count=150),
    "tiger_nut_fresh": dict(id="tiger_nuts", aliases=["atadwe", "tigernuts"], category="snack", portion=("1 handful", 30)),
    "coconut_mature": dict(id="coconut", aliases=["kube"], category="snack", portion=("1 piece", 45)),
    "watermelon": dict(id="watermelon", aliases=["water melon"], category="fruit", portion=("1 slice", 280)),
    "palm_wine": dict(id="palm_wine", aliases=["nsafufuo", "palmwine"], category="drink", portion=("1 cup", 300)),
    "pito_millet": dict(id="pito", aliases=["pito beer"], category="drink", portion=("1 calabash", 400)),
    "brukina": dict(id="brukina", aliases=["burkina"], category="drink", portion=("1 bottle", 350)),
    "fula_zoomkom": dict(id="fula", aliases=["zoomkom", "fura"], category="drink", portion=("1 bottle", 350)),
    "lager": dict(id="beer", aliases=["club beer", "star beer", "lager"], category="drink", portion=("1 bottle", 625), count=625),
    "stout_strong": dict(id="stout", aliases=["guinness stout"], category="drink", portion=("1 bottle", 330), count=330),
    "coconut_water": dict(id="coconut_water", aliases=["kube nsuo"], category="drink", portion=("1 coconut", 250), count=250),
    "orange_juice_fresh": dict(id="orange_juice", aliases=["fresh orange juice"], category="drink", portion=("1 cup", 250)),
    "evaporated_milk": dict(id="evaporated_milk", aliases=["ideal milk", "peak milk"], category="dairy", portion=("2 tbsp", 30)),
    "fanice_pouch": dict(id="fanice", aliases=["fan ice", "fanmilk"], category="dairy", portion=("1 pouch", 145), count=145),
    "sugar_white": dict(id="sugar", aliases=["white sugar"], category="sauce", portion=("1 tsp", 5)),
}

SOURCE_LONG = {
    "WAFCT2019": "FAO/INFOODS West African Food Composition Table 2019",
    "Appiah2020": "Appiah et al. 2020, AJFAND 20(3)",
    "USDA": "USDA FoodData Central",
    "PLOSONE2020": "PLOS ONE 2020 (PMC7660496)",
}


def num(s: str) -> float | None:
    s = s.strip()
    try:
        return float(s)
    except ValueError:
        return None


def read_appendix(report: Path) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    lines = report.read_text().splitlines()
    start = next(i for i, ln in enumerate(lines) if re.match(r"\|\s*id\s*\|", ln))
    for line in lines[start + 2 :]:
        if not line.startswith("|"):
            break
        c = [x.strip() for x in line.strip("|").split("|")]
        rows[c[0]] = {
            "name": c[1], "kcal": num(c[2]), "protein": num(c[3]), "carbs": num(c[4]), "fat": num(c[5]),
            "source": c[6], "confidence": c[7], "portion_label": c[8], "portion_g": num(c[9].split()[0]) if c[9] else None,
            "portion_source": c[10], "notes": c[11] if len(c) > 11 else "",
        }
    return rows


def apply(food: dict[str, Any], row: dict[str, Any]) -> None:
    food.update(
        kcal_per_100g=row["kcal"], protein_g=row["protein"], carbs_g=row["carbs"], fat_g=row["fat"],
        source=row["source"].replace(" ", ""), confidence=row["confidence"],
        needs_review=row["confidence"] == "proxy",
    )
    if row["confidence"] == "proxy":
        food["source_note"] = f"Stand-in: {row['name']}"


def main(report: Path) -> None:
    rows = read_appendix(report)
    data = json.loads(FOODS.read_text())
    foods: list[dict[str, Any]] = data["foods"]
    for f in foods:
        key = EXISTING.get(f["id"], None)
        if key and rows.get(key, {}).get("kcal") is not None:
            apply(f, rows[key])
        else:
            # Not found in the research: keep the earlier value, clearly marked as an estimate.
            f.update(source="estimate:not-in-published-tables", confidence="estimate", needs_review=True)
            f.pop("source_note", None)
        f["portion_source"] = "PlateWise default"
    have = {f["id"] for f in foods}
    for key, meta in NEW.items():
        row = rows[key]
        if row["kcal"] is None or meta["id"] in have:
            continue
        label, grams = meta["portion"]
        food = {
            "id": meta["id"], "name": row["name"].split(" (")[0].split(",")[0] if meta["id"] not in ("smoked_herring",) else "Smoked herring",
            "aliases": meta["aliases"], "category": meta["category"], "detail": row["name"],
            "kcal_per_100g": None, "protein_g": None, "carbs_g": None, "fat_g": None,
            "typical_portion_g": grams, "typical_portion_label": label, "count_g": meta.get("count"),
            "oily": meta.get("oily", False), "greens": meta.get("greens", False), "region": "GH",
        }
        apply(food, row)
        food["portion_source"] = "PlateWise default"
        foods.append(food)
    data["version"] = 2
    data["note"] = (
        "Values per 100 g as eaten, from the sources named on each row (mostly the FAO/INFOODS West African Food "
        "Composition Table 2019). confidence: primary = analysed, calculated = derived by the table's yield factors, "
        "proxy = a West African or USDA stand-in, estimate = not in any published table (needs_review). WAFCT 2019 "
        "is licensed for non-commercial use; commercial use needs FAO's permission (copyright@fao.org)."
    )
    data["sources"] = SOURCE_LONG
    FOODS.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    counts: dict[str, int] = {}
    for f in foods:
        counts[f["confidence"]] = counts.get(f["confidence"], 0) + 1
    print(f"{len(foods)} foods:", counts)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
