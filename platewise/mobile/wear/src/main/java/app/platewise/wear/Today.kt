package app.platewise.wear

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject
import java.util.UUID

/** Today's summary as sent by the phone (see mobile/src/wear/payload.ts). */
data class Today(
    val date: String,
    val left: Int,
    val eaten: Int,
    val budget: Int,
    val share: String?,
    val protein: Int,
    val proteinGoal: Int,
    val water: Int,
    val waterGoal: Int,
    val steps: Int,
    val hide: Boolean,
    val streak: Int,
    val slots: List<Slot>,
    val week: List<WeekDay>,
    val quick: List<Quick>,
    val signals: Signals = Signals(),
) {
    data class Slot(val label: String, val kcal: Int, val titles: List<String>)

    /** Body signals, the summary, the fasting window and a meal idea (mobile/src/wear/signals.ts). */
    data class Signals(
        val stressLevel: String? = null,
        val stressWord: String = "Check in",
        val stressTip: String = "How do you feel? Tap a number.",
        val checkIn: Int? = null,
        val sugar: Sugar? = null,
        val restingHr: Int? = null,
        val hrv: Int? = null,
        val reportTitle: String = "Today so far",
        val urgent: String? = null,
        val lines: List<Line> = emptyList(),
        val next: List<String> = emptyList(),
        val fast: Fast? = null,
        val idea: Idea? = null,
    )
    data class Sugar(val mmol: Double, val usual: Boolean, val urgent: String?)
    data class Line(val label: String, val text: String, val good: Boolean)
    data class Fast(val eatFromMin: Int, val eatHours: Int) {
        data class State(val eating: Boolean, val progress: Float, val minutesLeft: Int)

        /** Eating or fasting at this minute of the day, how far through, and how long is left. */
        fun at(minuteOfDay: Int): State {
            val eatMin = eatHours * 60
            val delta = ((minuteOfDay - eatFromMin) % 1440 + 1440) % 1440
            return if (delta < eatMin) State(true, delta / eatMin.toFloat(), eatMin - delta)
            else (1440 - eatMin).let { len -> State(false, (delta - eatMin) / len.toFloat(), len - (delta - eatMin)) }
        }

        fun now(): State = java.util.Calendar.getInstance().let { at(it.get(java.util.Calendar.HOUR_OF_DAY) * 60 + it.get(java.util.Calendar.MINUTE)) }

        val eatUntilMin get() = (eatFromMin + eatHours * 60) % 1440
    }
    data class Idea(val slot: String, val name: String, val kcal: Int?, val parts: List<String>)
    data class WeekDay(val day: String, val kcal: Int, val budget: Int)
    data class Quick(val ref: String, val title: String, val kcal: Int)

    val over get() = eaten > budget

    companion object {
        private const val PREFS = "platewise"

        private fun <T> JSONObject.list(key: String, f: (JSONObject) -> T): List<T> {
            val a = optJSONArray(key) ?: return emptyList()
            return (0 until a.length()).map { f(a.getJSONObject(it)) }
        }

        fun parse(json: String): Today? = runCatching {
            val o = JSONObject(json)
            Today(
                date = o.getString("date"),
                left = o.optInt("left"),
                eaten = o.optInt("eaten"),
                budget = o.optInt("budget"),
                share = o.optString("share").ifEmpty { null }.takeIf { it != "null" },
                protein = o.optInt("protein"),
                proteinGoal = o.optInt("proteinGoal"),
                water = o.optInt("water"),
                waterGoal = o.optInt("waterGoal", 8),
                steps = o.optInt("steps"),
                hide = o.optBoolean("hide"),
                streak = o.optInt("streak"),
                slots = o.list("slots") { s ->
                    val t = s.optJSONArray("titles")
                    Slot(s.optString("label"), s.optInt("kcal"), (0 until (t?.length() ?: 0)).map { t!!.getString(it) })
                },
                week = o.list("week") { WeekDay(it.optString("day"), it.optInt("kcal"), it.optInt("budget")) },
                quick = o.list("quick") { Quick(it.optString("ref"), it.optString("title"), it.optInt("kcal")) },
                signals = o.optJSONObject("signals")?.let(::signals) ?: Signals(),
            )
        }.getOrNull()

        private fun JSONObject.str(key: String): String? = if (isNull(key)) null else optString(key).ifEmpty { null }
        private fun JSONObject.int(key: String): Int? = if (isNull(key) || !has(key)) null else optInt(key)
        private fun JSONObject.strings(key: String): List<String> {
            val a = optJSONArray(key) ?: return emptyList()
            return (0 until a.length()).map { a.getString(it) }
        }

        private fun signals(o: JSONObject): Signals {
            val stress = o.optJSONObject("stress")
            val report = o.optJSONObject("report")
            val heart = o.optJSONObject("heart")
            return Signals(
                stressLevel = stress?.str("level"),
                stressWord = stress?.str("word") ?: "Check in",
                stressTip = stress?.str("tip") ?: "",
                checkIn = stress?.int("checkIn"),
                sugar = o.optJSONObject("sugar")?.let { Sugar(it.optDouble("mmol"), it.optBoolean("usual", true), it.str("urgent")) },
                restingHr = heart?.int("resting"),
                hrv = heart?.int("hrv"),
                reportTitle = report?.str("title") ?: "Today so far",
                urgent = report?.str("urgent"),
                lines = report?.list("lines") { Line(it.optString("label"), it.optString("text"), it.optBoolean("good")) } ?: emptyList(),
                next = report?.strings("next") ?: emptyList(),
                fast = o.optJSONObject("fast")?.let { f ->
                    val (h, m) = f.optString("eatFrom", "08:00").split(":").map { it.toIntOrNull() ?: 0 } + listOf(0, 0)
                    Fast(h * 60 + m, f.optInt("eatHours", 12))
                },
                idea = o.optJSONObject("idea")?.let { Idea(it.optString("slot"), it.optString("name"), it.int("kcal"), it.strings("parts")) },
            )
        }

        private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        fun save(context: Context, json: String) = prefs(context).edit().putString("today", json).apply()

        fun load(context: Context): Today? = prefs(context).getString("today", null)?.let(::parse)

        /** Change the stored summary right away, before the phone confirms (it overwrites it later). */
        private fun edit(context: Context, f: (JSONObject) -> Unit) {
            val raw = prefs(context).getString("today", null) ?: return
            val o = runCatching { JSONObject(raw) }.getOrNull() ?: return
            f(o)
            save(context, o.toString())
        }

        /** Cups added on the watch for a date (a running count the phone reads). */
        fun watchCups(context: Context, date: String): Int = prefs(context).getInt("cups_$date", 0)

        /** Tell everything showing today's numbers to redraw: the app, the tile and the watch-face complication. */
        fun refreshAll(context: Context) {
            TileService.getUpdater(context).requestUpdate(KcalTileService::class.java)
            TileService.getUpdater(context).requestUpdate(SignalsTileService::class.java)
            listOf(KcalComplicationService::class.java, StressComplicationService::class.java, SugarComplicationService::class.java, FastComplicationService::class.java, SummaryComplicationService::class.java)
                .forEach { ComplicationDataSourceUpdateRequester.create(context, ComponentName(context, it)).requestUpdateAll() }
            context.sendBroadcast(Intent(TodayListenerService.ACTION_TODAY).setPackage(context.packageName))
        }

        /**
         * One more cup of water. The watch counts only its own taps per day (the phone adds whatever
         * is new), so cups logged on the phone are never counted twice.
         */
        fun addWater(context: Context): Int? {
            val t = load(context) ?: return null
            val cups = watchCups(context, t.date) + 1
            prefs(context).edit().putInt("cups_${t.date}", cups).apply()
            edit(context) { it.put("water", t.water + 1) }
            val req = PutDataMapRequest.create("/platewise/water/${t.date}").apply {
                dataMap.putInt("cups", cups)
                dataMap.putLong("at", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(context).putDataItem(req)
            refreshAll(context)
            return cups
        }

        /** A stress check-in (1 to 5) tapped on the watch. Travels like a meal log; the phone records it. */
        fun checkIn(context: Context, level: Int) {
            val now = System.currentTimeMillis()
            val req = PutDataMapRequest.create("/platewise/log/${UUID.randomUUID()}").apply {
                dataMap.putString("ref", "stress:$level:$now")
                dataMap.putLong("at", now)
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(context).putDataItem(req)
            edit(context) { o ->
                val sig = o.optJSONObject("signals") ?: JSONObject().also { o.put("signals", it) }
                val st = sig.optJSONObject("stress") ?: JSONObject().also { sig.put("stress", it) }
                st.put("checkIn", level)
                val lvl = when { level <= 2 -> "calm"; level == 3 -> "usual"; else -> "raised" }
                st.put("level", lvl)
                st.put("word", mapOf("calm" to "Calm", "usual" to "About usual", "raised" to "Some strain")[lvl])
            }
            refreshAll(context)
        }

        /** Log a meal again from the watch. The phone adds it when it next sees the request. */
        fun logAgain(context: Context, q: Quick) {
            val req = PutDataMapRequest.create("/platewise/log/${UUID.randomUUID()}").apply {
                dataMap.putString("ref", q.ref)
                dataMap.putLong("at", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(context).putDataItem(req)
            edit(context) {
                val eaten = it.optInt("eaten") + q.kcal
                it.put("eaten", eaten)
                it.put("left", maxOf(0, it.optInt("budget") - eaten))
                val week = it.optJSONArray("week")
                if (week != null && week.length() > 0) {
                    val last = week.getJSONObject(week.length() - 1)
                    last.put("kcal", last.optInt("kcal") + q.kcal)
                }
            }
            refreshAll(context)
        }
    }
}
