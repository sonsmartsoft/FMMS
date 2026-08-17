package com.fmms.carlogger

import android.content.Context
import android.content.Intent
import androidx.room.Room
import com.fmms.carlogger.core.database.AppDatabase
import com.fmms.carlogger.core.gps.GpsTracker
import com.fmms.carlogger.core.obd.OBDConnectionManager
import com.fmms.carlogger.core.odometer.VirtualOdometerEngine
import com.fmms.carlogger.data.repository.DiagnosticLogEmitter
import com.fmms.carlogger.data.repository.GpsTrackRepository
import com.fmms.carlogger.data.repository.PrefsStore
import com.fmms.carlogger.data.repository.SyncQueueRepository
import com.fmms.carlogger.data.repository.TelemetryRepository
import com.fmms.carlogger.data.repository.TripRepository
import com.fmms.carlogger.data.repository.VehicleRepository
import com.fmms.carlogger.data.sync.SyncWorker
import com.fmms.carlogger.domain.engine.FuelEngine
import com.fmms.carlogger.domain.engine.FuelLogRepository
import com.fmms.carlogger.domain.engine.TelemetryEngine
import com.fmms.carlogger.domain.engine.TripEngine
import com.fmms.carlogger.service.TelemetryService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Manual service-locator container (Clean Architecture without a DI framework —
 * keeps the build simple and works offline on ZESTECH).
 */
object AppContainer {

    lateinit var context: Context
    lateinit var db: AppDatabase
    lateinit var prefs: PrefsStore
    lateinit var vehicleRepository: VehicleRepository
    lateinit var telemetryRepository: TelemetryRepository
    lateinit var tripRepository: TripRepository
    lateinit var fuelLogRepository: FuelLogRepository
    lateinit var syncQueueRepository: SyncQueueRepository
    lateinit var gpsTrackRepository: GpsTrackRepository
    lateinit var diagLog: DiagnosticLogEmitter
    lateinit var gpsTracker: GpsTracker
    lateinit var obdManager: OBDConnectionManager
    lateinit var telemetryEngine: TelemetryEngine
    lateinit var tripEngine: TripEngine
    lateinit var fuelEngine: FuelEngine
    lateinit var odometerEngine: VirtualOdometerEngine

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _serviceRunning = MutableStateFlow(false)
    val serviceRunning: StateFlow<Boolean> = _serviceRunning.asStateFlow()

    private val _themeMode = MutableStateFlow("dark")
    val themeMode: StateFlow<String> = _themeMode.asStateFlow()

    fun setThemeMode(mode: String) {
        prefs.setTheme(mode)
        _themeMode.value = mode
    }

    private val _deviceMode = MutableStateFlow("obd")
    val deviceMode: StateFlow<String> = _deviceMode.asStateFlow()

    fun setDeviceMode(mode: String) {
        prefs.setDeviceMode(mode)
        _deviceMode.value = mode
    }

    private val _language = MutableStateFlow("en")
    val language: StateFlow<String> = _language.asStateFlow()

    fun setLanguage(lang: String) {
        prefs.setLanguage(lang)
        _language.value = lang
    }

    /** GPS-only live telemetry (bike/tracker mode, no OBD). */
    private val _gpsTelemetry = MutableStateFlow(com.fmms.carlogger.domain.model.LiveTelemetry())
    val gpsTelemetry: StateFlow<com.fmms.carlogger.domain.model.LiveTelemetry> = _gpsTelemetry.asStateFlow()

    fun publishGpsTelemetry(t: com.fmms.carlogger.domain.model.LiveTelemetry) {
        _gpsTelemetry.value = t
    }

    @Synchronized
    fun init(context: Context) {
        if (::context.isInitialized) return
        this.context = context.applicationContext
        this.db = Room.databaseBuilder(
                this.context,
                AppDatabase::class.java,
                "fmms.db",
            )
            .addMigrations(AppDatabase.MIGRATION_1_2, AppDatabase.MIGRATION_2_3)
            .build()

        this.prefs = PrefsStore(this.context)
        this._themeMode.value = prefs.getTheme()
        this._deviceMode.value = prefs.getDeviceMode()
        this._language.value = prefs.getLanguage()

        // Layer: repositories (depend on DAOs)
        this.telemetryRepository = TelemetryRepository(db.telemetryDao())
        this.syncQueueRepository = SyncQueueRepository(db.syncQueueDao())
        this.tripRepository = TripRepository(db.tripDao(), syncQueueRepository)
        this.gpsTrackRepository = GpsTrackRepository(db.gpsTrackPointDao(), syncQueueRepository)
        this.fuelLogRepository = FuelLogRepository(db.fuelLogDao())
        this.vehicleRepository = VehicleRepository(
            this.context, db.vehicleDao(), db.deviceDao(), db.syncQueueDao(), prefs,
        )
        this.diagLog = DiagnosticLogEmitter()
        this.gpsTracker = GpsTracker(this.context)
        this.odometerEngine = VirtualOdometerEngine(prefs, vehicleRepository)

        // Layer: OBD connection
        this.obdManager = OBDConnectionManager(
            context = this.context,
            scope = appScope,
            settings = { prefs.getMac() },
        )

        // Layer: engines
        this.telemetryEngine = TelemetryEngine(
            elms = obdManager.elms,
            gpsTracker = gpsTracker,
            diagLogOutput = if (prefs.getDiagEnabled()) diagLog else null,
            scope = appScope,
        )
        this.fuelEngine = FuelEngine(vehicleRepository, tripRepository, fuelLogRepository)
        this.tripEngine = TripEngine(vehicleRepository, tripRepository, appScope)
    }

    fun telemetryEngineState(): StateFlow<com.fmms.carlogger.domain.model.LiveTelemetry> =
        telemetryEngine.live

    fun startTelemetryService() {
        val svc = Intent(context, TelemetryService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(svc)
        } else {
            context.startService(svc)
        }
        _serviceRunning.value = true
    }

    fun scheduleSync() {
        SyncWorker.schedule(context)
    }

    fun launch(block: suspend () -> Unit) {
        appScope.launch { block() }
    }
}