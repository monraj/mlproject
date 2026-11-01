package app.platewise.wear

import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent

/** Where watch-face shortcuts and tiles land: a page of the watch app, or Gemini on the watch. */
object Shortcuts {
    const val EXTRA_PAGE = "page"
    const val RING = "ring"
    const val SIGNALS = "signals"
    const val SUMMARY = "summary"
    const val PLAN = "plan"
    const val WATER = "water"

    fun page(context: Context, page: String): Intent =
        Intent(context, MainActivity::class.java).putExtra(EXTRA_PAGE, page).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    fun pageTap(context: Context, page: String): PendingIntent =
        PendingIntent.getActivity(context, page.hashCode(), page(context, page), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    /**
     * Gemini on the Pixel Watch. Opening it sends nothing from PlateWise: the person asks whatever
     * they choose, by voice, under Google's own terms.
     */
    private const val GEMINI = "com.google.android.wearable.assistant"

    fun gemini(context: Context): Intent =
        context.packageManager.getLaunchIntentForPackage(GEMINI)?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ?: Intent(Intent.ACTION_VOICE_COMMAND).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    fun openGemini(context: Context): Boolean = try {
        context.startActivity(gemini(context))
        true
    } catch (_: ActivityNotFoundException) {
        try {
            context.startActivity(Intent(Intent.ACTION_ASSIST).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    fun geminiTap(context: Context): PendingIntent =
        PendingIntent.getActivity(context, 7, gemini(context), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
}
