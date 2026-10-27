# CLAUDE.md — PlateWise (AI food-photo calorie & weight tracker)

You are implementing PlateWise, a mobile app that turns a photo of a meal into identified foods, portion estimates, calories/macros, and a weight-trend forecast. Launch market: Ghana (Accra), so local dishes (waakye, banku, kenkey, fufu, jollof, red-red, kontomire, light soup) are first-class.

The full build plan is in `ROADMAP.md`. Work **one phase at a time**, in order. Do not start a phase until the previous phase's acceptance criteria pass.

## Non-negotiable architecture rules

1. **The AI identifies; the backend counts.** The vision model returns food names, gram ranges, cooking method, oil level and confidence as JSON. It never returns the final calorie number used in the app. Calories = grams × kcal_per_100g ÷ 100, computed in `backend/app/nutrition/calc.py`.
2. **Never invent nutrient values.** Every row in `foods` must have a `source` (USDA FDC id, FAO WAFCT 2019 code, or `recipe:<id>` composed from sourced ingredients). If a value is unknown, leave it null and set `needs_review = true`. Do not fill gaps from memory.
3. **Provider-agnostic AI layer.** All model calls go through `backend/app/vision/provider.py` (interface) with implementations for Gemini (primary), OpenAI and Anthropic (fallbacks). Model names and keys come from env vars only.
4. **Store the AI guess and the user's final value** on every `meal_item` (`ai_grams`, `grams`, `ai_food_id`, `food_id`, `was_corrected`). This powers the learning loop.
5. **Safety rules live in one module** (`backend/app/safety/rules.py`) and are unit-tested: calorie floor (1,200 kcal women / 1,500 kcal men), max loss pace 1% body weight/week, block goal weights with BMI < 18.5, 18+ only.
6. **Privacy by default.** Strip EXIF/GPS on device before upload. Do not persist meal photos unless `users.consent_store_photos = true`. Never log images or full prompts containing images.
7. **Show uncertainty.** API responses carry `kcal_low` / `kcal_high` alongside `kcal`. The UI shows ranges or a confidence badge, never false precision.
8. **Motion follows `docs/design/MOTION.md`** (created in Phase 4 from the spec in ROADMAP.md). All durations and easings come from one `mobile/src/lib/motion.ts` token file. Every animation checks Reduce Motion (`useReducedMotion()` from Reanimated) and shows the final state instead. Animations never block input or delay a task.
9. **Tone.** Insights and tips are encouraging, never shaming. No "bad food" language, no red warnings for eating over budget.

## Design source

The screens, flow and motion are on the PlateWise design canvas: [DESIGN CANVAS LINK — paste the shared link here]. Match its layout, colours and copy. If something on the canvas conflicts with these rules, the rules win; note it in `docs/OPEN_QUESTIONS.md`.

Design tokens — **Fresh mint** (the "Fresh mint" page of the canvas; ignore the "Earlier · calm green" page). Light is the default; dark follows the phone setting.
- Light: background `#FFFFFF` · surface/cards `#F4F6F5` · line `#EAECF0` · ink `#101828` · muted text `#475467` · faint `#98A2B3`
- Mint: shapes (rings, bars, chart lines, fills) `#12B76A` · borders/selected `#039855` · mint text and links `#027A48` · dark text on tint `#05603A` · tint `#ECFDF3` · light `#6CE9A6`
- Sun yellow (highlights, over-budget bars, sparks) `#FDB022`
- "Check this" amber: border `#F79009`, text `#B54708`, tint `#FFFAEB`
- Primary buttons are near-black `#101828` with white text. Never put white or small text on `#12B76A` (fails contrast).
- Dark: background `#0C111D` · surface `#161B26` · raised `#1F242F` · line `#333741` · ink `#F5F5F6` · muted `#94969C` · mint `#32D583` · mint tint `#053321` · yellow `#FDB022`
- Habit colours (light / dark): protein `#12B76A`/`#32D583`, greens `#7E9A2E`/`#B8D86B`, water `#2E90FA`/`#53B1FD`, steps `#F79009`/`#FDB022`
- Font: Plus Jakarta Sans — 800 with tight tracking (−0.03em) for big numbers and titles, 500–700 for body
- Radius: cards 20, sheets 28, buttons fully rounded · no drop shadows on cards · touch targets ≥ 44 px

## Stack (fixed — don't swap without asking)

| Area | Choice |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript, Expo Router, TanStack Query, Zustand, expo-camera, expo-image-manipulator |
| Motion & UI | react-native-reanimated 3, moti (simple entrances), react-native-svg (ring, charts, logo), expo-haptics, expo-splash-screen |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic |
| Database | PostgreSQL 16 + pgvector (pg_trgm for fuzzy search) |
| Auth | Supabase Auth (JWT verified in FastAPI) — or email-OTP stub in dev |
| Storage | S3-compatible bucket (MinIO in dev) |
| AI | `google-genai` SDK (Gemini Flash tier); `openai` and `anthropic` SDKs as fallbacks |
| Payments (Phase 6) | Paystack (mobile money) on Android/web; App Store billing on iOS |
| Tests | pytest + httpx (backend), Jest + React Native Testing Library (mobile) |
| Lint/format | ruff + mypy (backend), eslint + prettier + tsc (mobile) |
| Local dev | docker compose (postgres, minio, backend) |
| CI | GitHub Actions |

## Repo layout

```
/
├── CLAUDE.md
├── ROADMAP.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db/ (models.py, session.py)
│   │   ├── api/ (routes_*.py)
│   │   ├── vision/ (provider.py, gemini.py, openai_p.py, anthropic_p.py, prompts.py, schema.py)
│   │   ├── nutrition/ (calc.py, matcher.py, importers/)
│   │   ├── energy/ (bmr.py, tdee.py, trend.py, forecast.py)
│   │   ├── safety/ (rules.py)
│   │   └── learning/ (bias.py)
│   ├── alembic/
│   ├── data/ (raw source files — gitignored if large)
│   ├── eval/ (test set manifest, run_eval.py, reports/)
│   └── tests/
└── mobile/
    ├── app/ (Expo Router screens)
    ├── src/ (api/, components/, store/, lib/)
    └── __tests__/
```

## Working conventions

- Small commits, one logical change each, conventional-commit messages.
- Every new backend module gets tests in the same PR. Run `make test` before saying a task is done.
- Type everything (mypy strict on `app/`, `strict: true` in tsconfig).
- Use Alembic for every schema change; never edit the DB by hand.
- Secrets only via env vars; keep `.env.example` current.
- When a requirement is ambiguous, write the question into `docs/OPEN_QUESTIONS.md` and pick the simplest reasonable default — don't stall.
- At the end of each phase, update the checklist in `ROADMAP.md` and write a short `docs/phase-N-notes.md` (what was built, what's stubbed, known issues).

## Commands (create these in Phase 0)

```
make up          # docker compose up -d
make migrate     # alembic upgrade head
make seed        # load food data
make test        # backend + mobile tests
make lint        # ruff, mypy, eslint, tsc
make eval        # run the vision evaluation set
cd mobile && npx expo start
```
