package com.fmms.carlogger.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.database.entity.FuelLogEntity
import com.fmms.carlogger.core.database.entity.TripEntity
import com.fmms.carlogger.data.repository.TripAggregate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Giá xăng mặc định (₫/L) dùng khi chưa có FuelLog nào trong hệ thống. */
private const val DEFAULT_FUEL_PRICE_VND = 24_000.0

/** Chế độ phân tích trên tab Analysis (khớp 3 chế độ Web). */
enum class AnalyticsMode(val id: Int) {
    DAILY(0),
    MONTHLY(1),
    YEARLY(2),
}

/** Một cột dữ liệu cho biểu đồ/so sánh theo kỳ. */
data class PeriodStat(
    val label: String,
    val distanceKm: Double,
    val fuelUsedLiters: Double,
    val consumptionL100km: Double?,
    /** Chi phí nhiên liệu ước tính (₫) = fuel_used_liters × giá tham chiếu. */
    val fuelCostVnd: Double,
)

/** Một dòng trong nhật ký liên tục theo ngày. */
data class DayLogEntry(
    val dateLabel: String,
    val dayOfMonth: Int,
    val distanceKm: Double,
    val odoKm: Double?,
    val tripCount: Int,
    /** Các chuyến trong ngày (km). */
    val tripsKm: List<Double>,
    val consumptionL100km: Double?,
    val fuelCostVnd: Double,
) {
    val isRestDay: Boolean get() = distanceKm <= 0.05
}

/** Dữ liệu cho AI Advisor (đồng bộ với VehicleAiRequest bên Web). */
data class VehicleAiRequest(
    val asset_id: String,
    val current_odo: Double,
    val recent_trips: List<TripSummaryDto>,
    val fuel_logs: List<FuelSummaryDto>,
    val user_prompt: String? = null,
)

data class TripSummaryDto(
    val start_time: Long,
    val end_time: Long,
    val distance_km: Double,
    val fuel_used_liters: Double?,
    val average_consumption_l100km: Double?,
    val average_speed_kmh: Double?,
    val max_speed_kmh: Double?,
    val start_odometer: Double?,
    val end_odometer: Double?,
)

data class FuelSummaryDto(
    val date: Long,
    val odometer_km: Double?,
    val fuel_liters: Double,
    val price_per_liter: Double?,
    val total_cost: Double?,
    val currency: String,
)

/** Một lát cắt chi phí theo danh mục (cho donut chart). */
data class ExpenseSlice(
    val category: String,
    val label: String,
    val amount: Double,
    val currency: String = "VND",
)

class StatsViewModel : ViewModel() {
    private val c = AppContainer

    private val _mode = MutableStateFlow(AnalyticsMode.DAILY)
    val mode: StateFlow<AnalyticsMode> = _mode

    private val _today = MutableStateFlow<TripAggregate?>(null)
    val today = _today
    private val _month = MutableStateFlow<TripAggregate?>(null)
    val month = _month
    private val _total = MutableStateFlow<TripAggregate?>(null)
    val total = _total

    private val _dailyLog = MutableStateFlow<List<DayLogEntry>>(emptyList())
    val dailyLog = _dailyLog

    private val _monthly = MutableStateFlow<List<PeriodStat>>(emptyList())
    val monthly = _monthly

    private val _yearly = MutableStateFlow<List<PeriodStat>>(emptyList())
    val yearly = _yearly

    private val _years = MutableStateFlow<List<Int>>(emptyList())
    val years = _years
    private val _selectedYear = MutableStateFlow<Int?>(null)
    val selectedYear = _selectedYear

    /** Tổng thời gian lái (giây) của hôm nay / tháng này. */
    private val _driveSecondsToday = MutableStateFlow(0L)
    val driveSecondsToday: StateFlow<Long> = _driveSecondsToday
    private val _driveSecondsMonth = MutableStateFlow(0L)
    val driveSecondsMonth: StateFlow<Long> = _driveSecondsMonth

    /** ODO hiện tại (km). */
    private val _odoKm = MutableStateFlow<Double?>(null)
    val odoKm: StateFlow<Double?> = _odoKm

    /** Quãng đường tháng trước (km) để so sánh %. */
    private val _prevMonthDistanceKm = MutableStateFlow(0.0)
    val prevMonthDistanceKm: StateFlow<Double> = _prevMonthDistanceKm

    /** Tháng được chọn trong chế độ Tháng (1..12). Mặc định = tháng hiện tại. */
    private val _selectedMonth = MutableStateFlow(Calendar.getInstance().get(Calendar.MONTH) + 1)
    val selectedMonth: StateFlow<Int> = _selectedMonth

