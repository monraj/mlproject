package app.platewise.wear

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat
import androidx.wear.tiles.TileService
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import java.time.LocalDate

/** Today on the wrist: what's left, protein, what was eaten in each part of the day, and a water button. */
class MainActivity : ComponentActivity() {
    private lateinit var column: LinearLayout

    private val onToday = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = render()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val pad = dp(24)
            setPadding(pad, dp(28), pad, dp(40))
        }
        setContentView(ScrollView(this).apply { isVerticalScrollBarEnabled = false; addView(column) })
        render()
    }

    override fun onStart() {
        super.onStart()
        ContextCompat.registerReceiver(this, onToday, IntentFilter(TodayListenerService.ACTION_TODAY), ContextCompat.RECEIVER_NOT_EXPORTED)
        render()
    }

    override fun onStop() {
        unregisterReceiver(onToday)
        super.onStop()
    }

    private fun render() {
        column.removeAllViews()
        val t = Today.load(this)
        if (t == null) {
            column.addView(text("PlateWise", 14f, KcalTileService.MUTED))
            column.addView(text("Open PlateWise on your phone to see today here.", 15f, KcalTileService.INK, top = 12))
            return
        }
        val stale = t.date != LocalDate.now().toString()
        column.addView(text(if (stale) "Last synced ${t.date}" else "Today", 13f, KcalTileService.MUTED))
        if (t.hide) {
            column.addView(text(t.share ?: "—", 20f, KcalTileService.MINT, bold = true, top = 4))
            column.addView(text("eaten so far", 13f, KcalTileService.INK))
        } else {
            column.addView(text("%,d".format(t.left), 40f, KcalTileService.MINT, bold = true))
            column.addView(text("kcal left · %,d of %,d".format(t.eaten, t.budget), 13f, KcalTileService.INK))
        }
        if (t.proteinGoal > 0) column.addView(text("Protein ${t.protein} of ${t.proteinGoal} g", 13f, KcalTileService.INK, top = 6))

        val cups = t.water.coerceAtLeast(Today.watchCups(this, t.date))
        column.addView(text("Water $cups of ${t.waterGoal} cups", 13f, KcalTileService.INK, top = 6))
        column.addView(Button(this).apply {
            text = "+ Cup of water"
            isAllCaps = false
            setTextColor(0xFF0C111D.toInt())
            background = GradientDrawable().apply { cornerRadius = dp(24).toFloat(); setColor(KcalTileService.MINT) }
            minHeight = dp(48)
            setOnClickListener { addWater(t.date) }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(8) }
        })

        if (t.slots.isEmpty()) {
            column.addView(text("Nothing logged yet today.", 13f, KcalTileService.MUTED, top = 14))
        }
        t.slots.forEach { s ->
            val head = if (t.hide) s.label else "${s.label} · %,d kcal".format(s.kcal)
            column.addView(text(head, 13f, KcalTileService.MINT, bold = true, top = 14))
            s.titles.forEach { column.addView(text(it, 13f, KcalTileService.INK)) }
        }
        column.addView(text("Log meals on your phone", 11f, KcalTileService.MUTED, top = 16))
    }

    /** Water is a running count per day; the phone adds whatever is new since it last looked. */
    private fun addWater(date: String) {
        val today = Today.load(this) ?: return
        val cups = today.water.coerceAtLeast(Today.watchCups(this, date)) + 1
        Today.setWatchCups(this, date, cups)
        val req = PutDataMapRequest.create("/platewise/water/$date").apply {
            dataMap.putInt("cups", cups)
            dataMap.putLong("at", System.currentTimeMillis())
        }.asPutDataRequest().setUrgent()
        Wearable.getDataClient(this).putDataItem(req)
        TileService.getUpdater(this).requestUpdate(KcalTileService::class.java)
        render()
    }

    private fun text(s: String, size: Float, color: Int, bold: Boolean = false, top: Int = 0) = TextView(this).apply {
        text = s
        textSize = size
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) typeface = Typeface.DEFAULT_BOLD
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top) }
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
