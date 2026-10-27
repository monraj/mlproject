# ROADMAP.md — PlateWise end-to-end implementation plan

Read `CLAUDE.md` first. Build phases in order. Each phase lists **tasks**, **acceptance criteria** (must pass before moving on) and a **kickoff prompt** to paste into Claude Code.

Overall shape:

| Phase | Name | Outcome | Est. effort |
| --- | --- | --- | --- |
| 0 | Foundations | Repo, Docker, CI, skeleton apps talk to each other | 2–3 days |
| 1 | Food database | Postgres food table from USDA + FAO West Africa + Ghana recipes, fuzzy/semantic search | 4–6 days |
| 2 | Vision pipeline + eval harness | Photo → structured items → matched foods → calories, measured on a test set | 5–7 days |
| 3 | Core backend: users, meals, energy | Profiles, goals, meal logging, BMR/TDEE, safety rules | 4–5 days |
| 4 | Mobile app MVP + motion | Launch animation, onboarding, camera, scanning, review/correct, saved + meal check, what fits, Today, history | 12–16 days |
| 5 | Weight trend, forecast, learning loop, insights | Weigh-ins, trend, adaptive TDEE, forecast, per-dish bias, meal check, suggestions, week in review | 8–10 days |
| 5b | Best-in-market features | Log-anything menu, voice/text/barcode logging, AI coach, weekly check-in, habits, dark mode, widgets, smart reminders | 12–18 days |
| 6 | Hardening, privacy, payments, release | Security, DPC-ready privacy features, subscriptions, store builds | 6–10 days |
| 7 | Post-launch (optional) | Portion model, LiDAR, voice/Twi, barcode | ongoing |

Effort assumes one developer working with Claude Code. Phases 0–5 = closed-beta build.

---

## Phase 0 — Foundations

