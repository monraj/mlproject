import io
from typing import Any

from PIL import Image

from app.vision.provider import FallbackProvider, ProviderError, Turn, set_provider


def _jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (2000, 1500), (200, 120, 40)).save(buf, format="JPEG")
    return buf.getvalue()


def test_health(client):
    r = client.get("/health").json()
    assert r["status"] == "ok" and r["demo"] is True and r["foods"] > 50


def test_foods_and_search(client):
    assert len(client.get("/foods").json()["foods"]) > 50
    assert client.get("/foods/search", params={"q": "kenkey"}).json()["foods"][0]["id"] == "kenkey"


def test_scan_counts_from_table_with_ranges(client):
    r = client.post("/scans", files={"image": ("p.jpg", _jpeg(), "image/jpeg")}, data={"meal": "Lunch"})
    assert r.status_code == 200
    body = r.json()
    assert body["is_food"] and len(body["items"]) == 4
    egg = next(i for i in body["items"] if i["food_id"] == "egg")
    assert egg["kind"] == "count" and egg["count"] == 1
    assert egg["kcal"] == round(155 * 50 / 100)
    for i in body["items"]:
        assert i["kcal_low"] <= i["kcal"] <= i["kcal_high"]
        assert i["ai_grams"] == i["grams"] and i["ai_food_id"] == i["food_id"]
    stew = next(i for i in body["items"] if i["food_id"] == "pepper_stew")
    assert stew["kind"] == "oil"
    rice = next(i for i in body["items"] if i["food_id"] == "waakye")
    assert rice["confidence"] == "low" and rice["hint"].startswith("Is this")
    assert body["totals"]["kcal"] == sum(i["kcal"] for i in body["items"])


def test_scan_rejects_non_images(client):
    r = client.post("/scans", files={"image": ("x.jpg", b"not an image", "image/jpeg")})
    assert r.status_code == 400


def test_parse_voice_text(client):
    r = client.post("/parse", json={"text": "I chop two balls kenkey with fried fish and small pepper", "lang": "pcm"}).json()
    ids = [i["food_id"] for i in r["items"]]
    assert ids == ["kenkey", "fried_fish", "fresh_pepper"]
    assert r["items"][0]["count"] == 2


class _Planner:
    name = "planner"

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        import datetime as dt

        d = dt.date.today() + dt.timedelta(days=2)
        return {
            "reply": "Flex a little.",
            "flex_plan": {
                "reason": "Wedding",
                "days": [{"date": d.isoformat(), "kcal": 900}, {"date": "2001-01-01", "kcal": 1500}, {"date": "bad", "kcal": 1500}],
            },
        }


def test_coach_plan_respects_floor_and_dates(client):
    set_provider(FallbackProvider([_Planner()]))
    r = client.post("/coach", json={"messages": [{"role": "user", "content": "Wedding Saturday"}], "sex": "female"}).json()
    assert r["reply"] == "Flex a little."
    assert len(r["flex_plan"]["days"]) == 1
    assert r["flex_plan"]["days"][0]["kcal"] == 1200


def test_coach_requires_user_last(client):
    r = client.post("/coach", json={"messages": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "yo"}]})
    assert r.status_code == 422


def test_ideas_computed_from_table(client):
    r = client.post("/ideas", json={"kcal_left": 700, "protein_left": 40, "greens_today": 0}).json()
    assert len(r["ideas"]) == 3
    soup = r["ideas"][0]
    assert soup["kcal"] == round(55 * 3.5 + 130 * 1.5 + 130 * 2)


class _Broken:
    name = "broken"

    def generate_json(self, **_: Any) -> dict[str, Any]:
        raise ProviderError("down")


def test_falls_back_to_next_provider_then_502(client):
    from app.vision.fake import DemoProvider

    set_provider(FallbackProvider([_Broken(), DemoProvider()]))
    assert client.post("/parse", json={"text": "waakye"}).status_code == 200
    set_provider(FallbackProvider([_Broken()]))
    assert client.post("/parse", json={"text": "waakye"}).status_code == 502


def test_product_lookup(client, monkeypatch):
    import app.api.routes as routes

    monkeypatch.setattr(routes, "lookup", lambda code: {"barcode": code, "name": "Malt", "per100": {"kcal": 55}} if code == "6001234567890" else None)
    assert client.get("/products/6001234567890").json()["name"] == "Malt"
    assert client.get("/products/1234567").status_code == 404
    assert client.get("/products/abc").status_code == 422


def test_label_not_found_in_demo(client):
    r = client.post("/products/label", files={"image": ("p.jpg", _jpeg(), "image/jpeg")})
    assert r.status_code == 404
