package app.platewise.wear

import android.content.Context
import org.json.JSONObject

/** Today's summary as sent by the phone (see mobile/src/wear/WatchBridge.tsx). */
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
    val hide: Boolean,
    val slots: List<Slot>,
) {
    data class Slot(val label: String, val kcal: Int, val titles: List<String>)

    companion object {
        private const val PREFS = "platewise"

        fun parse(json: String): Today? = runCatching {
            val o = JSONObject(json)
            val slots = o.optJSONArray("slots")
            Today(
                date = o.getString("date"),
                left = o.optInt("left"),
                eaten = o.optInt("eaten"),
                budget = o.optInt("budget"),
                share = o.optString("share").ifEmpty { null },
                protein = o.optInt("protein"),
                proteinGoal = o.optInt("proteinGoal"),
                water = o.optInt("water"),
                waterGoal = o.optInt("waterGoal", 8),
                hide = o.optBoolean("hide"),
                slots = (0 until (slots?.length() ?: 0)).map { i ->
                    val s = slots!!.getJSONObject(i)
                    val t = s.optJSONArray("titles")
                    Slot(s.optString("label"), s.optInt("kcal"), (0 until (t?.length() ?: 0)).map { t!!.getString(it) })
                },
            )
        }.getOrNull()

        fun save(context: Context, json: String) =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("today", json).apply()

        fun load(context: Context): Today? =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("today", null)?.let(::parse)

        /** Cups added on the watch for a date (a running count the phone reads). */
        fun watchCups(context: Context, date: String): Int =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt("cups_$date", 0)

        fun setWatchCups(context: Context, date: String, cups: Int) =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("cups_$date", cups).apply()
    }
}
