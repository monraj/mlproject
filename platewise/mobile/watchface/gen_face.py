"""Writes the PlateWise Flip watch face (Watch Face Format v2): a retro split-flap clock.

Hours, minutes and seconds sit on paper-like cards. When a value changes, the top half of the old
card folds down over the hinge and the new card's bottom half drops into place, with a soft shadow
passing underneath. Everything is driven by the clock itself, so it never drifts. In ambient mode
the seconds card and the motion switch off.

Run: python3 gen_face.py src/main/res/raw/watchface.xml
"""
import sys

W = 450
C = W // 2  # whole numbers only: the watch can't read "23.0" as a position
PKG = "app.platewise.mobile/app.platewise.wear."

BG_IN, BG_OUT = "#FF1D1A16", "#FF070605"
CARD_TOP, CARD_TOP2 = "#FF34302A", "#FF2A2722"  # top half: light from above
CARD_BOT, CARD_BOT2 = "#FF24211D", "#FF1A1815"
PAPER = "#FFF3E9D2"  # warm cream digits
SUN = "#FFFDB022"
MINT = "#FF32D583"
MUTED = "#FF8C8577"
HINGE = "#FF050505"
AMBIENT_OFF = '<Variant mode="AMBIENT" target="alpha" value="0"/>'

out: list[str] = []
w = out.append


def font(size, color, fam="jakarta_extrabold"):
    return f'<Font family="{fam}" size="{size}" color="{color}">'


def text(x, y, wd, h, expr, size, color, fam="jakarta_extrabold", fmt="%s", align="CENTER", ellipsis="TRUE"):
    params = "".join(f'<Parameter expression="{e}"/>' for e in (expr if isinstance(expr, list) else [expr]))
    return (f'<PartText x="{x}" y="{y}" width="{wd}" height="{h}"><Text align="{align}" ellipsis="{ellipsis}">'
            f'{font(size, color, fam)}<Template>{fmt}{params}</Template></Font></Text></PartText>')


def half(wd, h, top, value, size, color, scale=None, shadow=None):
    """One half of a card: the card face and the digits, clipped to the half."""
    hh = h // 2
    y = 0 if top else hh + 1
    hgt = hh - 1 if top else h - hh - 1
    pivot = "1" if top else "0"
    c1, c2 = (CARD_TOP, CARD_TOP2) if top else (CARD_BOT, CARD_BOT2)
    face_y = 0 if top else -(hh + 1)
    s = [f'<Group name="{"top" if top else "bottom"}" x="0" y="{y}" width="{wd}" height="{hgt}" pivotX="0.5" pivotY="{pivot}">']
    if scale:
        s.append(f'<Transform target="scaleY" value="{scale}"/>')
    s.append(f'<PartDraw x="0" y="{face_y}" width="{wd}" height="{h}"><RoundRectangle x="0" y="0" width="{wd}" height="{h}" cornerRadiusX="14" cornerRadiusY="14">'
             f'<Fill color="#FFFFFFFF"><LinearGradient startX="0" startY="0" endX="0" endY="{h}" colors="{c1} {c2}" positions="0 1"/></Fill></RoundRectangle></PartDraw>')
    s.append(text(-10, face_y, wd + 20, h, value, size, color, fmt="%02d", ellipsis="FALSE"))
    if shadow:
        # The falling flap's shadow passes over the card underneath.
        s.append(f'<PartDraw x="0" y="0" width="{wd}" height="{hgt}" alpha="0"><Transform target="alpha" value="{shadow}"/>'
                 f'<Rectangle x="0" y="0" width="{wd}" height="{hgt}"><Fill color="#FF000000"/></Rectangle></PartDraw>')
    s.append('</Group>')
    return "".join(s)


