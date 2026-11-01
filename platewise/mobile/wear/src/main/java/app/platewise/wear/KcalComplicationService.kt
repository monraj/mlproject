package app.platewise.wear

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest

/** Watch-face complication: calories left (or the day's share in hide-numbers mode), as a ring or short text. */
class KcalComplicationService : ComplicationDataSourceService() {
    override fun onComplicationRequest(request: ComplicationRequest, listener: ComplicationRequestListener) {
        listener.onComplicationData(build(request.complicationType, Today.load(this)))
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        build(type, Today("", 1240, 530, 1770, null, 40, 111, 3, 8, 0, false, 0, emptyList(), emptyList(), emptyList()))

    private fun plain(s: String) = PlainComplicationText.Builder(s).build()

    private fun build(type: ComplicationType, t: Today?): ComplicationData? {
        val tap = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val value = when {
            t == null -> "—"
            t.hide -> t.share ?: "—"
            t.over -> "+" + kcalText(t.eaten - t.budget)
            else -> kcalText(t.left)
        }
        val title = if (t?.hide == true) "today" else if (t?.over == true) "over" else "left"
        val desc = plain(if (t == null) "PlateWise: open the phone app" else "PlateWise: $value $title")
        return when (type) {
            ComplicationType.RANGED_VALUE -> {
                val budget = (t?.budget ?: 1).coerceAtLeast(1).toFloat()
                RangedValueComplicationData.Builder((t?.eaten ?: 0).toFloat().coerceAtMost(budget), 0f, budget, desc)
                    .setText(plain(value))
                    .setTitle(plain(title))
                    .setTapAction(tap)
                    .build()
            }
            ComplicationType.SHORT_TEXT ->
                ShortTextComplicationData.Builder(plain(value), desc).setTitle(plain(title)).setTapAction(tap).build()
            else -> null
        }
    }
}
