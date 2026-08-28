package com.fmms.carlogger.data.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.BuildConfig
import java.io.IOException
import java.util.concurrent.TimeUnit
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Offline-first cloud sync (§33-§35): reads the local sync_queue,
 * upserts into Supabase PostgREST (idempotent via client UUID + on_conflict),
 * marks rows SYNCED. Runs periodically and respects network constraints.
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        AppContainer.init(applicationContext)
        val c = AppContainer
        if (!c.prefs.getSyncEnabled()) return Result.success()

        return try {
            // Data retention: raw telemetry 90 days locally (spec §43)
            val cutoff = System.currentTimeMillis() - 90L * 24 * 3600 * 1000
            c.telemetryRepository.purgeOlderThan(cutoff)

            if (c.syncQueueRepository.getPending(limit = 1).isEmpty()) {
                c.syncQueueRepository.deleteSynced(System.currentTimeMillis() - 7 * 24 * 3600 * 1000L)
                return Result.success()
            }
            pushPendingNow(c)
            Result.retry()
        } catch (e: IOException) {
            Result.retry()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "fmms_sync_worker"

        /**
         * Một lượt đẩy toàn bộ queue PENDING lên Supabase. Dùng chung cho worker
         * định kỳ và nút "SYNC NOW" để hai đường đi không lệch logic.
         */
        suspend fun pushPendingNow(c: AppContainer) {
            val client = OkHttpClient()

            // Self-heal: payloads enqueued before the ISO-timestamp fix still carry
            // raw epoch millis -> Postgres rejects them with code 22008. Repair in
            // place so the same data can finally sync instead of retrying forever.
            c.syncQueueRepository.repairStalePayloads(limit = 500)

            // Drop queue rows belonging to an old/different vehicle (orphans after
            // a vehicle re-provision) and legacy trips payloads using the wrong
            // schema key — they would fail RLS forever.
            val purged = c.vehicleRepository.getActive()
                ?.let { c.syncQueueRepository.purgeOrphanedPayloads(it.id) }
                ?: 0
            if (purged > 0) android.util.Log.d("FmmsSync", "purged $purged orphaned queue row(s)")

            val fresh = c.syncQueueRepository.getPending(limit = 500)
            if (fresh.isEmpty()) return

            // Order matters for the RLS check on gps_track_points:
            // the device row must exist on the web before any track point is
            // accepted (EXISTS devices WHERE id = device_id). Process devices
            // first, then vehicles, then trips, then gps batches.
            val ordered = fresh.sortedWith(
                compareBy<com.fmms.carlogger.core.database.entity.SyncQueueEntity>(
                    { priorityOf(it.entityType) },
                    { it.createdAt },
                )
            )
            for (entry in ordered) {
                val resp = when {
                    entry.operation != "UPSERT" -> null
                    // Web quản lý xe qua bảng `assets` (khác schema với bảng local
                    // `vehicles`) và RLS chặn anon ghi trực tiếp -> đẩy qua RPC.
                    entry.entityType == "vehicles" -> reportOdometer(client, entry.payload)
                    // Time-series append-only: nếu row đã tồn tại trên cloud (409)
                    // coi như đã đồng bộ. Không dùng merge-duplicates vì nhánh
                    // UPDATE của upsert bị chặn bởi USING khi row cũ mang
                    // device/asset pairing khác (xe trước khi re-provision).
                    entry.entityType == "telemetry_samples" ||
                        entry.entityType == "gps_track_points" -> insertOnly(client, entry.entityType, entry.payload)
                    else -> upsert(client, entry.entityType, entry.payload)
                }
                if ((resp != null && resp.isSuccessful) || resp?.code == 409) {
                    c.syncQueueRepository.markSynced(entry.id)
                } else {
                    c.syncQueueRepository.markFailed(
                        entry.id,
                        "HTTP ${resp?.code ?: 0}: ${resp?.body?.string()?.take(180) ?: ""}",
                    )
                }
            }
        }

        /** POST thuần không merge-duplicates cho dữ liệu append-only. */
        private fun insertOnly(client: OkHttpClient, table: String, payload: String): okhttp3.Response? {
            val request = Request.Builder()
                .url("${BuildConfig.SUPABASE_URL}/rest/v1/$table")
                .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                .header("Authorization", "Bearer ${BuildConfig.SUPABASE_PUBLISHABLE_KEY}")
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .post(payload.toRequestBody("application/json".toMediaType()))
                .build()
            return try {
                client.newCall(request).execute()
            } catch (_: Exception) {
                null
            }
        }

        /** Đẩy odometer của xe lên web qua RPC SECURITY DEFINER (bypass RLS an toàn). */
        private fun reportOdometer(client: OkHttpClient, payload: String): okhttp3.Response? = try {
            val o = JSONObject(payload)
            val odo = o.optDouble("odometer_km")
            if (o.optString("id").isEmpty() || odo.isNaN()) null else {
                val body = JSONObject().apply {
                    put("p_asset", o.getString("id"))
                    put("p_odo", odo)
                    if (!o.isNull("virtual_odometer_km")) put("p_virtual", o.getDouble("virtual_odometer_km"))
                    put("p_source", "OBD")
                }
                val request = Request.Builder()
                    .url("${BuildConfig.SUPABASE_URL}/rest/v1/rpc/fmms_report_odometer")
                    .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                    .header("Authorization", "Bearer ${BuildConfig.SUPABASE_PUBLISHABLE_KEY}")
                    .header("Content-Type", "application/json")
                    .post(body.toString().toRequestBody("application/json".toMediaType()))
                    .build()
                client.newCall(request).execute()
            }
        } catch (_: Exception) {
            null
        }

        private fun upsert(client: OkHttpClient, table: String, payload: String): okhttp3.Response? {
            val request = Request.Builder()
                .url("${BuildConfig.SUPABASE_URL}/rest/v1/$table")
                .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                .header("Authorization", "Bearer ${BuildConfig.SUPABASE_PUBLISHABLE_KEY}")
                .header("Content-Type", "application/json")
                .header("Prefer", "resolution=merge-duplicates,return=minimal")
                .post(payload.toRequestBody("application/json".toMediaType()))
                .build()
            return try {
                client.newCall(request).execute()
            } catch (_: Exception) {
                null
            }
        }

        private fun priorityOf(type: String): Int = when (type) {
            "devices" -> 0
            "vehicles" -> 1
            "trips" -> 2
            else -> 3 // gps_track_points last, depends on device + trip
        }

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }
    }
}