**Tasks**
- [ ] Create the repo layout from `CLAUDE.md`.
- [ ] `docker-compose.yml`: postgres 16 with pgvector + pg_trgm extensions, MinIO, backend (hot reload).
- [ ] Backend: FastAPI app, `config.py` (pydantic-settings), `/health` endpoint, SQLAlchemy session, Alembic init.
- [ ] Mobile: Expo + TypeScript + Expo Router, a Home screen calling `/health` and showing the result.
- [ ] `Makefile` with the commands listed in `CLAUDE.md`.
- [ ] `.env.example` with: `DATABASE_URL`, `S3_*`, `VISION_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `USDA_API_KEY`, `SUPABASE_JWT_SECRET`, `API_BASE_URL`.
- [ ] GitHub Actions: lint + typecheck + tests for backend and mobile on every PR.
- [ ] `docs/OPEN_QUESTIONS.md`, `docs/phase-0-notes.md`.

**Acceptance criteria**
- `make up && make migrate && make test && make lint` all pass on a clean clone.
- Expo app on a phone/emulator shows "API: ok".
- CI is green.

**Kickoff prompt**
> Read CLAUDE.md and ROADMAP.md. Implement Phase 0 exactly as listed. Use the fixed stack. When done, run make test and make lint, tick the Phase 0 checklist, and write docs/phase-0-notes.md.

---

## Phase 1 — Food database

The food table is the source of truth for calories. Nothing here may be invented.

**Schema (Alembic migration)**

```
foods(
  id uuid pk, name text, aliases text[], region text,           -- 'GH', 'WA', 'US', 'global'
  category text, kcal_per_100g numeric null, protein_g numeric null,
  carbs_g numeric null, fat_g numeric null, fiber_g numeric null,
  density_g_per_ml numeric null,                                   -- for volume→grams later
  typical_portion_g numeric null, typical_portion_label text null, -- e.g. 'one ball of kenkey'
  source text not null,                                            -- 'usda:<fdc_id>' | 'fao_wafct2019:<code>' | 'recipe:<id>' | 'user'
  needs_review bool default false, is_composite bool default false,
  name_embedding vector(768) null, created_at, updated_at
)
recipes(id, food_id fk, notes, reviewed_by text null, reviewed_at null)
recipe_ingredients(recipe_id fk, ingredient_food_id fk, grams numeric)
```
Indexes: GIN trigram on `name`, GIN on `aliases`, ivfflat/hnsw on `name_embedding`.

**Tasks**
- [ ] USDA importer (`nutrition/importers/usda.py`): load the FoodData Central "Foundation" and "SR Legacy" bulk CSV/JSON downloads from `backend/data/usda/` (do not call the API per food; the API is rate-limited to 1,000 req/hour). Map energy (kcal), protein, carbs, fat, fiber.
- [ ] FAO importer (`nutrition/importers/fao_wafct.py`): load the FAO/INFOODS Western Africa Food Composition Table 2019 Excel from `backend/data/fao/`. Use the edible-portion per-100 g values. Keep the FAO code in `source`. If the file is missing, the importer prints download instructions and exits non-zero (don't fabricate).
- [ ] Recipe composer (`nutrition/recipes.py`): computes a composite food's per-100 g values from its ingredients' sourced values and weights (accounting for total cooked weight if provided).
- [ ] `backend/data/ghana_dishes.yaml`: list the top ~150 Ghanaian dishes with name, aliases (English + common local spellings), category, typical portion label, and a **draft** ingredient list referencing FAO/USDA foods. All entries `needs_review: true` until a dietitian signs off. Ingredient gram amounts may be left blank where unknown — the composer skips dishes with incomplete recipes and reports them.
- [ ] `make seed` runs all importers + composer, idempotently (upsert on `source`).
- [ ] Embeddings: generate name+alias embeddings with the configured provider's embedding model; store in `name_embedding`. Make it a separate `make embed` step so it can be re-run.
- [ ] Matcher (`nutrition/matcher.py`): `match(name, aliases, region_hint) -> list[Candidate]` combining trigram similarity, alias exact hits and vector similarity; boost `region='GH'/'WA'` when the user is in Ghana. Return top 5 with a combined score in [0,1].
- [ ] Endpoint `GET /foods/search?q=` (used by the mobile swap list).
- [ ] Report script: counts per source, number `needs_review`, dishes skipped for incomplete recipes → `docs/food-db-report.md`.

**Acceptance criteria**
- Seed loads USDA + FAO with zero rows lacking `source`.
- Matcher unit tests: "jollof", "jollof rice", "waakye", "wakye", "kenkey", "fried plantain/kelewele", "banku" each return a sensible top-1 (write the expected IDs into the test after seeding).
- `/foods/search` p95 < 150 ms locally on the full table.

**Kickoff prompt**
> Implement Phase 1 from ROADMAP.md. Follow CLAUDE.md rule 2 strictly: never invent nutrient values. If the USDA or FAO source files are not in backend/data/, write clear download instructions into docs/DATA_SOURCES.md and stop to tell me which files to download.

---

## Phase 2 — Vision pipeline + evaluation harness

**Structured output schema** (`vision/schema.py`, Pydantic, also exported as JSON Schema for the provider's structured-output mode):

```
MealAnalysis {
  is_food: bool
  items: [ {
    food_name: str
    local_aliases: [str]
    grams_estimate: float
    grams_low: float
    grams_high: float
    cooking_method: enum[raw, boiled, steamed, fried, grilled, stewed, baked, fermented, other]
    visible_oil_level: enum[none, low, medium, high, unknown]
    confidence: float  # 0..1
    bbox: [x0, y0, x1, y1] | null  # normalised 0..1
  } ]
  plate_or_reference: str | null   # e.g. 'standard dinner plate', 'bowl', 'hand visible'
  notes: str | null
}
```

**Tasks**
- [ ] `vision/provider.py`: `VisionProvider` protocol with `analyze(image_bytes, context) -> MealAnalysis`; timeouts, 1 retry, JSON-schema validation, fallback to the next provider on failure.
- [ ] Gemini, OpenAI and Anthropic implementations using each SDK's structured-output / JSON mode.
- [ ] `vision/prompts.py`: two-step prompting. Step A (decompose): list every distinct food, estimate grams as a range, cooking method and visible oil — **no calories**. Context passed in: country, meal time, user note, cuisine hint ("Ghanaian / West African home and chop-bar food" when region is GH). Keep prompts versioned (`PROMPT_VERSION`).
- [ ] Pipeline (`vision/pipeline.py`): validate → for each item run matcher → pick top match if score ≥ 0.75 else mark `needs_user_choice` with top-3 → compute kcal/macros and `kcal_low/kcal_high` from the gram range → apply oil adjustment (if oil level medium/high and dish category is stew/soup/fried, add a configurable oil increment and flag `asked_oil=true`).
- [ ] Endpoint `POST /scans` (multipart image + context) → returns scan id, items with candidates, totals, ranges, latency, prompt version, provider. Images are held in memory only unless consent flag is set.
- [ ] Image pre-check: reject images > 8 MB; downscale server-side to ≤1024 px if the client didn't.
- [ ] Evaluation harness (`backend/eval/`):
  - `manifest.csv` format: `image_path, item_food_id, item_true_grams` (one row per item; multiple rows per image).
  - `run_eval.py --provider gemini --prompt-version v1` outputs top-1/top-3 recognition accuracy, per-item gram MAPE, meal kcal MAPE, p50/p95 latency, cost estimate from token usage → `eval/reports/<date>-<provider>-<prompt>.md`.
  - Ship with an **empty** manifest and a README explaining how to collect 100+ weighed local meals (photo from ~45°, kitchen scale grams per component).
- [ ] Cost logging: record input/output tokens per scan in a `scan_logs` table (no image, no prompt text).

**Acceptance criteria**
- Unit tests with recorded provider responses (fixtures) cover: valid parse, malformed JSON → retry → fallback, `is_food=false`, low-confidence match → `needs_user_choice`.
- `POST /scans` works end-to-end against a real provider with a sample image (manual check, documented in phase notes).
- `make eval` runs and produces a report (even on a small manifest).

**Kickoff prompt**
> Implement Phase 2 from ROADMAP.md. The model must never produce the calorie number used by the app (CLAUDE.md rule 1). Build the provider fallback chain and the eval harness. Use recorded fixtures in tests so CI never calls a paid API.

---

## Phase 3 — Core backend: users, meals, energy, safety

**Schema additions**

```
users(id, auth_id, email, created_at, sex, birth_date, height_cm, activity_level,
      goal_type enum[lose, maintain, gain], goal_weight_kg, goal_pace_kg_per_week,
      region default 'GH', units default 'metric',
      consent_terms_at, consent_health_data_at, consent_store_photos bool default false,
      hide_numbers bool default false)
