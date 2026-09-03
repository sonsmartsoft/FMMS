package com.fmms.carlogger.ui.stats

import android.speech.tts.TextToSpeech
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.BuildConfig
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Trả lời của AI Advisor (đồng bộ VehicleAiResponse bên Web).
 */
data class AiInsights(
    val summary: String,
    val maintenancePrediction: String?,
    val fuelEfficiencyTip: String?,
    val costAlert: String?,
)

sealed class AiUiState {
    object Idle : AiUiState()
    object Loading : AiUiState()
    data class Success(val insights: AiInsights) : AiUiState()
    data class Error(val message: String) : AiUiState()
}

class AiAdvisorViewModel : ViewModel() {
    private val c = AppContainer

    private val _state = MutableStateFlow<AiUiState>(AiUiState.Idle)
    val state: StateFlow<AiUiState> = _state

    /** Máy TTS (đọc tiếng Việt) đã sẵn sàng chưa — true khi thiết bị có giọng đọc tiếng Việt. */
    private val _ttsReady = MutableStateFlow(false)
    val ttsReady: StateFlow<Boolean> = _ttsReady

    private var tts: TextToSpeech? = null
    private var ttsInitOk = false
    private var ttsVi = false

    fun ask(userPrompt: String? = null) {
        if (_state.value is AiUiState.Loading) return
        _state.value = AiUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val insights = callAiAdvisor(userPrompt)
                // Tự động đọc kết quả thành tiếng nếu user bật (mặc định bật).
                if (c.prefs.getAiReadAloud()) readAloud(insights)
                AiUiState.Success(insights)
            } catch (e: Exception) {
                AiUiState.Error(e.message ?: "AI error")
            }
        }
    }

    /** Đọc toàn bộ kết quả phân tích bằng giọng nói (tiếng Việt nếu có). */
    fun readAloud(insights: AiInsights? = null) {
        ensureTts()
        val engine = tts ?: return
        if (!ttsInitOk) return
        val text = spokenText(insights ?: (state.value as? AiUiState.Success)?.insights)
        if (text.isBlank()) return
        engine.stop()
        engine.setSpeechRate(1.0f)
        engine.speak(text, TextToSpeech.QUEUE_ADD, null, "fmms_ai_advisor")
    }

    fun stopSpeaking() {
        tts?.stop()
    }

    fun setReadAloud(enabled: Boolean) {
        c.prefs.setAiReadAloud(enabled)
        if (!enabled) stopSpeaking()
    }

    private fun spokenText(insights: AiInsights?): String {
        if (insights == null) return ""
        return buildString {
            append(insights.summary)
            insights.maintenancePrediction?.takeIf { it.isNotBlank() }?.let { append(" ").append(it) }
            insights.costAlert?.takeIf { it.isNotBlank() }?.let { append(" ").append(it) }
            insights.fuelEfficiencyTip?.takeIf { it.isNotBlank() }?.let { append(" ").append(it) }
        }
    }

    private fun ensureTts() {
        if (tts != null) return
        tts = TextToSpeech(c.context) { status ->
            ttsInitOk = status == TextToSpeech.SUCCESS
            if (ttsInitOk) {
                val result = tts?.setLanguage(Locale("vi", "VN"))
                ttsVi = result != TextToSpeech.LANG_MISSING_DATA &&
                    result != TextToSpeech.LANG_NOT_SUPPORTED
                if (!ttsVi) tts?.setLanguage(Locale.getDefault())
                _ttsReady.value = ttsVi
            }
        }
    }

    override fun onCleared() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        super.onCleared()
    }

    private suspend fun callAiAdvisor(userPrompt: String?): AiInsights = withContext(Dispatchers.IO) {
        val vehicle = c.vehicleRepository.getActive()
            ?: throw IllegalStateException("Chưa có xe hoạt động")

        val trips = c.tripRepository.getWithOdometer()
        val allTrips = c.tripRepository.getAllByVehicle(vehicle.id)
            .filter { it.status == "COMPLETED" }
        val fuelLogs = c.fuelLogRepository.getByVehicle(vehicle.id)
        val currentOdo = trips.mapNotNull { it.endOdometer }.firstOrNull() ?: vehicle.odometerKm ?: 0.0

        // Tính các thống kê vận hành CHÍNH XÁC từ dữ liệu thực tế (đã pull từ cloud).
        val totalDistanceKm = allTrips.sumOf { it.distanceKm }
        val totalFuelLiters = allTrips.sumOf { it.fuelUsedLiters ?: 0.0 }
        val tripCount = allTrips.size
        val totalFuelCost = fuelLogs.sumOf { it.totalCost ?: 0.0 }
        val avgConsumption = if (totalDistanceKm > 0.05 && totalFuelLiters > 0) {
            totalFuelLiters / totalDistanceKm * 100.0
        } else null
        // Odometer gần nhất CHÍNH XÁC từ end_odometer của trips hoặc fuel_logs.
        val latestOdoFromTrips = trips.mapNotNull { it.endOdometer }.maxOrNull()
        val latestOdoFromFuel = fuelLogs.mapNotNull { it.odometerKm }.maxOrNull()
        val currentOdometerKm = (latestOdoFromTrips ?: 0.0).coerceAtLeast(latestOdoFromFuel ?: 0.0)
            .takeIf { it > 0 } ?: currentOdo

        val requestBody = JSONObject().apply {
            put("asset_id", vehicle.id)
            put("device_id", c.prefs.getDeviceId())
            put("current_odo", currentOdo)
            // --- Thống kê vận hành chính xác do ứng dụng tính từ dữ liệu thật (KHÔNG để AI tự suy) ---
            put("stats", JSONObject().apply {
                put("total_distance_km", totalDistanceKm)
                put("total_fuel_liters", totalFuelLiters)
                put("trip_count", tripCount)
                put("current_odometer_km", currentOdometerKm)
                put("total_fuel_cost_vnd", totalFuelCost)
                put("avg_consumption_l100km", avgConsumption ?: JSONObject.NULL)
                put("fuel_log_count", fuelLogs.size)
            })
            put("recent_trips", org.json.JSONArray().apply {
                trips.forEach { t ->
                    put(JSONObject().apply {
                        put("start_time", t.startTime)
                        put("end_time", t.endTime ?: JSONObject.NULL)
                        put("distance_km", t.distanceKm)
                        put("fuel_used_liters", t.fuelUsedLiters ?: JSONObject.NULL)
                        put("average_consumption_l100km", t.averageConsumptionL100km ?: JSONObject.NULL)
                        put("average_speed_kmh", t.averageSpeedKmh ?: JSONObject.NULL)
                        put("max_speed_kmh", t.maxSpeedKmh ?: JSONObject.NULL)
                        put("start_odometer", t.startOdometer ?: JSONObject.NULL)
                        put("end_odometer", t.endOdometer ?: JSONObject.NULL)
                    })
                }
            })
            put("fuel_logs", org.json.JSONArray().apply {
                fuelLogs.forEach { f ->
                    put(JSONObject().apply {
                        put("date", f.timestamp)
                        put("odometer_km", f.odometerKm ?: JSONObject.NULL)
                        put("fuel_liters", f.fuelLiters)
                        put("price_per_liter", f.pricePerLiter ?: JSONObject.NULL)
                        put("total_cost", f.totalCost ?: JSONObject.NULL)
                        put("currency", f.currency)
                    })
                }
            })
            userPrompt?.let { put("user_prompt", it) }
        }

        val client = OkHttpClient.Builder()
            .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(90, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
        val request = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/functions/v1/ai-advisor")
            .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            .header("Authorization", "Bearer ${BuildConfig.SUPABASE_PUBLISHABLE_KEY}")
            .header("Content-Type", "application/json")
            .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) {
                throw IllegalStateException("AI HTTP ${resp.code}: ${body.take(120)}")
            }
            val json = JSONObject(body)
            fun opt(key: String): String? =
                json.optString(key).takeIf { it.isNotBlank() && it != "null" }
            AiInsights(
                summary = opt("summary") ?: "",
                maintenancePrediction = opt("maintenance_prediction"),
                fuelEfficiencyTip = opt("fuel_efficiency_tip"),
                costAlert = opt("cost_alert"),
            )
        }
    }
}
