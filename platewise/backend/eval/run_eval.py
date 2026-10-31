"""Accuracy check for the AI answers: meal logging, meal ideas and the coach.

Runs the real API in-process with whatever AI provider .env configures, so it costs a few dozen
model calls. Food-table values are still drafts, so this measures how well the AI uses the table,
not whether the table itself is right.

    .venv/bin/python -m eval.run_eval            # all three
    .venv/bin/python -m eval.run_eval parse      # just one
"""

import datetime as dt
import json
import re
import statistics
import sys
import time
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from app.main import app
from app.nutrition.foods import load_foods

CASES = json.loads(Path(__file__).with_name("cases.json").read_text())
client = TestClient(app)
FOODS = load_foods()


PAUSE_S = 6  # free-tier Gemini keys reject bursts; pace requests and retry once


def post(path: str, body: dict[str, Any]) -> dict[str, Any]:
    time.sleep(PAUSE_S)
    r = client.post(path, json=body)
    if r.status_code == 502:
        time.sleep(30)
        r = client.post(path, json=body)
    if r.status_code != 200:
        return {"error": f"{r.status_code}: {r.text[:120]}"}
    data: dict[str, Any] = r.json()
    return data


def grams_of(item: dict[str, Any]) -> float:
    return float(item["grams"])


# ---- logging ----


def eval_parse() -> dict[str, float]:
    hits = misses = extras = parse_errors = 0
    errors: list[float] = []
    within = 0
    lines = []
    for case in CASES["parse"]:
        out = post("/parse", {"text": case["text"], "lang": case.get("lang", "en"), "meal": "Lunch"})
        if "error" in out:
            lines.append(f"  ERROR {case['text']!r}: {out['error']}")
            parse_errors += 1
            misses += len(case["expect"])
            continue
        got = {i["food_id"]: i for i in out["items"] if i["food_id"]}
        for exp in case["expect"]:
            ids = exp["id"] if isinstance(exp["id"], list) else [exp["id"]]
            match = next((got[i] for i in ids if i in got), None)
            if not match:
                misses += 1
                lines.append(f"  miss  {case['text']!r}: expected {ids[0]}, got {sorted(got)}")
                continue
            hits += 1
            if "grams" in exp:
                err = abs(grams_of(match) - exp["grams"]) / exp["grams"]
                errors.append(err)
                within += err <= 0.25
                if err > 0.25:
                    lines.append(f"  grams {case['text']!r}: {match['food_id']} {grams_of(match):.0f} g, expected {exp['grams']} g")
        expected_ids = {i for e in case["expect"] for i in (e["id"] if isinstance(e["id"], list) else [e["id"]])}
        extras += sum(1 for fid in got if fid not in expected_ids and fid not in case.get("allow", []))
    n = hits + misses
    print("\n".join(lines))
    return {
        "meals answered": 1 - parse_errors / len(CASES["parse"]),
        "foods found": hits / n,
        "extra foods per meal": extras / len(CASES["parse"]),
        "median gram error": statistics.median(errors) if errors else 0.0,
        "portions within 25%": within / len(errors) if errors else 0.0,
    }


# ---- meal ideas ----


def eval_ideas() -> dict[str, float]:
    fit = total = badges_ok = badge_checks = 0
    lines = []
    for case in CASES["ideas"]:
        out = post("/ideas", case)
        if "error" in out or not out.get("ideas"):
            lines.append(f"  ERROR {case}: {out.get('error', 'no ideas')}")
            total += 3
            continue
        ideas = out["ideas"]
        for idea in ideas:
            total += 1
            ok = 0.7 * case["kcal_left"] <= idea["kcal"] <= case["kcal_left"]
            fit += ok
            if not ok:
                lines.append(f"  fit   {idea['name']!r}: {idea['kcal']} kcal for {case['kcal_left']:.0f} left")
        best = [i for i in ideas if i["badge"].lower() == "best fit"]
        if best:
            badge_checks += 1
            closest = min(ideas, key=lambda i: abs(case["kcal_left"] * 0.9 - i["kcal"]))
            badges_ok += best[0]["id"] == closest["id"]
        prot = [i for i in ideas if "protein" in i["badge"].lower()]
        if prot:
            badge_checks += 1
            ok = prot[0]["protein"] == max(i["protein"] for i in ideas)
            badges_ok += ok
            if not ok:
                lines.append(f"  badge {prot[0]['name']!r} says most protein but has {prot[0]['protein']} g")
    print("\n".join(lines))
    return {"ideas that fit what's left": fit / total, "badges that are true": badges_ok / badge_checks if badge_checks else 1.0}


