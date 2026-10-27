# PlateWise — mobile app (Fresh mint UI prototype)

All the PlateWise screens from the design canvas, built in Expo / React Native with the Fresh mint
colours, the Plus Jakarta Sans font and the animations from the motion spec. It runs on real data
saved on the phone, and uses the PlateWise server in `../backend` for photo scans, voice and typed
meals, the coach, meal ideas and barcode lookups.

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
Start the server first (`make server` from the `platewise` folder) so scans and the coach work.

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

1. The launch animation plays, then enter your details and pick a pace → **Start tracking**.
2. **Today**: the ring draws and "kcal left" rolls up. Tap **Water** to add a cup.
3. Tap **+**: six ways to log fly out of the button.
4. **Snap a photo** → allow the camera (or pick a photo from the gallery) → watch the scan → **Check your
   plate**: drag a portion slider, tap "Rice and beans" to swap it for Waakye, pick the oil level →
   **Save meal**.
5. **Meal saved** → **See what fits for dinner**.
6. **Progress** → **Your week in review** and **Weekly check-in**.
7. **Coach**: tap a suggestion chip or type a question (answers from the server's AI).
8. **Me**: switch Light / Dark / Phone and try **Hide numbers**.

Turn on Reduce Motion in your phone's accessibility settings: every screen shows its final state
without the movement.

## What's real

Everything runs on real data: your profile, meals, weigh-ins, habits, saved meals, scanned products,
plans and coach chat are saved on the phone. Photo, voice, typed meals, the coach, meal ideas and
barcode lookups go to the PlateWise server in `../backend` (see `../README.md` to run it). Without an AI
key the server answers in demo mode.

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
src/api/client.ts       calls to the PlateWise server
src/data/foods.*        food table (copied from the server)
src/state/              app state saved on the phone, calorie maths, insights
docs/design/MOTION.md   the motion spec this code follows
```

## Next steps with Claude Code

Open the `platewise` folder (the one with `CLAUDE.md` and `ROADMAP.md`) in Claude Code. This app
covers most of the **Phase 4** screens; the backend starts at **Phase 0**. A good first prompt:

> Read CLAUDE.md, ROADMAP.md and docs/OPEN_QUESTIONS.md. The app and a stateless server already work.
> Implement Phase 0 (backend, Docker, CI), then wire mobile/src/state to the real API as each phase lands.
