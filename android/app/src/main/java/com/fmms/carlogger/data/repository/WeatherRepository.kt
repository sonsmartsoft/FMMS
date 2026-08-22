package com.fmms.carlogger.data.repository

import org.json.JSONObject
import java.net.URL

data class WeatherCurrent(
    val temperature: Double,
    val apparentTemp: Double,
    val humidity: Int,
    val windKmh: Double,
    val code: Int,
    val isDay: Boolean,
    val uvIndex: Double?,
    val pressureHpa: Double?,
)

data class WeatherHour(val time: String, val temp: Double, val code: Int, val precipProb: Int)

data class WeatherDay(
    val date: String,
    val max: Double,
    val min: Double,
    val code: Int,
    val precipProb: Int,
    val uvMax: Double?,
    val sunrise: String?,
    val sunset: String?,
)

data class WeatherData(
    val latitude: Double,
    val longitude: Double,
    val current: WeatherCurrent,
    val hourly: List<WeatherHour>,
    val daily: List<WeatherDay>,
    val fetchedAt: Long = System.currentTimeMillis(),
)

/**
 * Thời tiết qua Open-Meteo (miễn phí, không cần API key).
 * fetchSync() là blocking — gọi trong Dispatchers.IO.
 */
object WeatherRepository {

    /** Cache in-memory: mở lại màn hình hiển thị ngay trong khi refresh nền. */
    @Volatile
    var lastData: WeatherData? = null

    fun fetchSync(lat: Double, lon: Double): WeatherData? = try {
        val url = "https://api.open-meteo.com/v1/forecast" +
            "?latitude=$lat&longitude=$lon" +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,uv_index,surface_pressure" +
            "&hourly=temperature_2m,weather_code,precipitation_probability" +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset" +
            "&forecast_days=7&timezone=auto"
        parse(URL(url).readText(), lat, lon)
    } catch (e: Exception) {
        null
    }

    // ---- Disk cache: mở lại app hiện thời tiết NGAY, không chờ GPS fix ----
    private const val CACHE_PREFS = "fmms_weather"
    private const val CACHE_KEY = "last"

    fun saveDiskCache(context: android.content.Context, d: WeatherData) {
        runCatching {
            context.getSharedPreferences(CACHE_PREFS, android.content.Context.MODE_PRIVATE)
                .edit().putString(CACHE_KEY, toJson(d)).apply()
        }
    }

    fun loadDiskCache(context: android.content.Context): WeatherData? = runCatching {
        context.getSharedPreferences(CACHE_PREFS, android.content.Context.MODE_PRIVATE)
            .getString(CACHE_KEY, null)?.let { fromJson(it) }
    }.getOrNull()

    private fun toJson(d: WeatherData): String = JSONObject()
        .put("lat", d.latitude).put("lon", d.longitude).put("at", d.fetchedAt)
        .put(
            "cur", JSONObject()
                .put("t", d.current.temperature).put("at", d.current.apparentTemp)
                .put("h", d.current.humidity).put("w", d.current.windKmh)
                .put("c", d.current.code).put("d", if (d.current.isDay) 1 else 0)
                .put("u", d.current.uvIndex ?: JSONObject.NULL)
                .put("p", d.current.pressureHpa ?: JSONObject.NULL)
        )
        .put("hourly", org.json.JSONArray().apply {
            d.hourly.forEach { h ->
                put(JSONObject().put("time", h.time).put("t", h.temp).put("c", h.code).put("p", h.precipProb))
            }
        })
        .put("daily", org.json.JSONArray().apply {
            d.daily.forEach { dy ->
                put(
                    JSONObject().put("date", dy.date).put("max", dy.max).put("min", dy.min)
                        .put("c", dy.code).put("p", dy.precipProb)
                        .put("u", dy.uvMax ?: JSONObject.NULL)
                        .put("sr", dy.sunrise ?: JSONObject.NULL)
                        .put("ss", dy.sunset ?: JSONObject.NULL)
                )
            }
        })
        .toString()

