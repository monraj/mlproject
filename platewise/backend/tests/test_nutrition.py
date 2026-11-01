import pytest

from app.nutrition.calc import nutrients, oil_from_visible
from app.nutrition.foods import get_food
from app.nutrition.matcher import AUTO_ACCEPT, match


def test_every_food_has_a_source_and_review_flag():
    import json

    from app.nutrition.foods import FOODS_PATH

    for r in json.loads(FOODS_PATH.read_text())["foods"]:
        assert r["source"], r["id"]
        assert r["confidence"] in ("primary", "calculated", "proxy", "estimate"), r["id"]
        # Stand-ins, estimates and our own recipe ratios are flagged for review; table values are not (CLAUDE.md rule 2).
        assert r["needs_review"] is (r["confidence"] in ("proxy", "estimate") or r["source"].startswith("recipe:")), r["id"]
        if r["confidence"] != "estimate":
            assert ":" in r["source"] or "label" in r["source"].lower() or r["source"].startswith("KNUST"), r["id"]


def test_calories_come_from_the_table():
    egg = get_food("egg")
    n = nutrients(egg, 100, 90, 110)
    assert n.kcal == pytest.approx(egg.kcal_per_100g)
    assert n.kcal_low < n.kcal < n.kcal_high


def test_oil_level_only_changes_oily_foods():
    stew, egg = get_food("pepper_stew"), get_food("egg")
    assert nutrients(stew, 40, 40, 40, "very").kcal > nutrients(stew, 40, 40, 40, "light").kcal
    assert nutrients(egg, 50, 50, 50, "very").kcal == nutrients(egg, 50, 50, 50, "light").kcal
    assert oil_from_visible("high") == "very"
    assert oil_from_visible(None) == "normal"


@pytest.mark.parametrize(
    "name,expected",
    [
        ("jollof", "jollof"),
        ("jollof rice", "jollof"),
        ("waakye", "waakye"),
        ("wakye", "waakye"),
        ("kenkey", "kenkey"),
        ("kelewele", "kelewele"),
        ("fried plantain", "fried_plantain"),
        ("banku", "banku"),
        ("shito", "shito"),
        ("light soup", "light_soup"),
        ("cow skin", "wele"),
    ],
)
def test_matcher_top1(name, expected):
    top = match(name)[0]
    assert top.food.id == expected
    assert top.score >= AUTO_ACCEPT


def test_catalog_hint_boosts_but_nonsense_stays_low():
    assert match("rice and beans", catalog_id="waakye")[0].food.id in ("waakye", "rice_beans")
    assert not match("zzqqxx") or match("zzqqxx")[0].score < AUTO_ACCEPT