def card(name, x, y, wd, h, new, old, progress, size, color, ambient_hide=False):
    """A split-flap card. `progress` runs 0 to 1 over a flip and rests at 1."""
    fold = f"clamp(1 - 2 * ({progress}), 0, 1)"  # old top half folding down
    drop = f"clamp(2 * ({progress}) - 1, 0, 1)"  # new bottom half dropping into place
    hh = h // 2
    s = [f'<Group name="{name}" x="{x}" y="{y}" width="{wd}" height="{h}">']
    # Behind: new top, old bottom (shaded while the flap is above it).
    s.append(half(wd, h, True, new, size, color, shadow=f"110 * {fold}"))
    s.append(half(wd, h, False, old, size, color, shadow=f"150 * (1 - {drop}) * (1 - {fold})"))
    # In front: the moving flaps.
    s.append(half(wd, h, True, old, size, color, scale=fold))
    s.append(half(wd, h, False, new, size, color, scale=drop))
    # Hinge: a dark line with two little pins, like a desk clock.
    s.append(f'<PartDraw x="0" y="{hh - 2}" width="{wd}" height="4"><Rectangle x="0" y="1" width="{wd}" height="2"><Fill color="{HINGE}"/></Rectangle>'
             f'<RoundRectangle x="-2" y="0" width="6" height="4" cornerRadiusX="2" cornerRadiusY="2"><Fill color="#FF55504A"/></RoundRectangle>'
             f'<RoundRectangle x="{wd - 4}" y="0" width="6" height="4" cornerRadiusX="2" cornerRadiusY="2"><Fill color="#FF55504A"/></RoundRectangle></PartDraw>')
    # Always-on: no seconds, and dimmer cards so the screen isn't lit for hours.
    s.append(AMBIENT_OFF if ambient_hide else '<Variant mode="AMBIENT" target="alpha" value="170"/>')
    s.append('</Group>')
    w("".join(s))


def shortcut(sid, x, y, provider, ptype, fallback, ftype, accent):
    """A round brass-ringed button that opens a PlateWise page (or Gemini)."""
    s = 54
    r = s // 2
    w(f'<ComplicationSlot slotId="{sid}" x="{x}" y="{y}" width="{s}" height="{s}" supportedTypes="SHORT_TEXT RANGED_VALUE MONOCHROMATIC_IMAGE SMALL_IMAGE" isCustomizable="TRUE">')
    w(f'<DefaultProviderPolicy defaultSystemProvider="{fallback}" defaultSystemProviderType="{ftype}" primaryProvider="{PKG}{provider}" primaryProviderType="{ptype}"/>')
    w(f'<BoundingOval x="0" y="0" width="{s}" height="{s}"/>')
    disc = (f'<PartDraw x="0" y="0" width="{s}" height="{s}"><Ellipse x="0" y="0" width="{s}" height="{s}"><Fill color="#FF2A2722"/></Ellipse>'
            f'<Ellipse x="2" y="2" width="{s - 4}" height="{s - 4}"><Fill color="#FF16140F"/></Ellipse></PartDraw>')
    icon = f'<PartImage x="{r - 9}" y="7" width="18" height="18" tintColor="{accent}"><Image resource="[COMPLICATION.MONOCHROMATIC_IMAGE]"/></PartImage>'
    w('<Complication type="SHORT_TEXT">' + disc + icon + text(3, 25, s - 6, 22, "[COMPLICATION.TEXT]", 14, PAPER) + '</Complication>')
    w('<Complication type="RANGED_VALUE">' + disc +
      f'<PartDraw x="0" y="0" width="{s}" height="{s}"><Arc centerX="{r}" centerY="{r}" width="{s - 6}" height="{s - 6}" startAngle="0" endAngle="0"><Stroke color="{accent}" thickness="3" cap="ROUND"/>'
      f'<Transform target="endAngle" value="clamp([COMPLICATION.RANGED_VALUE_VALUE] / [COMPLICATION.RANGED_VALUE_MAX], 0, 1) * 360"/></Arc></PartDraw>'
      + icon + text(3, 25, s - 6, 22, "[COMPLICATION.TEXT]", 14, PAPER) + '</Complication>')
    for t in ("MONOCHROMATIC_IMAGE", "SMALL_IMAGE"):
        img = f"[COMPLICATION.{t}]"
        tint = f' tintColor="{accent}"' if t == "MONOCHROMATIC_IMAGE" else ""
        w(f'<Complication type="{t}">' + disc + f'<PartImage x="{r - 13}" y="{r - 13}" width="26" height="26"{tint}><Image resource="{img}"/></PartImage></Complication>')
    w('</ComplicationSlot>')


w('<?xml version="1.0" encoding="utf-8"?>')
w('<!-- PlateWise Flip. Generated by mobile/watchface/gen_face.py; edit that, not this file. -->')
w(f'<WatchFace width="{W}" height="{W}">')
w('<Metadata key="CLOCK_TYPE" value="DIGITAL"/>')
w('<Metadata key="PREVIEW_TIME" value="10:08:32"/>')
w('<Scene backgroundColor="#FF000000">')

# A warm, dim room behind the clock.
w(f'<PartDraw x="0" y="0" width="{W}" height="{W}"><Rectangle x="0" y="0" width="{W}" height="{W}"><Fill color="#FFFFFFFF">'
  f'<RadialGradient centerX="{C}" centerY="{C - 20}" radius="{C + 20}" colors="{BG_IN} {BG_OUT}" positions="0 1"/></Fill></Rectangle>'
  f'<Variant mode="AMBIENT" target="alpha" value="0"/></PartDraw>')

