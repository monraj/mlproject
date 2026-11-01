"""Provider-agnostic AI layer (CLAUDE.md rule 3). Every model call goes through `get_provider()`."""

import json
import logging
from collections.abc import Iterator
from contextvars import ContextVar, Token
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
        # Per-provider success/failure counts since start, for the admin console.
        self.calls: dict[str, dict[str, int]] = {p.name: {"ok": 0, "failed": 0} for p in providers}

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        errors: list[str] = []
        for p in self.providers:
            try:
                out = p.generate_json(system=system, turns=turns, schema=schema, image=image)
                self.last_used = p.name
                self.calls[p.name]["ok"] += 1
                return out
            except ProviderError as e:  # never log prompts or images (CLAUDE.md rule 6)
                log.warning("provider %s failed: %s", p.name, type(e).__name__)
                self.calls[p.name]["failed"] += 1
                errors.append(f"{p.name}: {e}")
            except Exception as e:  # SDK network/HTTP errors
                log.warning("provider %s errored: %s", p.name, type(e).__name__)
                self.calls[p.name]["failed"] += 1
                errors.append(f"{p.name}: {type(e).__name__}")
        raise ProviderError("; ".join(errors) or "no provider configured")

    def stream_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> Iterator[str]:
        """A JSON answer as raw text, streamed where the provider supports it; otherwise all at once.
        Falls back to the next provider only if nothing has been sent yet."""
        errors: list[str] = []
        for p in self.providers:
            started = False
            try:
                streamer = getattr(p, "stream_json", None)
                if streamer is not None:
                    for piece in streamer(system=system, turns=turns, schema=schema, image=image):
                        started = True
                        yield piece
                else:
                    out = p.generate_json(system=system, turns=turns, schema=schema, image=image)
                    started = True
                    yield json.dumps(out)
                self.last_used = p.name
                self.calls[p.name]["ok"] += 1
                return
            except Exception as e:  # never log prompts or images (CLAUDE.md rule 6)
                log.warning("provider %s json stream failed: %s", p.name, type(e).__name__)
                self.calls[p.name]["failed"] += 1
                if started:
                    raise ProviderError("stream broke off") from e
                errors.append(f"{p.name}: {type(e).__name__}")
        raise ProviderError("; ".join(errors) or "no provider configured")

    def stream_text(self, *, system: str, turns: list[Turn]) -> Iterator[str]:
        """Plain text, streamed where the provider supports it; otherwise the whole reply at once.
        Falls back to the next provider only if nothing has been sent yet."""
        errors: list[str] = []
        for p in self.providers:
            started = False
            try:
                streamer = getattr(p, "stream_text", None)
                if streamer is not None:
                    for piece in streamer(system=system, turns=turns):
                        started = True
                        yield piece
                else:
                    schema = {"type": "object", "properties": {"reply": {"type": "string"}}, "required": ["reply"]}
                    out = p.generate_json(system=system, turns=turns, schema=schema)
                    started = True
                    yield str(out.get("reply", ""))
                self.last_used = p.name
                self.calls[p.name]["ok"] += 1
                return
            except Exception as e:  # never log prompts (CLAUDE.md rule 6)
                log.warning("provider %s stream failed: %s", p.name, type(e).__name__)
                self.calls[p.name]["failed"] += 1
                if started:
                    return
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

# A person's own AI key, sent by the app with a request ("bring your own key"). Used for that request
# only: never stored, never logged, and never mixed with PlateWise's own keys.
USER_PROVIDERS = ("gemini", "openai", "anthropic")
_user_provider: ContextVar[FallbackProvider | None] = ContextVar("user_provider", default=None)


def user_provider(name: str, key: str, s: Settings | None = None) -> FallbackProvider:
    from app.vision.anthropic_p import AnthropicProvider
    from app.vision.gemini import GeminiProvider
    from app.vision.openai_p import OpenAIProvider

    s = s or get_settings()
    p: VisionProvider
    if name == "gemini":
        p = GeminiProvider(key, s.gemini_model, s.request_timeout_s, s.gemini_fallback_model)
    elif name == "openai":
        p = OpenAIProvider(key, s.openai_model, s.request_timeout_s)
    elif name == "anthropic":
        p = AnthropicProvider(key, s.anthropic_model, s.request_timeout_s)
    else:
        raise ValueError(name)
    return FallbackProvider([p])


def use_user_provider(p: FallbackProvider | None) -> Token[FallbackProvider | None]:
    return _user_provider.set(p)


def reset_user_provider(token: Token[FallbackProvider | None]) -> None:
    _user_provider.reset(token)


def using_own_key() -> bool:
    return _user_provider.get() is not None


def get_provider() -> FallbackProvider:
    own = _user_provider.get()
    if own is not None:
        return own
    global _provider
    if _provider is None:
        _provider = FallbackProvider(build_providers(get_settings()))
    return _provider


def set_provider(p: FallbackProvider | None) -> None:
    """For tests."""
    global _provider
    _provider = p
