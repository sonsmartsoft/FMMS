package com.fmms.carlogger.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.BuildConfig
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

    fun ask(userPrompt: String? = null) {
        if (_state.value is AiUiState.Loading) return
        _state.value = AiUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val insights = callAiAdvisor(userPrompt)
                AiUiState.Success(insights)
            } catch (e: Exception) {
                AiUiState.Error(e.message ?: "AI error")
            }
        }
    }

    private suspend fun callAiAdvisor(userPrompt: String?): AiInsights = withContext(Dispatchers.IO) {
        val vehicle = c.vehicleRepository.getActive()
            ?: throw IllegalStateException("Chưa có xe hoạt động")

        val trips = c.tripRepository.getWithOdometer().take(10)
        val fuelLogs = c.fuelLogRepository.getByVehicle(vehicle.id)
        val currentOdo = trips.mapNotNull { it.endOdometer }.firstOrNull() ?: vehicle.odometerKm ?: 0.0

        val requestBody = JSONObject().apply {
            put("asset_id", vehicle.id)
            put("device_id", c.prefs.getDeviceId())
            put("current_odo", currentOdo)
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
