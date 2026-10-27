"""Claude via the Anthropic SDK."""

import base64
from typing import Any

import anthropic

from app.vision.provider import ProviderError, ProviderRefused, Turn, parse_json


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str, timeout_s: float):
        self.client = anthropic.Anthropic(api_key=api_key, timeout=timeout_s, max_retries=1)
        self.model = model

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        messages: list[dict[str, Any]] = []
        for i, t in enumerate(turns):
            content: list[dict[str, Any]] = []
            if image is not None and i == len(turns) - 1:
                content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.standard_b64encode(image).decode()}})
            content.append({"type": "text", "text": t.content})
            messages.append({"role": t.role, "content": content})
        resp = self.client.beta.messages.create(  # type: ignore[call-overload]
            model=self.model,
            max_tokens=16000,
            system=system,
            messages=messages,
            output_config={"effort": "medium", "format": {"type": "json_schema", "schema": schema}},
            # On a safety decline, let the API retry on its recommended fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        if resp.stop_reason == "refusal":
            raise ProviderRefused("model declined")
        text = next((b.text for b in resp.content if b.type == "text"), "")
        if resp.stop_reason == "max_tokens" or not text:
            raise ProviderError(f"incomplete reply ({resp.stop_reason})")
        return parse_json(text)
