package app.platewise.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import android.view.animation.LinearInterpolator
import kotlin.math.PI
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

/** Water so far as a filling glass: a gentle wave, a springy rise and bubbles when a cup is added. */
class WaterView(context: Context) : View(context) {
    private var level = 0f
    private var levelFrom = 0f
    private var levelTo = 0f
    private var cups = 0
    private var goal = 8
    private var phase = 0f
    private var bubbles = emptyList<FloatArray>() // x share, size share, delay
    private var bubbleT = 1f

    private var rise: ValueAnimator? = null
    private var wave: ValueAnimator? = null
    private var pop: ValueAnimator? = null

    private val clip = Path()
    private val path = Path()
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val dot = Paint(Paint.ANTI_ALIAS_FLAG)
    private val big = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.heavy(context); color = Palette.INK; letterSpacing = -0.03f }
    private val small = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.semi(context); color = Palette.INK }

    fun set(cups: Int, goal: Int, replay: Boolean) {
        val added = cups > this.cups && !replay
        this.cups = cups
        this.goal = goal.coerceAtLeast(1)
        levelFrom = if (replay) 0f else level
        levelTo = (cups.toFloat() / this.goal).coerceIn(0f, 1f)
        if (!Motion.enabled) {
            level = levelTo
            invalidate()
            return
        }
        rise?.cancel()
        rise = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = Motion.WATER_MS
            interpolator = if (added) Motion.EASE_SPRING else Motion.EASE_OUT
            addUpdateListener { level = levelFrom + (levelTo - levelFrom) * (it.animatedValue as Float); invalidate() }
            start()
        }
        if (added) bubbleBurst()
        startWave()
    }

    private fun bubbleBurst() {
        bubbles = List(7) { floatArrayOf(0.25f + Random.nextFloat() * 0.5f, 0.012f + Random.nextFloat() * 0.018f, Random.nextFloat() * 0.35f) }
        pop?.cancel()
        pop = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1100
            addUpdateListener { bubbleT = it.animatedValue as Float }
            start()
        }
    }

    /** The wave moves for a few seconds after a change, then rests (saves battery). */
    private fun startWave() {
        wave?.cancel()
        wave = ValueAnimator.ofFloat(0f, 6f).apply {
            duration = 4500
            interpolator = LinearInterpolator()
            addUpdateListener { phase = it.animatedValue as Float * 2f * PI.toFloat(); invalidate() }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        listOf(rise, wave, pop).forEach { it?.cancel() }
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val size = min(width, height).toFloat()
        val cx = width / 2f
        // Sits above the "+ Cup" button, which overlaps the bottom of the round screen.
        val cy = height * 0.4f
        val r = size * 0.27f
        clip.reset()
        clip.addCircle(cx, cy, r, Path.Direction.CW)

        ring.strokeWidth = size * 0.012f
        ring.color = Palette.WATER.withAlpha(0.35f)
        canvas.drawCircle(cx, cy, r + size * 0.02f, ring)
        fill.color = Palette.WATER.withAlpha(0.08f)
        canvas.drawCircle(cx, cy, r, fill)

        canvas.save()
        canvas.clipPath(clip)
        val top = cy + r - 2 * r * level
        // Calm the wave as the glass gets full or empty, so it never spills over the rim.
        val amp = size * 0.022f * (0.4f + 0.6f * sin(PI.toFloat() * level.coerceIn(0.05f, 0.95f)))
        for ((k, color) in listOf(0.55f to Palette.WATER_DEEP.withAlpha(0.55f), 0f to Palette.WATER.withAlpha(0.9f))) {
            path.reset()
            path.moveTo(cx - r, cy + r)
            var x = cx - r
            while (x <= cx + r + 4) {
                val y = top + amp * sin((x - cx) / r * 2.2f + phase + k * 3f)
                path.lineTo(x, y)
                x += 6f
            }
            path.lineTo(cx + r, cy + r)
            path.close()
            fill.color = color
            canvas.drawPath(path, fill)
        }
        if (bubbleT < 1f) {
            bubbles.forEach { (xs, sz, delay) ->
                val p = ((bubbleT - delay) / (1f - delay)).coerceIn(0f, 1f)
                if (p <= 0f || p >= 1f) return@forEach
                dot.color = Palette.INK.withAlpha(0.55f * (1f - p))
                canvas.drawCircle(cx - r + 2 * r * xs, cy + r - (cy + r - top + size * 0.05f) * p, size * sz, dot)
            }
        }
        canvas.restore()

        // Cup ticks around the rim: one per cup of the goal, lit as they fill.
        for (i in 0 until goal) {
            val a = (-90f + 360f * i / goal) * PI.toFloat() / 180f
            val d = r + size * 0.065f
            dot.color = if (i < cups) Palette.WATER else Palette.LINE
            canvas.drawCircle(cx + d * kotlin.math.cos(a), cy + d * sin(a), size * 0.013f, dot)
        }

        big.textSize = size * 0.16f
        canvas.drawText("$cups", cx, cy + big.textSize * 0.15f, big)
        small.textSize = size * 0.048f
        canvas.drawText("of $goal cups", cx, cy + big.textSize * 0.15f + small.textSize * 1.5f, small)
    }
}
