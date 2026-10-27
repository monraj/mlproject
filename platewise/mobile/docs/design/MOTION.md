# Motion spec — Fresh mint

Motion explains what changed or where something went. It never delays a task and never blocks
input. All values live in `src/lib/motion.ts`; don't hard-code timings in screens.

## Tokens

| Token | Value | Use for |
| --- | --- | --- |
| `duration.fast` | 150 ms | Taps, toggles, number cross-fades |
| `duration.base` | 250 ms | Sheets closing, overlays |
| `duration.slow` | 500 ms | Screen entrances (cards rising in) |
| `duration.data` | 1,000 ms | Bars, odometer digits |
| `duration.dataLong` | 1,200 ms | Rings, trend line |
| `easeOut` | bezier(0.2, 0.8, 0.2, 1) | Default for anything entering |
| `spring.sheet` | damping 20, stiffness 220 | Swap sheet |
| `spring.pop` | damping 12, stiffness 260 | Check mark, chart endpoint, plate |
| `spring.drop` | damping 11, stiffness 180 | Food dots and tags dropping in |
| `spring.press` | damping 18, stiffness 420 | Press-down on every button (`Press`) |
| `stagger` | 80 ms | Lists, cards, detected-food tags |

## Signature moments

| Where | What moves | File |
| --- | --- | --- |
| Launch | Mint blob springs in and wobbles (four corner radii) into a circle; plate pops in; ring draws to today's progress; three food dots drop; sun spark orbits once; "platewise" slides up out of a slot; tagline fades. 2.7 s, tap to skip. | `app/index.tsx` |
| Every button | Springs to 97% on press; selection haptic on key actions | `src/components/Press.tsx` |
| Today | Ring animates from the old total to the new one; "kcal left" rolls like an odometer; habit rings draw 80 ms apart; a newly saved meal zooms into the list | `app/(tabs)/today.tsx` |
| + menu | Plus turns into ✕; six tiles fly out of the button to their own places ("cloning"); background blurs | `app/log.tsx` |
| Camera | Shutter squeezes, a white flash, light haptic | `app/scan/camera.tsx` |
| Scanning | Photo settles from 108%; three rings ripple out; sun spark orbits; food tags drop in one by one with a haptic each; status text cross-fades; bar eases to 92% then completes | `app/scan/scanning.tsx` |
| Review | Items rise in; the low-confidence item's amber border pulses twice then stops; kcal ranges cross-fade as you drag (never spin) | `app/scan/review.tsx` |
| Swap sheet | Springs up over a fading scrim; options rise in; slides away on choose | `app/scan/swap.tsx` |
| Saved | Check pops and draws; eight dots burst once; day bar fills from old total to new; tips rise in; success haptic | `app/scan/saved.tsx` |
| What fits | Cards rise in; fit bars grow to their share of what's left; steam drifts on the best fit only | `app/fits.tsx` |
| Progress | Trend line draws; endpoint pops; likely-range band and forecast line fade in | `app/(tabs)/progress.tsx` |
| Week story | Story bar fills over 6 s (tap to pause); meal count rolls; day bars rise left to right; highlights rise last | `app/week.tsx` |
| Voice | Two rings pulse from the mic; wave bars bounce while listening; words appear phrase by phrase; heard-food chips zoom in | `app/voice.tsx` |
| Check-in | Old budget is struck through and dims; new budget rolls in | `app/checkin.tsx` |
| Coach | Bubbles slide in from their own side; typing dots bounce | `app/(tabs)/coach.tsx` |

## Rules

- **Reduce Motion**: every animated value starts at its final state when `useReducedMotion()` is
  true, and loops don't start. Layout entrances (`FadeInDown` etc.) follow the system setting.
- Loop only while the user waits (scanning, listening, typing) or on one small accent (steam).
  Nothing flashes more than 3 times a second.
- Never animate a number the user must read for longer than 1.2 s. Calorie ranges cross-fade; they
  don't roll.
- Run on the UI thread: shared values and worklets only; no `setState` per frame.
- Target 60 fps on a mid-range Android phone.
