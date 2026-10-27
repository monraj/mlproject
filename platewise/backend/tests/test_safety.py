from app.energy.bmr import bmr, daily_budget, tdee
from app.safety.rules import age_allowed, clamp_budget, clamp_pace, goal_allowed, min_goal_weight


def test_floor_by_sex():
    assert clamp_budget(900, "female") == 1200
    assert clamp_budget(1300, "male") == 1500
    assert clamp_budget(1794, "female") == 1790


def test_pace_capped_at_one_percent():
    assert clamp_pace(0.75, 60) == 0.6
    assert clamp_pace(0.5, 84) == 0.5


def test_underweight_goal_blocked():
    assert round(min_goal_weight(165), 1) == 50.4
    assert not goal_allowed(48, 165)
    assert goal_allowed(60, 165)


def test_adults_only():
    assert not age_allowed(17)
    assert age_allowed(18)


def test_mifflin_st_jeor():
    assert bmr("female", 84, 165, 29) == 10 * 84 + 6.25 * 165 - 5 * 29 - 161
    assert bmr("male", 80, 180, 30) == 10 * 80 + 6.25 * 180 - 5 * 30 + 5


def test_budget_never_below_floor():
    t = tdee("female", 50, 150, 60, 1.2)
    assert daily_budget(t, "female", 50, 48, 0.75) >= 1200


def test_budget_loss_and_maintain():
    t = 2400
    assert daily_budget(t, "female", 84, 76, 0.5) == 1850  # 2400 − 550
    assert daily_budget(t, "female", 84, 84, 0.5) == 2400
