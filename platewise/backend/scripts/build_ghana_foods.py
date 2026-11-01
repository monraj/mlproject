"""Add foods from every part of Ghana, cooking ingredients and recipe dishes to the food table.

    .venv/bin/python scripts/build_ghana_foods.py data/wafct/WAFCT_2019.xlsx

Download WAFCT_2019.xlsx from https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx
(not committed: FAO licenses it for non-commercial use).

Rules (CLAUDE.md rule 2): every value is read from the named WAFCT 2019 row, or worked out from
WAFCT ingredient rows by a recipe written out below. Nothing is typed in from memory.
- confidence "primary": an analysed WAFCT row; "calculated": WAFCT's own cooked value (marked * in
  the table) or a recipe here; "proxy": the closest WAFCT row for a dish it doesn't list (needs_review).
- Recipe ratios and portions are PlateWise defaults, so recipe rows are needs_review too.
- `people` says who mainly eats a food (for suggestions and search); "All" means eaten countrywide.
- `ingredients` lists a dish's main visible ingredients, so a scan can guess a dish from what it sees.
Running it again replaces the rows it owns and leaves the rest of the table alone.
"""

import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FOODS = ROOT / "app" / "nutrition" / "foods.json"
MOBILE = ROOT.parent / "mobile" / "src" / "data" / "foods.json"
OWNER = "build_ghana_foods"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}

AKAN, EWE, GA, NORTH, HAUSA, FULANI, WEST, ALL = "Akan", "Ewe", "Ga-Adangbe", "Mole-Dagbani", "Hausa / Zongo", "Fulani", "Nzema / Ahanta", "All"


# ---------------------------------------------------------------------------------------------
# WAFCT reader (stdlib only)


