"""Every safety rule in one place (CLAUDE.md rule 5). Mirrored in mobile/src/state/calc.ts."""

from typing import Literal

Sex = Literal["female", "male"]

CALORIE_FLOOR: dict[str, int] = {"female": 1200, "male": 1500}
MAX_WEEKLY_LOSS_SHARE = 0.01
MIN_GOAL_BMI = 18.5
MIN_AGE = 18


def calorie_floor(sex: Sex) -> int:
    return CALORIE_FLOOR[sex]


def clamp_budget(kcal: float, sex: Sex) -> int:
    """Round to 10 kcal and never go below the floor."""
    return max(calorie_floor(sex), int(round(kcal / 10) * 10))


def max_weekly_loss_kg(weight_kg: float) -> float:
    return weight_kg * MAX_WEEKLY_LOSS_SHARE


def clamp_pace(pace_kg_week: float, weight_kg: float) -> float:
    return min(pace_kg_week, max_weekly_loss_kg(weight_kg))


def min_goal_weight(height_cm: float) -> float:
    return MIN_GOAL_BMI * (height_cm / 100) ** 2


def goal_allowed(goal_kg: float, height_cm: float) -> bool:
    return goal_kg >= min_goal_weight(height_cm)


def age_allowed(age: int) -> bool:
    return age >= MIN_AGE
