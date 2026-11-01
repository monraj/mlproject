package app.platewise.wear

import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
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

/** Tile: a ring of today's calories with what's left in the middle, and a "+ Water" button. */
class KcalTileService : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        if (requestParams.currentState.lastClickableId == WATER_ID) Today.addWater(this)
        val device = requestParams.deviceConfiguration
        val t = Today.load(this)
        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion(RES_VERSION)
            .setFreshnessIntervalMillis(30 * 60 * 1000L)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(t, device)))
            .build()
        return Futures.immediateFuture(tile)
    }

    private fun layout(t: Today?, device: DeviceParameters): LayoutElementBuilders.LayoutElement {
        val open = ModifiersBuilders.Clickable.Builder()
            .setId("open")
            .setOnClick(
                ActionBuilders.LaunchAction.Builder().setAndroidActivity(
                    ActionBuilders.AndroidActivity.Builder().setPackageName(packageName).setClassName(MainActivity::class.java.name).build(),
                ).build(),
            ).build()
        if (t == null) {
            return box(open, text("Open PlateWise\non your phone", Typography.TYPOGRAPHY_BODY1, Palette.INK))
        }
        val progress = if (t.budget > 0) (t.eaten.toFloat() / t.budget).coerceIn(0f, 1f) else 0f
        val ringColor = if (t.over) Palette.SUN else Palette.MINT
        val big = when {
            t.hide -> t.share ?: "Today"
            t.over -> "+" + kcalText(t.eaten - t.budget)
            else -> kcalText(t.left)
        }
        val small = when {
            t.hide -> "of today's plan"
            t.over -> "kcal above plan"
            else -> "kcal left"
        }
        val water = ModifiersBuilders.Clickable.Builder().setId(WATER_ID).setOnClick(ActionBuilders.LoadAction.Builder().build()).build()
        return EdgeContentLayout.Builder(device)
            .setEdgeContent(
                CircularProgressIndicator.Builder()
                    .setProgress(progress)
                    .setCircularProgressIndicatorColors(ProgressIndicatorColors(ringColor, Palette.MINT.withAlpha(0.18f)))
                    .build(),
            )
            .setPrimaryLabelTextContent(text("PlateWise", Typography.TYPOGRAPHY_CAPTION1, Palette.MUTED))
            .setContent(
                box(
                    open,
                    LayoutElementBuilders.Column.Builder()
                        .addContent(text(big, if (t.hide) Typography.TYPOGRAPHY_TITLE2 else Typography.TYPOGRAPHY_DISPLAY2, if (t.over) Palette.SUN else Palette.INK))
                        .addContent(text(small, Typography.TYPOGRAPHY_CAPTION2, Palette.MUTED))
                        .build(),
                ),
            )
            .setSecondaryLabelTextContent(
                CompactChip.Builder(this, "+ Water · ${t.water}/${t.waterGoal}", water, device)
                    .setChipColors(ChipColors(Palette.WATER, 0xFF0C111D.toInt()))
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
        private const val RES_VERSION = "2"
        private const val WATER_ID = "water"
    }
}
