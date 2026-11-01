package app.platewise.wear

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.InputDevice
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import kotlin.math.abs

/**
 * PlateWise on the wrist. Pages scrolled with a swipe or the crown: the day's rings, body signals
 * (stress check-in, sugar, heart), the summary with a Gemini shortcut, the fasting window and a meal
 * idea, water, meals by part of the day, log a meal again, and the week. Watch-face shortcuts open a
 * page directly (Shortcuts.EXTRA_PAGE).
 */
class MainActivity : ComponentActivity() {
    private lateinit var pager: ViewPager2
    private lateinit var dots: PageDots
    private val ring by lazy { RingView(this) }
    private val water by lazy { WaterView(this) }
    private val week by lazy { WeekView(this) }
    private val breath by lazy { BreathView(this) }
    private val stressWord by lazy { text("", 16f, Palette.INK, Fonts.heavy(this)) }
    private val stressTip by lazy { text("", 11f, Palette.MUTED).apply { maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END } }
    private val feel by lazy { LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER } }
    private val vitalsLine by lazy { text("", 11f, Palette.INK, Fonts.semi(this)) }
    private val summaryTitle by lazy { text("", 15f, Palette.INK, Fonts.heavy(this)) }
    private val summaryList by lazy { column() }
    private val dial by lazy { FastDial(this) }
    private val fastOff by lazy { text("Fasting is off. Turn it on in PlateWise on your phone.", 12f, Palette.MUTED) }
    private val ideaText by lazy { text("", 12f, Palette.INK, Fonts.semi(this)).apply { maxLines = 3 } }
    private val mealsList by lazy { column() }
    private val quickList by lazy { column() }
    private val weekNote by lazy { text("", 12f, Palette.MUTED) }
    private val streakText by lazy { text("", 12f, Palette.MINT, Fonts.semi(this)) }
    private val pages = mutableListOf<View>()
    private var today: Today? = null
    private var shown = -1
    private var rotary = 0f

    private val onToday = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = render(replay = false)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pages += page(ring, pad = 0.04f)
        pages += signalsPage()
        pages += summaryPage()
        pages += planPage()
        pages += waterPage()
        pages += listPage("Today's meals", mealsList, streakText)
        pages += listPage("Log again", quickList, null)
        pages += weekPage()

        pager = ViewPager2(this).apply {
            orientation = ViewPager2.ORIENTATION_VERTICAL
            adapter = Pages(pages)
            offscreenPageLimit = 1
            setPageTransformer { v, pos ->
                // Pages ease back and fade as they leave, so scrolling feels layered.
                val p = abs(pos).coerceAtMost(1f)
                v.alpha = 1f - p * 0.7f
                v.scaleX = 1f - p * 0.12f
                v.scaleY = 1f - p * 0.12f
            }
        }
        dots = PageDots(this, pages.size)
        pager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageScrolled(position: Int, offset: Float, px: Int) = dots.scrolled(position, offset)
            override fun onPageSelected(position: Int) {
                if (shown >= 0 && position != shown) pager.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                shown = position
                replayPage(position)
            }
        })
        setContentView(FrameLayout(this).apply {
            setBackgroundColor(Palette.BG)
            addView(pager, FrameLayout.LayoutParams(-1, -1))
            addView(dots, FrameLayout.LayoutParams(dp(8), -1, Gravity.END or Gravity.CENTER_VERTICAL).apply { marginEnd = dp(6) })
        })
        render(replay = true)
        openPage(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        openPage(intent)
    }

    /** A watch-face shortcut or tile asked for a page. */
    private fun openPage(intent: Intent?) {
        val i = PAGES.indexOf(intent?.getStringExtra(Shortcuts.EXTRA_PAGE) ?: return)
        if (i >= 0) pager.post { pager.setCurrentItem(i, false); replayPage(i) }
    }

    override fun onStart() {
        super.onStart()
        ContextCompat.registerReceiver(this, onToday, IntentFilter(TodayListenerService.ACTION_TODAY), ContextCompat.RECEIVER_NOT_EXPORTED)
        render(replay = false)
    }

    override fun onStop() {
        unregisterReceiver(onToday)
        super.onStop()
    }

    /** The crown scrolls a page at a time. */
    override fun dispatchGenericMotionEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_SCROLL && ev.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            rotary += -ev.getAxisValue(MotionEvent.AXIS_SCROLL)
            if (abs(rotary) > 1.2f) {
                val next = (pager.currentItem + if (rotary > 0) 1 else -1).coerceIn(0, pages.size - 1)
                rotary = 0f
                pager.setCurrentItem(next, true)
            }
            return true
        }
        return super.dispatchGenericMotionEvent(ev)
    }

    private fun render(replay: Boolean) {
        val t = Today.load(this)
        today = t
        if (t == null) {
            mealsList.removeAllViews()
            mealsList.addView(text("Open PlateWise on your phone to see today here.", 14f, Palette.INK))
            return
        }
        ring.set(t, replay && shown <= 0)
        fillSignals(t)
        fillSummary(t)
        fillPlan(t, replay = false)
        water.set(t.water, t.waterGoal, replay)
        week.set(t.week, t.hide, replay)
        fillMeals(t)
        fillQuick(t)
        val logged = t.week.filter { it.kcal > 0 }
        weekNote.text = when {
            logged.isEmpty() -> "Log a meal to start your week"
            t.hide -> "${logged.size} of 7 days logged"
            else -> "Average ${kcalText(logged.sumOf { it.kcal } / logged.size)} kcal · ${logged.size} days logged"
        }
    }

    private fun replayPage(position: Int) {
        val t = today ?: return
        when (position) {
            0 -> ring.set(t, replay = true)
            1 -> { fillSignals(t); stagger(feel) }
            2 -> { fillSummary(t); stagger(summaryList) }
            3 -> fillPlan(t, replay = true)
            4 -> water.set(t.water, t.waterGoal, replay = true)
            5 -> { fillMeals(t); stagger(mealsList) }
            6 -> stagger(quickList)
            7 -> week.play()
        }
    }

    // ---- pages ----

    private fun signalsPage(): View {
        val col = column()
        col.addView(breath, LinearLayout.LayoutParams(dp(60), dp(60)))
        col.addView(stressWord, LinearLayout.LayoutParams(-1, -2))
        col.addView(stressTip, LinearLayout.LayoutParams(-1, -2))
        col.addView(feel, LinearLayout.LayoutParams(-1, dp(30)).apply { topMargin = dp(5) })
        col.addView(vitalsLine, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(5) })
        return page(col, pad = 0.12f)
    }

    private fun fillSignals(t: Today) {
        val s = t.signals
        breath.set(s.stressLevel == "raised")
        stressWord.text = s.stressWord
        stressTip.text = if (s.stressLevel == null) "How stressed are you? Tap 1–5." else s.stressTip
        feel.removeAllViews()
        (1..5).forEach { n ->
            val on = s.checkIn == n
            val b = pill("$n", if (on) Palette.MINT else Palette.SURFACE, if (on) 0xFF0C111D.toInt() else Palette.INK) { v ->
                v.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                Today.checkIn(this, n)
                today = Today.load(this)
                today?.let(::fillSignals)
            }.apply { setPadding(0, 0, 0, 0) }
            feel.addView(b, LinearLayout.LayoutParams(dp(28), dp(28)).apply { marginStart = dp(2); marginEnd = dp(2) })
        }
        val parts = mutableListOf<String>()
        s.sugar?.let { parts += "Sugar ${"%.1f".format(it.mmol)}" }
        s.restingHr?.let { parts += "Heart $it bpm" }
        if (parts.isEmpty()) s.hrv?.let { parts += "HRV $it ms" }
        vitalsLine.text = if (parts.isEmpty()) "Sugar and heart show here" else parts.joinToString("  ·  ")
        vitalsLine.setTextColor(if (s.sugar?.usual == false) Palette.SUN else Palette.INK)
    }

    private fun summaryPage(): View {
        val col = column()
        col.addView(summaryTitle)
        col.addView(summaryList, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(4) })
        val ask = pill("✦  Ask Gemini", Palette.RAISED, Palette.INK) { v ->
            v.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
            Shortcuts.openGemini(this)
        }
        col.addView(ask, LinearLayout.LayoutParams(-2, dp(38)).apply { topMargin = dp(8) })
        return page(col, pad = 0.12f)
    }

    private fun fillSummary(t: Today) {
        val s = t.signals
        summaryTitle.text = s.reportTitle
        summaryList.removeAllViews()
        s.urgent?.let { summaryList.addView(text(it, 11f, Palette.SUN, Fonts.semi(this)).apply { maxLines = 3 }) }
        val lines = s.lines.take(if (s.urgent != null) 2 else 3)
        if (lines.isEmpty()) summaryList.addView(text("Log a meal and your summary builds through the day.", 12f, Palette.MUTED))
        lines.forEach { l ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            row.addView(View(this).apply { background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(if (l.good) Palette.MINT else Palette.WATER) } }, LinearLayout.LayoutParams(dp(6), dp(6)).apply { marginEnd = dp(6) })
            row.addView(text(if (l.label.isNotEmpty()) "${l.label}: ${l.text}" else l.text, 11f, Palette.INK, gravity = Gravity.START).apply { maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END }, LinearLayout.LayoutParams(0, -2, 1f))
            summaryList.addView(row, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(4) })
        }
        s.next.firstOrNull()?.let { summaryList.addView(text("Next: $it", 11f, Palette.MINT, Fonts.semi(this)).apply { maxLines = 2 }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(5) }) }
    }

    private fun planPage(): View {
        val col = column()
        col.addView(FrameLayout(this).apply {
            addView(dial, FrameLayout.LayoutParams(-1, -1))
            addView(fastOff, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER))
        }, LinearLayout.LayoutParams(dp(128), dp(128)))
        col.addView(ideaText, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(6) })
        return page(col, pad = 0.12f)
    }

    private fun fillPlan(t: Today, replay: Boolean) {
        val s = t.signals
        dial.set(s.fast, replay)
        dial.visibility = if (s.fast == null) View.INVISIBLE else View.VISIBLE
        fastOff.visibility = if (s.fast == null) View.VISIBLE else View.GONE
        ideaText.text = s.idea?.let { i -> "${i.slot} idea: ${i.name}" + (i.kcal?.let { " · about ${kcalText(it)} kcal" } ?: "") } ?: "Meal ideas show here when there's room in your day."
    }

    private fun waterPage(): View {
        val add = pill("+ Cup of water", Palette.WATER, 0xFF0C111D.toInt()) { v ->
            if (Today.addWater(this) != null) {
                v.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                today = Today.load(this)
                today?.let { water.set(it.water, it.waterGoal, replay = false); ring.set(it, replay = false) }
            }
        }
        return FrameLayout(this).apply {
            addView(water, FrameLayout.LayoutParams(-1, -1))
            addView(add, FrameLayout.LayoutParams(-2, dp(44), Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply { bottomMargin = dp(18) })
        }
    }

    private fun weekPage(): View {
        val col = column()
        col.addView(text("This week", 15f, Palette.INK, Fonts.heavy(this)))
        col.addView(week, LinearLayout.LayoutParams(-1, dp(92)).apply { topMargin = dp(10) })
        col.addView(weekNote, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(8) })
        return page(col, pad = 0.16f)
    }

    private fun listPage(title: String, list: LinearLayout, extra: View?): View {
        val col = column()
        col.addView(text(title, 15f, Palette.INK, Fonts.heavy(this)))
        if (extra != null) col.addView(extra)
        col.addView(list, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(6) })
        return page(col, pad = 0.13f)
    }

    private fun fillMeals(t: Today) {
        mealsList.removeAllViews()
        streakText.text = when {
            t.streak >= 2 -> "${t.streak} days in a row"
            t.steps > 0 -> "${kcalText(t.steps)} steps today"
            else -> ""
        }
        streakText.visibility = if (streakText.text.isEmpty()) View.GONE else View.VISIBLE
        if (t.slots.isEmpty()) {
            mealsList.addView(text("Nothing logged yet. Log on your phone, or pick a meal on the next page.", 13f, Palette.MUTED))
            return
        }
        val max = maxOf(t.budget / 2, t.slots.maxOf { it.kcal }).coerceAtLeast(1)
        t.slots.take(4).forEach { s ->
            val row = column().apply { gravity = Gravity.START }
            val head = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            head.addView(text(s.label, 13f, Palette.INK, Fonts.semi(this), Gravity.START), LinearLayout.LayoutParams(0, -2, 1f))
            if (!t.hide) head.addView(text(kcalText(s.kcal), 13f, Palette.MINT, Fonts.heavy(this), Gravity.END))
            row.addView(head, LinearLayout.LayoutParams(-1, -2))
            row.addView(Bar(this, s.kcal.toFloat() / max), LinearLayout.LayoutParams(-1, dp(6)).apply { topMargin = dp(3) })
            row.addView(text(s.titles.joinToString(", "), 11f, Palette.MUTED, gravity = Gravity.START).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END })
            mealsList.addView(row, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(7) })
        }
    }

    private fun fillQuick(t: Today) {
        quickList.removeAllViews()
        if (t.quick.isEmpty()) {
            quickList.addView(text("Meals you log on your phone show up here, ready to log again with one tap.", 13f, Palette.MUTED))
            return
        }
        t.quick.take(3).forEach { q -> // a fourth is cut off by the round screen
            val label = if (t.hide) q.title else "${q.title} · ${kcalText(q.kcal)}"
            val chip = pill(label, Palette.SURFACE, Palette.INK, wide = true) { v -> confirmLog(v as TextView, q, label) }
            quickList.addView(chip, LinearLayout.LayoutParams(-1, dp(40)).apply { topMargin = dp(6) })
        }
    }

    /** Tap a meal: the chip fills with mint and says it's added, then settles back. */
    private fun confirmLog(v: TextView, q: Today.Quick, label: String) {
        if (!v.isEnabled) return
        v.isEnabled = false
        v.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        Today.logAgain(this, q)
        today = Today.load(this)
        today?.let { ring.set(it, replay = false); week.set(it.week, it.hide, replay = false) }
        val bg = v.background as GradientDrawable
        val anim = ValueAnimator.ofObject(ArgbEvaluator(), Palette.SURFACE, Palette.MINT).apply {
            duration = if (Motion.enabled) 260 else 0
            addUpdateListener { bg.setColor(it.animatedValue as Int) }
        }
        v.text = "✓  Added to today"
        v.setTextColor(0xFF0C111D.toInt())
        if (Motion.enabled) v.animate().scaleX(1.04f).scaleY(1.04f).setDuration(140).withEndAction { v.animate().scaleX(1f).scaleY(1f).setDuration(220).start() }.start()
        anim.start()
        v.postDelayed({
            bg.setColor(Palette.SURFACE)
            v.text = label
            v.setTextColor(Palette.INK)
            v.isEnabled = true
        }, 2200)
    }

    /** Rows slide up and fade in one after another. */
    private fun stagger(list: LinearLayout) {
        if (!Motion.enabled) return
        for (i in 0 until list.childCount) {
            val c = list.getChildAt(i)
            c.alpha = 0f
            c.translationY = dp(14).toFloat()
            c.animate().alpha(1f).translationY(0f).setStartDelay(Motion.STAGGER_MS * i + 60).setDuration(320).setInterpolator(Motion.EASE_OUT).start()
        }
    }

    // ---- small builders ----

    private fun page(content: View, pad: Float): View = object : FrameLayout(this) {
        override fun onSizeChanged(w: Int, h: Int, ow: Int, oh: Int) {
            super.onSizeChanged(w, h, ow, oh)
            val p = (w * pad).toInt()
            post { setPadding(p, p, p, p) }
        }
    }.apply {
        addView(content, FrameLayout.LayoutParams(-1, if (content is RingView) -1 else -2, Gravity.CENTER))
    }

    private fun column() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
    }

    private fun text(s: String, size: Float, color: Int, face: android.graphics.Typeface = Fonts.body(this), gravity: Int = Gravity.CENTER) =
        TextView(this).apply {
            text = s
            textSize = size
            setTextColor(color)
            typeface = face
            this.gravity = gravity
            if (face == Fonts.heavy(this@MainActivity)) letterSpacing = -0.02f
        }

    private fun pill(label: String, bg: Int, fg: Int, wide: Boolean = false, onTap: (View) -> Unit) = TextView(this).apply {
        text = label
        textSize = if (wide) 12f else 14f
        setTextColor(fg)
        typeface = Fonts.semi(this@MainActivity)
        gravity = Gravity.CENTER
        maxLines = 1
        ellipsize = android.text.TextUtils.TruncateAt.END
        setPadding(dp(18), 0, dp(18), 0)
        background = GradientDrawable().apply { cornerRadius = dp(22).toFloat(); setColor(bg) }
        isClickable = true
        setOnClickListener { onTap(it) }
        // Press feedback: a quick squeeze.
        setOnTouchListener { v, e ->
            if (Motion.enabled) when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> v.animate().scaleX(0.95f).scaleY(0.95f).setDuration(90).start()
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> v.animate().scaleX(1f).scaleY(1f).setDuration(160).start()
            }
            false
        }
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    companion object {
        /** Page order, for shortcuts. */
        private val PAGES = listOf(Shortcuts.RING, Shortcuts.SIGNALS, Shortcuts.SUMMARY, Shortcuts.PLAN, Shortcuts.WATER)
    }

    /** A thin rounded bar that grows to its share. */
    private class Bar(context: Context, private val share: Float) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val r = RectF()
        private var t = if (Motion.enabled) 0f else 1f

        override fun onAttachedToWindow() {
            super.onAttachedToWindow()
            if (t < 1f) ValueAnimator.ofFloat(0f, 1f).apply {
                duration = Motion.BAR_MS
                startDelay = 120
                interpolator = Motion.EASE_OUT
                addUpdateListener { t = it.animatedValue as Float; invalidate() }
                start()
            }
        }

        override fun onDraw(canvas: Canvas) {
            val h = height.toFloat()
            paint.color = Palette.RAISED
            r.set(0f, 0f, width.toFloat(), h)
            canvas.drawRoundRect(r, h / 2, h / 2, paint)
            paint.color = Palette.MINT
            r.set(0f, 0f, (width * share.coerceIn(0.04f, 1f) * t), h)
            canvas.drawRoundRect(r, h / 2, h / 2, paint)
        }
    }

    private class Pages(private val pages: List<View>) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        override fun getItemCount() = pages.size
        override fun getItemViewType(position: Int) = position
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            val v = pages[viewType]
            (v.parent as? ViewGroup)?.removeView(v)
            v.layoutParams = RecyclerView.LayoutParams(-1, -1)
            return object : RecyclerView.ViewHolder(v) {}
        }
        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) = Unit
    }
}
