from app.nutrition.foods import load_foods
from app.nutrition.guess import compose, guess_dishes, seen_ingredients
from app.vision.pipeline import build_item
from app.vision.schema import AnalysisItem, SeenIngredient


def item(name: str, ingredients: list[tuple[str, float]], confidence: float = 0.4) -> AnalysisItem:
    return AnalysisItem(
        food_name=name, grams_estimate=200, grams_low=150, grams_high=250, confidence=confidence,
        ingredients=[SeenIngredient(name=n, share=s) for n, s in ingredients],
    )


def test_every_dish_ingredient_is_in_the_table() -> None:
    foods = load_foods()
    for f in foods.values():
        for i in f.ingredients:
            assert i in foods, (f.id, i)


def test_matches_local_ingredient_names() -> None:
    ids = {s.food.id for s in seen_ingredients([("zomi", 0.2), ("kontomire", 0.5), ("egusi seeds", 0.2)])}
    assert ids == {"palm_oil", "kontomire_leaves", "agushie_seeds"}


def test_guesses_palava_sauce_from_what_it_sees() -> None:
    seen = seen_ingredients([("cocoyam leaves", 0.5), ("agushie", 0.2), ("palm oil", 0.15), ("smoked herring", 0.15)])
    guesses = guess_dishes(seen)
    assert guesses[0].food.id == "palava_sauce"


def test_guesses_northern_soup_from_baobab_and_dawadawa() -> None:
    seen = seen_ingredients([("baobab leaves", 0.5), ("dawadawa", 0.1), ("dried fish", 0.2), ("tomato", 0.2)])
    assert guess_dishes(seen)[0].food.id == "kuka_soup"


def test_needs_two_shared_ingredients() -> None:
    assert guess_dishes(seen_ingredients([("palm oil", 1.0)])) == []


def test_builds_an_unknown_dish_from_its_ingredients() -> None:
    seen = seen_ingredients([("rice", 0.6), ("palm oil", 0.1), ("tomatoes", 0.3)])
    mix = compose(seen, "Red rice")
    assert mix is not None
    foods = load_foods()
    expected = (foods["rice"].kcal_per_100g * 0.6 + foods["palm_oil"].kcal_per_100g * 0.1 + foods["tomato"].kcal_per_100g * 0.3)  # type: ignore[operator]
    assert abs((mix.kcal_per_100g or 0) - expected) < 0.2
    assert mix.oily and mix.needs_review


def test_scan_fills_in_a_strong_guess_but_asks_to_check() -> None:
    out = build_item(item("unknown dish", [("kontomire", 0.5), ("agushie", 0.2), ("palm oil", 0.15), ("smoked herring", 0.15)]), 0)
    assert out["food_id"] == "palava_sauce"
    assert out["confidence"] == "low" and "Looks like" in out["hint"]
    assert out["candidates"][0]["food_id"] == "palava_sauce"
    assert out["kcal"] is not None


def test_scan_works_out_an_unknown_dish_from_ingredients() -> None:
    out = build_item(item("zzq special", [("rice", 0.6), ("palm oil", 0.1), ("tomatoes", 0.3)]), 0)
    assert out["food_id"] is None  # nothing in the table to point to
    assert out["kcal"] is not None and out["per100"]["kcal"] is not None
    assert out["built_from"] == ["rice", "palm_oil", "tomato"]
    assert "ingredients" in out["hint"]


def test_named_foods_ignore_ingredients() -> None:
    out = build_item(item("waakye", [("palm oil", 0.5), ("kontomire", 0.5)], confidence=0.9), 0)
    assert out["food_id"] == "waakye"


def test_common_ingredients_alone_do_not_make_a_confident_guess() -> None:
    seen = seen_ingredients([("rice", 0.6), ("palm oil", 0.1), ("tomatoes", 0.3)])
    assert all(g.score < 0.7 for g in guess_dishes(seen))
