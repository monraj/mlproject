# PlateWise

Snap your food, know your day. A food-photo calorie and weight tracker for Ghana, built from the
PlateWise design (Fresh mint) as an Expo phone app plus a small Python server for the AI parts.

```
platewise/
  backend/   FastAPI server: photo scans, voice/typed meals, coach, meal ideas, barcode lookup
  mobile/    Expo (React Native) app: every screen from the design, data saved on the phone
  CLAUDE.md  rules the code follows · ROADMAP.md  the full plan
```

## Run it on your phone (easiest)

Install **Python 3.12+** and **Node.js 20+** on your computer and the **Expo Go** app on your phone
(same Wi-Fi). Then:

- **Mac / Linux:** open a terminal in the `platewise` folder and run `bash start.sh`
- **Windows:** double-click `start.bat` in the `platewise` folder

The first time, it asks you to paste your Gemini API key (nothing shows while you paste; that's normal),
saves it to `backend/.env`, installs everything, and starts the server and the app. Scan the QR code
with Expo Go. Next time it remembers your key.

## Run it step by step

You need **Python 3.12+**, **Node.js 20+**, and the **Expo Go** app on your phone. Phone and
computer must be on the same Wi-Fi.

```bash
cd platewise
make setup                         # once
cp backend/.env.example backend/.env   # then paste an AI key into backend/.env (see below)
make server                        # terminal 1: the API on port 8000
make app                           # terminal 2: scan the QR code with Expo Go
```

The app finds the server automatically (same computer as `expo start`, port 8000). To use a
server somewhere else, start the app with `EXPO_PUBLIC_API_URL=http://your-server:8000 npx expo start`.
**Me → PlateWise server** shows whether the app is connected.

### AI keys

The start script fills this in for you. To change it later, edit `backend/.env`: put at least one key in: `GEMINI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.
With several, the server tries them in order and falls back if one fails. With none, it runs in
**demo mode**: everything works, but scans and the coach return sample answers.

## What works

| Feature | How |
| --- | --- |
| Onboarding | Your details → Mifflin–St Jeor budget, 1,200/1,500 kcal floors, pace ≤ 1 %/week, no underweight goals, 18+ |
| Snap a photo / gallery | Photo is shrunk on the phone (drops location data), sent once, never stored |
| Say it (English, Twi, Pidgin) | Speak with your keyboard's microphone; the AI turns "two balls of kenkey" into grams |
| Type it, food list, saved meals, recent meals, same as yesterday | All on the Log menu |
| Barcode | Live scanner → Open Food Facts → you check the numbers once; products are remembered. No barcode? Photograph the label |
| Check your plate | Portion sliders, counts, oil level, swap or add foods, ranges not false precision |
| Calories | Always computed from the food table, never by the AI |
| Today | Budget ring, protein/greens/water/steps habits, meal list (hold to delete), encouraging insights |
| Meal check, What fits now | Plain-language feedback; meal ideas built from the food table, tap to log |
| Coach | Chat grounded in your log; flex plans for weddings and parties (saved only when you tap Save) |
| Progress, Your week, Weekly check-in | Weigh-ins, smoothed trend, forecast band, weekly story, learned daily burn after 2 weeks |
| Reminders | Local notifications for meals you haven't logged yet, plus a weigh-in day |
| Light/dark, hide numbers, delete all data | On Me |

Your log is stored on the phone only (no accounts yet).

## Before launch

- **Food values are drafts.** `backend/app/nutrition/foods.json` has 63 foods, every one marked
  `needs_review`. Check them against USDA FoodData Central and the FAO West Africa table (ROADMAP Phase 1).
- See `docs/OPEN_QUESTIONS.md` for what's simplified compared with the roadmap.
