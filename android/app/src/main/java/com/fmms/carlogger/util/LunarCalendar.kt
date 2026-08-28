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

    // ------------------------------------------------------------------
    // Helper hiển thị (dùng chung Dashboard + Lịch)
    // ------------------------------------------------------------------
    private val THIEN_CAN = listOf("Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý")
    private val DIA_CHI = listOf("Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi")
    val LUNAR_MONTH_NAMES = arrayOf(
        "", "Giêng", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Một", "Chạp",
    )

    /** Can-Chi của năm âm lịch, VD: "Giáp Thìn". */
    fun canChiYear(lunarYear: Int): String {
        val can = THIEN_CAN[((lunarYear - 4).mod(10) + 10).mod(10)]
        val chi = DIA_CHI[((lunarYear - 4).mod(12) + 12).mod(12)]
        return "$can $chi"
    }

    /** Tên ngày âm: Mùng 1 / Mồng 5 / 13 / Rằm... */
    fun lunarDayLabel(l: LunarDate): String = when {
        l.day == 1 -> "Mùng 1"
        l.day < 10 -> "Mồng ${l.day}"
        l.day == 15 -> "Rằm"
        else -> l.day.toString()
    }

    /** "tháng Giêng" / "tháng nhuận Giêng". */
    fun lunarMonthLabel(l: LunarDate): String {
        val name = if (l.month in 1..12) LUNAR_MONTH_NAMES[l.month] else ""
        return (if (l.isLeapMonth) "tháng nhuận " else "tháng ") + name
    }

    /** Chuyển thể sang nhãn "Mồng 5 tháng Giêng năm Giáp Thìn". */
    fun fullLunarLabel(l: LunarDate): String =
        "${lunarDayLabel(l)} ${lunarMonthLabel(l)} năm ${canChiYear(l.year)}"

    /** Thứ tiếng Việt đầy đủ: "Thứ hai" ... "Chủ nhật". */
    fun weekdayVi(dd: Int, mm: Int, yy: Int): String {
        val c = Calendar.getInstance()
        c.clear()
        c.set(yy, mm - 1, dd)
        return when (c.get(Calendar.DAY_OF_WEEK)) {
            Calendar.SUNDAY -> "Chủ nhật"
            Calendar.MONDAY -> "Thứ hai"
            Calendar.TUESDAY -> "Thứ ba"
            Calendar.WEDNESDAY -> "Thứ tư"
            Calendar.THURSDAY -> "Thứ năm"
            Calendar.FRIDAY -> "Thứ sáu"
            else -> "Thứ bảy"
        }
    }

    // ------------------------------------------------------------------
    // VẠN NIÊN — Can-Chi ngày/tháng, Trực, Hoàng đạo/Hắc đạo, Giờ HD, Tuổi xung
    // Công thức chuẩn: Can-Chi ngày từ Julian Day (Hồ Ngọc Đức);
    // Trực & sao ngày theo chu kỳ 12 chi khởi từ chi của tháng âm lịch;
    // giờ hoàng đạo theo tương quan chi giờ - chi ngày.
    // ------------------------------------------------------------------

    data class VanNien(
        val dayCanChi: String,
        val monthCanChi: String,
        val truc: String,
        val trucNote: String,
        val isHoangDaoDay: Boolean,
        val dayStar: String,
        val goodHours: List<String>,
        val xungChi: String,
    )

    private val TRUC_NAMES = listOf("Kiến", "Trừ", "Mãn", "Bình", "Định", "Chấp", "Phá", "Nguy", "Thành", "Thu", "Khai", "Bế")
    private val STAR_NAMES = listOf(
        "Thanh Long", "Minh Đường", "Thiên Hình", "Chu Tước",
        "Kim Quỹ", "Kim Đường", "Bạch Hổ", "Ngọc Đường",
        "Thiên Lao", "Huyền Vũ", "Tư Mệnh", "Câu Trận",
    )
    private val HOANG_DAO_IDX = setOf(0, 1, 4, 5, 8, 9)

    /** Vạn niên của một ngày dương lịch. */
    fun vanNien(dd: Int, mm: Int, yy: Int): VanNien {
        val jdn = jdFromDate(dd, mm, yy)
        val dCan = ((jdn + 9) % 10 + 10) % 10
        val dChi = ((jdn + 1) % 12 + 12) % 12

        val lunar = convert(dd, mm, yy)
        val yCan = ((lunar.year - 4) % 10 + 10) % 10
        val mCan = (((yCan % 5) * 2 + 2 + (lunar.month - 1)) % 10 + 10) % 10
        val mChi = ((lunar.month + 1) % 12 + 12) % 12

        val trucIdx = ((dChi - mChi) % 12 + 12) % 12
        val starIdx = ((dChi - mChi) % 12 + 12) % 12
        val goodHours = (0..11)
            .filter { (((it - dChi) % 12 + 12) % 12) in HOANG_DAO_IDX }
            .map { "${DIA_CHI[it]} (${hourRange(it)})" }

        return VanNien(
            dayCanChi = "${THIEN_CAN[dCan]} ${DIA_CHI[dChi]}",
            monthCanChi = "${THIEN_CAN[mCan]} ${DIA_CHI[mChi]}",
            truc = TRUC_NAMES[trucIdx],
            trucNote = trucNote(trucIdx),
            isHoangDaoDay = starIdx in HOANG_DAO_IDX,
            dayStar = STAR_NAMES[starIdx],
            goodHours = goodHours,
            xungChi = DIA_CHI[(dChi + 6) % 12],
        )
    }

    private fun hourRange(chi: Int): String = when (chi) {
        0 -> "23h-01h"; 1 -> "01h-03h"; 2 -> "03h-05h"; 3 -> "05h-07h"
        4 -> "07h-09h"; 5 -> "09h-11h"; 6 -> "11h-13h"; 7 -> "13h-15h"
        8 -> "15h-17h"; 9 -> "17h-19h"; 10 -> "19h-21h"; else -> "21h-23h"
    }

    private fun trucNote(i: Int): String = when (i) {
        0 -> "Thuận lợi khởi sự, khai trương, xuất hành"
        1 -> "Tốt chữa bệnh, dọn dẹp, loại bỏ cái cũ"
        2 -> "Tốt cầu tài, cúng lễ, mừng thành tựu"
        3 -> "Ngày cân bằng, thuận hòa, việc bình thường"
        4 -> "Tốt ký kết, ổn định, an cư"
        5 -> "Tốt thi cử, thăng tiến, giữ chức trách"
        6 -> "Kỵ khai đầu; chỉ nên phá dỡ, tháo cũ"
        7 -> "Kỵ xuất hành, khởi sự; đề phòng rủi ro"
        8 -> "Tốt cưới hỏi, hoàn thành, chôn cất"
        9 -> "Tốt thu hoạch, tích trữ, mua bất động sản"
        10 -> "Tốt khai trương, mở cửa, gặp gỡ"
        else -> "Nên bảo quản, đóng cửa, tránh phiêu lưu"
    }
}