    private fun fromJson(s: String): WeatherData? = try {
        val o = JSONObject(s)
        val cur = o.getJSONObject("cur")
        WeatherData(
            latitude = o.getDouble("lat"),
            longitude = o.getDouble("lon"),
            fetchedAt = o.optLong("at"),
            current = WeatherCurrent(
                temperature = cur.getDouble("t"),
                apparentTemp = cur.getDouble("at"),
                humidity = cur.optInt("h"),
                windKmh = cur.getDouble("w"),
                code = cur.getInt("c"),
                isDay = cur.optInt("d", 1) == 1,
                uvIndex = if (cur.isNull("u")) null else cur.getDouble("u"),
                pressureHpa = if (cur.isNull("p")) null else cur.getDouble("p"),
            ),
            hourly = (0 until o.getJSONArray("hourly").length()).map { i ->
                val h = o.getJSONArray("hourly").getJSONObject(i)
                WeatherHour(h.getString("time"), h.getDouble("t"), h.getInt("c"), h.optInt("p"))
            },
            daily = (0 until o.getJSONArray("daily").length()).map { i ->
                val dy = o.getJSONArray("daily").getJSONObject(i)
                WeatherDay(
                    date = dy.getString("date"),
                    max = dy.getDouble("max"),
                    min = dy.getDouble("min"),
                    code = dy.getInt("c"),
                    precipProb = dy.optInt("p"),
                    uvMax = if (dy.isNull("u")) null else dy.getDouble("u"),
                    sunrise = if (dy.isNull("sr")) null else dy.getString("sr"),
                    sunset = if (dy.isNull("ss")) null else dy.getString("ss"),
                )
            },
        )
    } catch (e: Exception) {
        null
    }

    private fun parse(text: String, lat: Double, lon: Double): WeatherData? = try {
        val o = JSONObject(text)
        val cur = o.getJSONObject("current")
        val current = WeatherCurrent(
            temperature = cur.getDouble("temperature_2m"),
            apparentTemp = cur.getDouble("apparent_temperature"),
            humidity = cur.optInt("relative_humidity_2m", 0),
            windKmh = cur.optDouble("wind_speed_10m", 0.0),
            code = cur.getInt("weather_code"),
            isDay = cur.optInt("is_day", 1) == 1,
            uvIndex = cur.optDouble("uv_index", Double.NaN).takeUnless { it.isNaN() },
            pressureHpa = cur.optDouble("surface_pressure", Double.NaN).takeUnless { it.isNaN() },
        )

        val h = o.getJSONObject("hourly")
        val hTimes = h.getJSONArray("time")
        val hTemps = h.getJSONArray("temperature_2m")
        val hCodes = h.getJSONArray("weather_code")
        val hPrecip = h.getJSONArray("precipitation_probability")
        val hourly = ArrayList<WeatherHour>(hTimes.length())
        for (i in 0 until hTimes.length()) {
            hourly += WeatherHour(
                time = hTimes.getString(i),
                temp = hTemps.getDouble(i),
                code = hCodes.getInt(i),
                precipProb = hPrecip.optInt(i, 0),
            )
        }

        val d = o.getJSONObject("daily")
        val dTimes = d.getJSONArray("time")
        val dMax = d.getJSONArray("temperature_2m_max")
        val dMin = d.getJSONArray("temperature_2m_min")
        val dCodes = d.getJSONArray("weather_code")
        val dPrecip = d.getJSONArray("precipitation_probability_max")
        val dUv = d.optJSONArray("uv_index_max")
        val dSunrise = d.optJSONArray("sunrise")
        val dSunset = d.optJSONArray("sunset")
        val daily = ArrayList<WeatherDay>(dTimes.length())
        for (i in 0 until dTimes.length()) {
            daily += WeatherDay(
                date = dTimes.getString(i),
                max = dMax.getDouble(i),
                min = dMin.getDouble(i),
                code = dCodes.getInt(i),
                precipProb = dPrecip.optInt(i, 0),
                uvMax = dUv?.optDouble(i, Double.NaN)?.takeUnless { it.isNaN() },
                sunrise = dSunrise?.optString(i, null),
                sunset = dSunset?.optString(i, null),
            )
        }

        WeatherData(lat, lon, current, hourly, daily).also { lastData = it }
    } catch (e: Exception) {
        null
    }
}
