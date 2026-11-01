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


# ---- Time-restricted eating (intermittent fasting) ----
# A fasting window is a choice the person makes; PlateWise only checks it is safe for them.

FastingPlan = Literal["12:12", "14:10", "16:8"]
DiabetesMeds = Literal["none", "metformin", "other"]
FastingBlock = Literal["age", "pregnant", "eating_disorder", "underweight", "glucose_meds"]

FAST_HOURS: dict[str, int] = {"12:12": 12, "14:10": 14, "16:8": 16}
# Below this, a fast ends now: eat 15 g of fast sugar and recheck (same line as the low-sugar band).
FAST_BREAK_GLUCOSE_MMOL = 3.9
# With diabetes, keep to an overnight-length fast until a doctor has agreed a longer one.
DIABETES_MAX_FAST_HOURS = 12


def fasting_block(
    *,
    age: int,
    weight_kg: float,
    height_cm: float,
    pregnant: bool,
    eating_disorder: bool,
    diabetes_meds: DiabetesMeds,
    doctor_ok: bool,
) -> FastingBlock | None:
    """Why fasting is not offered to this person, or None when it is.

    Insulin and sulfonylurea-type tablets ("other") can cause dangerous lows while fasting, so they
    need a doctor's go-ahead. Pregnancy, breastfeeding, an eating-disorder history and a BMI under
    18.5 are never cleared by the app.
    """
    if not age_allowed(age):
        return "age"
    if pregnant:
        return "pregnant"
    if eating_disorder:
        return "eating_disorder"
    if weight_kg < min_goal_weight(height_cm):
        return "underweight"
    if diabetes_meds == "other" and not doctor_ok:
        return "glucose_meds"
    return None


def max_fast_hours(*, diabetes: bool, doctor_ok: bool) -> int:
    return DIABETES_MAX_FAST_HOURS if diabetes and not doctor_ok else max(FAST_HOURS.values())


def fasting_plan_allowed(plan: FastingPlan, *, diabetes: bool, doctor_ok: bool) -> bool:
    return FAST_HOURS[plan] <= max_fast_hours(diabetes=diabetes, doctor_ok=doctor_ok)


def must_break_fast(glucose_mmol: float) -> bool:
    return glucose_mmol < FAST_BREAK_GLUCOSE_MMOL
