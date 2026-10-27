# PlateWise

A working version of the PlateWise food-photo calorie and weight tracker, built from the
"Building an AI Food-Photo Calorie & Weight Tracker" spec and the PlateWise "Fresh mint" screens.

- **Log a meal** by photo or description (Claude names each food and estimates grams), by
  search, or from saved meals. Calories are computed from a built-in food table (Ghanaian
  dishes plus common foods, per 100 g), not by the AI.
- **Check your plate**: per-item portion sliders, swap or add items, an oil question for
  oil-heavy dishes, and a total shown as a likely range.
- **Daily budget** from Mifflin–St Jeor with safety floors (1,200 / 1,500 kcal), pace capped at
  1% of body weight a week, and no underweight goals.
- **Progress**: weigh-ins, a smoothed (7-day EMA) weight trend, and a weekly check-in that
  learns your real daily burn from your logs and scale.

Open `index.html` in a browser to use it with search logging; data stays in that browser.
Published as a Claude artifact, photo and describe logging use Claude, and the log syncs to
your Claude account.

`app.html` is the artifact source; `index.html` wraps it in a full HTML document. Regenerate
`index.html` after editing `app.html`.
