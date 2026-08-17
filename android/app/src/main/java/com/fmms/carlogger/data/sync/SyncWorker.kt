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

        val client = OkHttpClient()
        return try {
            // Data retention: raw telemetry 90 days locally (spec §43)
            val cutoff = System.currentTimeMillis() - 90L * 24 * 3600 * 1000
            c.telemetryRepository.purgeOlderThan(cutoff)

            val pending = c.syncQueueRepository.getPending(limit = 200)
            if (pending.isEmpty()) {
                c.syncQueueRepository.deleteSynced(System.currentTimeMillis() - 7 * 24 * 3600 * 1000L)
                return Result.success()
            }

            for (entry in pending) {
                val resp = if (entry.operation == "UPSERT") {
                    upsert(client, entry.entityType, entry.payload)
                } else {
                    null
                }
                if (resp != null && resp.isSuccessful) {
                    c.syncQueueRepository.markSynced(entry.id)
                } else {
                    c.syncQueueRepository.markFailed(entry.id, "HTTP ${resp?.code ?: 0}")
                }
            }
            Result.retry()
        } catch (e: IOException) {
            Result.retry()
        } catch (e: Exception) {
            Result.retry()
        }
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
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun tryReconnect() {
        // Best-effort OBD reconnect after internet regained; harmless if blocking.
    }

    companion object {
        const val WORK_NAME = "fmms_sync_worker"

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