# Top: the date on two small flaps, and a little brand line.
w(text(0, 44, W, 22, [], 13, MINT, "jakarta_semibold", fmt="PLATEWISE"))


def flap(wd, h):
    """A small still flap (date, calories): the same card, without the motion."""
    return (f'<PartDraw x="0" y="0" width="{wd}" height="{h}"><RoundRectangle x="0" y="0" width="{wd}" height="{h}" cornerRadiusX="10" cornerRadiusY="10">'
            f'<Fill color="#FFFFFFFF"><LinearGradient startX="0" startY="0" endX="0" endY="{h}" colors="{CARD_TOP} {CARD_BOT2}" positions="0 1"/></Fill></RoundRectangle>'
            f'<Rectangle x="0" y="{h // 2 - 1}" width="{wd}" height="2"><Fill color="{HINGE}"/></Rectangle></PartDraw>')


w(f'<Group name="date" x="126" y="70" width="96" height="46">{flap(96, 46)}'
  + text(2, 0, 92, 46, ["[DAY_OF_WEEK_S]", "[DAY]"], 19, PAPER, fmt="%s %d") + '</Group>')

# Hours and minutes: the big cards. Hours follow the phone's 12/24-hour setting.
HOUR = "([IS_24_HOUR_MODE] ? [HOUR_0_23] : [HOUR_1_12])"
HOUR_OLD = "([IS_24_HOUR_MODE] ? ([HOUR_0_23] + 23) % 24 : ([HOUR_1_12] + 10) % 12 + 1)"
card("hours", 50, 132, 168, 170, HOUR, HOUR_OLD, "clamp(([MINUTE] * 60 + [SECOND_MILLISECOND]) / 0.7, 0, 1)", 118, PAPER)
card("minutes", 232, 132, 168, 170, "[MINUTE]", "([MINUTE] + 59) % 60", "clamp([SECOND_MILLISECOND] / 0.7, 0, 1)", 118, PAPER)

# Seconds: a smaller card in sun yellow that flips every second.
card("seconds", 185, 318, 80, 64, "[SECOND]", "([SECOND] + 59) % 60", "clamp(([SECOND_MILLISECOND] - [SECOND]) / 0.45, 0, 1)", 46, SUN, ambient_hide=True)

# Shortcuts either side of the seconds: stress and blood sugar on the left, fasting and Gemini on
# the right. Calories left sits on the top right flap.
shortcut(0, 66, 318, "StressComplicationService", "SHORT_TEXT", "HEART_RATE", "SHORT_TEXT", MINT)
shortcut(1, 124, 318, "SugarComplicationService", "SHORT_TEXT", "WATCH_BATTERY", "SHORT_TEXT", "#FF53B1FD")
shortcut(2, 272, 318, "FastComplicationService", "RANGED_VALUE", "DAY_OF_WEEK", "SHORT_TEXT", SUN)
shortcut(7, 330, 318, "GeminiComplicationService", "SHORT_TEXT", "WATCH_BATTERY", "SHORT_TEXT", PAPER)

# Calories left, as a flap beside the date.
w('<ComplicationSlot slotId="5" x="228" y="70" width="96" height="46" supportedTypes="SHORT_TEXT RANGED_VALUE" isCustomizable="TRUE">'
  f'<DefaultProviderPolicy defaultSystemProvider="STEP_COUNT" defaultSystemProviderType="SHORT_TEXT" primaryProvider="{PKG}KcalComplicationService" primaryProviderType="SHORT_TEXT"/>'
  '<BoundingBox x="0" y="0" width="96" height="46"/>')
for t in ("SHORT_TEXT", "RANGED_VALUE"):
    w(f'<Complication type="{t}">' + flap(96, 46) + text(2, 0, 92, 30, "[COMPLICATION.TEXT]", 20, PAPER) + text(2, 26, 92, 18, "[COMPLICATION.TITLE]", 11, MINT, "jakarta_semibold") + '</Complication>')
w('</ComplicationSlot>')

# Today's summary: tap the brand line area below the clock.
shortcut(3, 198, 386, "SummaryComplicationService", "SHORT_TEXT", "WATCH_BATTERY", "SHORT_TEXT", MINT)

w('</Scene>')
w('</WatchFace>')
open(sys.argv[1], "w").write("\n".join(out) + "\n")
