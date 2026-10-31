"""Change AI keys from the console: check the key with the provider, save it to .env, switch over live."""

import os
import re
from pathlib import Path
from typing import Literal

from app.config import get_settings
from app.vision.provider import set_provider

Provider = Literal["gemini", "openai", "anthropic"]
ENV_VARS: dict[str, str] = {"gemini": "GEMINI_API_KEY", "openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY"}
NAMES = {"gemini": "Gemini", "openai": "OpenAI", "anthropic": "Anthropic"}
ENV_PATH = Path(".env")  # the server runs from platewise/backend


class KeyRejected(Exception):
    """The provider said the key doesn't work."""


def check_key(provider: Provider, key: str) -> None:
    """Ask the provider to list models with this key: free, and fails fast on a bad key."""
    try:
        if provider == "gemini":
            from google import genai

            next(iter(genai.Client(api_key=key).models.list(config={"page_size": 1})))
        elif provider == "openai":
            import openai

            openai.OpenAI(api_key=key, timeout=20, max_retries=0).models.list()
        else:
            import anthropic

            anthropic.Anthropic(api_key=key, timeout=20, max_retries=0).models.list(limit=1)
    except Exception as e:  # any SDK auth/permission/network error
        raise KeyRejected(type(e).__name__) from e


def save_env(var: str, value: str) -> None:
    text = ENV_PATH.read_text() if ENV_PATH.exists() else ""
    line = f"{var}={value}"
    if re.search(rf"^{var}=.*$", text, flags=re.M):
        text = re.sub(rf"^{var}=.*$", lambda _: line, text, flags=re.M)
    else:
        text = text + ("" if text.endswith("\n") or not text else "\n") + line + "\n"
    ENV_PATH.write_text(text)
    try:
        os.chmod(ENV_PATH, 0o600)
    except OSError:
        pass


def apply_key(provider: Provider, key: str | None) -> None:
    """Save (or clear) the key and rebuild the provider chain so it's used straight away."""
    save_env(ENV_VARS[provider], key or "")
    setattr(get_settings(), f"{provider}_api_key", key or None)
    set_provider(None)


def hint(key: str | None) -> str | None:
    return f"••••{key[-4:]}" if key and len(key) > 8 else ("set" if key else None)


def on_render() -> bool:
    return os.environ.get("RENDER", "").lower() == "true"
