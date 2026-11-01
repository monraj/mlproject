package app.platewise.wear

import android.app.PendingIntent
import android.graphics.drawable.Icon
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.MonochromaticImage
import androidx.wear.watchface.complications.data.MonochromaticImageComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest

/**
 * Shortcuts for any watch face (and the PlateWise face): each shows one thing at a glance and opens
 * its page in the watch app. Short text, plus a small icon where the face has room for one.
 */
abstract class ShortcutComplication : ComplicationDataSourceService() {
    protected abstract val icon: Int
    protected abstract fun tap(): PendingIntent
    /** Value, title and a spoken description. */
    protected abstract fun show(t: Today?): Triple<String, String, String>
    /** For RANGED_VALUE: progress 0..1, or null if this shortcut has no progress. */
    protected open fun progress(t: Today?): Float? = null

    override fun onComplicationRequest(request: ComplicationRequest, listener: ComplicationRequestListener) {
        listener.onComplicationData(build(request.complicationType, Today.load(this)))
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? = build(type, null, preview = true)

    protected open fun previewText(): Triple<String, String, String> = show(null)

    private fun plain(s: String) = PlainComplicationText.Builder(s).build()

    private fun build(type: ComplicationType, t: Today?, preview: Boolean = false): ComplicationData? {
        val (value, title, said) = if (preview) previewText() else show(t)
        val image = MonochromaticImage.Builder(Icon.createWithResource(this, icon)).build()
        return when (type) {
            ComplicationType.SHORT_TEXT -> ShortTextComplicationData.Builder(plain(value), plain(said)).setTitle(plain(title)).setMonochromaticImage(image).setTapAction(tap()).build()
            ComplicationType.MONOCHROMATIC_IMAGE -> MonochromaticImageComplicationData.Builder(image, plain(said)).setTapAction(tap()).build()
            ComplicationType.RANGED_VALUE -> {
                val p = (if (preview) 0.6f else progress(t)) ?: return null
                RangedValueComplicationData.Builder(p.coerceIn(0f, 1f) * 100f, 0f, 100f, plain(said))
                    .setText(plain(value)).setTitle(plain(title)).setMonochromaticImage(image).setTapAction(tap()).build()
            }
            else -> null
        }
    }
}

class StressComplicationService : ShortcutComplication() {
    override val icon = R.drawable.ic_breath
    override fun tap() = Shortcuts.pageTap(this, Shortcuts.SIGNALS)
    override fun show(t: Today?): Triple<String, String, String> {
        val s = t?.signals ?: return Triple("Calm?", "stress", "Stress check-in")
        val word = when (s.stressLevel) { "calm" -> "Calm"; "usual" -> "Usual"; "raised" -> "Strain"; else -> "Check" }
        return Triple(word, "stress", "Stress: ${s.stressWord}. Tap to check in or breathe.")
    }
    override fun previewText() = Triple("Calm", "stress", "Stress")
}

class SugarComplicationService : ShortcutComplication() {
    override val icon = R.drawable.ic_drop
    override fun tap() = Shortcuts.pageTap(this, Shortcuts.SIGNALS)
    override fun show(t: Today?): Triple<String, String, String> {
        val g = t?.signals?.sugar ?: return Triple("Add", "sugar", "Blood sugar: no reading today. Tap to see body signals.")
        val v = "%.1f".format(g.mmol)
        return Triple(if (g.urgent != null) "$v!" else v, "mmol", "Blood sugar $v millimoles per litre" + (g.urgent?.let { ". $it" } ?: ""))
    }
    override fun previewText() = Triple("5.4", "mmol", "Blood sugar")
}

class FastComplicationService : ShortcutComplication() {
    override val icon = R.drawable.ic_clock
    override fun tap() = Shortcuts.pageTap(this, Shortcuts.PLAN)
    override fun progress(t: Today?) = t?.signals?.fast?.now()?.progress ?: 0f
    override fun show(t: Today?): Triple<String, String, String> {
        val f = t?.signals?.fast ?: return Triple("Plan", "food", "Fasting is off. Tap for today's meal idea.")
        val st = f.now()
        val left = if (st.minutesLeft >= 60) "${st.minutesLeft / 60}h" else "${st.minutesLeft}m"
        return Triple(left, if (st.eating) "eat" else "fast", if (st.eating) "Eating window: $left left" else "Fasting: $left to go")
    }
    override fun previewText() = Triple("5h", "fast", "Fasting")
}

class SummaryComplicationService : ShortcutComplication() {
    override val icon = R.drawable.ic_spark
    override fun tap() = Shortcuts.pageTap(this, Shortcuts.SUMMARY)
    override fun show(t: Today?) = Triple("Day", "summary", t?.signals?.reportTitle?.let { "$it. Tap to read." } ?: "Today's summary")
}

/** Opens Gemini on the watch. Sends nothing from PlateWise; the person decides what to ask. */
class GeminiComplicationService : ShortcutComplication() {
    override val icon = R.drawable.ic_gemini
    override fun tap(): PendingIntent = Shortcuts.geminiTap(this)
    override fun show(t: Today?) = Triple("Ask", "Gemini", "Ask Gemini")
}
