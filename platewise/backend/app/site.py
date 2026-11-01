"""Public pages: a home page, the privacy policy and terms. Google sign-in needs these links before
the app can be opened to everyone. They need no access code."""

from html import escape

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.config import get_settings

router = APIRouter()

UPDATED = "1 November 2026"

# Fresh mint tokens (CLAUDE.md), light and dark.
_STYLE = """
:root{--bg:#FFFFFF;--surface:#F4F6F5;--line:#EAECF0;--ink:#101828;--muted:#475467;--mint:#12B76A;--mintText:#027A48;--tint:#ECFDF3;--button:#101828;--buttonText:#FFFFFF}
@media (prefers-color-scheme:dark){:root{--bg:#0C111D;--surface:#161B26;--line:#333741;--ink:#F5F5F6;--muted:#94969C;--mint:#32D583;--mintText:#32D583;--tint:#053321;--button:#F5F5F6;--buttonText:#0C111D}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:500 17px/1.6 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:40px 20px 64px}
a{color:var(--mintText)}
nav{display:flex;gap:18px;align-items:center;margin-bottom:40px;font-weight:700}
nav .brand{font-weight:800;font-size:22px;letter-spacing:-.03em;text-decoration:none;color:var(--ink);margin-right:auto}
nav .brand span{color:var(--mint)}
h1{font-size:40px;line-height:1.1;letter-spacing:-.03em;font-weight:800;margin:0 0 16px}
h2{font-size:22px;letter-spacing:-.02em;font-weight:800;margin:36px 0 8px}
p,li{color:var(--muted)}
.card{background:var(--surface);border-radius:20px;padding:20px 22px;margin:16px 0}
.cta{display:inline-block;background:var(--button);color:var(--buttonText);text-decoration:none;font-weight:800;border-radius:999px;padding:16px 26px;margin:12px 0}
.tag{display:inline-block;background:var(--tint);color:var(--mintText);border-radius:999px;padding:4px 12px;font-size:14px;font-weight:700}
footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
"""


def _page(title: str, body: str) -> HTMLResponse:
    s = get_settings()
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title><meta name="description" content="PlateWise: snap your food and see your day, with Ghanaian dishes built in.">
<style>{_STYLE}</style></head><body><main>
<nav><a class="brand" href="/">plate<span>wise</span></a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
{body}
<footer>PlateWise · Accra, Ghana · <a href="mailto:{escape(s.contact_email)}">{escape(s.contact_email)}</a></footer>
</main></body></html>"""
    return HTMLResponse(html)


@router.get("/", response_class=HTMLResponse, include_in_schema=False)
def home() -> HTMLResponse:
    s = get_settings()
    download = (
        f'<a class="cta" href="{escape(s.download_url)}">Download for Android</a>'
        '<p>The app is shared from Google Drive while it isn\'t on the Play Store yet. On the Drive page, '
        "tap PlateWise.apk, then Download, then open the file.</p>"
        if s.download_url
        else ""
    )
    return _page(
        "PlateWise",
        f"""<span class="tag">Made for Ghana</span>
<h1>Snap your food. Know your day.</h1>
<p>PlateWise turns a photo of your plate into the foods on it, their portions and calories, and shows how your
day and your weight are going. Waakye, banku, kenkey, fufu, jollof, kontomire and light soup are built in.</p>
{download}
<div class="card"><strong>Your log stays on your phone.</strong>
<p>Meals, weigh-ins and coach chats are kept on the phone. Photos are only read by AI when you allow it, and are
never stored. Read the <a href="/privacy">privacy policy</a>.</p></div>
<div class="card"><strong>Calories are counted, not guessed.</strong>
<p>The AI names the foods and estimates portions; PlateWise counts the calories from a sourced food table, and
shows a range instead of false precision.</p></div>""",
    )


@router.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
def privacy() -> HTMLResponse:
    s = get_settings()
    email = escape(s.contact_email)
    return _page(
        "PlateWise privacy policy",
        f"""<h1>Privacy policy</h1>
