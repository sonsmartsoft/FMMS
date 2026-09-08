package com.fmms.carlogger.core.adas

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.ToneGenerator
import android.speech.tts.TextToSpeech
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Locale

/**
 * Bộ điều phối và phát âm thanh cảnh báo ADAS (State Machine Debounce + Voice TTS & Beep Alert Engine)
 */
class AdasAlertEngine(
    private val context: Context,
    private val scope: CoroutineScope,
    private var settings: AdasSettings = AdasSettings()
) : TextToSpeech.OnInitListener {

    private val _alertStateFlow = MutableStateFlow(AdasAlertState())
    val alertStateFlow: StateFlow<AdasAlertState> = _alertStateFlow.asStateFlow()

    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    // ToneGenerator cho âm thanh bíp cảnh báo tức thì (< 5ms) không có độ trễ
    private var toneGenerator: ToneGenerator? = null

    // Multi-Frame Debounce State Machine (Tránh nhấp nháy HUD & cảnh báo sai)
    private var debouncedAlertLevel = AdasAlertLevel.SAFE
    private var debouncedAlertType = AdasAlertType.NONE
    private var consecutiveHigherFrames = 0
    private var consecutiveLowerFrames = 0
    private val ESCALATE_FRAME_THRESHOLD = 2 // Cần 2 frame liên tiếp nguy hiểm để nâng cấp cảnh báo
    private val DEESCALATE_FRAME_THRESHOLD = 5 // Cần 5 frame liên tiếp an toàn để hạ cấp cảnh báo

    // Cooldown thời gian giữa các lần phát giọng nói (chống spam âm thanh)
    private var lastFcwVoiceTime = 0L
    private var lastLdwVoiceTime = 0L
    private var lastFvsaVoiceTime = 0L
    private var lastHmwVoiceTime = 0L
    private var lastBeepTime = 0L

    // Theo dõi trạng thái xe trước cho tính năng FVSA (Front Vehicle Start Alert)
    private var leadVehicleStoppedDistance: Float? = null
    private var leadVehicleStationarySinceMs = 0L

    init {
        tts = TextToSpeech(context.applicationContext, this)
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 95)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale("vi", "VN"))
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts?.setLanguage(Locale.US)
            }
            tts?.setSpeechRate(1.15f) // Tăng tốc độ giọng nói để cảnh báo nhanh gọn
            isTtsReady = true
        }
    }

    fun updateSettings(newSettings: AdasSettings) {
        this.settings = newSettings
    }

    /**
     * Đánh giá và kích hoạt cảnh báo dựa trên Vision + OBD Speed
     */
    fun evaluate(
        vision: AdasVisionOutput,
        obdSpeedKmh: Double,
        isObdConnected: Boolean
    ) {
        val now = System.currentTimeMillis()
        val primary = vision.primaryVehicle
        val lane = vision.laneResult
        val currentSpeed = obdSpeedKmh.toFloat()

        var candidateAlert = AdasAlertState(type = AdasAlertType.NONE, level = AdasAlertLevel.SAFE)

        // 1. Kiểm tra FCW (Forward Collision Warning) - Ưu tiên cao nhất
        if (settings.isFcwEnabled && primary != null && currentSpeed > 10f) {
            if (primary.alertLevel == AdasAlertLevel.CRITICAL) {
                candidateAlert = AdasAlertState(
                    type = AdasAlertType.FCW,
                    level = AdasAlertLevel.CRITICAL,
                    messageVi = "⚠️ NGUY HIỂM! PHANH GẤP!",
                    distanceMeters = primary.distanceMeters,
                    ttcSec = primary.timeToCollisionSec,
                    primaryClass = primary.objectClass,
                    timestamp = now
                )
            } else if (primary.alertLevel == AdasAlertLevel.CAUTION) {
                candidateAlert = AdasAlertState(
                    type = AdasAlertType.HMW,
                    level = AdasAlertLevel.CAUTION,
                    messageVi = "Giữ khoảng cách an toàn",
                    distanceMeters = primary.distanceMeters,
                    ttcSec = primary.timeToCollisionSec,
                    primaryClass = primary.objectClass,
                    timestamp = now
                )
            }
        }

        // 2. Kiểm tra LDW (Lane Departure Warning) - Khi tốc độ > ngưỡng cài đặt (mặc định 45 km/h)
        if (candidateAlert.type == AdasAlertType.NONE && settings.isLdwEnabled && lane != null && currentSpeed >= settings.ldwMinSpeedKmh) {
            if (lane.isDepartingLeft) {
                candidateAlert = AdasAlertState(
                    type = AdasAlertType.LDW_LEFT,
                    level = AdasAlertLevel.CAUTION,
                    messageVi = "Lệch làn bên trái!",
                    timestamp = now
                )
            } else if (lane.isDepartingRight) {
                candidateAlert = AdasAlertState(
                    type = AdasAlertType.LDW_RIGHT,
                    level = AdasAlertLevel.CAUTION,
                    messageVi = "Lệch làn bên phải!",
                    timestamp = now
                )
            }
        }

        // 3. Kiểm tra FVSA (Front Vehicle Start Alert) - Khi xe mình dừng (speed < 2 km/h)
        if (candidateAlert.type == AdasAlertType.NONE && settings.isFvsaEnabled && currentSpeed < 2.0f) {
            if (primary != null) {
                if (leadVehicleStoppedDistance == null) {
                    leadVehicleStoppedDistance = primary.distanceMeters
                    leadVehicleStationarySinceMs = now
                } else {
                    val stationaryDuration = now - leadVehicleStationarySinceMs
                    val distDiff = primary.distanceMeters - (leadVehicleStoppedDistance ?: 0f)

                    // Xe trước phải từng dừng lại ít nhất 3s và bây giờ bắt đầu di chuyển cách xa > 3.5m
                    if (stationaryDuration >= 3000 && distDiff > 3.5f) {
                        candidateAlert = AdasAlertState(
                            type = AdasAlertType.FVSA,
                            level = AdasAlertLevel.CAUTION,
                            messageVi = "Xe phía trước đã di chuyển",
                            distanceMeters = primary.distanceMeters,
                            primaryClass = primary.objectClass,
                            timestamp = now
                        )
                        // Reset vị trí xe sau khi đã cảnh báo
                        leadVehicleStoppedDistance = primary.distanceMeters
                        leadVehicleStationarySinceMs = now
                    }
                }
            } else {
                leadVehicleStoppedDistance = null
                leadVehicleStationarySinceMs = 0L
            }
        } else {
            leadVehicleStoppedDistance = null
            leadVehicleStationarySinceMs = 0L
        }

        // --- 4. Hysteresis State Machine Debounce Filter ---
        val finalAlert = applyDebounceFilter(candidateAlert, now)
        _alertStateFlow.value = finalAlert

        // --- 5. Kích hoạt âm thanh / giọng nói dựa trên trạng thái đã qua debounce ---
        triggerAudioAndVoice(finalAlert, now)
    }

    /**
     * Bộ lọc chống rung / nhấp nháy trạng thái cảnh báo (Hysteresis Filter)
     */
    private fun applyDebounceFilter(candidate: AdasAlertState, nowMs: Long): AdasAlertState {
        val candLevelOrdinal = candidate.level.ordinal
        val currLevelOrdinal = debouncedAlertLevel.ordinal

        if (candLevelOrdinal > currLevelOrdinal) {
            // Có dấu hiệu nguy hiểm hơn -> Tăng đếm frame leo thang
            consecutiveHigherFrames++
            consecutiveLowerFrames = 0
            if (consecutiveHigherFrames >= ESCALATE_FRAME_THRESHOLD) {
                debouncedAlertLevel = candidate.level
                debouncedAlertType = candidate.type
                consecutiveHigherFrames = 0
            }
        } else if (candLevelOrdinal < currLevelOrdinal) {
            // Có dấu hiệu an toàn hơn -> Cần đủ 5 frame an toàn mới hạ cấp
            consecutiveLowerFrames++
            consecutiveHigherFrames = 0
            if (consecutiveLowerFrames >= DEESCALATE_FRAME_THRESHOLD) {
                debouncedAlertLevel = candidate.level
                debouncedAlertType = candidate.type
                consecutiveLowerFrames = 0
            }
        } else {
            // Cùng cấp độ
            debouncedAlertType = candidate.type
            consecutiveHigherFrames = 0
            consecutiveLowerFrames = 0
        }

        return candidate.copy(
            type = debouncedAlertType,
            level = debouncedAlertLevel
        )
    }

    private fun triggerAudioAndVoice(alert: AdasAlertState, now: Long) {
        when (alert.type) {
            AdasAlertType.FCW -> {
                // Âm thanh bíp tức thời
                if (settings.isSoundBeepEnabled && now - lastBeepTime > 500) {
                    try {
                        toneGenerator?.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 300)
                    } catch (e: Exception) {}
                    lastBeepTime = now
                }
                // Giọng nói tiếng Việt
                if (now - lastFcwVoiceTime > 3000) {
                    playVoiceAlert("Chú ý va chạm phía trước!")
                    lastFcwVoiceTime = now
                }
            }
            AdasAlertType.HMW -> {
                if (now - lastHmwVoiceTime > 6000) {
                    playVoiceAlert("Giữ khoảng cách an toàn")
                    lastHmwVoiceTime = now
                }
            }
            AdasAlertType.LDW_LEFT -> {
                if (settings.isSoundBeepEnabled && now - lastBeepTime > 600) {
                    try {
                        toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 200)
                    } catch (e: Exception) {}
                    lastBeepTime = now
                }
                if (now - lastLdwVoiceTime > 4000) {
                    playVoiceAlert("Lệch làn trái")
                    lastLdwVoiceTime = now
                }
            }
            AdasAlertType.LDW_RIGHT -> {
                if (settings.isSoundBeepEnabled && now - lastBeepTime > 600) {
                    try {
                        toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 200)
                    } catch (e: Exception) {}
                    lastBeepTime = now
                }
                if (now - lastLdwVoiceTime > 4000) {
                    playVoiceAlert("Lệch làn phải")
                    lastLdwVoiceTime = now
                }
            }
            AdasAlertType.FVSA -> {
                if (settings.isSoundBeepEnabled && now - lastBeepTime > 600) {
                    try {
                        toneGenerator?.startTone(ToneGenerator.TONE_PROP_PROMPT, 250)
                    } catch (e: Exception) {}
                    lastBeepTime = now
                }
                if (now - lastFvsaVoiceTime > 8000) {
                    playVoiceAlert("Xe trước đã di chuyển")
                    lastFvsaVoiceTime = now
                }
            }
            AdasAlertType.NONE -> {}
        }
    }

    private fun playVoiceAlert(text: String) {
        if (!settings.isVoiceAlertEnabled) return
        scope.launch(Dispatchers.Main) {
            if (isTtsReady) {
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "ADAS_ALERT")
            }
        }
    }

    fun release() {
        try {
            tts?.stop()
            tts?.shutdown()
            toneGenerator?.release()
            toneGenerator = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
