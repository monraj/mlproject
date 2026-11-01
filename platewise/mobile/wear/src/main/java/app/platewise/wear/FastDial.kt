package app.platewise.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * The day as a 24-hour dial: the eating window is a mint arc, the fast a calm blue one, and a bright
 * dot marks now. The arcs draw themselves in; the dot glows softly.
 */
class FastDial(context: Context) : View(context) {
    private var fast: Today.Fast? = null
    private var t = 1f
    private var glow = 0f
    private var draw: ValueAnimator? = null
    private var pulse: ValueAnimator? = null
    private val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val tick = Paint(Paint.ANTI_ALIAS_FLAG)
    private val dot = Paint(Paint.ANTI_ALIAS_FLAG)
    private val big = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.heavy(context); color = Palette.INK; letterSpacing = -0.03f }
    private val small = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.semi(context); color = Palette.MUTED }
    private val oval = RectF()

    fun set(f: Today.Fast?, replay: Boolean) {
        fast = f
        if (replay && Motion.enabled) {
            draw?.cancel()
            draw = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = Motion.RING_MS
                interpolator = Motion.EASE_OUT
                addUpdateListener { t = it.animatedValue as Float; invalidate() }
                start()
            }
        } else t = 1f
        invalidate()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!Motion.enabled) return
        pulse = ValueAnimator.ofFloat(0f, 1f, 0f).apply {
            duration = 2400
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener { glow = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        pulse?.cancel()
        draw?.cancel()
        super.onDetachedFromWindow()
    }

    private fun angle(minute: Int) = minute / 1440f * 360f - 90f // midnight at the top

    override fun onDraw(canvas: Canvas) {
        val f = fast ?: return
        val cx = width / 2f
        val cy = height / 2f
        val r = min(width, height) / 2f * 0.84f
        val stroke = r * 0.13f
        oval.set(cx - r, cy - r, cx + r, cy + r)
        // Hour ticks.
        for (h in 0 until 24) {
            val a = Math.toRadians(angle(h * 60).toDouble())
            tick.color = if (h % 6 == 0) Palette.MUTED else Palette.LINE
            val rr = r - stroke * 1.2f
            canvas.drawCircle(cx + (rr * cos(a)).toFloat(), cy + (rr * sin(a)).toFloat(), if (h % 6 == 0) stroke * 0.14f else stroke * 0.08f, tick)
        }
        val eatSweep = f.eatHours * 15f
        arc.strokeWidth = stroke
        arc.color = Palette.WATER_DEEP.withAlpha(0.45f)
        canvas.drawArc(oval, angle(f.eatUntilMin) + 3f, (360f - eatSweep - 6f) * t, false, arc)
        arc.color = Palette.MINT
        canvas.drawArc(oval, angle(f.eatFromMin), eatSweep * t, false, arc)
        // Now.
        val st = f.now()
        val cal = java.util.Calendar.getInstance()
        val nowMin = cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)
        val a = Math.toRadians(angle(nowMin).toDouble())
        val px = cx + (r * cos(a)).toFloat()
        val py = cy + (r * sin(a)).toFloat()
        dot.color = Palette.INK.withAlpha(0.25f * glow)
        canvas.drawCircle(px, py, stroke * (0.9f + 0.4f * glow), dot)
        dot.color = Palette.INK
        canvas.drawCircle(px, py, stroke * 0.55f, dot)
        // Middle.
        val h = st.minutesLeft / 60
        val m = st.minutesLeft % 60
        big.textSize = r * 0.36f
        small.textSize = r * 0.13f
        small.color = if (st.eating) Palette.MINT else Palette.WATER
        canvas.drawText(if (st.eating) "EATING" else "FASTING", cx, cy - r * 0.3f, small)
        canvas.drawText(if (h > 0) "${h}h ${m}m" else "${m}m", cx, cy + r * 0.12f, big)
        small.color = Palette.MUTED
        canvas.drawText(if (st.eating) "until ${hhmm(f.eatUntilMin)}" else "eat from ${hhmm(f.eatFromMin)}", cx, cy + r * 0.35f, small)
    }

    private fun hhmm(min: Int) = "%02d:%02d".format(min / 60, min % 60)
}
