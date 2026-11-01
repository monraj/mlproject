package app.platewise.wear

import android.content.ComponentName
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.TypeBuilders.FloatProp
import androidx.wear.protolayout.expression.AnimationParameterBuilders.AnimationParameters
import androidx.wear.protolayout.expression.AnimationParameterBuilders.AnimationSpec
import androidx.wear.protolayout.expression.DynamicBuilders.DynamicFloat
import androidx.wear.protolayout.material.ChipColors
import androidx.wear.protolayout.material.CircularProgressIndicator
import androidx.wear.protolayout.material.CompactChip
import androidx.wear.protolayout.material.ProgressIndicatorColors
import androidx.wear.protolayout.material.Text
import androidx.wear.protolayout.material.Typography
import androidx.wear.protolayout.material.layouts.EdgeContentLayout
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/**
 * Tile: body and plan. The edge ring is the fasting window (or the day's calories when fasting is
 * off) and sweeps in when the tile appears. Tap 1 to 5 to log how stressed you feel, right on the
 * tile; below it, blood sugar and the next meal idea; and a button that opens Gemini.
 */
class SignalsTileService : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val clicked = requestParams.currentState.lastClickableId
        clicked.removePrefix(FEEL).toIntOrNull()?.takeIf { clicked.startsWith(FEEL) && it in 1..5 }?.let { Today.checkIn(this, it) }
        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion(RES_VERSION)
            .setFreshnessIntervalMillis(15 * 60 * 1000L) // the fasting ring moves with the clock
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(Today.load(this), requestParams.deviceConfiguration)))
            .build()
        return Futures.immediateFuture(tile)
    }

    private fun launch(className: String, pkg: String = packageName, page: String? = null): ModifiersBuilders.Clickable {
        val activity = ActionBuilders.AndroidActivity.Builder().setPackageName(pkg).setClassName(className)
        if (page != null) activity.addKeyToExtraMapping(Shortcuts.EXTRA_PAGE, ActionBuilders.AndroidStringExtra.Builder().setValue(page).build())
        return ModifiersBuilders.Clickable.Builder().setId("open:$page:$className").setOnClick(ActionBuilders.LaunchAction.Builder().setAndroidActivity(activity.build()).build()).build()
    }

    /** Gemini's own launcher activity on this watch, or the PlateWise summary page if it isn't there. */
    private fun geminiClick(): ModifiersBuilders.Clickable {
        val c: ComponentName? = Shortcuts.gemini(this).component
        return if (c != null) launch(c.className, c.packageName) else launch(MainActivity::class.java.name, page = Shortcuts.SUMMARY)
    }

    private fun layout(t: Today?, device: DeviceParameters): LayoutElementBuilders.LayoutElement {
        if (t == null) {
            return box(launch(MainActivity::class.java.name), text("Open PlateWise\non your phone", Typography.TYPOGRAPHY_BODY1, Palette.INK))
        }
        val s = t.signals
        val fast = s.fast?.now()
        val (progress, ringColor, ringLabel) = when {
            fast != null -> Triple(fast.progress, if (fast.eating) Palette.MINT else Palette.WATER, (if (fast.minutesLeft >= 60) "${fast.minutesLeft / 60}h ${fast.minutesLeft % 60}m" else "${fast.minutesLeft}m") + if (fast.eating) " to eat" else " fast")
            else -> Triple(if (t.budget > 0) (t.eaten.toFloat() / t.budget).coerceIn(0f, 1f) else 0f, if (t.over) Palette.SUN else Palette.MINT, if (t.hide) (t.share ?: "Today") else "${kcalText(t.left)} kcal left")
        }
        // The ring sweeps from empty to its value each time the tile is shown.
        val sweep = DynamicFloat.animate(0f, progress, AnimationSpec.Builder().setAnimationParameters(AnimationParameters.Builder().setDurationMillis(900).build()).build())

        val feel = LayoutElementBuilders.Row.Builder()
        (1..5).forEach { n ->
            val on = s.checkIn == n
            feel.addContent(
                LayoutElementBuilders.Box.Builder()
                    .setWidth(dp(26f)).setHeight(dp(26f))
                    .setModifiers(
                        ModifiersBuilders.Modifiers.Builder()
                            .setBackground(ModifiersBuilders.Background.Builder().setColor(argb(if (on) Palette.MINT else Palette.SURFACE)).setCorner(ModifiersBuilders.Corner.Builder().setRadius(dp(13f)).build()).build())
                            .setClickable(ModifiersBuilders.Clickable.Builder().setId("$FEEL$n").setOnClick(ActionBuilders.LoadAction.Builder().build()).build())
                            .setSemantics(ModifiersBuilders.Semantics.Builder().setContentDescription("Stress $n of 5").build())
                            .build(),
                    )
                    .addContent(text("$n", Typography.TYPOGRAPHY_CAPTION1, if (on) 0xFF0C111D.toInt() else Palette.INK))
                    .build(),
            )
            if (n < 5) feel.addContent(LayoutElementBuilders.Spacer.Builder().setWidth(dp(3f)).build())
        }

        val info = buildList {
            s.sugar?.let { add("Sugar ${"%.1f".format(it.mmol)}") }
            s.idea?.let { add("${it.slot}: ${it.name}") }
        }.joinToString(" · ").ifEmpty { "Tap a number: how stressed are you?" }

        val content = LayoutElementBuilders.Column.Builder()
            .addContent(text(s.stressWord, Typography.TYPOGRAPHY_TITLE3, if (s.stressLevel == "raised") Palette.SUN else Palette.INK))
            .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(4f)).build())
            .addContent(feel.build())
            .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(5f)).build())
            .addContent(box(launch(MainActivity::class.java.name, page = Shortcuts.SIGNALS), text(info, Typography.TYPOGRAPHY_CAPTION2, if (s.sugar?.usual == false) Palette.SUN else Palette.MUTED)))
            .build()

        return EdgeContentLayout.Builder(device)
            .setEdgeContent(
                CircularProgressIndicator.Builder()
                    .setProgress(FloatProp.Builder(progress).setDynamicValue(sweep).build())
                    .setCircularProgressIndicatorColors(ProgressIndicatorColors(ringColor, ringColor.withAlpha(0.18f)))
                    .build(),
            )
            .setPrimaryLabelTextContent(text(ringLabel, Typography.TYPOGRAPHY_CAPTION1, ringColor))
            .setContent(content)
            .setSecondaryLabelTextContent(
                CompactChip.Builder(this, "✦ Ask Gemini", geminiClick(), device)
                    .setChipColors(ChipColors(Palette.RAISED, Palette.INK))
                    .build(),
            )
            .build()
    }

    private fun text(s: String, typography: Int, color: Int) =
        Text.Builder(this, s).setTypography(typography).setColor(argb(color)).setMaxLines(2).build()

    private fun box(click: ModifiersBuilders.Clickable, child: LayoutElementBuilders.LayoutElement) =
        LayoutElementBuilders.Box.Builder()
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(click).build())
            .addContent(child)
            .build()

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion(RES_VERSION).build())

    companion object {
        private const val RES_VERSION = "1"
        private const val FEEL = "feel"
    }
}
