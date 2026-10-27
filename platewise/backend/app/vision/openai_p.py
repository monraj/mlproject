"""OpenAI via the openai SDK."""

import base64
from typing import Any

import openai

from app.vision.provider import ProviderError, Turn, parse_json


class OpenAIProvider:
    name = "openai"

    def __init__(self, api_key: str, model: str, timeout_s: float):
        self.client = openai.OpenAI(api_key=api_key, timeout=timeout_s, max_retries=1)
        self.model = model

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
        for i, t in enumerate(turns):
            if image is not None and i == len(turns) - 1:
                url = "data:image/jpeg;base64," + base64.b64encode(image).decode()
                messages.append({"role": t.role, "content": [{"type": "image_url", "image_url": {"url": url}}, {"type": "text", "text": t.content}]})
            else:
                messages.append({"role": t.role, "content": t.content})
        resp = self.client.chat.completions.create(  # type: ignore[call-overload]
            model=self.model,
            messages=messages,
            response_format={"type": "json_schema", "json_schema": {"name": "answer", "schema": schema, "strict": True}},
        )
        text = resp.choices[0].message.content if resp.choices else None
        if not text:
            raise ProviderError("empty reply")
        return parse_json(text)
