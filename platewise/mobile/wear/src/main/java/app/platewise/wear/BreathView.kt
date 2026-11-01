package app.platewise.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.view.View
import android.view.animation.LinearInterpolator
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * A breathing orb: it grows for 4 s (breathe in) and shrinks for 6 s (breathe out), a slow pace that
 * calms most people. Six petals drift around it. Mint when calm, sun yellow under strain.
 */
class BreathView(context: Context) : View(context) {
    private var t = 0f // 0..1 over one 10 s breath
    private var color = Palette.MINT
    private var anim: ValueAnimator? = null
    private val orb = Paint(Paint.ANTI_ALIAS_FLAG)
    private val petal = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }

    fun set(raised: Boolean) {
        color = if (raised) Palette.SUN else Palette.MINT
        invalidate()
    }

    /** 0 = breathed out, 1 = breathed in. Eased in over the first 40%, out over the rest. */
    private fun breath(): Float {
        val x = if (t < 0.4f) t / 0.4f else 1f - (t - 0.4f) / 0.6f
        return (0.5f - 0.5f * cos(PI * x)).toFloat()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!Motion.enabled) { t = 0.4f; return } // show the orb full, still
        anim = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 10_000
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener { t = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        anim?.cancel()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val cx = width / 2f
        val cy = height / 2f
        val max = min(width, height) / 2f
        val b = breath()
        val r = max * (0.42f + 0.22f * b)
        // Petals: soft circles around the orb that open out as you breathe in and turn slowly.
        val spin = (t * 60f + b * 20f) * (PI / 180f).toFloat()
        for (i in 0 until 6) {
            val a = spin + i * (PI / 3).toFloat()
            val d = r * (0.35f + 0.45f * b)
            petal.color = color.withAlpha(0.16f + 0.1f * b)
            canvas.drawCircle(cx + d * cos(a), cy + d * sin(a), r * 0.62f, petal)
        }
        orb.shader = RadialGradient(cx, cy - r * 0.2f, r, intArrayOf(Palette.MINT_LIGHT.takeIf { color == Palette.MINT } ?: 0xFFFEDF89.toInt(), color), floatArrayOf(0f, 1f), Shader.TileMode.CLAMP)
        canvas.drawCircle(cx, cy, r * 0.7f, orb)
        ring.color = color.withAlpha(0.35f * (1f - b) + 0.1f)
        ring.strokeWidth = max * 0.02f
        canvas.drawCircle(cx, cy, r * (0.9f + 0.25f * (1f - b)), ring)
    }

    val phaseText get() = if (!Motion.enabled) "Breathe slowly" else if (t < 0.4f) "Breathe in" else "Breathe out"
}
