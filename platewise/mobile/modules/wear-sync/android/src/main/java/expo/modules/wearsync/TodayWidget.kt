package expo.modules.wearsync

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient
import android.graphics.Typeface
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * PlateWise on the home screen. A calorie ring on the left; on the right, cards that rise in one
 * after another (body signals, the summary, the next meal, the fasting window), each opening its
 * page; and "+ Water" (counted right here, picked up by the app) and "Snap a meal".
 *
 * Fed by the app with the same summary the watch gets (WearSyncModule.updateWidget). Respects
 * "hide numbers" because the app sends it that way. Over budget is sun yellow, never red.
 */
class TodayWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, render(context)) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_WATER) {
            addWater(context)
            refresh(context)
        }
    }

    companion object {
        private const val PREFS = "platewise_widget"
        private const val ACTION_WATER = "expo.modules.wearsync.WIDGET_WATER"

        private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        /** Store the app's latest summary and redraw every PlateWise widget. */
        fun save(context: Context, json: String) {
            prefs(context).edit().putString("today", json).apply()
            refresh(context)
        }

        /** Cups added with the widget's button for a date (a running count the app reads). */
        fun widgetCups(context: Context, date: String): Int = prefs(context).getInt("cups_$date", 0)

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, TodayWidget::class.java))
            ids.forEach { manager.updateAppWidget(it, render(context)) }
        }

        private fun load(context: Context): JSONObject? =
            prefs(context).getString("today", null)?.let { runCatching { JSONObject(it) }.getOrNull() }?.takeIf { it.optString("date") == today() }

        private fun addWater(context: Context) {
            val date = today()
            val o = load(context)
            // Count only this button's taps; the app adds whatever is new, so nothing is counted twice.
            val edit = prefs(context).edit().putInt("cups_$date", widgetCups(context, date) + 1)
            if (o != null) edit.putString("today", o.put("water", o.optInt("water") + 1).toString())
            edit.apply()
        }

        private fun open(context: Context, path: String, code: Int): PendingIntent =
            PendingIntent.getActivity(
                context, code,
                Intent(Intent.ACTION_VIEW, Uri.parse("platewise://$path")).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )

        private fun dark(c: Context) = (c.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

        private fun kcal(n: Int) = "%,d".format(n)

        fun render(context: Context): RemoteViews {
            val pkg = context.packageName
            val views = RemoteViews(pkg, R.layout.platewise_widget)
            val o = load(context)
            val sig = o?.optJSONObject("signals")
            val hide = o?.optBoolean("hide") == true

            // Ring.
            val budget = o?.optInt("budget") ?: 0
            val eaten = o?.optInt("eaten") ?: 0
            val over = budget in 1 until eaten
            val big = when {
                o == null -> "—"
                hide -> o.optString("share").takeIf { it.isNotEmpty() && it != "null" } ?: "Today"
                over -> "+" + kcal(eaten - budget)
                else -> kcal(o.optInt("left"))
            }
            val small = when { o == null -> "open app"; hide -> "of today"; over -> "above plan"; else -> "kcal left" }
            val density = context.resources.displayMetrics.density
            views.setImageViewBitmap(R.id.pw_ring, ring(context, (112 * density).toInt(), if (budget > 0) eaten / budget.toFloat() else 0f, over, big, small))
            views.setContentDescription(R.id.pw_ring, "PlateWise: $big $small")
            views.setOnClickPendingIntent(R.id.pw_ring, open(context, "today", 10))

            // Cards.
            views.removeAllViews(R.id.pw_flipper)
            val cards = mutableListOf<Triple<String, String, Pair<String, String>>>() // label, path, title/body
            if (o == null) {
                cards += Triple("PlateWise", "today", "Open the app" to "Your day shows here once you open PlateWise today.")
            } else {
                val stress = sig?.optJSONObject("stress")
                val sugar = sig?.optJSONObject("sugar")
                val heart = sig?.optJSONObject("heart")
                val parts = buildList {
                    sugar?.let { add("Sugar %.1f mmol/L".format(it.optDouble("mmol"))) }
                    heart?.takeIf { !it.isNull("resting") }?.let { add("Heart ${it.optInt("resting")} bpm") }
                }
                cards += Triple("Body signals", "vitals", (stress?.optString("word") ?: "Check in") to (sugar?.optString("urgent")?.takeIf { it.isNotEmpty() && it != "null" } ?: parts.joinToString(" · ").ifEmpty {
                    stress?.takeIf { !it.isNull("checkIn") }?.let { "You said ${it.optInt("checkIn")} of 5. Tap to breathe." } ?: "Tap to check in and breathe."
                }))
                sig?.optJSONObject("report")?.let { r ->
                    val first = r.optJSONArray("lines")?.optJSONObject(0)?.optString("text") ?: ""
                    val next = r.optJSONArray("next")?.optString(0) ?: ""
                    cards += Triple("Summary", "report", r.optString("title", "Today so far") to (next.ifEmpty { first }))
                }
                sig?.optJSONObject("idea")?.let { i ->
                    val k = if (i.isNull("kcal")) "" else " · about ${kcal(i.optInt("kcal"))} kcal"
                    cards += Triple("${i.optString("slot")} idea", "fits", i.optString("name") to "Fits what's left of your day$k")
                }
                sig?.optJSONObject("fast")?.let { f ->
                    val (h, m) = f.optString("eatFrom", "08:00").split(":").map { it.toIntOrNull() ?: 0 } + listOf(0, 0)
                    val from = h * 60 + m
                    val until = (from + f.optInt("eatHours", 12) * 60) % 1440
                    val now = java.util.Calendar.getInstance().let { it.get(java.util.Calendar.HOUR_OF_DAY) * 60 + it.get(java.util.Calendar.MINUTE) }
                    val eating = ((now - from + 1440) % 1440) < f.optInt("eatHours", 12) * 60
                    cards += Triple("Fasting", "plan", (if (eating) "Eating window" else "Fasting") to "Eat from %02d:%02d to %02d:%02d".format(from / 60, from % 60, until / 60, until % 60))
                }
            }
            cards.forEachIndexed { i, (label, path, text) ->
                val card = RemoteViews(pkg, R.layout.platewise_widget_card)
                card.setTextViewText(R.id.pw_card_label, label)
                card.setTextViewText(R.id.pw_card_title, text.first)
                card.setTextViewText(R.id.pw_card_body, text.second)
                card.setOnClickPendingIntent(R.id.pw_card, open(context, path, 20 + i))
                views.addView(R.id.pw_flipper, card)
            }

            // Under the ring, and today's habits as small bars.
            views.setTextViewText(R.id.pw_ring_sub, when {
                o == null -> ""
                hide -> "Keep going"
                else -> "${kcal(eaten)} of ${kcal(budget)} eaten"
            })
            val habits = listOf(
                Triple("Protein", o?.optInt("protein") ?: 0, o?.optInt("proteinGoal") ?: 0) to "g", // shown as "Protein 63g": the bar shows the goal
                Triple("Greens", o?.optInt("greens") ?: 0, 3) to "",
                Triple("Water", o?.optInt("water") ?: 0, o?.optInt("waterGoal", 8) ?: 8) to "",
            )
            listOf(R.id.pw_h1_text to R.id.pw_h1_bar, R.id.pw_h2_text to R.id.pw_h2_bar, R.id.pw_h3_text to R.id.pw_h3_bar).forEachIndexed { i, (text, bar) ->
                val (h, unit) = habits[i]
                val (label, have, goal) = h
                views.setTextViewText(text, if (o == null || hide) label else if (unit == "g") "$label $have$unit" else "$label $have/$goal")
                views.setProgressBar(bar, 100, if (goal > 0) (have * 100 / goal).coerceIn(0, 100) else 0, false)
            }

            // Buttons.
            val water = o?.optInt("water") ?: 0
            views.setTextViewText(R.id.pw_water, "+ Water  $water/${o?.optInt("waterGoal", 8) ?: 8}")
            views.setContentDescription(R.id.pw_water, "Add a cup of water. $water so far today.")
            views.setOnClickPendingIntent(
                R.id.pw_water,
                PendingIntent.getBroadcast(context, 1, Intent(context, TodayWidget::class.java).setAction(ACTION_WATER), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT),
            )
            views.setOnClickPendingIntent(R.id.pw_snap, open(context, "scan/camera", 2))
            return views
        }

        /** The calorie ring: a soft glow, a mint sweep with a round cap, and the number in the middle. */
        private fun ring(context: Context, size: Int, share: Float, over: Boolean, big: String, small: String): Bitmap {
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val dark = dark(context)
            val stroke = size * 0.1f
            val r = RectF(stroke, stroke, size - stroke, size - stroke)
            val mint = if (dark) 0xFF32D583.toInt() else 0xFF12B76A.toInt()
            val light = 0xFF6CE9A6.toInt()
            val sun = 0xFFFDB022.toInt()
            val track = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = stroke; color = if (dark) 0xFF333741.toInt() else 0xFFEAECF0.toInt() }
            c.drawArc(r, 0f, 360f, false, track)
            val sweep = 360f * share.coerceIn(0.02f, 1f)
            val main = if (over) sun else mint
            val glow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE; strokeWidth = stroke; strokeCap = Paint.Cap.ROUND
                color = main; alpha = 90; maskFilter = BlurMaskFilter(stroke * 0.8f, BlurMaskFilter.Blur.NORMAL)
            }
            c.drawArc(r, -90f, sweep, false, glow)
            val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE; strokeWidth = stroke; strokeCap = Paint.Cap.ROUND
                shader = SweepGradient(size / 2f, size / 2f, intArrayOf(if (over) 0xFFFEDF89.toInt() else light, main, main), floatArrayOf(0f, (sweep / 360f).coerceAtLeast(0.01f), 1f)).also {
                    val m = android.graphics.Matrix(); m.setRotate(-90f, size / 2f, size / 2f); it.setLocalMatrix(m)
                }
            }
            c.drawArc(r, -90f, sweep, false, arc)
            val ink = if (dark) 0xFFF5F5F6.toInt() else 0xFF101828.toInt()
            val muted = if (dark) 0xFF94969C.toInt() else 0xFF475467.toInt()
            val bigPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = if (over) sun else ink; textAlign = Paint.Align.CENTER; typeface = Typeface.create("sans-serif", Typeface.BOLD); letterSpacing = -0.03f
                textSize = size * (if (big.length > 5) 0.2f else 0.24f)
            }
            val smallPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = muted; textAlign = Paint.Align.CENTER; textSize = size * 0.1f; typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL) }
            c.drawText(big, size / 2f, size / 2f + bigPaint.textSize * 0.25f, bigPaint)
            c.drawText(small, size / 2f, size / 2f + bigPaint.textSize * 0.25f + smallPaint.textSize * 1.4f, smallPaint)
            return bmp
        }
    }
}
