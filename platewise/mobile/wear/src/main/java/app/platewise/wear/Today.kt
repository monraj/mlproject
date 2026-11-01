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
) {
    data class Slot(val label: String, val kcal: Int, val titles: List<String>)
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
            )
        }.getOrNull()

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
            ComplicationDataSourceUpdateRequester.create(context, ComponentName(context, KcalComplicationService::class.java)).requestUpdateAll()
            context.sendBroadcast(Intent(TodayListenerService.ACTION_TODAY).setPackage(context.packageName))
        }

        /** One more cup of water. A running count per day; the phone adds whatever is new. */
        fun addWater(context: Context): Int? {
            val t = load(context) ?: return null
            val cups = maxOf(t.water, watchCups(context, t.date)) + 1
            prefs(context).edit().putInt("cups_${t.date}", cups).apply()
            edit(context) { it.put("water", cups) }
            val req = PutDataMapRequest.create("/platewise/water/${t.date}").apply {
                dataMap.putInt("cups", cups)
                dataMap.putLong("at", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(context).putDataItem(req)
            refreshAll(context)
            return cups
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
