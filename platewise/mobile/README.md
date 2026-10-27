# PlateWise — mobile app (Fresh mint UI prototype)

All the PlateWise screens from the design canvas, built in Expo / React Native with the Fresh mint
colours, the Plus Jakarta Sans font and the animations from the motion spec. It runs on **sample
data**: there is no backend or AI connected yet, so scans always return the same sample plate.

## Run it on your phone (about 10 minutes the first time)

You need [Node.js 20 or newer](https://nodejs.org) on your computer and the **Expo Go** app on your
phone (Play Store or App Store). Phone and computer must be on the same Wi-Fi.

```bash
cd platewise/mobile
npm install
npx expo install --fix        # lines every package up with the Expo SDK
npx expo start
```

Scan the QR code that appears: with Expo Go on Android, or with the Camera app on iPhone.

If Expo Go says the project uses an **incompatible SDK version**, your Expo Go is newer than this
project. Upgrade the project once, then start again:

```bash
npx expo install expo@latest
npx expo install --fix
npx expo start --clear
```

> This code was written and checked in a workspace that couldn't download packages, so it has been
> type-checked and its layouts rendered, but it hasn't been run on a real phone yet. If the first
> run shows an error, open the folder in Claude Code and paste the error — it's set up to fix it
> (see `CLAUDE.md`).

Other commands: `npm run typecheck`, `npm test` (calorie maths and safety floor).

## What to try

1. The launch animation plays, then goal and pace → **Continue**.
2. **Today**: the ring draws and "kcal left" rolls up. Tap **Water** to add a cup.
3. Tap **+**: six ways to log fly out of the button.
4. **Snap a photo** → allow the camera (or tap **Sample plate**) → watch the scan → **Check your
   plate**: drag a portion slider, tap "Rice and beans" to swap it for Waakye, pick the oil level →
   **Save meal**.
5. **Meal saved** → **See what fits for dinner**.
6. **Progress** → **Your week in review** and **Weekly check-in**.
7. **Coach**: tap a suggestion chip or type a question (sample replies).
8. **Me**: switch Light / Dark / Phone and try **Hide numbers**.

Turn on Reduce Motion in your phone's accessibility settings: every screen shows its final state
without the movement.

## What's real and what's sample

| Part | Status |
| --- | --- |
| Screens, navigation, light and dark mode | Built |
| Animations (Reanimated) with Reduce Motion support | Built |
| Camera, with on-device resize (drops location data) | Built; the photo isn't sent anywhere |
| Food recognition, calories, coach replies, voice transcript | **Sample data** (`src/data/sample.ts`) |
| Saving meals, budget changes, water | In memory only; reset when the app restarts |
| Backend, AI, food database, accounts, payments | Not built — ROADMAP.md phases 0–3, 5, 6 |

Every calorie and gram figure in `src/data/sample.ts` is illustrative. Real values must come from
the backend food database (CLAUDE.md rule 2).

## Where things are

```
app/                    screens (Expo Router: each file is a route)
  index.tsx             animated launch
  onboarding.tsx        goal and pace
  (tabs)/               Today, Progress, Coach, Me + custom tab bar
  log.tsx               "Log anything" menu
  scan/                 camera → scanning → review → swap sheet → saved
  fits.tsx voice.tsx checkin.tsx week.tsx
src/theme/tokens.ts     Fresh mint colours (light + dark), font names, radii
src/lib/motion.ts       every duration, easing and spring
src/components/         Ring, Bar, Odometer, Slider, Card, Chip, Button, TabBar, Icon…
src/state/              app state (sample) and calorie maths
docs/design/MOTION.md   the motion spec this code follows
```

## Next steps with Claude Code

Open the `platewise` folder (the one with `CLAUDE.md` and `ROADMAP.md`) in Claude Code. This app
covers most of the **Phase 4** screens; the backend starts at **Phase 0**. A good first prompt:

> Read CLAUDE.md and ROADMAP.md. The mobile UI prototype in mobile/ already exists on sample data.
> Implement Phase 0 (backend, Docker, CI), then wire mobile/src/state to the real API as each phase lands.
