from typing import Any

import app.vision.provider as provider_mod
from app.vision.fake import DemoProvider
from app.vision.provider import FallbackProvider, ProviderError, Turn, get_provider


class Broken:
    name = "gemini"

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        raise ProviderError("key refused")


def test_own_key_is_used_for_that_request_only(client, monkeypatch):
    seen: list[tuple[str, str]] = []

    def fake_user_provider(name: str, key: str, s: object = None) -> FallbackProvider:
        seen.append((name, key))
        return FallbackProvider([DemoProvider()])

    monkeypatch.setattr("app.main.user_provider", fake_user_provider)
    shared = get_provider()
    r = client.post("/ai/check", headers={"X-AI-Provider": "Anthropic", "X-AI-Key": "sk-test"})
    assert r.status_code == 200 and r.json()["ok"] is True
    assert seen == [("anthropic", "sk-test")]
    assert get_provider() is shared  # back to PlateWise's own AI after the request


def test_own_key_needs_a_known_provider_and_a_key(client):
    assert client.post("/parse", json={"text": "waakye"}, headers={"X-AI-Provider": "llama", "X-AI-Key": "x"}).status_code == 400
    assert client.post("/parse", json={"text": "waakye"}, headers={"X-AI-Provider": "gemini"}).status_code == 400
    assert client.post("/ai/check").status_code == 400  # nothing to check without a key


def test_a_refused_own_key_says_so(client, monkeypatch):
    monkeypatch.setattr("app.main.user_provider", lambda name, key, s=None: FallbackProvider([Broken()]))
    r = client.post("/parse", json={"text": "waakye"}, headers={"X-AI-Provider": "gemini", "X-AI-Key": "bad"})
    assert r.status_code == 502
    assert "Your own AI key" in r.json()["detail"]


def test_user_provider_builds_each_kind():
    for name in provider_mod.USER_PROVIDERS:
        p = provider_mod.user_provider(name, "test-key")
        assert p.name == {"gemini": "gemini", "openai": "openai", "anthropic": "anthropic"}[name]
