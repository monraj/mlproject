package app.platewise.wear

import androidx.wear.tiles.TileService
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

/** Stores today's summary from the phone and refreshes the tile, even when the app is closed. */
class TodayListenerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        events.forEach { e ->
            if (e.type == DataEvent.TYPE_CHANGED && e.dataItem.uri.path == TODAY_PATH) {
                val json = DataMapItem.fromDataItem(e.dataItem).dataMap.getString("json") ?: return@forEach
                Today.save(this, json)
                TileService.getUpdater(this).requestUpdate(KcalTileService::class.java)
                sendBroadcast(android.content.Intent(ACTION_TODAY).setPackage(packageName))
            }
        }
    }

    companion object {
        const val TODAY_PATH = "/platewise/today"
        const val ACTION_TODAY = "app.platewise.wear.TODAY"
    }
}