    /** Phân bổ chi phí theo danh mục của kỳ đang xem (từ RPC DB). */
    private val _expenseBreakdown = MutableStateFlow<List<ExpenseSlice>>(emptyList())
    val expenseBreakdown: StateFlow<List<ExpenseSlice>> = _expenseBreakdown

    /** Giá xăng tham chiếu hiện tại (₫/L) từ FuelLog gần nhất. */
    private val _fuelPriceVnd = MutableStateFlow(DEFAULT_FUEL_PRICE_VND)
    val fuelPriceVnd: StateFlow<Double> = _fuelPriceVnd

    /**
     * Tiêu thụ (L/100km) pe kỳ, loài outlier per-trip: chuyến con consumption
     * ngoài khoảng hợp lý (0.5..40 L/100km, dữ liu OBD bẩn) nu ướnită à.
     * Khớp FuelEngine.estimateConsumption (rev96).
     */
    private fun consumptionL100km(trips: List<TripEntity>): Double? {
        val clean = trips.filter {
            it.endOdometer != null && it.startOdometer != null &&
                it.fuelUsedLiters != null && it.distanceKm > 1
        }.filter {
            val c = it.fuelUsedLiters!! / it.distanceKm * 100
            c in 0.5..40.0
        }
        if (clean.isEmpty()) return null
        val dist = clean.sumOf { it.distanceKm }
        val fuel = clean.sumOf { it.fuelUsedLiters ?: 0.0 }
        if (fuel <= 0 || dist <= 0) return null
        val c = fuel / dist * 100
        return if (c in 0.5..40.0) c else null
    }

