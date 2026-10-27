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