meals(id, user_id, eaten_at, meal_type enum[breakfast, lunch, dinner, snack], source enum[photo, text, manual],
      scan_id null, photo_key null, created_at)
meal_items(id, meal_id, food_id, grams, kcal, protein_g, carbs_g, fat_g,
           ai_food_id null, ai_grams null, ai_confidence null, was_corrected bool, oil_adjust_kcal numeric default 0)
weigh_ins(id, user_id, date, weight_kg)
daily_summary(user_id, date, intake_kcal, est_tdee_kcal, balance_kcal, updated_at)  -- materialised by service
```

**Tasks**
- [ ] Auth: verify Supabase JWT; dev mode allows a fixed test user.
- [ ] `energy/bmr.py`: Mifflin–St Jeor (men: 10W + 6.25H − 5A + 5; women: … − 161).
- [ ] `energy/tdee.py`: activity multipliers (1.2, 1.375, 1.55, 1.725, 1.9); daily budget = TDEE − deficit implied by goal pace (≈7,700 kcal/kg used only for the *initial* budget, clearly commented), then clamped by safety rules.
- [ ] `safety/rules.py`: calorie floors, max pace 1% body weight/week, BMI goal floor 18.5, age ≥ 18; returns `(allowed_value, warnings[])`. 100% branch coverage.
- [ ] Endpoints: `POST/GET/PATCH /me`, `POST /meals` (from a scan id with the user's confirmed items, or manual items), `GET /meals?date=`, `PATCH /meal-items/{id}`, `DELETE /meals/{id}`, `GET /summary?date=` (budget, intake, remaining, macros, per-meal share), `POST /weigh-ins`, `GET /weigh-ins`.
- [ ] When saving from a scan, persist `ai_*` fields and set `was_corrected` if food or grams changed by >10%.
- [ ] Data export `GET /me/export` (JSON) and `DELETE /me` (hard delete incl. stored photos).

**Acceptance criteria**
- Tests for BMR/TDEE with hand-checked numbers, all safety branches, and the full scan→confirm→meal→summary flow.
- Deleting a user removes every row and stored object (test with MinIO).

**Kickoff prompt**
> Implement Phase 3 from ROADMAP.md. Put every safety limit in safety/rules.py with full test coverage, and make the summary endpoint the single source of daily numbers for the app.

---

## Phase 4 — Mobile app MVP

**Screens (Expo Router)** — match the design canvas (see CLAUDE.md, Design source)
0. **Launch** — native splash (`expo-splash-screen`, white `#FFFFFF`, static mint logo) hands over to an animated `app/launch.tsx`: a mint blob springs in and wobbles into a circle, a white plate settles inside, a ring draws to today's real progress, three food dots drop on, a yellow spark orbits once, the "platewise" wordmark slides up out of a slot, tagline fades. Full 2.6 s on first open only; later opens play a 0.8 s ring-only version. Preload fonts and today's summary during it so it never adds waiting.
1. `onboarding/*` — welcome → 18+ confirm → sex, birth date, height, weight → activity → goal + pace (shows safety-clamped budget and any warning) → consents (terms, health data, optional "store my photos to improve the app") → sign-in.
2. `(tabs)/today` — budget ring (eaten / remaining), macro bars, meal cards with photo thumbnail (local only unless consented), "+" button. Respects `hide_numbers`.
3. `scan/camera` — expo-camera, framing hint ("include the whole plate, shoot at ~45°"), gallery picker. On device: resize to 1024 px, strip EXIF, JPEG q≈0.8.
3b. `scan/scanning` — shown while `POST /scans` runs: the photo settles into frame, a scan line sweeps, status text cycles ("Finding the foods…", "Estimating portions…", "Matching Ghanaian dishes…"), progress bar eases toward 92% and completes on response. Food labels pop onto the photo using each item's `bbox` as results arrive (if the API returns all items at once, stagger them 80 ms apart before moving to review). Cancel returns to camera.
4. `scan/review` — list of detected items: name, grams slider (range from `grams_low`–`grams_high`, extendable), kcal shown as a range, confidence badge; tap name → swap sheet with top-3 candidates + search (`/foods/search`); oil question chip when flagged; add/remove item; meal-type picker; Save.
4b. `scan/saved` — after Save: check mark pops and draws, a one-time burst of 8 dots, success haptic, "Today so far" bar animates from the old total to the new one, then up to 3 **meal check** tips rise in (rules from `GET /meals/{id}/check`, Phase 5; stub with fixed tips until then). Buttons: "See what fits for dinner" and "Back to today".
4c. `plan/fits` — **What fits**: calories and protein left today, filter chips (All / Home-cooked / Chop bar / Quick), up to 3 meal idea cards with a fit bar showing the share of remaining calories each uses, badges (Best fit / Most protein / Most fibre), one practical tip. Data from `GET /suggestions` (Phase 5; stub until then). Hidden when fewer than 300 kcal remain, after 9 pm, or when `hide_numbers` is on (show ideas without numbers instead).
5. `(tabs)/history` — calendar list of days with totals; tap → day detail.
6. `(tabs)/progress` — placeholder until Phase 5.
7. `settings` — profile, goals, units, hide numbers, consents, export data, delete account.
- [ ] Offline-safe: queue meal saves when offline; scans require network and show a friendly retry.
- [ ] Text fallback: "Describe your meal" field that calls `POST /scans` with text-only context (reuse pipeline with a text prompt variant).
- [ ] Loading state during scan with progress copy; target perceived latency < 6 s.
- [ ] Accessibility: dynamic type, labels on all controls, colour not the only signal.
- [ ] Analytics events: `scan_started`, `scan_succeeded`, `scan_failed`, `item_swapped`, `grams_adjusted`, `meal_saved`, `weigh_in_added`, `fits_opened`, `fits_idea_tapped`, `recap_viewed` (PostHog, behind a config flag; no food photos or health values in event properties).