    init {
        viewModelScope.launch {
            val vehicle = c.vehicleRepository.getActive() ?: return@launch
            val now = Calendar.getInstance()
            val todayStart = now.apply { set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis
            val monthStart = now.apply { set(Calendar.DAY_OF_MONTH, 1); set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis
            val end = System.currentTimeMillis()

            _odoKm.value = vehicle.odometerKm

            _fuelPriceVnd.value = latestFuelPrice(vehicle.id, end) ?: DEFAULT_FUEL_PRICE_VND

            val todayTrips = c.tripRepository.getBetween(vehicle.id, todayStart, end)
            val monthTrips = c.tripRepository.getBetween(vehicle.id, monthStart, end)
            _today.value = aggregate(todayTrips)
            _month.value = aggregate(monthTrips)
            _total.value = c.tripRepository.aggregate(vehicle.id)
            _driveSecondsToday.value = todayTrips.sumOf { it.durationSeconds.coerceAtLeast(0) }
            _driveSecondsMonth.value = monthTrips.sumOf { it.durationSeconds.coerceAtLeast(0) }
            _prevMonthDistanceKm.value = previousMonthDistance(vehicle.id, monthStart)

            _dailyLog.value = buildDailyLog(vehicle.id, _fuelPriceVnd.value)

            _years.value = c.tripRepository.getYears(vehicle.id).ifEmpty {
                listOf(Calendar.getInstance().get(Calendar.YEAR))
            }
            val currentYear = Calendar.getInstance().get(Calendar.YEAR)
            _selectedYear.value = if (_years.value.contains(currentYear)) currentYear
                                  else (_years.value.firstOrNull() ?: currentYear)
            _monthly.value = buildMonthly(vehicle.id, _selectedYear.value!!, _fuelPriceVnd.value)
            _yearly.value = buildYearly(vehicle.id, _fuelPriceVnd.value)
            loadExpenseForCurrentSelection(AnalyticsMode.MONTHLY)
        }
    }

    fun setMode(mode: AnalyticsMode) {
        _mode.value = mode
        viewModelScope.launch { loadExpenseForCurrentSelection(mode) }
    }

    fun selectYear(year: Int) {
        if (_selectedYear.value == year) return
        _selectedYear.value = year
        viewModelScope.launch {
            val vehicle = c.vehicleRepository.getActive() ?: return@launch
            _monthly.value = buildMonthly(vehicle.id, year, _fuelPriceVnd.value)
            loadExpenseForCurrentSelection(_mode.value)
        }
    }

    fun selectMonth(month: Int) {
        if (_selectedMonth.value == month) return
        _selectedMonth.value = month
        viewModelScope.launch { loadExpenseForCurrentSelection(AnalyticsMode.MONTHLY) }
    }

    /** Tải phân bổ chi phí theo danh mục từ DB cho kỳ đang chọn. */
    fun loadExpenseForCurrentSelection(mode: AnalyticsMode) {
        viewModelScope.launch {
            val assetId = c.prefs.getAssignedVehicleId()
                ?: c.vehicleRepository.getActive()?.id
                ?: return@launch
            val year = _selectedYear.value ?: Calendar.getInstance().get(Calendar.YEAR)
            val (from, to) = when (mode) {
                AnalyticsMode.MONTHLY -> {
                    val m = _selectedMonth.value
                    val cal = Calendar.getInstance().apply {
                        clear()
                        set(year, m - 1, 1)
                        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                    }
                    val f = cal.timeInMillis
                    val t = (cal.clone() as Calendar).also { it.add(Calendar.MONTH, 1) }.timeInMillis - 1
                    f to t
                }
                else -> {
                    val cal = Calendar.getInstance().apply {
                        clear(); set(year, 0, 1)
                        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                    }
                    val f = cal.timeInMillis
                    val t = (cal.clone() as Calendar).also { it.set(year + 1, 0, 1) }.timeInMillis - 1
                    f to t
                }
            }
            _expenseBreakdown.value = withContext(Dispatchers.IO) { fetchExpenseBreakdown(assetId, from, to) }
            android.util.Log.d("StatsVM", "expense breakdown [$mode] asset=$assetId n=${_expenseBreakdown.value.size}")
        }
    }

    /** Gọi RPC fmms_get_expense_breakdown để lấy chi phí theo danh mục từ DB. */
    private suspend fun fetchExpenseBreakdown(assetId: String, from: Long, to: Long): List<ExpenseSlice> {
        return try {
            val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            val body = org.json.JSONObject().apply {
                put("p_device_id", c.prefs.getDeviceId())
                put("p_asset_id", assetId)
                put("p_from", fmt.format(Date(from)))
                put("p_to", fmt.format(Date(to)))
            }
            val request = okhttp3.Request.Builder()
                .url("${com.fmms.carlogger.BuildConfig.SUPABASE_URL}/rest/v1/rpc/fmms_get_expense_breakdown")
                .header("apikey", com.fmms.carlogger.BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                .header("Authorization", "Bearer ${com.fmms.carlogger.BuildConfig.SUPABASE_PUBLISHABLE_KEY}")
                .header("Content-Type", "application/json")
                .post(body.toString().toRequestBody("application/json".toMediaType()))
                .build()
            val resp = okhttp3.OkHttpClient().newCall(request).execute()
            if (!resp.isSuccessful) {
                android.util.Log.d("StatsVM", "expense RPC http=${resp.code} body=${resp.peekBody(400).string()}")
                return emptyList()
            }
            val text = resp.body?.string() ?: return emptyList()
            android.util.Log.d("StatsVM", "expense raw = $text")
            val arr = try { org.json.JSONArray(text) } catch (e: Exception) { return emptyList() }
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                ExpenseSlice(
                    category = o.optString("category"),
                    label = o.optString("label").takeIf { it.isNotBlank() } ?: o.optString("category"),
                    amount = o.optDouble("amount", 0.0),
                    currency = o.optString("currency").takeIf { it.isNotBlank() } ?: "VND",
                )
            }.filter { it.amount > 0 }
        } catch (e: Exception) {
            android.util.Log.d("StatsVM", "expense EXC", e)
            emptyList()
        }
    }

    private fun aggregate(trips: List<TripEntity>): TripAggregate = TripAggregate(
        trips.sumOf { it.distanceKm },
        trips.sumOf { it.fuelUsedLiters ?: 0.0 },
        trips.size,
        trips.maxOfOrNull { it.maxSpeedKmh ?: 0.0 } ?: 0.0,
        trips.mapNotNull { it.averageSpeedKmh }.average().takeIf { it.isFinite() } ?: 0.0,
    )

    /** Giá xăng (₫/L) từ lần đổ gần nhất có<=cutoff, hoặc bất kỳ log nào nếu chưa đến cutoff. */
    private suspend fun latestFuelPrice(vehicleId: String, cutoff: Long): Double? {
        val logs = c.fuelLogRepository.getByVehicle(vehicleId).sortedBy { it.timestamp }
        val latestBefore = logs.lastOrNull { it.timestamp <= cutoff } ?: logs.lastOrNull()
        return latestBefore?.pricePerLiter
    }

    /** Xây nhật ký liên tục các ngày trong tháng hiện tại, gồm cả ngày nghỉ. */
    private suspend fun buildDailyLog(vehicleId: String, price: Double): List<DayLogEntry> {
        val now = Calendar.getInstance()
        val year = now.get(Calendar.YEAR)
        val monthIdx = now.get(Calendar.MONTH)
        val daysInMonth = now.getActualMaximum(Calendar.DAY_OF_MONTH)
        val dayFmt = SimpleDateFormat("d MMM", Locale.getDefault())
        val monthFmt = SimpleDateFormat("MMM", Locale.getDefault())

        // ODO của ngày hôm trước (bảo lưu qua các ngày nghỉ).
        var prevOdo: Double? = tripsWithOdoUpTo(vehicleId, 0).firstOrNull()?.startOdometer

        val result = mutableListOf<DayLogEntry>()
        for (d in 1..daysInMonth) {
            val cal = Calendar.getInstance().apply {
                clear()
                set(year, monthIdx, d)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            val s = cal.timeInMillis
            val e = (cal.clone() as Calendar).also { it.add(Calendar.DAY_OF_MONTH, 1) }.timeInMillis
            val trips = c.tripRepository.getBetween(vehicleId, s, e).filter { it.status == "COMPLETED" }
            val dist = trips.sumOf { it.distanceKm }
            val fuel = trips.sumOf { it.fuelUsedLiters ?: 0.0 }
            val odo = trips.mapNotNull { it.endOdometer }.lastOrNull() ?: prevOdo

            val label = if (d == 1) "${dayFmt.format(Date(s))} · ${monthFmt.format(Date(s))}" else dayFmt.format(Date(s))
            result += DayLogEntry(
                dateLabel = label,
                dayOfMonth = d,
                distanceKm = dist,
                odoKm = odo,
                tripCount = trips.size,
                tripsKm = trips.sortedBy { it.startTime }.map { it.distanceKm },
                consumptionL100km = consumptionL100km(trips),
                fuelCostVnd = fuel * price,
            )
            if (odo != null) prevOdo = odo
        }
        return result
    }

    private suspend fun buildMonthly(vehicleId: String, year: Int, price: Double): List<PeriodStat> {
        val monthFmt = SimpleDateFormat("MMM", Locale.getDefault())
        val result = mutableListOf<PeriodStat>()
        for (m in 0 until 12) {
            val ms = Calendar.getInstance().apply {
                clear(); set(year, m, 1)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            val me = Calendar.getInstance().apply {
                clear(); set(year, m, 1)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                add(Calendar.MONTH, 1)
            }.timeInMillis
            val trips = c.tripRepository.getBetween(vehicleId, ms, me)
            val dist = trips.sumOf { it.distanceKm }
            val fuel = trips.sumOf { it.fuelUsedLiters ?: 0.0 }
            result += PeriodStat(
                label = monthFmt.format(Date(ms)),
                distanceKm = dist,
                fuelUsedLiters = fuel,
                consumptionL100km = consumptionL100km(trips),
                fuelCostVnd = fuel * price,
            )
        }
        return result
    }

    private suspend fun buildYearly(vehicleId: String, price: Double): List<PeriodStat> {
        val result = mutableListOf<PeriodStat>()
        val startYear = (_years.value.minOrNull() ?: Calendar.getInstance().get(Calendar.YEAR))
        val currentYear = Calendar.getInstance().get(Calendar.YEAR)
        for (y in startYear..currentYear) {
            val ys = Calendar.getInstance().apply {
                clear(); set(y, 0, 1)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            val ye = Calendar.getInstance().apply {
                clear(); set(y + 1, 0, 1)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            val trips = c.tripRepository.getBetween(vehicleId, ys, ye)
            val dist = trips.sumOf { it.distanceKm }
            val fuel = trips.sumOf { it.fuelUsedLiters ?: 0.0 }
            result += PeriodStat(
                label = y.toString(),
                distanceKm = dist,
                fuelUsedLiters = fuel,
                consumptionL100km = consumptionL100km(trips),
                fuelCostVnd = fuel * price,
            )
        }
        return result
    }

    /** Lấy trips có odometer (end_time DESC) để ước ODO đầu tháng. */
    private suspend fun tripsWithOdoUpTo(vehicleId: String, cutoff: Long): List<TripEntity> =
        c.tripRepository.getWithOdometer()

    /** Tổng quãng đường (km) của tháng liền trước tháng hiện tại (để so sánh %). */
    private suspend fun previousMonthDistance(vehicleId: String, currentMonthStart: Long): Double {
        val cal = Calendar.getInstance().apply { timeInMillis = currentMonthStart }
        cal.add(Calendar.MONTH, -1)
        val prevStart = cal.timeInMillis
        val prevEnd = currentMonthStart
        return c.tripRepository.getBetween(vehicleId, prevStart, prevEnd).sumOf { it.distanceKm }
    }
}
