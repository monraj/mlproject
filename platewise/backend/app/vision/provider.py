"""Provider-agnostic AI layer (CLAUDE.md rule 3). Every model call goes through `get_provider()`."""

import json
import logging
from dataclasses import dataclass
from typing import Any, Protocol

from app.config import Settings, get_settings

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Turn:
    role: str  # "user" or "assistant"
    content: str


class ProviderError(Exception):
    """A provider failed; the next one in the chain is tried."""


class ProviderRefused(ProviderError):
    """The model declined the request."""


class VisionProvider(Protocol):
    name: str

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        """Return the model's answer as a JSON object matching `schema`. The image goes with the last user turn."""
        ...


def parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{") :]
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        raise ProviderError("no JSON object in reply")
    data = json.loads(text[start : end + 1])
    if not isinstance(data, dict):
        raise ProviderError("reply is not a JSON object")
    return data


class FallbackProvider:
    """Tries each configured provider in order until one answers."""

    def __init__(self, providers: list[VisionProvider]):
        self.providers = providers
        self.name = "+".join(p.name for p in providers)
        self.last_used = ""

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        errors: list[str] = []
        for p in self.providers:
            try:
                out = p.generate_json(system=system, turns=turns, schema=schema, image=image)
                self.last_used = p.name
                return out
            except ProviderError as e:  # never log prompts or images (CLAUDE.md rule 6)
                log.warning("provider %s failed: %s", p.name, type(e).__name__)
                errors.append(f"{p.name}: {e}")
            except Exception as e:  # SDK network/HTTP errors
                log.warning("provider %s errored: %s", p.name, type(e).__name__)
                errors.append(f"{p.name}: {type(e).__name__}")
        raise ProviderError("; ".join(errors) or "no provider configured")


def build_providers(s: Settings) -> list[VisionProvider]:
    from app.vision.anthropic_p import AnthropicProvider
    from app.vision.fake import DemoProvider
    from app.vision.gemini import GeminiProvider
    from app.vision.openai_p import OpenAIProvider

    available: dict[str, VisionProvider] = {}
    if s.gemini_api_key:
        available["gemini"] = GeminiProvider(s.gemini_api_key, s.gemini_model, s.request_timeout_s, s.gemini_fallback_model)
    if s.openai_api_key:
        available["openai"] = OpenAIProvider(s.openai_api_key, s.openai_model, s.request_timeout_s)
    if s.anthropic_api_key:
        available["anthropic"] = AnthropicProvider(s.anthropic_api_key, s.anthropic_model, s.request_timeout_s)

    choice = s.vision_provider.lower()
    if choice == "demo" or not available:
        return [DemoProvider()]
    order = ["gemini", "openai", "anthropic"]
    if choice in available:
        order.remove(choice)
        order.insert(0, choice)
    return [available[n] for n in order if n in available]


_provider: FallbackProvider | None = None


def get_provider() -> FallbackProvider:
    global _provider
    if _provider is None:
        _provider = FallbackProvider(build_providers(get_settings()))
    return _provider


def set_provider(p: FallbackProvider | None) -> None:
    """For tests."""
    global _provider
    _provider = p