**Motion (create `docs/design/MOTION.md` from this and `mobile/src/lib/motion.ts` with these tokens)**

| Token | Value | Use for |
| --- | --- | --- |
| `fast` | 150 ms | Taps, toggles, chips |
| `base` | 250 ms | Sheets, cards entering |
| `slow` | 500 ms | Screen entrances |
| `data` | 800–1,200 ms | Ring, bars, chart line |
| `easeOut` | `Easing.bezier(0.2, 0.8, 0.2, 1)` | Default for anything entering |
| `sheetSpring` | damping 20, stiffness 220 | Swap sheet, add-item sheet |
| `popSpring` | damping 12, stiffness 260 | Check mark, badges |
| `stagger` | 80 ms | Lists, detected food labels, idea cards |

Key moments:
- [ ] **Launch** — as screen 0 above.
- [ ] **Shutter** — photo scales to 0.96 and settles into the scan frame; `Haptics.impactAsync(Light)`.
- [ ] **Scanning** — scan line loop 2.4 s; labels pop (scale 0.85→1) as found; status text cross-fades.
- [ ] **Review** — items rise in (stagger); the low-confidence item's border pulses twice then stops; slider thumb springs; kcal range numbers cross-fade on change (never spin).
- [ ] **Swap sheet** — `sheetSpring` up; chosen option scales 0.98 on press; sheet closes and the item row flashes the mint tint once.
- [ ] **Save** — as screen 4b; `Haptics.notificationAsync(Success)`.
- [ ] **Today** — ring animates from previous to new total (`data`), then macro bars grow left to right; the newest meal card slides in at the top of the list (shared-element transition from the review summary where supported).
- [ ] **What fits** — cards rise in (stagger); fit bars grow to their share; gentle steam loop on the "Best fit" icon only.
- [ ] **Progress** — trend line draws (animated `strokeDashoffset`), endpoint dot pops, then the likely-range band and forecast line fade in.
- [ ] **Week in review** — story bar fills over 6 s (tap to pause, swipe for next); meal count rolls like an odometer; day bars rise left to right; highlight cards rise last.
- [ ] **Pull to refresh** on Today — the ring spins one turn and settles.

