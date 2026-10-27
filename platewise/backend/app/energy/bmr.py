"""Mifflin–St Jeor BMR, TDEE and the daily budget."""

from app.safety.rules import Sex, clamp_budget, clamp_pace

KCAL_PER_KG = 7700


def bmr(sex: Sex, weight_kg: float, height_cm: float, age: int) -> float:
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + (5 if sex == "male" else -161)


def tdee(sex: Sex, weight_kg: float, height_cm: float, age: int, activity: float) -> float:
    return bmr(sex, weight_kg, height_cm, age) * activity


def daily_budget(tdee_kcal: float, sex: Sex, weight_kg: float, goal_kg: float, pace_kg_week: float) -> int:
    pace = clamp_pace(pace_kg_week, weight_kg)
    delta = pace * KCAL_PER_KG / 7
    if goal_kg < weight_kg - 0.1:
        return clamp_budget(tdee_kcal - delta, sex)
    if goal_kg > weight_kg + 0.1:
        return clamp_budget(tdee_kcal + min(delta, 500), sex)
    return clamp_budget(tdee_kcal, sex)
