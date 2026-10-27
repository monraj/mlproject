"""Settings. Keys and model names come from environment variables only (CLAUDE.md rule 3)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "auto" uses every provider that has a key, in the order gemini → openai → anthropic.
    # "demo" (or no keys at all) uses canned answers so the app can be tried without a key.
    vision_provider: str = "auto"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.5-flash"
    gemini_fallback_model: str | None = "gemini-flash-lite-latest"
    openai_api_key: str | None = None
    openai_model: str = "gpt-5-mini"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"

    request_timeout_s: float = 60.0
    max_image_bytes: int = 8 * 1024 * 1024
    openfoodfacts_url: str = "https://world.openfoodfacts.org"
    cors_origins: str = "*"

    # When set, every request except /health must send this code in the X-PlateWise-Code header.
    # Set it on any server reachable from the internet so strangers can't spend your AI quota.
    app_access_code: str | None = None
    # Most AI requests one address may make per hour (0 = no limit).
    ai_requests_per_hour: int = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()
