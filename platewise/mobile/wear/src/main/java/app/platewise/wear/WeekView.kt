package app.platewise.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View

/** The last seven days as bars that grow in one after another; today's bar is brightest. */
class WeekView(context: Context) : View(context) {
    private var days = emptyList<Today.WeekDay>()
    private var hide = false
    private var t = 1f
    private var animator: ValueAnimator? = null
    private val bar = Paint(Paint.ANTI_ALIAS_FLAG)
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply { strokeCap = Paint.Cap.ROUND }
    private val label = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Fonts.semi(context) }
    private val r = RectF()

    fun set(week: List<Today.WeekDay>, hide: Boolean, replay: Boolean) {
        days = week
        this.hide = hide
        if (replay) play() else invalidate()
    }

    fun play() {
        animator?.cancel()
        if (!Motion.enabled) {
            t = 1f
            invalidate()
            return
        }
        animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = Motion.BAR_MS + Motion.STAGGER_MS * 7
            addUpdateListener { t = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        animator?.cancel()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        if (days.isEmpty()) return
        val w = width.toFloat()
        val h = height.toFloat()
        val n = days.size
        val slot = w / n
        val bw = slot * 0.5f
        val labelH = h * 0.16f
        val chartH = h - labelH
        val max = days.maxOf { maxOf(it.kcal, it.budget) }.coerceAtLeast(1).toFloat() * 1.05f
        val total = Motion.BAR_MS + Motion.STAGGER_MS * n
        label.textSize = labelH * 0.62f

        days.forEachIndexed { i, d ->
            val x = slot * i + (slot - bw) / 2
            val start = Motion.STAGGER_MS * i / total.toFloat()
            val p = Motion.EASE_OUT.getInterpolation(((t - start) / (Motion.BAR_MS / total.toFloat())).coerceIn(0f, 1f))
            val today = i == n - 1
            // Track up to the day's plan, then the bar for what was eaten.
            r.set(x, chartH - chartH * d.budget / max, x + bw, chartH)
            bar.color = Palette.LINE.withAlpha(0.7f)
            canvas.drawRoundRect(r, bw / 2, bw / 2, bar)
            val bh = chartH * d.kcal / max * p
            if (bh > 1f) {
                r.set(x, chartH - bh, x + bw, chartH)
                val base = if (d.kcal > d.budget) Palette.SUN else Palette.MINT
                bar.color = if (today) base else base.withAlpha(0.6f)
                canvas.drawRoundRect(r, bw / 2, bw / 2, bar)
            }
            label.color = if (today) Palette.INK else Palette.MUTED
            canvas.drawText(d.day, x + bw / 2, h - labelH * 0.18f, label)
        }
    }
}
