from typing import Literal

from pydantic import BaseModel, Field


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    lang: Literal["en", "tw", "pcm"] = "en"
    meal: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class CoachRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)
    context: str = Field(default="", max_length=8000)
    sex: Literal["female", "male"] = "female"
    hide_numbers: bool = False


class IdeasRequest(BaseModel):
    kcal_left: float = Field(ge=0, le=6000)
    protein_left: float = Field(ge=0, le=400)
    greens_today: int = Field(default=0, ge=0, le=20)
    meal: str = "Dinner"
    category: Literal["all", "home", "chop", "quick"] = "all"
