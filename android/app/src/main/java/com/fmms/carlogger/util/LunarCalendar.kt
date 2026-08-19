package com.fmms.carlogger.util

import java.util.Calendar

/**
 * Chuyển đổi Dương lịch → Âm lịch (Việt Nam) — triển khai offline
 * thuật toán "Chuyển đổi giữa lịch Gregorius và lịch âm Việt Nam" của
 * Hồ Ngọc Đức. Không cần thư viện bên ngoài.
 */
object LunarCalendar {

    data class LunarDate(val day: Int, val month: Int, val year: Int, val isLeapMonth: Boolean)

    private val DR = Math.PI / 180.0

    private fun jdFromDate(dd: Int, mm: Int, yy: Int): Int {
        val a = (14 - mm) / 12
        val y = yy + 4800 - a
        val m = mm + 12 * a - 3
        var jd = dd + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045
        if (jd < 2299161) {
            jd = dd + (153 * m + 2) / 5 + 365 * y + y / 4 - 32083
        }
        return jd
    }

    private fun sin(x: Double): Double = kotlin.math.sin(x)

    /** Ngày trăng mới (Julian Day) cho chu kỳ k, tính từ 1900-01-00. */
    private fun getNewMoonDay(k: Int): Int {
        var t = k / 1236.85
        var t2 = t * t
        var t3 = t2 * t
        var jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3
        jd += 0.00033 * sin((166.56 + 132.87 * t - 0.009173 * t2) * DR)
        val m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3
        val mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3
        val f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3
        var c1 = (0.1734 - 0.000393 * t) * sin(m * DR) + 0.0021 * sin(2 * DR * m)
        c1 -= 0.4068 * sin(mpr * DR) + 0.0161 * sin(2 * DR * mpr)
        c1 -= 0.0004 * sin(3 * DR * mpr)
        c1 += 0.0104 * sin(2 * DR * f) - 0.0051 * sin((m + mpr) * DR)
        c1 -= 0.0074 * sin((m - mpr) * DR) + 0.0004 * sin((2 * f + m) * DR)
        c1 -= 0.0004 * sin((2 * f - m) * DR) - 0.0006 * sin((2 * f + mpr) * DR)
        c1 += 0.001 * sin((2 * f - mpr) * DR) + 0.0005 * sin((2 * mpr + m) * DR)
        var deltat = if (t < -11.0) 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
        else if (t < -6.0) 0.278 + 0.000265 * t + 0.000262 * t2
        else if (t < -3.0) 0.111 + 0.000173 * t + 0.00021 * t2
        else 0.16278 + 0.000896 * t + 0.00024 * t2
        deltat += if (jd >= 2299160.0)
            if (t < -11.0) 0.016 * sin((228.0 + 120 * t) * DR)
            else if (t < 0.0) 0.292 * sin((248.0 + 36 * t) * DR)
            else 0.008
        else
            0.0
        jd += 0.000001 * deltat
        return Math.round(jd).toInt()
    }

    /** Kinh độ Mặt Trời tại ngày jd (đơn vị độ). */
    private fun getSunLongitude(jdn: Int): Double {
        var t = (jdn - 2451545.0) / 36525.0
        var t2 = t * t
        val m = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t * t2
        val l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2
        var dl = (1.914600 - 0.004817 * t - 0.000014 * t2) * sin(DR * m)
        dl += (0.019993 - 0.000101 * t) * sin(DR * 2 * m) + 0.000290 * sin(DR * 3 * m)
        var theta = l0 + dl
        theta *= DR
        theta -= 2.0 * Math.PI * Math.floor(theta / (2.0 * Math.PI))
        return theta / (2.0 * Math.PI) * 360.0
    }

    /** Julian Day của ngày mà tháng 11 âm lịch bắt đầu trong năm yy. */
    private fun getLunarMonth11(yy: Int): Int {
        val off = jdFromDate(31, 12, yy) - 2415021
        val k = Math.floor(off / 29.530588853).toInt()
        var nm = getNewMoonDay(k)
        val sunLong = getSunLongitude(nm)
        if (sunLong >= 90.0 && sunLong <= 270.0) {
            nm = getNewMoonDay(k - 1)
        } else if (sunLong > 270.0 || sunLong < 90.0) {
            nm = getNewMoonDay(k + 1)
        }
        return nm
    }

    /** Số tháng kể từ tháng 11 âm lịch: offset của tháng nhuận. */
    private fun getLeapMonthOffset(a11: Int): Int {
        val k = Math.floor((jdFromDate(31, 12, 1999) - 2415021.076998695) / 29.530588853).toInt()
        val last = getNewMoonDay(k)
        val k2 = Math.floor((a11 - last) / 29.530588853).toInt() + 1
        var i = k2
        var leap = -1
        while (i < 14) {
            val a = getSunLongitude(getNewMoonDay(a11 / 29 + i - 1))
            if (a <= 90.0 || a > 270.0) {
                leap = i
                break
            }
            i++
        }
        return if (leap < 0) i else leap - 1
    }

    /** Đổi ngày dương lịch (dd/mm/yyyy) sang âm lịch. */
    fun convert(dd: Int, mm: Int, yy: Int): LunarDate {
        val dayNumber = jdFromDate(dd, mm, yy)
        val k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853).toInt()
        var monthStart = getNewMoonDay(k + 1)
        if (monthStart > dayNumber) monthStart = getNewMoonDay(k)
        var a11 = getLunarMonth11(yy)
        val b11 = a11
        var lunarYear: Int
        if (a11 >= monthStart) {
            lunarYear = yy
            a11 = getLunarMonth11(yy - 1)
        } else {
            lunarYear = yy + 1
        }
        var lunarMonth = Math.floor((monthStart - a11) / 29.0).toInt() + 11
        var lunarLeap = false
        if (b11 - a11 > 365) {
            val leapMonthDiff = getLeapMonthOffset(a11)
            if (lunarMonth >= leapMonthDiff) {
                lunarMonth -= 1
                if (lunarMonth == leapMonthDiff) lunarLeap = true
            }
        }
        if (lunarMonth > 12) lunarMonth -= 12
        if (lunarMonth >= 11 && Math.floor((monthStart - a11) / 29.0).toInt() < 4) {
            lunarYear = yy - 1
        }
        return LunarDate(dayNumber - monthStart + 1, lunarMonth, lunarYear, lunarLeap)
    }

    /** Âm lịch của hôm nay. */
    fun today(): LunarDate {
        val c = Calendar.getInstance()
        return convert(c.get(Calendar.DAY_OF_MONTH), c.get(Calendar.MONTH) + 1, c.get(Calendar.YEAR))
    }

    /** Âm lịch của từng ngày trong một tháng dương lịch (1..lastDay). */
    fun monthGrid(year: Int, month: Int): Map<Int, LunarDate> {
        val c = Calendar.getInstance()
        c.clear()
        c.set(year, month - 1, 1)
        val lastDay = c.getActualMaximum(Calendar.DAY_OF_MONTH)
        return (1..lastDay).associateWith { convert(it, month, year) }
    }

    /** Ngày âm được nhấn mạnh (mồng 1, rằm 15). */
    fun isHighlightLunarDay(lunarDay: Int): Boolean = lunarDay == 1 || lunarDay == 15
}