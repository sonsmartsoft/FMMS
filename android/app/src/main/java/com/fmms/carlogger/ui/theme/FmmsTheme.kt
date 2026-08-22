package com.fmms.carlogger.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Theme-aware palette for FMMS. Replaces the hardcoded dark colors
 * (`0xFF0B0F19`, `0xFF111827`, `Color.White`...) across all screens so
 * Light / Dark / System toggle works app-wide.
 */
data class FmmsColors(
    val background: Color,
    val surface: Color,
    val surfaceVariant: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val divider: Color,
    val cyan: Color,
    val amber: Color,
    val emerald: Color,
    val red: Color,
    val purple: Color,
)

val DarkFmmsColors = FmmsColors(
    background = Color(0xFF0B0F19),
    surface = Color(0xFF111827),
    surfaceVariant = Color(0xFF1F2937),
    textPrimary = Color.White,
    textSecondary = Color.Gray,
    divider = Color.DarkGray,
    cyan = Color(0xFF06B6D4),
    amber = Color(0xFFF59E0B),
    emerald = Color(0xFF10B981),
    red = Color(0xFFEF4444),
    purple = Color(0xFFA855F7),
)

val LightFmmsColors = FmmsColors(
    background = Color(0xFFF1F5F9),
    surface = Color.White,
    surfaceVariant = Color(0xFFE2E8F0),
    textPrimary = Color(0xFF0F172A),
    textSecondary = Color(0xFF64748B),
    divider = Color(0xFFCBD5E1),
    cyan = Color(0xFF0891B2),
    amber = Color(0xFFB45309),
    emerald = Color(0xFF047857),
    red = Color(0xFFDC2626),
    purple = Color(0xFF7C3AED),
)

val LocalFmmsColors = staticCompositionLocalOf { DarkFmmsColors }

@Composable
fun FmmsTheme(dark: Boolean, content: @Composable () -> Unit) {
    val colors = if (dark) DarkFmmsColors else LightFmmsColors
    val scheme = if (dark) {
        darkColorScheme(
            primary = colors.cyan,
            background = colors.background,
            surface = colors.surface,
            surfaceVariant = colors.surfaceVariant,
            onBackground = colors.textPrimary,
            onSurface = colors.textPrimary,
            onPrimary = Color.White,
        )
    } else {
        lightColorScheme(
            primary = colors.cyan,
            background = colors.background,
            surface = colors.surface,
            surfaceVariant = colors.surfaceVariant,
            onBackground = colors.textPrimary,
            onSurface = colors.textPrimary,
            onPrimary = Color.White,
        )
    }
    CompositionLocalProvider(LocalFmmsColors provides colors) {
        MaterialTheme(colorScheme = scheme, content = content)
    }
}

/** Theme mode persisted in PrefsStore. */
object ThemeMode {
    const val DARK = "dark"
    const val LIGHT = "light"
    const val SYSTEM = "system"

    fun resolve(mode: String, isSystemDark: Boolean): Boolean = when (mode) {
        LIGHT -> false
        SYSTEM -> isSystemDark
        else -> true
    }

    fun label(mode: String, s: com.fmms.carlogger.ui.i18n.FmmsStrings): String = when (mode) {
        LIGHT -> s.light
        SYSTEM -> s.system
        else -> s.dark
    }
}