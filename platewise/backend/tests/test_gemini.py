from app.vision.gemini import GeminiProvider
from app.vision.schema import meal_schema


def _ids(schema: object) -> bool:
    return "enum" in str(schema)


def test_lite_fallback_gets_the_schema_without_the_food_list() -> None:
    # The lite models answer 400 to a schema carrying every food id as an enum.
    g = GeminiProvider("test-key", "main-model", 30, fallback_model="lite-model")
    schema = meal_schema()
    assert _ids(schema)
    main = g._json_config("main-model", "sys", schema, None)
    lite = g._json_config("lite-model", "sys", schema, None)
    assert _ids(main.response_json_schema)
    assert not _ids(lite.response_json_schema)
    assert lite.response_json_schema["properties"].keys() == schema["properties"].keys()
    assert _ids(schema)  # the shared schema itself is untouched
