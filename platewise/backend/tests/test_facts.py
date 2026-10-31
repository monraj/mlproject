from app.nutrition.facts import food_facts, strip_unverified_numbers


def test_facts_name_the_dish_with_portion_figures() -> None:
    facts = food_facts("Is red-red a good lunch?")
    assert facts[0].startswith("Red-red (Beans in palm oil): a usual portion is 1 bowl, about 250 g, about 442 kcal")


def test_no_facts_without_a_food() -> None:
    assert food_facts("How am I doing this week?") == []


def test_strips_made_up_numbers_but_keeps_advice() -> None:
    given = "Kelewele: about 150 g, about 345 kcal and 2 g protein. Today is 2026-10-30."
    assert (
        strip_unverified_numbers("Kelewele is lovely! Pair it with black-eyed peas – they add about 180 kcal and 15g of protein.", given)
        == "Kelewele is lovely! Pair it with black-eyed peas."
    )
    assert strip_unverified_numbers("Add eggs for protein – about 20-30g more.", given) == "Add eggs for protein."
    assert strip_unverified_numbers("A wrap is about 345 kcal.", given) == "A wrap is about 345 kcal."


def test_keeps_paragraphs() -> None:
    given = "Kelewele: about 345 kcal."
    assert strip_unverified_numbers("First idea.\n\nSecond idea with about 345 kcal.", given) == "First idea.\n\nSecond idea with about 345 kcal."
    assert strip_unverified_numbers("Tip one.\n\nPeas – they add about 180 kcal.", given) == "Tip one.\n\nPeas."
