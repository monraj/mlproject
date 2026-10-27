from app.config import get_settings
from app.main import _hits


def test_access_code_required_when_set(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "app_access_code", "sesame")
    assert client.get("/health").status_code == 200
    assert client.get("/foods").status_code == 401
    assert client.get("/foods", headers={"X-PlateWise-Code": "wrong"}).status_code == 401
    assert client.get("/foods", headers={"X-PlateWise-Code": "sesame"}).status_code == 200


def test_no_code_needed_when_unset(client):
    assert client.get("/foods").status_code == 200


def test_ai_rate_limit(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_requests_per_hour", 2)
    _hits.clear()
    codes = [client.post("/parse", json={"text": "waakye"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]
    assert client.get("/foods").status_code == 200  # non-AI routes aren't limited
    _hits.clear()


def test_refusals_still_carry_cors_headers(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "app_access_code", "sesame")
    r = client.get("/foods", headers={"Origin": "http://localhost:8081"})
    assert r.status_code == 401
    assert r.headers.get("access-control-allow-origin")
