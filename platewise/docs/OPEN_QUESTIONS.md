# Open questions and simplifications

Decisions taken to get a working app quickly, against CLAUDE.md / ROADMAP.md.

1. **No database or accounts yet.** The server is stateless; each person's log is saved on their phone
   (AsyncStorage). Postgres, Alembic, Supabase auth and server-side meal history (ROADMAP Phases 0 and 3)
   are not built. The meal items still store `aiGrams`/`grams`/`aiFoodId`/`foodId`/`wasCorrected`
   (CLAUDE.md rule 4), ready to upload when there is a server-side store.
2. **Food values are drafts (CLAUDE.md rule 2).** The 63 foods in `backend/app/nutrition/foods.json` use
   commonly published reference values, each with `source: "draft:unverified-reference-values"` and
   `needs_review: true`. They must be replaced by sourced USDA / FAO WAFCT 2019 / recipe values before
   launch. The app copies this file (`npm run sync-foods`; a test fails if the copies differ).
3. **Matching is fuzzy text matching** (difflib + aliases + the model's catalogue pick), not pg_trgm and
   embeddings.
4. **Voice:** Expo Go has no speech-to-text module, so "Say it" uses the phone keyboard's dictation and the
   server interprets English, Twi or Pidgin text. A development build with a speech module would allow
   in-app recording; Twi speech recognition is not widely available.
5. **Widgets** are not built (they need native code outside Expo Go). Reminders are local notifications.
6. **Stack differences:** plain React context instead of Zustand/TanStack Query; no Docker Compose yet.
7. **Barcode** uses Open Food Facts (`off:<barcode>` source). Label photos are read by the AI and always
   shown to the person to check before saving.

## Before Play release: turn off plain HTTP (2026-10-31)
`mobile/app.json` sets `expo-build-properties` → `android.usesCleartextTraffic: true` so the app can
reach a development server on the local Wi-Fi (`http://192.168.x.x:8100`). Production uses the
HTTPS server on Render, so remove this setting before publishing.

## Foods with no published values yet (2026-11-01)

WAFCT 2019 has no row or close stand-in for these, so they are not in the table yet (CLAUDE.md rule 2):
akyeke / attieke (Nzema, Ahanta), yakeyake and abolo (Ewe), kpekple (Ga), agbeli kaklo (cassava fritters),
asaana, lamugin, wasawasa. Still estimates: salad, fried fish, wele, chichinga, pizza, burger.
Recipe rows (`source: recipe:<id>`, e.g. banku, kokonte, shito, gari foto) use PlateWise ratios written on
the row; a dietitian should check those ratios and cooked weights.

## Watch face and Gemini on the watch (2026-11-01)

- **PlateWise Flip** (`mobile/watchface`) is a Watch Face Format face (no code), installed as its own
  APK next to the watch app. Its shortcuts are the watch app's complications (stress, blood sugar,
  fasting, calories, summary, Gemini), so the face only works fully with the watch app installed.
  Edit `gen_face.py`, not `res/raw/watchface.xml`. Play needs the face as a separate listing or bundled
  with the watch app; check the current Play rules for watch faces before release.
- **Gemini** on the watch opens Google's own Gemini app (`com.google.android.wearable.assistant`).
  PlateWise sends nothing to it; the person asks by voice under Google's terms. PlateWise's own AI use
  stays off by default and anonymous (CLAUDE.md rule 6).
- Stress check-ins tapped on the watch travel to the phone over the Data Layer as
  `stress:<level>:<ms>` and are stored like phone check-ins.
- **Home-screen widget** (`TodayWidget`, in the `wear-sync` native module so prebuild keeps it) shows
  the same summary the watch gets: calories ring, flipping cards (body signals, summary, meal idea,
  fasting), "+ Water" and "Snap a meal". It shows health data on the home screen, so it respects
  "hide numbers"; consider a "hide on widget" option before release.
- **Water from the watch or widget**: each now counts only its own taps per day (the phone adds what's
  new). Before this fix, a watch tap counted the phone's cups again.
