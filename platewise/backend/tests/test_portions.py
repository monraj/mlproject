import pytest

from app.nutrition.foods import load_foods
from app.nutrition.portions import stated_grams

F = load_foods()


@pytest.mark.parametrize(
    ("said", "food", "grams"),
    [
        ("two balls of kenkey with fried fish and shito", "kenkey", 660),
        ("half a plate of jollof and one piece of chicken", "jollof", 150),
        ("half a plate of jollof and one piece of chicken", "chicken", 120),
        ("4 slices of bread and a mug of tea", "bread", 120),
        ("4 slices of bread and a mug of tea", "tea", 250),
        ("two boiled eggs and half an avocado", "egg", 100),
        ("two boiled eggs and half an avocado", "avocado", 100),
        ("three balls of kokonte with palm nut soup", "kokonte", 900),
        ("a small bowl of red red", "red_red", 187.5),
        ("I chop two pieces of chicken with fried rice", "chicken", 240),
    ],
)
def test_reads_stated_amounts(said: str, food: str, grams: float) -> None:
    assert stated_grams(said, F[food]) == pytest.approx(grams)


@pytest.mark.parametrize(
    ("said", "food"),
    [
        ("two balls of kenkey with fried fish and shito", "fried_fish"),
        ("banku and grilled tilapia", "tilapia"),
        ("kelewele and a handful of groundnuts", "kelewele"),
    ],
)
def test_leaves_unstated_amounts_to_the_model(said: str, food: str) -> None:
    assert stated_grams(said, F[food]) is None