def read_wafct(path: Path) -> dict[str, dict[str, Any]]:
    z = zipfile.ZipFile(path)
    strings = ["".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    sheet = next(s for s in wb.find("m:sheets", NS) if s.get("name", "").startswith("03 NV_sum_39"))  # type: ignore[union-attr]
    target = "xl/" + str(rels[sheet.get(f"{{{NS['r']}}}id")]).lstrip("/").replace("xl/", "")

    def col(ref: str) -> int:
        n = 0
        for ch in re.match(r"[A-Z]+", ref).group():  # type: ignore[union-attr]
            n = n * 26 + ord(ch) - 64
        return n - 1

    def num(v: str) -> float | None:
        m = re.search(r"-?\d+(\.\d+)?", v or "")
        return round(float(m.group()), 2) if m else None

    out: dict[str, dict[str, Any]] = {}
    for row in ET.fromstring(z.read(target)).iter(f"{{{NS['m']}}}row"):
        cells: dict[int, str] = {}
        for c in row.findall("m:c", NS):
            v = c.find("m:v", NS)
            if v is None or v.text is None:
                continue
            cells[col(str(c.get("r")))] = strings[int(v.text)] if c.get("t") == "s" else v.text
        code = cells.get(0, "")
        if not re.fullmatch(r"\d\d_\d{3}", code):
            continue
        out[code] = {
            "name": cells.get(1, ""), "kcal": num(cells.get(7, "")), "water": num(cells.get(8, "")), "protein": num(cells.get(9, "")),
            "fat": num(cells.get(10, "")), "carbs": num(cells.get(11, "")), "fibre": num(cells.get(12, "")),
        }
    return out


# ---------------------------------------------------------------------------------------------
# Ingredients: what Ghanaian cooks put in the pot. Category "ingredient"; logged by the spoon or handful.
# (id, name, aliases, WAFCT code, portion label, portion g)

INGREDIENTS: list[tuple[str, str, list[str], str, str, float]] = [
    ("palm_oil", "Palm oil (red)", ["zomi", "red oil", "palm oil"], "11_004", "1 tbsp", 14),
    ("vegetable_oil", "Vegetable oil", ["cooking oil", "frytol", "oil"], "11_010", "1 tbsp", 14),
    ("groundnut_oil", "Groundnut oil", ["peanut oil", "nkate ngo"], "11_003", "1 tbsp", 14),
    ("coconut_oil", "Coconut oil", ["kube ngo"], "11_002", "1 tbsp", 14),
    ("palm_kernel_oil", "Palm kernel oil", ["adwe ngo"], "11_012", "1 tbsp", 14),
    ("shea_butter", "Shea butter", ["nkuto", "kpaam"], "11_008", "1 tbsp", 14),
    ("butter", "Butter", ["blue band", "margarine"], "11_011", "1 tsp", 5),
    ("groundnut_paste", "Groundnut paste", ["nkate kwan paste", "groundnut butter", "peanut butter", "nkatie paste"], "06_026", "1 tbsp", 16),
    ("agushie_seeds", "Agushie (melon seeds)", ["egusi seeds", "akatoa", "ground agushie"], "06_035", "1 tbsp", 10),
    ("sesame", "Sesame seeds", ["benniseed", "sesame"], "06_015", "1 tbsp", 9),
    ("coconut_milk", "Coconut milk", ["kube nsuo"], "06_006", "1/2 cup", 120),
    ("dawadawa", "Dawadawa (fermented locust beans)", ["dawadawa", "iru", "soumbala", "kpalgu"], "03_042", "1 tbsp", 10),
    ("dried_fish", "Dried fish", ["momoni", "dried fish", "stockfish"], "09_053", "1 piece", 30),
    ("tomato", "Tomatoes", ["ntoos", "fresh tomatoes", "tomato"], "04_021", "1 tomato", 90),
    ("tomato_paste", "Tomato paste", ["tin tomatoes", "gino", "tomato puree"], "04_066", "1 tbsp", 16),
    ("onion", "Onion", ["gyeene", "onions"], "04_018", "1 onion", 110),
    ("chilli", "Chilli pepper (kpakpo shito)", ["kpakpo shito", "hot pepper", "scotch bonnet", "mako", "chilli"], "04_046", "2 peppers", 10),
    ("dried_chilli", "Dried chilli powder", ["ground pepper", "pepper powder"], "13_006", "1 tsp", 3),
    ("green_pepper", "Green pepper (sweet)", ["bell pepper", "green pepper"], "04_049", "1/2 pepper", 60),
    ("ginger", "Ginger", ["akakaduro", "ginger"], "04_082", "1 thumb", 10),
    ("garlic", "Garlic", ["galik"], "04_015", "2 cloves", 6),
    ("kontomire_leaves", "Kontomire (cocoyam leaves), boiled", ["kontomire leaves", "nkontommire", "cocoyam leaves", "abomu leaves"], "04_097", "1 cup", 100),
    ("cassava_leaves", "Cassava leaves, boiled", ["bankye nhaban"], "04_092", "1 cup", 100),
    ("ayoyo_leaves", "Ayoyo (jute leaves), boiled", ["ayoyo leaves", "ademe leaves", "jute leaves", "salaat"], "04_107", "1 cup", 100),
    ("bra_leaves", "Bra (roselle leaves), boiled", ["bra", "sorrel leaves", "bito", "roselle leaves"], "04_117", "1 cup", 100),
    ("baobab_leaves", "Baobab leaves (kuka), boiled", ["kuka leaves", "baobab leaves"], "04_087", "1 cup", 100),
    ("baobab_leaf_powder", "Baobab leaf powder", ["kuka powder", "dried baobab leaves"], "04_002", "1 tbsp", 6),
    ("aleefu", "Aleefu (amaranth leaves), boiled", ["aleefu", "amaranth", "efan"], "04_086", "1 cup", 100),
    ("gboma", "Gboma (garden egg leaves), boiled", ["gboma", "gboma leaves", "garden egg leaves"], "04_105", "1 cup", 100),
    ("bitter_leaf", "Bitter leaf (awonwono), boiled", ["awonwono", "bitter leaf", "vernonia"], "04_126", "1 cup", 100),
    ("moringa", "Moringa leaves, boiled", ["zogale", "moringa", "drumstick leaves"], "04_101", "1/2 cup", 50),
    ("spinach_leaves", "Spinach, boiled", ["spinach"], "04_118", "1 cup", 100),
    ("garden_egg_fruit", "Garden eggs, boiled", ["nyaadowa", "garden eggs", "eggplant"], "04_104", "2 garden eggs", 120),
    ("okra_fruit", "Okro, boiled", ["nkruma", "okra", "okro fingers"], "04_111", "5 fingers", 60),
    ("dried_okra", "Dried okro powder", ["dried okro", "okra powder", "kpalaga"], "04_077", "1 tbsp", 8),
    ("pumpkin", "Pumpkin, boiled", ["squash", "pumpkin"], "04_115", "1 cup", 150),
    ("cabbage", "Cabbage", ["cabbage"], "04_005", "1 cup, shredded", 70),
    ("carrot", "Carrot", ["carrots"], "04_006", "1 carrot", 60),
    ("cucumber", "Cucumber", ["cucumber"], "04_032", "1/2 cucumber", 100),
    ("lettuce", "Lettuce", ["lettuce"], "04_040", "1 cup", 40),
    ("maize_meal", "Corn flour (maize meal)", ["corn flour", "maize flour", "esam", "corn dough flour"], "01_057", "1 cup", 120),
    ("millet_flour", "Millet flour", ["millet flour", "zia"], "01_063", "1 cup", 120),
    ("sorghum_flour", "Sorghum flour (guinea corn)", ["guinea corn flour", "kazaa"], "01_072", "1 cup", 120),
    ("cassava_flour", "Cassava flour (kokonte flour)", ["kokonte flour", "cassava flour", "lafun"], "02_004", "1 cup", 120),
    ("wheat_flour", "Wheat flour", ["flour", "all purpose flour"], "01_087", "1 cup", 125),
    ("milk_powder", "Milk powder", ["powdered milk", "nido", "cowbell"], "10_002", "2 tbsp", 15),
    ("condensed_milk", "Condensed milk (sweetened)", ["sweetened condensed milk", "condensed milk"], "10_015", "1 tbsp", 20),
    ("fresh_milk", "Fresh milk", ["milk", "uht milk"], "10_001", "1 cup", 250),
    ("honey", "Honey", ["ewo", "honey"], "13_001", "1 tbsp", 21),
    ("seasoning_cube", "Seasoning cube", ["maggi", "royco", "onga", "cube"], "13_008", "1 cube", 4),
]

# ---------------------------------------------------------------------------------------------
# Dishes, foods and snacks. (id, name, aliases, category, detail, WAFCT code, confidence override,
#  portion label, portion g, count g, oily, greens, people, ingredients)

F = tuple[str, str, list[str], str, str, str, str | None, str, float, float | None, bool, bool, list[str], list[str]]
DISHES: list[F] = [
    # Staples from the south
    ("yam_fufu", "Yam fufu", ["fufu yam", "pounded yam", "bayere fufu"], "staple", "Pounded yam", "02_097", "proxy", "1 ball", 300, None, False, False, [AKAN, NORTH], ["yam"]),
    ("yam_cassava_fufu", "Yam and cassava fufu", ["fufu with yam"], "staple", "Pounded yam and cassava", "02_092", "proxy", "1 ball", 300, None, False, False, [AKAN], ["yam", "cassava"]),
    ("oto", "Oto (mashed yam with palm oil)", ["yam oto", "yam eto", "bayere eto"], "staple", "Mashed yam with palm oil, served with eggs", "02_087", "proxy", "1 plate", 250, None, True, False, [AKAN], ["yam", "palm_oil", "egg"]),
    ("plantain_eto", "Plantain eto", ["ɛtɔ", "eto", "mashed plantain", "apem eto"], "staple", "Mashed unripe plantain with palm oil", "02_096", "proxy", "1 plate", 250, None, True, False, [AKAN], ["ampesi", "palm_oil", "onion"]),
    ("ripe_plantain_eto", "Ripe plantain eto", ["ripe eto", "boodie eto"], "staple", "Mashed ripe plantain with palm oil", "02_088", "proxy", "1 plate", 250, None, True, False, [AKAN], ["ampesi", "palm_oil"]),
    ("mpotompoto", "Mpotompoto (yam pottage)", ["yam pottage", "asaasewa", "yam porridge"], "staple", "Yam cooked down with tomato, onion and palm oil", "02_086", "proxy", "1 bowl", 350, None, True, False, [AKAN, GA], ["yam", "palm_oil", "tomato", "onion"]),
    ("sweet_potato", "Sweet potato, boiled", ["santom", "abrode santom", "white sweet potato"], "staple", "Pale sweet potato, boiled", "02_023", None, "2 pieces", 200, None, False, False, [ALL], []),
    ("orange_sweet_potato", "Orange sweet potato, boiled", ["osp", "orange flesh sweet potato"], "staple", "Orange-fleshed sweet potato, boiled", "02_072", None, "2 pieces", 200, None, False, False, [ALL], []),
    ("fried_sweet_potato", "Fried sweet potato", ["sweet potato chips"], "side", "Deep fried sweet potato", "02_083", None, "1 portion", 150, None, True, False, [ALL], ["sweet_potato", "vegetable_oil"]),
    ("irish_potato", "Irish potato, boiled", ["potato", "irish potatoes"], "staple", "Boiled potato", "02_010", None, "2 potatoes", 200, 100, False, False, [ALL], []),
    ("taro", "Taro, boiled", ["colocasia", "brobe"], "staple", "Boiled taro", "02_016", None, "2 pieces", 200, None, False, False, [AKAN, EWE], []),
    ("brown_rice", "Brown rice", ["brown rice"], "staple", "Brown rice, boiled", "01_035", None, "1 cup", 200, None, False, False, [ALL], []),
    ("local_rice", "Local rice (red / unpolished)", ["local rice", "red rice", "aveyime rice", "hohoe rice", "tamale rice"], "staple", "Ghana-grown red rice, boiled", "01_066", None, "1 cup", 200, None, False, False, [EWE, NORTH], []),
    ("rice_fish_veg", "Rice with fish and vegetables", ["one pot rice", "rice with fish"], "staple", "One-pot rice with fish and vegetables", "01_158", "proxy", "1 plate", 350, None, True, False, [ALL], ["rice", "dried_fish", "tomato", "onion", "vegetable_oil"]),
    ("jollof_spaghetti", "Jollof spaghetti", ["spaghetti jollof", "talia jollof"], "staple", "Spaghetti cooked in tomato stew", "01_157", "proxy", "1 plate", 300, None, True, False, [ALL], ["talia", "tomato", "onion", "vegetable_oil"]),
    ("jollof_macaroni", "Jollof macaroni", ["macaroni jollof"], "staple", "Macaroni in tomato sauce with meat", "01_156", "proxy", "1 plate", 300, None, True, False, [ALL], ["tomato", "onion", "vegetable_oil", "goat"]),
    # Staples from the north and the Zongo
    ("tz_millet", "Millet TZ", ["millet tuo", "zia saab", "tuo millet", "sao"], "staple", "Stiff porridge of whole millet", "01_153", None, "1 bowl", 400, None, False, False, [NORTH], ["millet_flour"]),
    ("fonio", "Fonio (acha)", ["acha", "fini", "fonio"], "staple", "Fonio grains, boiled", "01_051", None, "1 cup", 200, None, False, False, [NORTH], []),
    ("maasa", "Maasa (rice cakes)", ["masa", "waina", "rice cakes"], "snack", "Fermented rice cakes, fried", "01_163", None, "4 pieces", 120, 30, True, False, [HAUSA, NORTH], ["rice", "vegetable_oil"]),
    ("tubaani", "Tubaani (steamed bean cake)", ["tubani", "moi moi", "moin moin", "bean cake"], "staple", "Steamed bean flour cake with potash", "03_152", "proxy", "2 pieces", 200, 100, False, False, [NORTH, HAUSA], ["beans"]),
    ("fura_nono", "Fura da nono", ["fura de nono", "fura and nono", "zoomkom with milk"], "porridge", "Millet balls in fermented milk with sugar", "01_176", "proxy", "1 calabash", 400, None, False, False, [HAUSA, FULANI, NORTH], ["millet_flour", "fresh_milk", "sugar"]),
    ("millet_porridge_milk", "Millet porridge with milk and sugar", ["koko with milk", "millet koko with milk"], "porridge", "Millet porridge with milk and sugar", "01_174", "proxy", "1 cup", 300, None, False, False, [NORTH, HAUSA], ["millet_flour", "fresh_milk", "sugar"]),
    ("tom_brown", "Tom brown", ["tombrown", "roasted corn porridge", "weanimix"], "porridge", "Roasted maize porridge, unsweetened", "01_122", "proxy", "1 cup", 300, None, False, False, [ALL], ["maize_meal"]),
    ("corn_kernels", "Fresh corn kernels, boiled", ["boiled maize kernels", "corn kernels"], "side", "Fresh maize kernels, boiled", "04_108", None, "1 cup", 150, None, False, False, [ALL], []),
    # Soups and sauces from across the country
    ("kuka_soup", "Kuka soup (baobab leaf soup)", ["kuka soup", "baobab leaf soup", "toa soup"], "soup", "Baobab leaf soup with fish and dawadawa", "14_022", "proxy", "1 bowl", 300, None, True, True, [NORTH, HAUSA], ["baobab_leaves", "dawadawa", "dried_fish", "tomato", "onion"]),
    ("dried_kuka_soup", "Dried kuka soup", ["kuka powder soup", "dried baobab soup"], "soup", "Dried baobab leaf soup with fish and dawadawa", "14_020", "proxy", "1 bowl", 300, None, False, True, [NORTH, HAUSA], ["baobab_leaf_powder", "dawadawa", "dried_fish"]),
    ("bra_soup", "Bra soup (roselle leaf soup)", ["bra soup", "sorrel leaf soup", "bito soup"], "soup", "Roselle leaf soup with fish, dawadawa and tomato", "14_014", "proxy", "1 bowl", 300, None, False, True, [NORTH], ["bra_leaves", "dawadawa", "dried_fish", "tomato"]),
    ("groundnut_dawadawa_soup", "Northern groundnut soup", ["groundnut soup with dawadawa", "zim soup", "nkatie soup with dawadawa"], "soup", "Groundnut soup with fish and dawadawa", "14_006", "proxy", "1 bowl", 300, None, True, False, [NORTH], ["groundnut_paste", "dawadawa", "dried_fish", "tomato", "onion"]),
    ("bean_leaf_soup", "Bean leaf soup", ["cowpea leaf soup", "beans leaves soup"], "soup", "Bean leaf soup with fish, groundnut paste and dawadawa", "14_029", "proxy", "1 bowl", 300, None, True, True, [NORTH], ["groundnut_paste", "dawadawa", "dried_fish"]),
    ("ayoyo_lamb_soup", "Ayoyo soup with meat", ["ayoyo with meat", "ademe with meat"], "soup", "Jute leaf soup with meat and dawadawa", "14_015", "proxy", "1 bowl", 300, None, False, True, [NORTH, EWE], ["ayoyo_leaves", "dawadawa", "goat"]),
    ("okro_lamb_soup", "Dry okro soup with meat", ["kpalaga soup", "dried okro soup"], "soup", "Dried okro soup with meat and dawadawa", "14_017", "proxy", "1 bowl", 300, None, False, True, [NORTH, HAUSA], ["dried_okra", "dawadawa", "goat"]),
    ("fresh_okro_soup_fish", "Okro soup with fish and palm oil", ["fetri detsi", "okro soup fish", "okro with palm oil"], "soup", "Fresh okro soup with fish, palm oil and dawadawa", "14_019", "proxy", "1 bowl", 300, None, True, True, [EWE, GA, NORTH], ["okra_fruit", "palm_oil", "dried_fish", "dawadawa"]),
    ("cassava_leaf_stew", "Cassava leaf stew", ["bankye nhaban abomu", "cassava leaves soup"], "stew", "Cassava leaf stew with fish and palm oil", "14_025", "proxy", "1 ladle", 200, None, True, True, [WEST, AKAN], ["cassava_leaves", "palm_oil", "dried_fish"]),
    ("spinach_stew", "Spinach stew", ["spinach sauce", "aleefu stew"], "stew", "Spinach stew with fish", "14_004", "proxy", "1 ladle", 200, None, True, True, [ALL], ["spinach_leaves", "dried_fish", "tomato", "onion", "vegetable_oil"]),
    ("garden_egg_sauce", "Garden egg sauce with fish", ["nyaadowa froye", "garden egg stew with fish"], "stew", "Garden egg sauce with fish", "14_007", "proxy", "1 ladle", 200, None, True, True, [AKAN, EWE, GA], ["garden_egg_fruit", "dried_fish", "palm_oil", "tomato", "onion"]),
    ("palm_oil_sauce", "Palm oil fish sauce", ["zomi sauce", "red oil stew"], "stew", "Red palm oil sauce with fish and vegetables", "14_005", "proxy", "1 ladle", 150, None, True, False, [EWE, GA], ["palm_oil", "dried_fish", "tomato", "onion"]),
    ("chicken_soup_dawadawa", "Northern chicken soup", ["chicken soup", "local chicken soup", "akokɔ nkwan"], "soup", "Chicken soup with vegetables and dawadawa", "14_033", "proxy", "1 bowl", 350, None, False, False, [NORTH, AKAN], ["chicken", "dawadawa", "tomato", "onion"]),
    ("tomato_meat_sauce", "Tomato sauce with mutton", ["mutton stew", "tomato stew with lamb"], "stew", "Tomato sauce with mutton and vegetables", "14_002", "proxy", "1 ladle", 200, None, True, False, [HAUSA, ALL], ["tomato", "onion", "mutton", "vegetable_oil"]),
    ("sesame_sauce", "Sesame soup", ["benniseed soup", "sesame soup"], "soup", "Sesame sauce with fish", "14_028", "proxy", "1 bowl", 300, None, True, False, [NORTH], ["sesame", "dried_fish"]),
    # Proteins
    ("goat_grilled", "Grilled goat meat", ["goat khebab", "aponkye khebab", "goat suya"], "protein", "Lean goat, grilled", "07_114", None, "5 pieces", 100, 20, False, False, [ALL], []),
    ("mutton", "Mutton (lamb), stewed", ["lamb", "ram meat", "eid ram", "mutton"], "protein", "Lean mutton, stewed", "07_128", None, "3 pieces", 100, 33, False, False, [HAUSA, NORTH, ALL], []),
    ("pork", "Pork, stewed", ["pork", "prako"], "protein", "Pork, moderately fat, stewed", "07_122", None, "3 pieces", 100, 33, False, False, [EWE, GA, AKAN], []),
    ("pork_grilled", "Grilled pork", ["pork khebab", "pork chops", "prako khebab"], "protein", "Pork, moderately fat, grilled", "07_058", None, "3 pieces", 100, 33, False, False, [EWE, GA, AKAN], []),
    ("chicken_breast", "Chicken breast, no skin", ["grilled chicken breast", "chicken white meat"], "protein", "Chicken light meat without skin, grilled", "07_035", None, "1 breast", 120, 120, False, False, [ALL], []),
    ("beef_liver", "Liver (beef), stewed", ["liver", "cow liver"], "protein", "Beef liver, stewed", "07_089", None, "3 pieces", 80, None, False, False, [ALL], []),
    ("bush_meat", "Bush meat (akrantie), smoked", ["akrantie", "grasscutter", "bushmeat", "smoked grasscutter", "antelope"], "protein", "Smoked, salted game meat", "07_027", "proxy", "2 pieces", 60, 30, False, False, [AKAN, EWE, NORTH], []),
    ("kilishi", "Kilishi (dried spiced beef)", ["kilishi", "beef jerky"], "protein", "Dried lean beef", "07_017", "proxy", "1 strip", 30, 30, False, False, [HAUSA, FULANI], []),
    ("wagashi", "Wagashi (Fulani cheese)", ["wagashi", "wagasi", "fulani cheese"], "protein", "Fresh curd cheese", "10_028", "proxy", "2 pieces", 80, 40, False, False, [FULANI, NORTH], []),
    ("sausages", "Sausages (canned)", ["sausage", "vienna sausage", "hot dog"], "protein", "Canned wiener sausages", "07_063", None, "3 sausages", 60, 20, False, False, [ALL], []),
    ("duck_egg", "Duck egg, boiled", ["duck egg"], "protein", "Duck egg, boiled", "08_014", None, "1 egg", 70, 70, False, False, [ALL], []),
    ("guinea_fowl_egg", "Guinea fowl egg, boiled", ["akonfem kesua", "guinea fowl egg"], "protein", "Guinea fowl egg, boiled", "08_013", None, "2 eggs", 80, 40, False, False, [NORTH], []),
    ("catfish", "Catfish, grilled", ["catfish", "mudfish", "adwene"], "protein", "Catfish fillet, grilled", "09_020", None, "1 piece", 150, None, False, False, [AKAN, EWE, NORTH], []),
    ("nile_perch", "Nile perch, grilled", ["perch", "volta fish"], "protein", "Nile perch fillet, grilled", "09_034", None, "1 piece", 150, None, False, False, [EWE, NORTH], []),
    ("barracuda", "Barracuda, grilled", ["barracuda", "tsile"], "protein", "Barracuda fillet, grilled", "09_014", None, "1 piece", 150, None, False, False, [GA, AKAN], []),
    ("grouper", "Grouper, grilled", ["grouper", "mamaedwe"], "protein", "White grouper fillet, grilled", "09_047", None, "1 piece", 150, None, False, False, [GA, AKAN], []),
    ("prawns", "Prawns (shrimp), boiled", ["prawns", "shrimps", "fresh shrimp"], "protein", "Shrimp flesh, boiled", "09_104", None, "1 handful", 80, None, False, False, [GA, EWE, AKAN], []),
    ("clams", "Clams, steamed", ["clams", "adodi", "volta clams"], "protein", "Venus clams, steamed", "09_094", None, "1 cup", 100, None, False, False, [GA, EWE], []),
    ("sardines_tin", "Sardines (tinned)", ["sardines", "tin sardine"], "protein", "Sardines canned in oil, drained", "09_037", None, "1 tin", 90, None, False, False, [ALL], []),
    ("mackerel_tin", "Mackerel (tinned)", ["geisha", "tinned mackerel", "jack mackerel"], "protein", "Jack mackerel canned in oil, drained", "09_109", "proxy", "1 tin", 155, None, False, False, [ALL], []),
    ("tuna_tin", "Tuna (tinned in oil)", ["tuna", "tin tuna"], "protein", "Tuna canned in oil, drained", "09_111", None, "1/2 tin", 80, None, False, False, [ALL], []),
    ("pigeon_peas", "Pigeon peas, boiled", ["pigeon peas", "aduwa"], "protein", "Pigeon peas, boiled", "03_033", None, "1 cup", 150, None, False, False, [EWE, NORTH], []),
    # Fruit and nuts
    ("alasa", "Alasa (African star apple)", ["alasa", "african star apple", "adasema"], "fruit", "Ripe African star apple", "05_053", None, "3 fruits", 120, 40, False, False, [AKAN, ALL], []),
    ("guava", "Guava", ["guava", "gova"], "fruit", "Ripe guava", "05_010", "primary", "1 guava", 100, 100, False, False, [ALL], []),
    ("soursop", "Soursop", ["aluguntugui", "soursop"], "fruit", "Ripe soursop", "05_054", "primary", "1 cup", 220, None, False, False, [ALL], []),
    ("sweet_apple", "Sweet apple (sweetsop)", ["sweet apple", "sweetsop", "custard apple"], "fruit", "Ripe sweetsop", "05_045", "primary", "1 fruit", 120, 120, False, False, [ALL], []),
    ("cashew_apple", "Cashew apple", ["cashew fruit"], "fruit", "Cashew apple", "05_006", None, "1 fruit", 70, 70, False, False, [AKAN, NORTH], []),
    ("baobab_fruit", "Baobab fruit (monkey bread)", ["baobab pulp", "kuka fruit", "monkey bread"], "fruit", "Baobab fruit pulp", "05_004", None, "1 handful", 30, None, False, False, [NORTH], []),
    ("shea_fruit", "Shea fruit", ["taanga", "shea fruit", "nku aba"], "fruit", "Ripe shea fruit pulp", "05_044", None, "5 fruits", 100, 20, False, False, [NORTH], []),
    ("tamarind", "Tamarind (puna)", ["tsamiya", "puna", "tamarind", "dzowe"], "fruit", "Ripe tamarind pulp", "05_021", None, "1 tbsp", 20, None, False, False, [NORTH, HAUSA, EWE], []),
    ("dawadawa_pulp", "Dawadawa pulp", ["dawadawa powder", "yellow dawadawa"], "fruit", "African locust bean fruit pulp", "05_001", None, "1 tbsp", 15, None, False, False, [NORTH], []),
    ("dates", "Dates", ["dabino", "dates"], "fruit", "Dried dates", "05_031", None, "5 dates", 40, 8, False, False, [HAUSA, ALL], []),
    ("apple", "Apple", ["apple"], "fruit", "Apple with skin", "05_026", None, "1 apple", 150, 150, False, False, [ALL], []),
    ("young_coconut", "Young coconut flesh", ["coconut jelly", "soft coconut"], "fruit", "Immature coconut kernel", "06_004", "primary", "1 cup", 80, None, False, False, [ALL], []),
    ("lemon", "Lemon / lime", ["lime", "ankaa twadeɛ", "lemon"], "fruit", "Lemon", "05_014", "primary", "1 lemon", 60, 60, False, False, [ALL], []),
    ("cashew_nuts", "Cashew nuts", ["cashew", "cashew nuts"], "snack", "Cashew nuts", "06_001", None, "1 handful", 30, None, False, False, [ALL], []),
    ("kola_nut", "Kola nut", ["bese", "goro", "kola", "cola nut"], "snack", "Fresh kola nut", "06_018", "primary", "1 nut", 15, 15, False, False, [NORTH, HAUSA, AKAN], []),
    ("bitter_kola", "Bitter kola", ["bitter cola", "namijin goro"], "snack", "Fresh bitter kola seeds", "06_032", None, "2 seeds", 10, 5, False, False, [ALL], []),
    ("kulikuli", "Kulikuli (groundnut cake)", ["kuli kuli", "kulikuli", "groundnut cake"], "snack", "Pressed groundnut cake", "06_028", "proxy", "3 pieces", 40, 13, True, False, [HAUSA, NORTH], ["groundnut_paste"]),
    # Bakery, drinks and dairy
    ("sugar_bread", "Sugar bread / butter bread", ["butter bread", "sugar bread", "rolls"], "staple", "Soft white bread rolls", "01_045", "proxy", "2 slices", 80, 40, False, False, [ALL], []),
    ("brown_bread", "Brown bread (wheat)", ["wheat bread", "wholemeal bread"], "staple", "Wholemeal bread", "01_048", "primary", "2 slices", 70, 35, False, False, [ALL], []),
    ("biscuits", "Biscuits", ["biscuit", "cream crackers", "digestive"], "snack", "Sweet plain biscuits", "01_188", "primary", "4 biscuits", 40, 10, False, False, [ALL], []),
    ("cake", "Cake", ["pound cake", "sponge cake", "cake"], "snack", "Plain cake", "01_187", "primary", "1 slice", 80, 80, False, False, [ALL], []),
    ("cornflakes", "Cornflakes", ["cornflakes", "cereal"], "porridge", "Cornflakes, dry", "01_182", "primary", "1 bowl", 30, None, False, False, [ALL], []),
    ("chocolate", "Milk chocolate", ["chocolate", "kingsbite", "golden tree"], "snack", "Milk chocolate", "13_021", "primary", "1 bar", 50, 50, False, False, [ALL], []),
    ("nono", "Nono (fermented milk)", ["nono", "fermented milk", "brukina milk"], "drink", "Fermented cow's milk", "10_022", "primary", "1 cup", 250, None, False, False, [FULANI, HAUSA], []),
    ("soya_milk", "Soya milk", ["soy milk", "soya drink"], "drink", "Soya milk, unsweetened", "12_025", "primary", "1 cup", 250, None, False, False, [ALL], []),
    ("ovaltine", "Ovaltine with milk", ["ovaltine", "bournvita"], "drink", "Ovaltine with whole milk, no sugar", "12_015", None, "1 mug", 300, None, False, False, [ALL], []),
    ("palm_sap", "Fresh palm sap (sweet palm wine)", ["nsafufuo", "sweet palm wine", "fresh palm wine"], "drink", "Fresh palm sap", "12_007", "primary", "1 cup", 250, None, False, False, [AKAN, EWE, WEST], []),
    ("millet_beer", "Millet beer", ["pito millet", "dam"], "drink", "Millet beer (about 3%)", "12_003", "primary", "1 calabash", 500, None, False, False, [NORTH], []),
    ("juice_sweetened", "Juice (sweetened, boxed)", ["boxed juice", "fruit drink", "ceres", "tampico"], "drink", "Bottled or boxed sweetened juice", "12_012", "primary", "1 glass", 300, None, False, False, [ALL], []),
]

# ---------------------------------------------------------------------------------------------
# Recipes for foods no table lists. Raw ingredient grams from WAFCT rows; `cooked` is the finished
# weight. `ids` that already exist in the table are updated (their old value was an estimate).
# (id, name, aliases, category, detail, parts [(WAFCT code, grams)], cooked g or ("yield", code_raw, code_cooked),
#  portion label, portion g, count g, oily, greens, people, ingredients, how the cooked weight was set)

R = tuple[str, str, list[str], str, str, list[tuple[str, float]], Any, str, float, float | None, bool, bool, list[str], list[str], str]
# WAFCT's own yield for stiff maize porridge: 01_057 maize meal (346 kcal) -> 01_105 stiff porridge.
STIFF = ("yield", "01_057", "01_105")
RECIPES: list[R] = [
    ("banku", "Banku", ["banku"], "staple", "Fermented corn and cassava dough", [("01_057", 75), ("02_004", 25)], STIFF, "1 ball", 300, None, False, False, [GA, EWE, AKAN], ["maize_meal", "cassava_flour"],
     "dry flours 3:1 corn:cassava, cooked to the firmness of WAFCT's stiff maize porridge (01_105)"),
    ("kokonte", "Kokonte", ["kokonte", "face the wall", "lapiwa"], "staple", "Cassava flour stiff porridge", [("02_004", 100)], STIFF, "1 ball", 300, None, False, False, [AKAN, NORTH], ["cassava_flour"],
     "cassava flour cooked to the firmness of WAFCT's stiff maize porridge (01_105)"),
    ("tea", "Tea with milk and sugar", ["lipton", "tea"], "drink", "Tea with evaporated milk and 2 tsp sugar", [("12_008", 250), ("10_016", 30), ("13_002", 10)], 290, "1 mug", 290, None, False, False, [ALL], [],
     "nothing evaporates"),
    ("gari_soakings", "Gari soakings", ["soaking gari", "gari and sugar", "gari soakings", "gari with groundnuts"], "porridge", "Gari in cold water with sugar, milk and groundnuts", [("02_039", 50), ("12_019", 250), ("13_002", 10), ("10_016", 20), ("06_025", 15)], 345, "1 bowl", 345, None, False, False, [ALL], ["gari", "sugar", "groundnuts"],
     "nothing evaporates"),
    ("gari_foto", "Gari foto", ["garifoto", "gari fotor", "gari jollof"], "staple", "Gari stirred into tomato and egg stew", [("02_039", 100), ("11_010", 25), ("04_021", 120), ("04_018", 40), ("08_002", 50), ("12_019", 80)], 360, "1 plate", 300, None, True, False, [EWE, GA, ALL], ["gari", "tomato", "onion", "egg", "vegetable_oil"],
     "about 55 g of the tomato, onion and water cooks off"),
    ("nkatie_cake", "Nkatie cake (groundnut brittle)", ["nkate cake", "groundnut cake", "peanut brittle"], "snack", "Roasted groundnuts in caramel", [("06_025", 100), ("13_002", 80)], 175, "1 piece", 30, 30, False, False, [ALL], ["groundnuts", "sugar"],
     "about 5 g of moisture cooks off"),
    ("kube_cake", "Kube cake (coconut candy)", ["coconut cake", "kube toffee"], "snack", "Grated coconut cooked in caramel", [("06_002", 100), ("13_002", 60)], 130, "1 piece", 30, 30, False, False, [ALL], ["coconut", "sugar"],
     "about 30 g of coconut water cooks off"),
    ("fresh_pepper", "Fresh pepper", ["fresh pepper", "blended pepper", "pepper sauce", "kpakpo shito sauce"], "sauce", "Raw ground tomato, pepper and onion", [("04_021", 60), ("04_046", 20), ("04_018", 20)], 100, "2 tbsp", 40, None, False, False, [ALL], ["tomato", "chilli", "onion"],
     "raw, nothing cooks off"),
    ("vegetables", "Mixed vegetables", ["mixed vegetables", "veggies", "boiled vegetables"], "side", "Cabbage, carrot and green beans, boiled", [("04_089", 34), ("04_007", 33), ("04_026", 33)], 100, "1 cup", 150, None, False, True, [ALL], ["cabbage", "carrot"],
     "the cooked values of each vegetable, equal parts"),
    ("shito", "Shito", ["shito", "black pepper sauce", "hot pepper sauce"], "sauce", "Black pepper sauce of oil, dried fish and shrimp", [("11_010", 200), ("09_057", 60), ("09_053", 60), ("13_006", 50), ("04_018", 200), ("04_082", 40), ("04_015", 30), ("04_066", 70)],
     ("dry", ["04_018", "04_082", "04_015", "04_066"], 0.9), "1 tbsp", 15, None, True, False, [GA, ALL], ["dried_chilli", "dried_fish", "vegetable_oil", "onion"],
     "90% of the water in the onion, ginger, garlic and tomato paste fries off"),
    ("omo_tuo", "Omo tuo (rice balls)", ["omotuo", "rice balls"], "staple", "Soft-cooked rice, shaped into balls", [("01_069", 100)], 100, "2 balls", 300, 150, False, False, [AKAN, NORTH, HAUSA], ["rice"],
     "boiled white rice (WAFCT 01_069), mashed"),
]

# Earlier estimates that a WAFCT row now covers.
UPGRADE: dict[str, tuple[str, str]] = {
    "fries": ("02_081", "calculated"),
    "sobolo": ("12_012", "proxy"),  # sweetened juice; sobolo's sugar varies
}

# Who mainly eats the foods already in the table, and their main visible ingredients.
EXISTING_PEOPLE: dict[str, list[str]] = {
    "waakye": [HAUSA, ALL], "kenkey": [GA, AKAN], "fufu": [AKAN], "tuo_zaafi": [NORTH], "akple": [EWE], "eba": [ALL], "kokonte": [AKAN, NORTH],
    "hausa_koko": [HAUSA, NORTH, ALL], "koose": [HAUSA, ALL], "fula": [HAUSA, NORTH], "brukina": [HAUSA, NORTH], "pito": [NORTH], "palm_wine": [AKAN, EWE, WEST],
    "ayoyo": [NORTH, EWE], "red_red": [AKAN, ALL], "kelewele": [GA, AKAN], "ampesi": [AKAN], "fante_fante": [AKAN], "light_soup": [AKAN, ALL],
    "palmnut_soup": [AKAN, ALL], "groundnut_soup": [ALL], "okro": [EWE, GA, ALL], "kontomire": [AKAN], "palava_sauce": [AKAN, ALL], "smoked_anchovy": [EWE],
    "guinea_fowl": [NORTH], "chichinga": [HAUSA, ALL], "wele": [ALL], "bambara_beans": [NORTH, AKAN], "tiger_nuts": [AKAN, NORTH], "oblayo": [GA],
}
EXISTING_INGREDIENTS: dict[str, list[str]] = {
    "waakye": ["rice", "beans"], "jollof": ["rice", "tomato", "onion", "vegetable_oil"], "fried_rice": ["rice", "vegetable_oil", "carrot", "egg"],
    "red_red": ["beans", "palm_oil", "fried_plantain"], "light_soup": ["tomato", "onion", "chilli"], "light_soup_fish": ["tomato", "onion", "chilli", "tilapia"],
    "groundnut_soup": ["groundnut_paste", "tomato", "onion"], "groundnut_soup_chicken": ["groundnut_paste", "chicken", "tomato"],
    "palmnut_soup": ["palm_oil", "tomato", "onion"], "palmnut_soup_fish": ["palm_oil", "smoked_herring"], "okro": ["okra_fruit", "palm_oil", "crab"],
    "okro_dry": ["dried_okra", "beef"], "kontomire": ["kontomire_leaves", "palm_oil", "agushie_seeds", "egg"], "palava_sauce": ["kontomire_leaves", "agushie_seeds", "palm_oil", "smoked_herring"],
    "garden_egg": ["garden_egg_fruit", "palm_oil", "tomato", "onion"], "pepper_stew": ["tomato", "onion", "vegetable_oil"], "agushie": ["agushie_seeds", "tomato", "palm_oil"],
    "ayoyo": ["ayoyo_leaves", "dawadawa", "dried_fish"], "fante_fante": ["palm_oil", "tomato", "dried_fish"], "beans_stew": ["beans", "palm_oil", "tomato"],
    "kelewele": ["fried_plantain", "ginger", "chilli"], "omelette": ["egg", "onion", "tomato"], "salad": ["lettuce", "cabbage", "tomato", "cucumber", "carrot"],
}


# ---------------------------------------------------------------------------------------------


def per100(w: dict[str, Any]) -> dict[str, float | None]:
    return {"kcal_per_100g": w["kcal"], "protein_g": w["protein"], "carbs_g": w["carbs"], "fat_g": w["fat"]}


def confidence_of(w: dict[str, Any], override: str | None) -> str:
    return override or ("calculated" if "*" in w["name"] else "primary")


def cooked_weight(spec: Any, parts: list[tuple[str, float]], wafct: dict[str, dict[str, Any]]) -> float:
    raw = sum(g for _, g in parts)
    if isinstance(spec, (int, float)):
        return float(spec)
    if spec[0] == "yield":  # same water uptake as WAFCT's own raw -> cooked pair
        return raw * wafct[spec[1]]["kcal"] / wafct[spec[2]]["kcal"]
    if spec[0] == "dry":  # a share of the water in some ingredients cooks off
        lost = sum(g * (wafct[c]["water"] or 0) / 100 for c, g in parts if c in spec[1]) * spec[2]
        return raw - lost
    raise ValueError(spec)


def recipe_values(parts: list[tuple[str, float]], cooked: float, wafct: dict[str, dict[str, Any]]) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for key, col in (("kcal_per_100g", "kcal"), ("protein_g", "protein"), ("carbs_g", "carbs"), ("fat_g", "fat")):
        total = sum(g * (wafct[c][col] or 0) / 100 for c, g in parts)
        out[key] = round(total / cooked * 100, 1)
    return out


def row(**kw: Any) -> dict[str, Any]:
    base = {"region": "GH", "portion_source": "PlateWise default", "added_by": OWNER}
    base.update(kw)
    return base


def build(wafct: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for fid, name, aliases, code, label, g in INGREDIENTS:
        w = wafct[code]
        rows.append(row(id=fid, name=name, aliases=aliases, category="ingredient", detail=w["name"].split("*")[0], **per100(w),
                        typical_portion_g=g, typical_portion_label=label, count_g=None, oily=code.startswith("11_"), greens=code.startswith("04_") and "leaves" in w["name"],
                        source=f"WAFCT2019:{code}", confidence=confidence_of(w, None), needs_review=False, people=[ALL], ingredients=[]))
    for fid, name, aliases, cat, detail, code, conf, label, g, count, oily, greens, people, ingr in DISHES:
        w = wafct[code]
        c = confidence_of(w, conf)
        r = row(id=fid, name=name, aliases=aliases, category=cat, detail=detail, **per100(w), typical_portion_g=g, typical_portion_label=label,
                count_g=count, oily=oily, greens=greens, source=f"WAFCT2019:{code}", confidence=c, needs_review=c == "proxy", people=people, ingredients=ingr)
        if c == "proxy":
            r["source_note"] = f"Stand-in: {w['name'].split('*')[0].strip()}"
        rows.append(r)
    for fid, name, aliases, cat, detail, parts, spec, label, g, count, oily, greens, people, ingr, how in RECIPES:
        cooked = cooked_weight(spec, parts, wafct)
        rows.append(row(id=fid, name=name, aliases=aliases, category=cat, detail=detail, **recipe_values(parts, cooked, wafct), typical_portion_g=g,
                        typical_portion_label=label, count_g=count, oily=oily, greens=greens, source=f"recipe:{fid}", confidence="calculated", needs_review=True,
                        people=people, ingredients=ingr,
                        recipe={"parts": [{"wafct": c, "name": wafct[c]["name"].split("*")[0].strip(), "g": gr} for c, gr in parts], "cooked_g": round(cooked), "note": how}))
    return rows


def main(xlsx: Path) -> None:
    wafct = read_wafct(xlsx)
    data = json.loads(FOODS.read_text())
    foods: list[dict[str, Any]] = data["foods"]
    built = {r["id"]: r for r in build(wafct)}
    by_id = {f["id"]: f for f in foods}
    for fid, r in built.items():
        old = by_id.get(fid)
        if old is None:
            foods.append(r)
            continue
        # Keep the app's own fields (portion, aliases) for foods that were already there; take the new values.
        keep_aliases = sorted(set(old.get("aliases", [])) | set(r["aliases"]))
        old.update({k: v for k, v in r.items() if k not in ("typical_portion_g", "typical_portion_label", "count_g", "category", "name")})
        old["aliases"] = keep_aliases
        old.pop("source_note", None) if r["confidence"] != "proxy" else None
    for fid, (code, conf) in UPGRADE.items():
        w = wafct[code]
        f = by_id[fid]
        f.update(**per100(w), source=f"WAFCT2019:{code}", confidence=conf, needs_review=conf == "proxy")
        if conf == "proxy":
            f["source_note"] = f"Stand-in: {w['name'].split('*')[0].strip()}"
    for f in foods:
        if f["id"] in EXISTING_PEOPLE and not f.get("people"):
            f["people"] = EXISTING_PEOPLE[f["id"]]
        if f["id"] in EXISTING_INGREDIENTS and not f.get("ingredients"):
            f["ingredients"] = EXISTING_INGREDIENTS[f["id"]]
        f.setdefault("people", [ALL])
        f.setdefault("ingredients", [])
    # Every ingredient a dish names must be a food in the table.
    ids = {f["id"] for f in foods}
    missing = sorted({i for f in foods for i in f["ingredients"] if i not in ids})
    if missing:
        raise SystemExit(f"unknown ingredients: {missing}")
    data["sources"]["recipe"] = "PlateWise recipe from WAFCT 2019 ingredient rows (see each row's recipe)"
    data["note"] = data["note"].split(" Recipes:")[0] + (
        " Recipes: rows with source recipe:<id> are worked out from WAFCT ingredient rows; the ratios and cooked weights are "
        "PlateWise defaults written on the row, so they need review."
    )
    text = json.dumps(data, indent=1, ensure_ascii=False)
    FOODS.write_text(text)
    MOBILE.write_text(text)
    counts: dict[str, int] = {}
    for f in foods:
        counts[f["confidence"]] = counts.get(f["confidence"], 0) + 1
    print(f"{len(foods)} foods ({len(built)} from this script):", counts)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "wafct" / "WAFCT_2019.xlsx")
