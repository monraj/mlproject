"""Gemini via the google-genai SDK (primary provider)."""

from typing import Any

from google import genai
from google.genai import types

from app.vision.provider import ProviderError, Turn, parse_json


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str, timeout_s: float):
        self.client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=int(timeout_s * 1000)))
        self.model = model

    def generate_json(self, *, system: str, turns: list[Turn], schema: dict[str, Any], image: bytes | None = None) -> dict[str, Any]:
        contents: list[types.Content] = []
        for i, t in enumerate(turns):
            parts: list[types.Part] = []
            if image is not None and i == len(turns) - 1:
                parts.append(types.Part.from_bytes(data=image, mime_type="image/jpeg"))
            parts.append(types.Part.from_text(text=t.content))
            contents.append(types.Content(role="model" if t.role == "assistant" else "user", parts=parts))
        resp = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json", response_json_schema=schema),
        )
        if not resp.text:
            raise ProviderError("empty reply")
        return parse_json(resp.text)