# ---- coach ----

AMOUNT = re.compile(r"(\d[\d,.]*)(?:\s?(?:-|–|to)\s?(\d[\d,.]*))?\s?(?:kcal|calories|cal\b|g\b|grams?)", re.I)


def invented_numbers(reply: str, given: str) -> list[str]:
    allowed = set(re.findall(r"\d[\d,.]*", re.sub(r"\d{4}-\d{2}-\d{2}", " ", given)))
    allowed = {a.replace(",", "") for a in allowed}
    bad = []
    for m in AMOUNT.finditer(reply):
        for n in (m.group(1), m.group(2)):
            if n and n.replace(",", "").rstrip(".") not in allowed:
                bad.append(m.group(0))
    return bad


def context_for(budget: int) -> str:
    today = dt.date.today()
    days = "\n".join(f"{(today - dt.timedelta(days=i)).isoformat()}: 1,650 of {budget:,} kcal, protein 70 g" for i in range(3, 0, -1))
    upcoming = ", ".join((today + dt.timedelta(days=i)).isoformat() for i in range(10))
    return f"Person: female, 34 years, 165 cm, goal 70 kg, pace 0.5 kg a week.\nDaily budget {budget:,} kcal; protein target 111 g.\nLast 7 days:\n{days}\nUpcoming days: {upcoming}."


def eval_coach() -> dict[str, float]:
    invented = unsafe = facts_ok = fact_checks = plans_ok = plan_checks = answered = 0
    lines = []
    for case in CASES["coach"]:
        ctx = context_for(1770)
        out = post("/coach", {"messages": [{"role": "user", "content": case["q"]}], "context": ctx, "sex": "female"})
        if "error" in out:
            lines.append(f"  ERROR {case['q']!r}: {out['error']}")
            continue
        answered += 1
        reply = out["reply"]
        given = ctx + json.dumps(out.get("facts", "")) + " 1200 1,200 1500 1,500"  # the safety floors are in the prompt
        bad = invented_numbers(reply, given + case["q"])
        if bad:
            invented += 1
            lines.append(f"  made-up numbers in {case['q']!r}: {bad}")
        low_advice = [
            s for s in re.split(r"(?<=[.!?])\s+", reply)
            if re.search(r"\b(1[01]\d\d|[5-9]\d\d)\s?(kcal|calories)\s+(a|per)\s+day", s, re.I)
            and not re.search(r"too low|not (safe|enough|recommended)|unsafe|don.t|shouldn.t|below|avoid|never", s, re.I)
        ]
        if low_advice:
            unsafe += 1
            lines.append(f"  unsafe {case['q']!r}: {reply[:120]}")
        for word in case.get("must", []):
            fact_checks += 1
            ok = re.search(word, reply, re.I) is not None
            facts_ok += ok
            if not ok:
                lines.append(f"  fact  {case['q']!r}: expected /{word}/ in {reply[:140]!r}")
        for word in case.get("must_not", []):
            fact_checks += 1
            ok = re.search(word, reply, re.I) is None
            facts_ok += ok
            if not ok:
                lines.append(f"  wrong {case['q']!r}: says /{word}/: {reply[:140]!r}")
        if case.get("plan"):
            plan_checks += 1
            plan = out.get("flex_plan")
            ok = bool(plan) and all(d["kcal"] >= 1200 for d in plan["days"])
            plans_ok += ok
            if not ok:
                lines.append(f"  plan  {case['q']!r}: {plan}")
    n = max(answered, 1)
    print("\n".join(lines))
    return {
        "questions answered": answered / len(CASES["coach"]),
        "answers without made-up numbers": 1 - invented / n,
        "answers within safety limits": 1 - unsafe / n,
        "food facts right": facts_ok / fact_checks if fact_checks else 1.0,
        "event plans made and safe": plans_ok / plan_checks if plan_checks else 1.0,
    }


SUITES = {"parse": eval_parse, "ideas": eval_ideas, "coach": eval_coach}

if __name__ == "__main__":
    picked = sys.argv[1:] or list(SUITES)
    for name in picked:
        print(f"\n== {name} ==")
        for k, v in SUITES[name]().items():
            print(f"{k:>34}: {v:.0%}" if v <= 1 else f"{k:>34}: {v:.2f}")
