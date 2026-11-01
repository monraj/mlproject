package expo.modules.wearsync

import android.net.Uri
import android.util.Log
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Phone side of the PlateWise watch app. Today's summary goes to the watch as a data item
 * (/platewise/today); the watch writes cups of water it added as /platewise/water/<date>, which
 * persist until the phone reads them, so taps on the watch aren't lost while the phone app is closed.
 * Meals re-logged on the watch arrive as /platewise/log/<id> and are deleted once the phone adds them.
 * Reads list every item and filter by path: a prefix query never matches items the watch wrote
 * (they live under the watch's node id), with or without a "*" host.
 */
class WearSyncModule : Module() {
  private var listener: DataClient.OnDataChangedListener? = null

  private val context get() = requireNotNull(appContext.reactContext) { "No React context" }

  override fun definition() = ModuleDefinition {
    Name("WearSync")
    Events("onWatchData")

    AsyncFunction("sendToday") { json: String, promise: Promise ->
      val request = PutDataMapRequest.create(TODAY_PATH).apply {
        dataMap.putString("json", json)
        dataMap.putLong("sentAt", System.currentTimeMillis()) // always a change, so the watch updates
      }.asPutDataRequest().setUrgent()
      Wearable.getDataClient(context).putDataItem(request)
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { promise.resolve(false) }
    }

    // Home-screen widget (TodayWidget): the same summary as the watch, and cups added with its button.
    AsyncFunction("updateWidget") { json: String ->
      TodayWidget.save(context, json)
      true
    }

    AsyncFunction("widgetWater") { date: String -> TodayWidget.widgetCups(context, date) }

    AsyncFunction("hasWatch") { promise: Promise ->
      Wearable.getNodeClient(context).connectedNodes
        .addOnSuccessListener { promise.resolve(it.isNotEmpty()) }
        .addOnFailureListener { promise.resolve(false) }
    }

    AsyncFunction("watchWater") { date: String, promise: Promise ->
      Wearable.getDataClient(context).dataItems
        .addOnSuccessListener { items ->
          var cups = 0
          items.filter { it.uri.path == "$WATER_PATH/$date" }.forEach { cups = maxOf(cups, DataMapItem.fromDataItem(it).dataMap.getInt("cups", 0)) }
          items.release()
          promise.resolve(cups)
        }
        .addOnFailureListener { Log.w(TAG, "watchWater failed", it); promise.resolve(0) }
    }

    AsyncFunction("pendingLogs") { promise: Promise ->
      Wearable.getDataClient(context).dataItems
        .addOnSuccessListener { items ->
          val out = items.filter { it.uri.path?.startsWith("$LOG_PATH/") == true }.map { mapOf("uri" to it.uri.toString(), "ref" to (DataMapItem.fromDataItem(it).dataMap.getString("ref") ?: "")) }
          items.release()
          promise.resolve(out)
        }
        .addOnFailureListener { promise.resolve(emptyList<Map<String, String>>()) }
    }

    AsyncFunction("clearLog") { uri: String, promise: Promise ->
      Wearable.getDataClient(context).deleteDataItems(Uri.parse(uri))
        .addOnCompleteListener { promise.resolve(true) }
    }

    OnStartObserving {
      val l = DataClient.OnDataChangedListener { events: DataEventBuffer ->
        events.forEach { e ->
          val path = e.dataItem.uri.path ?: return@forEach
          if (e.type == DataEvent.TYPE_CHANGED && (path.startsWith(WATER_PATH) || path.startsWith(LOG_PATH))) {
            sendEvent("onWatchData", mapOf("path" to path))
          }
        }
      }
      listener = l
      Wearable.getDataClient(context).addListener(l)
    }

    OnStopObserving {
      listener?.let { Wearable.getDataClient(context).removeListener(it) }
      listener = null
    }
  }

  companion object {
    const val TODAY_PATH = "/platewise/today"
    const val WATER_PATH = "/platewise/water"
    const val LOG_PATH = "/platewise/log"
    const val TAG = "PlateWiseWear"
  }
}
