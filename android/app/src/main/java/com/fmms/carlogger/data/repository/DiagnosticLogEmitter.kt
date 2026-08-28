package com.fmms.carlogger.data.repository

import com.fmms.carlogger.core.database.dao.TelemetryDao
import com.fmms.carlogger.core.database.entity.TelemetrySampleEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import java.util.UUID

/**
 * Optional diagnostic logging (spec §15): captures raw command/response lines.
 * Emits to a StateFlow so a diagnostics screen can show a live tail.
 */
class DiagnosticLogEmitter {

    private val _entries = MutableStateFlow<List<String>>(emptyList())
    val entries: StateFlow<List<String>> = _entries

    private val max = 400

    fun log(lines: List<Pair<String, String>>) {
        if (lines.isEmpty()) return
        val now = System.currentTimeMillis()
        withContextSafe {
            _entries.value = (_entries.value + lines.map { (cmd, value) ->
                "[${formatTime(now)}] CMD $cmd → $value"
            }).takeLast(max)
        }
    }

    fun logRaw(cmd: String, value: String) {
        withContextSafe {
            _entries.value = (_entries.value + "[${formatTime(System.currentTimeMillis())}] CMD $cmd → $value").takeLast(max)
        }
    }

    fun clear() {
        withContextSafe { _entries.value = emptyList() }
    }

    private fun withContextSafe(block: () -> Unit) {
        block()
    }

    private fun formatTime(ts: Long): String {
        val sdf = java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.US)
        return sdf.format(java.util.Date(ts))
    }
}