Rules:
- [ ] With Reduce Motion on, every screen shows its final state with at most a 150 ms fade.
- [ ] Loop only while the user is waiting (scanning) or on a decorative accent (steam); nothing flashes more than 3 times a second.
- [ ] Never animate a number the user must read for more than 1.2 s; never animate the calorie *range* text itself.
- [ ] 60 fps on a mid-range Android (test on a ~GHS 2,000 device): run animations on the UI thread (Reanimated worklets), no layout animations on long lists.

**Acceptance criteria**
- Full happy path on a physical Android device: onboard → scan a real plate → correct one item → save → Today updates.
- Every motion moment above is implemented, uses tokens from `motion.ts`, and has a Reduce Motion path (Jest test toggles the mock and asserts final state renders).
- No dropped frames visible in the scan → review → save → Today flow on a mid-range Android (check with the Perf Monitor).
- Component tests for review screen logic (slider updates kcal range, swap updates item).
- `tsc`, eslint, Jest all pass.

**Kickoff prompt**
> Implement Phase 4 from ROADMAP.md in mobile/. Start with mobile/src/lib/motion.ts and docs/design/MOTION.md, then the screens in flow order, matching the design canvas. The review screen is the most important screen — make correcting an item take at most two taps. Never display a single exact calorie number without its range or a confidence badge. Every animation must have a Reduce Motion path.