<p>Last updated {UPDATED}. This explains what PlateWise keeps, where, and why, in plain words.</p>

<h2>What stays on your phone</h2>
<p>Your profile (name, age, sex, height, weight, goal and any health notes you add), your meals, weigh-ins,
water, plans, coach chats and the coach's notes about earlier chats are saved on your phone, separately for each
person who uses PlateWise on it. They are not sent to our server to be kept. If you remove yourself from a phone you
can choose to keep your log there for next time, or delete it. Uninstalling the app removes everything.</p>

<h2>Google sign-in</h2>
<p>If you continue with Google, PlateWise receives your name and email address from Google and keeps them on your
phone, only to recognise you and bring back your own log. We don't ask for any other Google data, and your name and
email are not sent to our server. If you sign in with a name and password instead, the password is kept on the
phone only as a salted, scrambled hash, never as the password itself.</p>

<h2>Photos and AI</h2>
<p>AI features only work after you allow them in the app, and you can turn them off in Me → Privacy. When you scan
a meal, type or say what you ate, or ask the coach, PlateWise sends what is needed for that answer to our server:</p>
<ul>
<li>for a photo scan, the photo with its location and camera details removed;</li>
<li>for the coach and daily reports, a short summary such as your age, sex, height, goal, weight trend, recent meals
and, if you connected them, steps, exercise and sleep. Your name and email are not included.</li>
</ul>
<p>Our server passes this to Google's Gemini AI to identify foods and write replies. Photos are held in memory only
while they are read and are never stored by PlateWise. While PlateWise uses Gemini's free plan, Google may use what it
receives to improve its services, under Google's own terms. Without AI, you can still log meals from the food table
on the phone, and an optional on-device model can read photos without sending them anywhere.</p>

<h2>Health Connect and watches</h2>
<p>If you connect Health Connect or a watch, PlateWise reads steps, active calories, exercise, sleep and heart rate on
the phone to set your daily target and suggest meals. These readings are only sent off the phone as part of the
coach summary above, when AI is allowed.</p>

<h2>What our server keeps</h2>
<p>The server keeps no accounts and no meal logs. It keeps short technical counts (which feature was used, how long it
took, whether it worked) to keep the service running, without photos, prompts or personal details.</p>

<h2>Sharing</h2>
<p>We don't sell your information or use it for advertising. Apart from the AI processing described above, we
don't share it with anyone.</p>

<h2>Children</h2>
<p>PlateWise is for adults aged 18 and over.</p>

<h2>Your choices</h2>
<p>You can turn AI off, remove yourself from a phone, or delete all your data from Me in the app. Questions or
requests: <a href="mailto:{email}">{email}</a>.</p>""",
    )


@router.get("/terms", response_class=HTMLResponse, include_in_schema=False)
def terms() -> HTMLResponse:
    s = get_settings()
    email = escape(s.contact_email)
    return _page(
        "PlateWise terms",
        f"""<h1>Terms of use</h1>
<p>Last updated {UPDATED}.</p>
<h2>Not medical advice</h2>
<p>PlateWise gives estimates and general guidance about food and weight. It is not medical advice, diagnosis or
treatment. If you are pregnant, have diabetes or another condition, or are unsure about changing how you eat, talk to
a doctor or dietitian.</p>
<h2>Estimates</h2>
<p>Food recognition, portions and calories are estimates and can be wrong. Check and correct them in the app.</p>
<h2>Who can use it</h2>
<p>PlateWise is for adults aged 18 and over. Use it fairly: don't try to overload or misuse the service.</p>
<h2>The service</h2>
<p>PlateWise is offered as it is, while it is being tested, and may change or stop. We do our best to keep it working
but can't promise it always will.</p>
<h2>Contact</h2>
<p><a href="mailto:{email}">{email}</a></p>""",
    )
