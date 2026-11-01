package app.platewise.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Typeface
import android.view.animation.PathInterpolator
import androidx.core.content.res.ResourcesCompat

/** Fresh mint, dark (CLAUDE.md design tokens): the watch is always dark. */
object Palette {
    const val BG = 0xFF000000.toInt()
    const val SURFACE = 0xFF161B26.toInt()
    const val RAISED = 0xFF1F242F.toInt()
    const val LINE = 0xFF333741.toInt()
    const val INK = 0xFFF5F5F6.toInt()
    const val MUTED = 0xFF94969C.toInt()
    const val MINT = 0xFF32D583.toInt()
    const val MINT_LIGHT = 0xFF6CE9A6.toInt()
    const val MINT_TINT = 0xFF053321.toInt()
    const val SUN = 0xFFFDB022.toInt() // over budget: yellow, never red (CLAUDE.md rule 9)
    const val GREENS = 0xFFB8D86B.toInt()
    const val WATER = 0xFF53B1FD.toInt()
    const val WATER_DEEP = 0xFF2E90FA.toInt()
}

/** Motion tokens, matching mobile/src/lib/motion.ts in spirit: quick, eased, never blocking. */
object Motion {
    val EASE_OUT = PathInterpolator(0.2f, 0f, 0f, 1f)
    val EASE_SPRING = PathInterpolator(0.34f, 1.4f, 0.64f, 1f)
    const val RING_MS = 1100L
    const val COUNT_MS = 900L
    const val BAR_MS = 650L
    const val STAGGER_MS = 45L
    const val WATER_MS = 700L

    /** Off when the person turned animations off (Reduce Motion): show the final state instead (CLAUDE.md rule 8). */
    val enabled get() = ValueAnimator.areAnimatorsEnabled()
}

object Fonts {
    private var cache: Triple<Typeface, Typeface, Typeface>? = null
    private fun load(c: Context) = cache ?: Triple(
        ResourcesCompat.getFont(c, R.font.jakarta_extrabold) ?: Typeface.DEFAULT_BOLD,
        ResourcesCompat.getFont(c, R.font.jakarta_semibold) ?: Typeface.DEFAULT_BOLD,
        ResourcesCompat.getFont(c, R.font.jakarta_medium) ?: Typeface.DEFAULT,
    ).also { cache = it }

    fun heavy(c: Context) = load(c).first
    fun semi(c: Context) = load(c).second
    fun body(c: Context) = load(c).third
}

fun Int.withAlpha(a: Float): Int = (this and 0x00FFFFFF) or ((a.coerceIn(0f, 1f) * 255).toInt() shl 24)

fun kcalText(n: Int) = "%,d".format(n)
