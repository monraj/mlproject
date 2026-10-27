# Food Calorie Tracker

A single-page calorie tracker. Open `index.html` in any browser; no install or server needed.

- Search 80+ common foods (calories, protein, carbs, fat per serving) or enter a custom food
- Log by meal (breakfast, lunch, dinner, snacks) and move between days
- Daily goal ring, macro progress bars, and a 7-day chart

Opened as a local file, the log is saved in that browser (localStorage). Published as a
Claude artifact, it is saved to your Claude account so it follows you across devices.

`app.html` is the page source used for the artifact; `index.html` is the same page wrapped
in a full HTML document for opening locally. Regenerate `index.html` after editing `app.html`.
