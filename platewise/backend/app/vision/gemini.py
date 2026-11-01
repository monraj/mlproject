"""Gemini via the google-genai SDK (primary provider)."""

import time
from collections.abc import Iterator
from typing import Any

from google import genai
from google.genai import errors, types

from app.vision.provider import ProviderError, Turn, parse_json

# After the main model says its quota is used up (429), skip it for this long and go straight to
# the lighter model, instead of paying an extra round trip on every request.
QUOTA_COOLDOWN_S = 15 * 60


def _without_enums(schema: Any) -> Any:
    if isinstance(schema, dict):
        return {k: _without_enums(v) for k, v in schema.items() if k != "enum"}
    if isinstance(schema, list):
        return [_without_enums(v) for v in schema]
    return schema


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str, timeout_s: float, fallback_model: str | None = None):
        self.client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=int(timeout_s * 1000)))
        self.model = model
        self.fallback_model = fallback_model
        self.main_blocked_until = 0.0

    def _models(self) -> list[str]:
        main_ok = time.monotonic() >= self.main_blocked_until or not self.fallback_model
        return ([self.model] if main_ok else []) + ([self.fallback_model] if self.fallback_model else [])

    def _quota_hit(self) -> None:
        self.main_blocked_until = time.monotonic() + QUOTA_COOLDOWN_S

    @staticmethod
    def _contents(turns: list[Turn], image: bytes | None = None) -> list[types.Content]:
        contents: list[types.Content] = []
        for i, t in enumerate(turns):
            parts: list[types.Part] = []
            if image is not None and i == len(turns) - 1:
                parts.append(types.Part.from_bytes(data=image, mime_type="image/jpeg"))
            parts.append(types.Part.from_text(text=t.content))
            contents.append(types.Content(role="model" if t.role == "assistant" else "user", parts=parts))
        return contents

    def stream_text(self, *, system: str, turns: list[Turn]) -> Iterator[str]:
        """A plain-text answer, piece by piece, so the app can show it as it's written."""
        contents = self._contents(turns)
        models = self._models()
        for i, model in enumerate(models):
            thinking = types.ThinkingConfig(thinking_level=types.ThinkingLevel.MINIMAL) if model == self.model else None
            config = types.GenerateContentConfig(system_instruction=system, thinking_config=thinking)
            started = False
            try:
                for chunk in self.client.models.generate_content_stream(model=model, contents=contents, config=config):
                    if chunk.text:
                        started = True
                        yield chunk.text
                return
            except (errors.ServerError, errors.ClientError) as e:
                # Busy (5xx) or quota used up (429) before anything was sent: try the lighter model.
                retryable = isinstance(e, errors.ServerError) or e.code == 429
                if isinstance(e, errors.ClientError) and e.code == 429 and model == self.model:
                    self._quota_hit()
                if started or not retryable or i == len(models) - 1:
                    raise

    def _json_config(self, model: str, system: str, schema: dict[str, Any], image: bytes | None) -> types.GenerateContentConfig:
        # Default thinking adds ~4 s to every answer. The AI only identifies foods and chats (the
        # backend counts calories), so keep thinking minimal; photos get a little more.
        thinking = None
        if model == self.model:
            thinking = types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW if image is not None else types.ThinkingLevel.MINIMAL)
        else:
            # The lite models reject a schema with the whole food table as an enum (400). Without it
            # they still answer in the same shape; the matcher ignores any id not in the table.
            schema = _without_enums(schema)
        return types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json", response_json_schema=schema, thinking_config=thinking)

    def stream_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> Iterator[str]:
        """The JSON answer as it's written, so the app can show each food's name as soon as it appears."""
        contents = self._contents(turns, image)
        models = self._models()
        for i, model in enumerate(models):
            started = False
            try:
                for chunk in self.client.models.generate_content_stream(model=model, contents=contents, config=self._json_config(model, system, schema, image)):
                    if chunk.text:
                        started = True
                        yield chunk.text
                return
            except (errors.ServerError, errors.ClientError) as e:
                retryable = isinstance(e, errors.ServerError) or e.code == 429
                if isinstance(e, errors.ClientError) and e.code == 429 and model == self.model:
                    self._quota_hit()
                if started or not retryable or i == len(models) - 1:
                    raise

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        contents = self._contents(turns, image)

        def config_for(model: str) -> types.GenerateContentConfig:
            return self._json_config(model, system, schema, image)

        # Gemini sometimes answers 503 when busy: retry once, then try the lighter fallback model.
        models = self._models()
        attempts = ([self.model, self.model] if self.model in models else []) + ([self.fallback_model] if self.fallback_model else [])
        for i, model in enumerate(attempts):
            try:
                resp = self.client.models.generate_content(model=model, contents=contents, config=config_for(model))
                break
            except errors.ServerError:
                if i == len(attempts) - 1:
                    raise
                time.sleep(1.5)
            except errors.ClientError as e:
                # Quota used up on the main model (429): go straight to the lighter model, which
                # has its own quota, instead of failing the request.
                if e.code != 429 or model == attempts[-1] or not self.fallback_model:
                    raise
                self._quota_hit()
                resp = self.client.models.generate_content(model=self.fallback_model, contents=contents, config=config_for(self.fallback_model))
                break
        if not resp.text:
            raise ProviderError("empty reply")
        return parse_json(resp.text)
