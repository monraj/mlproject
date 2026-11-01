package app.platewise.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View

/** Page dots down the right edge; the current one stretches into a pill as you scroll. */
class PageDots(context: Context, private val count: Int) : View(context) {
    private var pos = 0f
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val r = RectF()
    private var fade: ValueAnimator? = null

    fun scrolled(position: Int, offset: Float) {
        pos = position + offset
        alpha = 1f
        invalidate()
        fade?.cancel()
        if (Motion.enabled) {
            fade = ValueAnimator.ofFloat(1f, 0.35f).apply {
                startDelay = 1400
                duration = 500
                addUpdateListener { alpha = it.animatedValue as Float }
                start()
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        val d = width * 0.42f
        val gap = d * 1.1f
        val total = count * d + (count - 1) * gap + d
        var y = (height - total) / 2f
        val x = width / 2f
        for (i in 0 until count) {
            val near = (1f - kotlin.math.abs(pos - i)).coerceIn(0f, 1f)
            val len = d + d * near
            paint.color = if (near > 0.5f) Palette.INK else Palette.MUTED.withAlpha(0.6f)
            r.set(x - d / 2, y, x + d / 2, y + len)
            canvas.drawRoundRect(r, d / 2, d / 2, paint)
            y += len + gap
        }
    }
}
