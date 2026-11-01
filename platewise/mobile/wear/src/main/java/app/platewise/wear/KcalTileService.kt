package app.platewise.wear

import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/** Watch-face tile: calories left today (or a share of the day in hide-numbers mode). */
class KcalTileService : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val t = Today.load(this)
        val big = when {
            t == null -> "Open PlateWise"
            t.hide -> t.share ?: "Today"
            else -> "%,d".format(t.left)
        }
        val small = when {
            t == null -> "on your phone"
            t.hide -> "eaten so far"
            else -> "kcal left · %,d of %,d".format(t.eaten, t.budget)
        }
        val column = LayoutElementBuilders.Column.Builder()
            .addContent(text("PlateWise", 14f, MUTED))
            .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(6f)).build())
            .addContent(text(big, if (t == null || t.hide) 20f else 40f, MINT))
            .addContent(text(small, 13f, INK))
            .build()
        val layout = LayoutElementBuilders.Layout.Builder().setRoot(
            LayoutElementBuilders.Box.Builder()
                .setVerticalAlignment(LayoutElementBuilders.VERTICAL_ALIGN_CENTER)
                .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                .addContent(column).build(),
        ).build()
        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion(RES_VERSION)
            .setFreshnessIntervalMillis(30 * 60 * 1000L)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout.root!!))
            .build()
        return Futures.immediateFuture(tile)
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion(RES_VERSION).build())

    private fun text(s: String, size: Float, color: Int) =
        LayoutElementBuilders.Text.Builder().setText(s).setMaxLines(2)
            .setFontStyle(
                LayoutElementBuilders.FontStyle.Builder().setSize(androidx.wear.protolayout.DimensionBuilders.sp(size))
                    .setColor(argb(color)).build(),
            ).build()

    companion object {
        private const val RES_VERSION = "1"
        const val MINT = 0xFF32D583.toInt()
        const val INK = 0xFFF5F5F6.toInt()
        const val MUTED = 0xFF94969C.toInt()
    }
}