---

## Phase 5 — Weight trend, forecast, learning loop

**Tasks**
- [ ] `energy/trend.py`: exponentially smoothed weight trend (α ≈ 0.1 per day, interpolating missing days).
- [ ] `energy/tdee.py` (adaptive): weekly job estimating actual TDEE = mean logged intake − (Δtrend_kg × energy density) / days over a rolling 14–28 day window; blend with formula TDEE (weight shifts toward observed as logging completeness rises; require ≥ 10 logged days of 14). Store `est_tdee_kcal` in `daily_summary`.
- [ ] `energy/forecast.py`: dynamic forecast that does **not** assume a fixed kcal/kg forever — recompute expected expenditure as projected weight changes (simple daily simulation: weight → BMR via Mifflin–St Jeor × activity → balance → Δweight). Return a band (low/mid/high from ±10% intake uncertainty). Document the method and its limits in `docs/forecast.md`.
- [ ] `GET /progress` — trend series, raw weigh-ins, adaptive TDEE, forecast band to goal date.
- [ ] Mobile `(tabs)/progress` — trend line + dots for raw weigh-ins + forecast band; weekly weigh-in reminder (local notification).
- [ ] `learning/bias.py`: nightly job computing per-food median ratio `grams / ai_grams` and swap frequency from corrected items (min 20 samples). Expose as `food_bias` table; pipeline multiplies `grams_estimate` by the bias factor (bounded 0.6–1.6) and logs that it did.
- [ ] Admin report `GET /admin/learning-report` (protected): most-swapped AI names → chosen foods (feeds new aliases / new dishes), biggest bias factors.
- [ ] Wellbeing checks (safety module): if 7-day average intake < floor, or rapid loss > 1%/week for 2+ weeks, show a supportive message with a link to talk to a health professional; never lower the budget further.

**Helpful features (back the screens added in Phase 4)**
- [ ] **Meal check** — `insights/meal_check.py` + `GET /meals/{id}/check`: up to 3 rule-based tips per saved meal, each `{kind: good|tip|info, title, body}`. Starter rules: protein ≥ 25 g → "Good protein"; any item with oil level medium/high → "Oil adds up"; no vegetable/leafy item → "Low on greens" with local suggestions (kontomire, garden eggs, salad); very large starch share → suggest a smaller portion of the starch. Rules and copy live in one YAML file so non-engineers can edit them. Tone rule: never shaming (CLAUDE.md rule 9).
- [ ] **What fits** — `meal_templates` table (name, local name, category home/chop_bar/quick, portion description, food items with grams, `source`, `reviewed_by`) seeded with ~40 common Ghanaian meals as **draft** recipes from the food DB (nutrients computed by the recipe composer, `needs_review` until a dietitian signs off). `GET /suggestions?meal=dinner&filter=` returns up to 3 templates whose kcal ≤ remaining calories, ranked by how well they close the protein and fibre gaps, with a fit share and badges. Never suggest when remaining < 300 kcal; never suggest skipping a meal.
- [ ] **Week in review** — `GET /recap/week?start=` returns meals logged, days logged, per-day intake vs budget, top dish, best day (closest to budget), trend change, and one rule-based nudge (e.g., over-budget days cluster on weekends → plan ahead). Mobile `recap/week` story screen (5 story pages: meals logged, calories by day, top dishes, weight trend, next-week nudge); Monday-morning local notification "Your week is ready". Share renders a 1080×1920 image of page 1–2 without weight values unless the user turns them on.

