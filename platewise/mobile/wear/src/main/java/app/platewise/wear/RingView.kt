package app.platewise.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient
import android.view.View
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * The day at a glance: three rings (calories, protein, water) that sweep in, with the number in the
 * middle counting up. Over budget the calorie ring turns sun yellow, never red.
 */
class RingView(context: Context) : View(context) {
    private data class Ring(var from: Float = 0f, var to: Float = 0f, val color: Int, val colorEnd: Int)

    private val rings = listOf(
        Ring(color = Palette.MINT_LIGHT, colorEnd = Palette.MINT),
        Ring(color = Palette.GREENS, colorEnd = Palette.GREENS),
        Ring(color = Palette.WATER, colorEnd = Palette.WATER_DEEP),
    )
    private var t = 1f
    private var numberFrom = 0
    private var numberTo = 0
    private var big = ""
    private var label = ""
    private var legend = emptyList<Pair<String, Int>>()
    private var bigIsNumber = true
    private var over = false
    private var animator: ValueAnimator? = null

    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val glow = Paint(Paint.ANTI_ALIAS_FLAG)
    private val bigPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.heavy(context); letterSpacing = -0.03f }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.semi(context); color = Palette.INK }
    private val subPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.body(context); color = Palette.MUTED }
    private val oval = RectF()
    private val m = Matrix()

    fun set(today: Today, replay: Boolean) {
        over = today.over
        val kcalP = if (today.budget > 0) today.eaten.toFloat() / today.budget else 0f
        val targets = listOf(
            kcalP.coerceIn(0f, 1f),
            if (today.proteinGoal > 0) (today.protein.toFloat() / today.proteinGoal).coerceIn(0f, 1f) else 0f,
            if (today.waterGoal > 0) (today.water.toFloat() / today.waterGoal).coerceIn(0f, 1f) else 0f,
        )
        rings.forEachIndexed { i, r ->
            r.from = if (replay) 0f else current(r)
            r.to = targets[i]
        }
        if (today.hide) {
            bigIsNumber = false
            big = today.share ?: "Today"
            label = "of today's plan"
        } else {
            bigIsNumber = true
            numberFrom = if (replay) 0 else numberTo
            numberTo = if (over) today.eaten - today.budget else today.left
            label = if (over) "kcal above plan" else "kcal left"
        }
        legend = listOf(
            "Protein ${today.protein} of ${today.proteinGoal} g" to Palette.GREENS,
            "Water ${today.water} of ${today.waterGoal} cups" to Palette.WATER,
        )
        play()
    }

    private fun current(r: Ring) = r.from + (r.to - r.from) * Motion.EASE_OUT.getInterpolation(t)

    fun play() {
        animator?.cancel()
        if (!Motion.enabled) {
            t = 1f
            invalidate()
            return
        }
        t = 0f
        animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = Motion.RING_MS
            addUpdateListener { t = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        animator?.cancel()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val size = min(width, height).toFloat()
        val cx = width / 2f
        val cy = height / 2f
        val outerStroke = size * 0.062f
        val stroke = size * 0.045f
        val gap = size * 0.018f
        var radius = size / 2f - outerStroke / 2f - size * 0.03f

        rings.forEachIndexed { i, r ->
            val w = if (i == 0) outerStroke else stroke
            if (i > 0) radius -= (if (i == 1) outerStroke / 2 else stroke / 2) + gap + w / 2
            oval.set(cx - radius, cy - radius, cx + radius, cy + radius)
            val start = if (i == 0 && over) Palette.SUN else r.color
            val end = if (i == 0 && over) Palette.SUN else r.colorEnd
            track.strokeWidth = w
            track.color = r.color.withAlpha(0.16f)
            canvas.drawArc(oval, 0f, 360f, false, track)

            val p = current(r)
            if (p <= 0.002f) return@forEachIndexed
            val sweep = 360f * p
            arc.strokeWidth = w
            arc.shader = SweepGradient(cx, cy, intArrayOf(start, end, end), floatArrayOf(0f, p.coerceAtLeast(0.01f), 1f)).also {
                m.setRotate(-90f, cx, cy)
                it.setLocalMatrix(m)
            }
            canvas.drawArc(oval, -90f, sweep, false, arc)

            // A soft glow on the leading end, so the ring reads as moving.
            val a = Math.toRadians((-90f + sweep).toDouble())
            val ex = cx + radius * cos(a).toFloat()
            val ey = cy + radius * sin(a).toFloat()
            glow.color = end.withAlpha(0.35f * (1f - (t - 0.85f).coerceAtLeast(0f) * 4f).coerceIn(0.25f, 1f))
            canvas.drawCircle(ex, ey, w * 0.95f, glow)
            glow.color = Palette.INK.withAlpha(0.9f)
            canvas.drawCircle(ex, ey, w * 0.18f, glow)
        }

        // Centre: the number counts up with the rings.
        val e = if (Motion.enabled) Motion.EASE_OUT.getInterpolation((t * Motion.RING_MS / Motion.COUNT_MS).coerceAtMost(1f)) else 1f
        val text = if (bigIsNumber) kcalText((numberFrom + (numberTo - numberFrom) * e).toInt()) else big
        bigPaint.textSize = if (bigIsNumber) size * 0.15f else size * 0.075f
        bigPaint.color = if (over) Palette.SUN else Palette.INK
        bigPaint.alpha = (255 * (0.4f + 0.6f * e)).toInt()
        val baseline = cy - size * 0.01f
        canvas.drawText(text, cx, baseline, bigPaint)
        labelPaint.textSize = size * 0.048f
        canvas.drawText(label, cx, baseline + labelPaint.textSize * 1.4f, labelPaint)
        // Legend in the ring colours, so the inner rings explain themselves.
        subPaint.textSize = size * 0.04f
        legend.forEachIndexed { i, (txt, color) ->
            val y = baseline + labelPaint.textSize * 1.4f + subPaint.textSize * (1.7f + 1.35f * i)
            val w = subPaint.measureText(txt)
            glow.color = color
            canvas.drawCircle(cx - w / 2 - subPaint.textSize * 0.6f, y - subPaint.textSize * 0.33f, subPaint.textSize * 0.28f, glow)
            canvas.drawText(txt, cx + subPaint.textSize * 0.2f, y, subPaint)
        }
    }
}
