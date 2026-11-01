from app.config import get_settings


def test_public_pages_open_without_the_access_code(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "app_access_code", "sesame")
    for path, words in [("/", "Snap your food"), ("/privacy", "Privacy policy"), ("/terms", "Terms of use")]:
        r = client.get(path)
        assert r.status_code == 200, path
        assert r.headers["content-type"].startswith("text/html")
        assert words in r.text
        assert 'href="/privacy"' in r.text  # every page links the policy
    assert client.get("/foods").status_code == 401  # the API stays locked


def test_home_links_the_download_only_when_set(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "download_url", "https://example.com/app")
    assert "https://example.com/app" in client.get("/").text
    monkeypatch.setattr(get_settings(), "download_url", None)
    assert "Download for Android" not in client.get("/").text