**Acceptance criteria**
- Trend/adaptive TDEE/forecast tested with synthetic users (stable weight, steady loss, noisy data, missing days).
- Bias factor applied only when sample size threshold met; covered by tests.
- Meal check, suggestions and recap each have unit tests with fixture meals; suggestions never exceed remaining calories and never return anything when remaining < 300 kcal.

**Kickoff prompt**
> Implement Phase 5 from ROADMAP.md. Do not use a static 3,500 kcal/lb (7,700 kcal/kg) rule for forecasts — simulate day by day so expenditure falls as weight falls. Write docs/forecast.md explaining the model in plain language.

---

## Phase 5b — Best-in-market features

Benchmarked against MacroFactor, Cal AI, MyFitnessPal, SnapCalorie and others (see the "Design principles and research" board on the design canvas). Each item matches a canvas screen.

**Tasks**
- [ ] **Log anything menu** (canvas 11) — the tab-bar "+" morphs into ✕ and six options spring out of it: Snap a photo, Say it, Barcode, Type it, Saved meals, Same as yesterday; recent meals as one-tap chips; "Ask PlateWise" entry. Background blurs (`expo-blur`). Long-press "+" goes straight to the camera.
- [ ] **Text and copy logging** — `POST /scans` text mode (from Phase 4) plus `POST /meals/copy` (yesterday's meal or a saved meal) and `saved_meals` table.
- [ ] **Barcode and label scan** — `expo-camera` barcode scanning → Open Food Facts lookup cached in `foods` with `source='off:<barcode>'`; nutrition-label photo → vision model reads the panel → user confirms before saving. (Moved up from Phase 7.)
- [ ] **Voice logging** (canvas 12) — record → speech-to-text → the same text pipeline → chips for each food with quantity; unclear quantities shown as orange "how much?" chips. English first; add Twi and Pidgin when a speech-to-text provider handles them well enough on the eval set (write the comparison into `docs/OPEN_QUESTIONS.md`; keep the provider behind an interface like the vision layer).
- [ ] **Ask PlateWise coach** (canvas 13) — `POST /coach/messages` (streaming). The model answers using tools that read only this user's data (today's summary, last 14 days of meals, weight trend, goals) — no free-form database access. Can propose a **flex plan** (redistribute calories across up to 7 days, same weekly total, every day ≥ safety floor; user must tap "Save" to apply). Guardrails: not medical advice; refuses diagnosis and medication questions with a referral; any sign of disordered eating triggers the wellbeing response from Phase 5 and never gives lower targets; all limits from `safety/rules.py`. Log only message counts, not content, in analytics.
- [ ] **Weekly check-in** (canvas 14) — every Monday, after Phase 5's adaptive TDEE job: propose a new budget with "why it changed" (average intake vs learned burn), options "Use new", "Keep current", "Maintenance week" (budget = learned burn for 7 days). Never more than ±150 kcal change per week; never below floor. Odometer number animation; old value struck through.
- [ ] **Daily habits** (canvas 15) — protein, greens (servings from food categories), water (tap to add cups), steps (Health Connect on Android via `react-native-health-connect`, HealthKit on iOS). Steps are shown, but logged exercise does **not** add calories back by default (adaptive TDEE already covers activity); add a setting if users ask.
- [ ] **Gentle consistency count** — "N days logged" (not a fragile streak): one missed day doesn't reset it; it counts days logged in the last 30.
- [ ] **Dark mode** (canvas 15) — full theme from the tokens on the principles board; follows the system setting with an in-app override.
- [ ] **Widgets** (canvas 16) — home-screen small and medium widgets (calories left, protein, "Snap meal" deep link) and a lock-screen circular widget. iOS via WidgetKit (Expo config plugin, e.g. `@bacons/apple-targets`), Android via a Glance/RemoteViews widget (e.g. `react-native-android-widget`). Widgets read a small cached summary written by the app; refresh after each meal save.
- [ ] **Smart reminders** — local notifications only when a meal the user usually logs (learned from the last 14 days) hasn't been logged by its usual time + 45 min; actions "Snap", "Same as yesterday", "Skip today". Max 2 a day; quiet hours; one-tap off.

