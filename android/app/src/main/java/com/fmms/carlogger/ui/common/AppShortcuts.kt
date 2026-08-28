package com.fmms.carlogger.ui.common

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.FmmsColors

/** Ứng dụng ngoài có thể khởi chạy (dùng chung cho phím tắt Speedometer + Car UI). */
data class ShortcutApp(val packageName: String, val label: String, val icon: android.graphics.drawable.Drawable?)

fun launchableApps(context: android.content.Context): List<ShortcutApp> {
    val pm = context.packageManager
    val intent = android.content.Intent(android.content.Intent.ACTION_MAIN).addCategory(android.content.Intent.CATEGORY_LAUNCHER)
    return pm.queryIntentActivities(intent, 0)
        .asSequence()
        .mapNotNull { info ->
            val pkg = info.activityInfo?.packageName ?: return@mapNotNull null
            if (pkg == context.packageName) null
            else ShortcutApp(pkg, info.loadLabel(pm)?.toString() ?: pkg, info.loadIcon(pm))
        }
        .distinctBy { it.packageName }
        .sortedBy { it.label.lowercase(java.util.Locale.US) }
        .toList()
}

/** @return true nếu intent khởi chạy thành công. */
fun launchApp(context: android.content.Context, packageName: String): Boolean =
    runCatching {
        context.packageManager.getLaunchIntentForPackage(packageName)
            ?.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            ?.let { context.startActivity(it) } != null
    }.getOrDefault(false)

/** Wrapper hiển thị Drawable icon của app ngoài trong Compose. */
@Composable
fun DrawableIconView(icon: android.graphics.drawable.Drawable?, size: Int = 34) {
    val context = LocalContext.current
    if (icon != null) {
        androidx.compose.ui.viewinterop.AndroidView(
            factory = { ctx -> android.widget.ImageView(ctx).apply { setImageDrawable(icon) } },
            modifier = Modifier.size(size.dp),
            update = { iv -> iv.setImageDrawable(icon) },
        )
    } else {
        Text("?", color = Color(0xFF9E9E9E), fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AppPickerDialog(colors: FmmsColors, onDismiss: () -> Unit, onPick: (ShortcutApp) -> Unit) {
    val s = LocalStrings.current
    val context = LocalContext.current
    val apps = remember { runCatching { launchableApps(context) }.getOrElse { emptyList() } }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(s.closeBtn, color = colors.cyan) }
        },
        title = { Text(s.chooseAppToPin, color = colors.textPrimary, fontSize = 16.sp) },
        text = {
            if (apps.isEmpty()) {
                Text(s.noAppsFound, color = colors.textSecondary, fontSize = 13.sp)
            } else {
                LazyColumn(modifier = Modifier.size(width = 280.dp, height = 360.dp)) {
                    items(apps, key = { it.packageName }) { app ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .combinedClickable(onClick = { onPick(app) })
                                .padding(vertical = 6.dp, horizontal = 4.dp),
                        ) {
                            DrawableIconView(app.icon, size = 32)
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                app.label,
                                color = colors.textPrimary,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        },
    )
}
