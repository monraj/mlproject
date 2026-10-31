import shutil

import pytest

import app.admin.routes as admin_routes
import app.nutrition.foods as foods_mod
from app.admin import stats
from app.config import get_settings


@pytest.fixture
def food_file(tmp_path, monkeypatch):
    copy = tmp_path / "foods.json"
    shutil.copy(foods_mod.FOODS_PATH, copy)
    monkeypatch.setattr(foods_mod, "FOODS_PATH", copy)
    monkeypatch.setattr(admin_routes, "FOODS_PATH", copy)
    foods_mod.load_foods.cache_clear()
    yield copy
    foods_mod.load_foods.cache_clear()


ADMIN = {"X-Admin-Password": "pw"}


@pytest.fixture
def password(monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_password", "pw")


def test_console_page_is_served(client):
    r = client.get("/admin")
    assert r.status_code == 200 and "PlateWise" in r.text


def test_password_required_when_set(client, password):
    assert client.get("/admin/api/status").status_code == 401
    assert client.get("/admin/api/status", headers={"X-Admin-Password": "nope"}).status_code == 401
    body = client.get("/admin/api/status", headers=ADMIN).json()
    assert body["demo"] is True and body["foods"] > 50 and body["admin_password_on"] is True


def test_no_password_only_from_this_computer(client):
    assert client.get("/admin/api/status").status_code == 200  # TestClient counts as local
    assert client.get("/admin/api/status", headers={"X-Forwarded-For": "1.2.3.4"}).status_code == 403


def test_admin_password_works_instead_of_access_code(client, password, monkeypatch):
    monkeypatch.setattr(get_settings(), "app_access_code", "sesame")
    assert client.get("/foods").status_code == 401
    assert client.get("/foods", headers=ADMIN).status_code == 200


def test_activity_is_recorded_without_content(client):
    stats.reset()
    client.post("/parse", json={"text": "waakye with egg"})
    client.get("/products/123")
    s = client.get("/admin/api/stats").json()
    routes = {r["route"] for r in s["routes"]}
    assert "POST /parse" in routes and "GET /products/{barcode}" in routes
    assert "waakye" not in str(s)


def test_provider_calls_counted(client):
    client.post("/parse", json={"text": "kenkey"})
    calls = client.get("/admin/api/status").json()["provider_calls"]
    assert calls["demo"]["ok"] >= 1


def test_edit_food_updates_server_immediately(client, food_file):
    row = next(r for r in client.get("/admin/api/foods").json()["foods"] if r["id"] == "egg")
    row.update(kcal_per_100g=143, source="usda:748967", needs_review=False)
    r = client.put("/admin/api/foods/egg", json=row)
    assert r.status_code == 200 and r.json()["needs_review"] is False
    assert client.get("/foods/search", params={"q": "boiled egg"}).json()["foods"][0]["per100"]["kcal"] == 143
    assert '"kcal_per_100g": 143' in food_file.read_text()


def test_cannot_mark_checked_with_draft_source(client, food_file):
    row = next(r for r in client.get("/admin/api/foods").json()["foods"] if r["id"] == "egg")
    row["needs_review"] = False
    assert client.put("/admin/api/foods/egg", json=row).status_code == 422


def test_add_and_delete_food(client, food_file):
    new = {"id": "abolo", "name": "Abolo", "category": "staple", "kcal_per_100g": None, "typical_portion_g": 120,
           "typical_portion_label": "2 pieces", "source": "draft:to-source", "needs_review": False}
    r = client.post("/admin/api/foods", json=new)
    assert r.status_code == 201 and r.json()["needs_review"] is True  # no value yet, so not checked
    assert client.post("/admin/api/foods", json=new).status_code == 409
    assert client.delete("/admin/api/foods/abolo").status_code == 204
    assert client.delete("/admin/api/foods/abolo").status_code == 404


def test_download_table(client, food_file):
    r = client.get("/admin/api/foods.json")
    assert r.status_code == 200 and r.json()["foods"]