**Acceptance criteria**
- Every new screen matches its canvas board, with motion from `motion.ts` and a Reduce Motion path.
- Coach: test suite of 30 scripted conversations (including disordered-eating, medical and pregnancy prompts) passes the guardrail checks; flex plans never break the floor or change the weekly total.
- Voice and barcode logs land in the same review screen as photo logs.
- Widgets update within 1 minute of saving a meal on both platforms.

**Kickoff prompt**
> Implement Phase 5b from ROADMAP.md, one feature per PR in the listed order. The coach must only read this user's data through explicit tools and must use safety/rules.py for every number it suggests. Stop and ask me before choosing a paid speech-to-text provider.

---

## Phase 6 — Hardening, privacy, payments, release

**Tasks**
- [ ] Security: rate limiting on `/scans` (per user per minute/day), request size limits, CORS lockdown, dependency audit (`pip-audit`, `npm audit`), secrets scanning in CI.
- [ ] Privacy: privacy policy + terms pages (plain language; disclose that photos are processed by a third-party AI provider outside Ghana), in-app consent management, vendor setting to disable training on API data (document in `docs/PRIVACY.md`), data retention job (delete unconsented images immediately, scan logs after 90 days).
- [ ] Ghana DPC readiness checklist in `docs/DPC_CHECKLIST.md` (data inventory, processors list, cross-border transfers, retention, breach process, data subject request process). Registration itself is a business task — leave a TODO for the founder.
- [ ] Payments: free tier (e.g., 3 scans/day) and Premium (unlimited scans, progress forecast, history export). Paystack integration for mobile-money subscriptions via a web checkout + webhook; App Store / Play billing via RevenueCat. Entitlements checked server-side.
- [ ] Observability: Sentry (backend + mobile), structured logs, dashboard of scan success rate, latency p95, cost per active user.
- [ ] Deployment: backend Docker image → a managed host (Render/Fly/Railway or Cloud Run), managed Postgres with pgvector, S3 bucket, staging + production envs, migrations on deploy.
- [ ] EAS Build for Android (Play internal testing) and iOS (TestFlight); store listings with honest accuracy wording and "not medical advice".
- [ ] Load test `/scans` path with mocked provider (k6 or Locust) to 50 concurrent users.

**Acceptance criteria**
- Staging environment live; mobile builds installable by beta testers.
- All CI checks pass; no high/critical vulnerabilities.
- Beta checklist in `docs/BETA_CHECKLIST.md` complete.

**Kickoff prompt**
> Implement Phase 6 from ROADMAP.md. Prioritise rate limiting, privacy/retention and deployment first, then payments. Stop and ask me before creating any paid cloud resources or entering any real API keys.

---

## Phase 7 — Post-launch (pick based on beta data)

- [ ] **Portion head model:** once ≥ 2,000 weighed local plates exist, train a small portion-estimation network on top of the vision model's names/boxes (frozen image backbone + per-food volume/density head). Serve behind a feature flag; A/B against the LLM gram estimate using the eval harness.
- [ ] **LiDAR depth** on supported iPhones for volume.
- [ ] **Ga and Ewe** voice logging (after Twi and Pidgin in Phase 5b).
- [ ] **Watch app** (Wear OS / watchOS) with calories left and quick "same as usual" logging.
- [ ] **Before/after photos** to subtract leftovers.

---

## Definition of done (closed beta)

- [ ] A new user in Accra can onboard, scan 3 meals, correct them in ≤ 2 taps each, and see today's budget update.
- [ ] Weekly weigh-ins produce a trend line and forecast band.
- [ ] Eval report on ≥ 100 weighed local meals exists, with recognition and calorie error published internally.
- [ ] Safety rules, privacy defaults and data export/delete verified by tests.
- [ ] Staging + production deployed; Android and iOS beta builds distributed.
