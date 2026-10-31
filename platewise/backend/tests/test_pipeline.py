

def test_meal_schema_limits_catalog_ids_to_the_food_table() -> None:
    from app.nutrition.foods import load_foods
    from app.vision.schema import meal_schema

    enum = meal_schema()["properties"]["items"]["items"]["properties"]["catalog_id"]["anyOf"][0]["enum"]
    assert set(enum) == set(load_foods())
