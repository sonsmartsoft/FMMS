package com.fmms.carlogger.ui.more

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.ui.DashboardViewModel
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MoreViewModel(private val dashboard: DashboardViewModel) : ViewModel() {

    sealed class Page {
        object Menu : Page()
        object Live : Page()
        object Vehicles : Page()
        object Diagnostics : Page()
        object Cloud : Page()
        object Settings : Page()
        object Connection : Page()
        object Device : Page()
    }

    private val _page = MutableStateFlow<Page>(Page.Menu)
    val page = _page

    fun open(p: Page) { _page.value = p }

    fun back() { _page.value = Page.Menu }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(vm: DashboardViewModel) {
    val moreVm: MoreViewModel = viewModel { MoreViewModel(dashboard = vm) }
    val page by moreVm.page.collectAsStateWithLifecycle()
    // Nút BACK cứng: đang ở trang con thì quay về menu MORE thay vì thoát app
    androidx.activity.compose.BackHandler(enabled = page != MoreViewModel.Page.Menu) {
        moreVm.back()
    }

    when (page) {
        is MoreViewModel.Page.Menu -> MoreMenu(onOpen = moreVm::open, vm = vm)
        is MoreViewModel.Page.Live -> LiveDataScreen(vm = vm, onBack = moreVm::back)
        is MoreViewModel.Page.Vehicles -> VehiclesScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Diagnostics -> DiagnosticsScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Cloud -> CloudScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Settings -> SettingsScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Connection -> ConnectionScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Device -> DeviceConfigScreen(onBack = moreVm::back)
    }
}

@Composable
private fun MoreMenu(onOpen: (MoreViewModel.Page) -> Unit, vm: DashboardViewModel) {
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    val scrollState = rememberScrollState()
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState),
        ) {
            Text(strings.more, color = colors.textPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(10.dp))
            MenuItem(strings.liveData, strings.liveDataDesc) { onOpen(MoreViewModel.Page.Live) }
            MenuItem(strings.vehicles, strings.vehiclesDesc) { onOpen(MoreViewModel.Page.Vehicles) }
            MenuItem(strings.diagnostics, strings.diagnosticsDesc) { onOpen(MoreViewModel.Page.Diagnostics) }
            MenuItem(strings.cloud, strings.cloudDesc) { onOpen(MoreViewModel.Page.Cloud) }
            MenuItem(strings.connection, strings.connectionDesc) { onOpen(MoreViewModel.Page.Connection) }
            MenuItem(strings.device, strings.deviceDesc) { onOpen(MoreViewModel.Page.Device) }
            MenuItem(strings.settings, strings.settingsDesc) { onOpen(MoreViewModel.Page.Settings) }
        }
        CustomScrollbar(scrollState, Modifier.align(Alignment.CenterEnd).fillMaxHeight())
    }
}

@Composable
private fun CustomScrollbar(scrollState: ScrollState, modifier: Modifier = Modifier) {
    val colors = LocalFmmsColors.current
    val maxValue = scrollState.maxValue
    if (maxValue <= 0) return
    val total = (maxValue + scrollState.viewportSize).toFloat()
    val thumbFraction = (scrollState.viewportSize / total).coerceIn(0.1f, 1f)
    val trackFraction = (scrollState.value / maxValue.toFloat()).coerceIn(0f, 1f)
    val thumbOffsetFraction = trackFraction * (1f - thumbFraction)
    val density = LocalDensity.current
    Box(modifier = modifier.width(6.dp).padding(vertical = 8.dp)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(thumbFraction)
                .offset(y = with(density) { (thumbOffsetFraction * scrollState.viewportSize.toFloat()).toDp() })
                .background(colors.surfaceVariant, shape = RoundedCornerShape(50)),
        )
    }
}

@Composable
private fun MenuItem(title: String, subtitle: String, onClick: () -> Unit) {
    val colors = LocalFmmsColors.current
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
        onClick = onClick,
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(title, color = colors.textPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = colors.textSecondary, fontSize = 12.sp)
        }
    }
}

@Composable
private fun BackHeader(title: String, onBack: () -> Unit) {
    val strings = LocalStrings.current
    val colors = LocalFmmsColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Start,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(onClick = onBack) { Text(strings.backChip, color = colors.cyan) }
        Spacer(modifier = Modifier.width(8.dp))
        Text(title, color = colors.textPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun LiveDataScreen(vm: DashboardViewModel, onBack: () -> Unit) {
    val strings = LocalStrings.current
    val state by vm.uiState.collectAsStateWithLifecycle()
    val t = state.telemetry
    val colors = LocalFmmsColors.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        BackHeader(strings.liveData, onBack)
        Spacer(modifier = Modifier.height(8.dp))
        LiveGrid(
            "RPM" to (t.rpm?.let { "${it.toInt()}" } ?: "N/A"),
            "Speed" to (t.speedKmh?.let { "${it.toInt()} km/h" } ?: "N/A"),
            "Load" to (t.engineLoadPercent?.let { "${it.toInt()}%" } ?: "N/A"),
            "Throttle" to (t.throttlePercent?.let { "${it.toInt()}%" } ?: "N/A"),
            "Coolant" to (t.coolantTempC?.let { "${it.toInt()}°C" } ?: "N/A"),
            "Intake" to (t.intakeTempC?.let { "${it.toInt()}°C" } ?: "N/A"),
            "MAF" to (t.mafGps?.let { String.format(java.util.Locale.US, "%.1f g/s", it) } ?: "N/A"),
            "Fuel level" to (t.fuelLevelPercent?.let { "${it.toInt()}%" } ?: "N/A"),
            "Fuel rate" to (t.fuelRateLph?.let { String.format(java.util.Locale.US, "%.1f L/h", it) } ?: "N/A"),
            "Battery" to (t.batteryVoltage?.let { String.format(java.util.Locale.US, "%.2f V", it) } ?: "N/A"),
            "Runtime" to (t.engineRuntimeSeconds?.let { "${it.toInt()} s" } ?: "N/A"),
            "STFT" to (t.stft?.let { String.format(java.util.Locale.US, "%.1f%%", it) } ?: "N/A"),
            "LTFT" to (t.ltft?.let { String.format(java.util.Locale.US, "%.1f%%", it) } ?: "N/A"),
            "Data quality" to (t.dataQuality.name),
            "Raw source" to (t.rawSource),
        )
    }
}

@Composable
private fun LiveGrid(vararg cells: Pair<String, String>) {
    val colors = LocalFmmsColors.current
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(cells.size) { i ->
            val (label, value) = cells[i]
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(label, color = colors.textSecondary, fontSize = 14.sp)
                    Text(value, color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun DiagnosticsScreen(onBack: () -> Unit) {
    val strings = LocalStrings.current
    val entries by AppContainer.diagLog.entries.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var crashLog by remember { mutableStateOf<String?>(null) }
    val colors = LocalFmmsColors.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        BackHeader(strings.diagnostics, onBack)
        Spacer(modifier = Modifier.height(8.dp))

        if (crashLog == null && entries.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                Text(strings.diagEmpty, color = colors.textSecondary)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                val lines = crashLog?.split("\n") ?: entries
                items(lines.size) { i -> Text(lines[i], color = colors.emerald, fontSize = 11.sp) }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = {
                crashLog = com.fmms.carlogger.FmmsApplication.crashLogPath(context)
                    .takeIf { it.exists() }?.readText()?.let { "--- CRASH LOG ---\n$it" }
                    ?: "No crash log found."
            }) { Text(strings.showCrashLog) }
            OutlinedButton(onClick = { AppContainer.diagLog.clear() }) { Text(strings.clearLbl) }
        }
    }
}

@Composable
private fun CloudScreen(onBack: () -> Unit) {
    val pending by AppContainer.syncQueueRepository.observePendingCount().collectAsStateWithLifecycle(0)
    val recent by AppContainer.syncQueueRepository.observeRecent().collectAsStateWithLifecycle(initialValue = emptyList())
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    val clipboard = LocalClipboardManager.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        BackHeader(strings.cloud, onBack)
        Spacer(modifier = Modifier.height(12.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.pendingSync, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(strings.recordsCountFmt.format(pending), color = colors.cyan, fontSize = 24.sp, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.height(4.dp))
                Text(strings.syncHint, color = colors.textSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(10.dp))
                val syncing = remember { mutableStateOf(false) }
                Button(
                    onClick = {
                        syncing.value = true
                        AppContainer.syncNow()
                        // stop the spinner shortly after; status flows update live
                        kotlinx.coroutines.MainScope().launch {
                            kotlinx.coroutines.delay(1500)
                            syncing.value = false
                        }
                    },
                    enabled = !syncing.value,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.cyan,
                        contentColor = colors.background,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (syncing.value) strings.syncingNow else strings.syncNow, fontWeight = FontWeight.Bold)
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.lastSyncTapCopy, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                if (recent.isEmpty()) {
                    Text(strings.noRecordsYet, color = colors.textPrimary, fontSize = 13.sp)
                } else {
                    recent.take(8).forEach { e ->
                        val err = e.lastError?.let { " 🔴 $it" } ?: ""
                        val line = "${e.entityType}/${e.status}${err}"
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp)
                                .clickable {
                                    clipboard.setText(androidx.compose.ui.text.AnnotatedString(line))
                                },
                            color = Color.Transparent,
                        ) {
                            Text(
                                line,
                                color = if (e.status == "PENDING" && e.lastError != null) colors.red else colors.textPrimary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}

/** IP mạng LAN đang kết nối của thiết bị (ưu tiên WLAN/ethernet, bỏ usb/loopback). */
private fun deviceIp(): String {
    val ifaces = runCatching { java.net.NetworkInterface.getNetworkInterfaces() }.getOrNull() ?: return "-"
    val addrs = ArrayList<String>()
    for (nif in ifaces) {
        if (!nif.isUp || nif.isLoopback) continue
        val name = nif.name.lowercase()
        if (name.contains("wlan") || name.contains("eth") || name.contains("rmnet") || name.contains("wifi")) {
            for (a in nif.inetAddresses) {
                if (a is java.net.Inet4Address && !a.isLoopbackAddress && !a.isLinkLocalAddress) {
                    addrs.add(a.hostAddress ?: "")
                }
            }
        }
    }
    return addrs.firstOrNull { it.isNotBlank() } ?: "-"
}

@Composable
private fun SettingsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = AppContainer.prefs
    var autoStart by remember { mutableStateOf(prefs.getAutoStart()) }
    var diag by remember { mutableStateOf(prefs.getDiagEnabled()) }
    var sync by remember { mutableStateOf(prefs.getSyncEnabled()) }
    var timeoutMin by remember { mutableStateOf((prefs.getTripTimeoutMs() / 60000).toInt()) }
    var theme by remember { mutableStateOf(prefs.getTheme()) }
    var language by remember { mutableStateOf(prefs.getLanguage()) }
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        BackHeader(strings.settings, onBack)
        Spacer(modifier = Modifier.height(8.dp))

        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("About", color = colors.textPrimary, fontSize = 14.sp)
                Text(
                    "v${com.fmms.carlogger.BuildConfig.VERSION_NAME} · rev${com.fmms.carlogger.BuildConfig.REV}",
                    color = colors.cyan,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 14.dp, end = 14.dp, bottom = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("IP", color = colors.textSecondary, fontSize = 13.sp)
                Text(
                    deviceIp(),
                    color = colors.cyan,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
        SettingRow(strings.autoStart, autoStart) { v -> autoStart = v; prefs.setAutoStart(v) }
        SettingRow(strings.diagLogging, diag) { v -> diag = v; prefs.setDiagEnabled(v) }
        SettingRow(strings.syncCloud, sync) { v -> sync = v; prefs.setSyncEnabled(v) }

        ThemeSelector(theme) { mode ->
            theme = mode
            AppContainer.setThemeMode(mode)
        }

        LanguageSelector(language) { lang ->
            language = lang
            AppContainer.setLanguage(lang)
        }

        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(strings.tripTimeout, color = colors.textPrimary, fontSize = 14.sp)
                OutlinedTextField(
                    value = timeoutMin.toString(),
                    onValueChange = { v ->
                        timeoutMin = v.filter { c -> c.isDigit() }.toIntOrNull() ?: 3
                        prefs.setTripTimeoutMs(timeoutMin * 60000L)
                    },
                    modifier = Modifier.width(80.dp),
                    singleLine = true,
                )
            }
        }
    }
}

@Composable
private fun LanguageSelector(current: String, onSelect: (String) -> Unit) {
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    Card(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(
                strings.languageLabel,
                color = colors.textPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(6.dp))
            listOf("en" to strings.english, "vi" to strings.vietnamese).forEach { (code, label) ->
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { onSelect(code) },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = current == code, onClick = { onSelect(code) })
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(label, color = colors.textPrimary, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
private fun ThemeSelector(current: String, onSelect: (String) -> Unit) {
    val colors = LocalFmmsColors.current
    val options = listOf(
        com.fmms.carlogger.ui.theme.ThemeMode.DARK,
        com.fmms.carlogger.ui.theme.ThemeMode.LIGHT,
        com.fmms.carlogger.ui.theme.ThemeMode.SYSTEM,
    )
    Card(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(
                com.fmms.carlogger.ui.i18n.LocalStrings.current.themeLabel,
                color = colors.textPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(6.dp))
            options.forEach { mode ->
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { onSelect(mode) },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(
                        selected = current == mode,
                        onClick = { onSelect(mode) },
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        com.fmms.carlogger.ui.theme.ThemeMode.label(mode, com.fmms.carlogger.ui.i18n.LocalStrings.current),
                        color = colors.textPrimary,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingRow(title: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val colors = LocalFmmsColors.current
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, color = colors.textPrimary, fontSize = 14.sp)
            Switch(checked = checked, onCheckedChange = onChange)
    }
}
}

@Composable
private fun VehiclesScreen(onBack: () -> Unit) {
    val strings = LocalStrings.current
    val context = LocalContext.current
    val vehicles by AppContainer.vehicleRepository.observeAll().collectAsStateWithLifecycle(emptyList())
    val colors = LocalFmmsColors.current

    var showAdd by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<com.fmms.carlogger.core.database.entity.VehicleEntity?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BackHeader(strings.vehicles, onBack)
            Button(onClick = { showAdd = true }) { Text(strings.addPlus) }
        }
        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(vehicles, key = { it.id }) { v ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                if (v.active) {
                                    Box(modifier = Modifier.size(8.dp).background(colors.emerald, shape = RoundedCornerShape(50)))
                                    Spacer(modifier = Modifier.width(6.dp))
                                }
                                Text(
                                    v.displayName(),
                                    color = colors.textPrimary,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            if (!v.active) {
                                TextButton(onClick = {
                                    AppContainer.launch {
                                        AppContainer.vehicleRepository.setActive(v.id)
                                        AppContainer.odometerEngine.adoptVehicleOdometer()
                                    }
                                    Toast.makeText(context, "Active: ${v.displayName()}", Toast.LENGTH_SHORT).show()
                                }) { Text("SET ACTIVE", color = colors.cyan) }
                            }
                        }
                        val meta = listOfNotNull(
                            v.licensePlate.takeIf { it.isNotBlank() },
                            v.fuelType.takeIf { it.isNotBlank() },
                            v.tankCapacityLiters.takeIf { it > 0 }?.let { "${it.toInt()}L" },
                            v.year.takeIf { it > 0 }?.toString(),
                        ).joinToString(" • ")
                        if (meta.isNotEmpty()) {
                            Text(meta, color = colors.textSecondary, fontSize = 12.sp)
                        }
                        if (v.odometerKm > 0) {
                            Text("ODO ${v.odometerKm.toInt()} km", color = colors.cyan, fontSize = 12.sp)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(onClick = { editing = v }) {
                                Text(strings.editVehicleNameBtn, color = colors.cyan, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAdd) {
        AddVehicleDialog(onDismiss = { showAdd = false })
    }
    editing?.let { v ->
        EditVehicleDialog(vehicle = v, onDismiss = { editing = null })
    }
}

@Composable
private fun AddVehicleDialog(onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    val context = LocalContext.current
    var make by remember { mutableStateOf("Mazda") }
    var model by remember { mutableStateOf("Mazda 2 AT") }
    var trim by remember { mutableStateOf("AT") }
    var plate by remember { mutableStateOf("") }
    var year by remember { mutableStateOf("2026") }
    var tank by remember { mutableStateOf("44") }
    val colors = LocalFmmsColors.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(strings.addVehicle, color = colors.textPrimary) },
        text = {
            Column {
                OutlinedTextField(value = make, onValueChange = { make = it }, label = { Text(strings.fldMake) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = model, onValueChange = { model = it }, label = { Text(strings.fldModel) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = trim, onValueChange = { trim = it }, label = { Text(strings.fldTrim) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = plate, onValueChange = { plate = it }, label = { Text(strings.fldPlate) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = year, onValueChange = { year = it }, label = { Text(strings.fldYear) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = tank, onValueChange = { tank = it }, label = { Text(strings.fldTank) }, singleLine = true)
            }
        },
        confirmButton = {
            Button(onClick = {
                AppContainer.launch {
                    AppContainer.vehicleRepository.addVehicle(
                        make = make.ifBlank { "Mazda" },
                        model = model.ifBlank { "Mazda 2 AT" },
                        year = year.toIntOrNull() ?: 2026,
                        trim = trim.ifBlank { "AT" },
                        licensePlate = plate.ifBlank { "WIP" },
                        vin = null,
                        engine = "1.5L Petrol",
                        fuelType = "Petrol",
                        tankCapacityLiters = tank.toDoubleOrNull() ?: 44.0,
                    )
                }
                Toast.makeText(context, strings.vehicleAdded, Toast.LENGTH_SHORT).show()
                onDismiss()
            }) { Text("SAVE") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("CANCEL") }
        },
    )
}

@Composable
private fun EditVehicleDialog(
    vehicle: com.fmms.carlogger.core.database.entity.VehicleEntity,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val strings = LocalStrings.current
    var make by remember { mutableStateOf(vehicle.make) }
    var model by remember { mutableStateOf(vehicle.model) }
    var trim by remember { mutableStateOf(vehicle.trim) }
    var plate by remember { mutableStateOf(vehicle.licensePlate) }
    var year by remember { mutableStateOf(vehicle.year.toString()) }
    var tank by remember { mutableStateOf(vehicle.tankCapacityLiters.toInt().toString()) }
    var odo by remember { mutableStateOf(if (vehicle.odometerKm > 0) vehicle.odometerKm.toInt().toString() else "") }
    val colors = LocalFmmsColors.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(strings.editVehicle, color = colors.textPrimary) },
        text = {
            Column {
                OutlinedTextField(value = make, onValueChange = { make = it }, label = { Text(strings.fldMake) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = model, onValueChange = { model = it }, label = { Text(strings.fldModel) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = trim, onValueChange = { trim = it }, label = { Text(strings.fldTrim) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = plate, onValueChange = { plate = it }, label = { Text(strings.fldPlate) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = year, onValueChange = { year = it }, label = { Text(strings.fldYear) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = tank, onValueChange = { tank = it }, label = { Text(strings.fldTank) }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = odo, onValueChange = { odo = it }, label = { Text(strings.fldOdoClear) }, singleLine = true)
            }
        },
        confirmButton = {
            Button(onClick = {
                val newOdo = odo.toDoubleOrNull()?.takeIf { it >= 0 }
                AppContainer.launch {
                    val updated = vehicle.copy(
                        make = make.ifBlank { vehicle.make },
                        model = model.ifBlank { vehicle.model },
                        trim = trim.ifBlank { vehicle.trim },
                        licensePlate = plate.ifBlank { vehicle.licensePlate },
                        year = year.toIntOrNull() ?: vehicle.year,
                        tankCapacityLiters = tank.toDoubleOrNull() ?: vehicle.tankCapacityLiters,
                        odometerKm = newOdo ?: 0.0,
                    )
                    AppContainer.vehicleRepository.updateVehicle(updated)
                    if (updated.id == AppContainer.vehicleRepository.getActive()?.id) {
                        AppContainer.odometerEngine.adoptVehicleOdometer()
                    }
                }
                Toast.makeText(context, strings.vehicleUpdated, Toast.LENGTH_SHORT).show()
                onDismiss()
            }) { Text("SAVE") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("CANCEL") }
        },
    )
}

@Composable
private fun DeviceConfigScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = AppContainer.prefs
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    var deviceName by remember { mutableStateOf(prefs.getDeviceName() ?: "") }
    var deviceMode by remember { mutableStateOf(prefs.getDeviceMode()) }
    var gpsInterval by remember { mutableStateOf(prefs.getGpsIntervalSec()) }
    val deviceId = remember { prefs.getDeviceId() }
    val obdMac = remember { prefs.getObdMacAddress() }
    val vehicles by AppContainer.vehicleRepository.observeAll().collectAsStateWithLifecycle(emptyList())
    val activeVehicleId = vehicles.firstOrNull { it.active }?.id ?: vehicles.firstOrNull()?.id
    var assignedId by remember { mutableStateOf(prefs.getAssignedVehicleId()) }
    var syncingWeb by remember { mutableStateOf(false) }
    var webSynced by remember { mutableStateOf(false) }

    // Khóa bảo vệ: SYNC xe từ web / gán xe yêu cầu mật khẩu
    var showPassDialog by remember { mutableStateOf(false) }
    var passInput by remember { mutableStateOf("") }
    var passError by remember { mutableStateOf(false) }
    var pendingAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    fun requirePassword(action: () -> Unit) {
        pendingAction = action
        passInput = ""
        passError = false
        showPassDialog = true
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        BackHeader(strings.deviceTitle, onBack)
        Spacer(modifier = Modifier.height(8.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.deviceNameLabel, color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = deviceName,
                    onValueChange = {
                        deviceName = it
                        prefs.setDeviceName(it)
                    },
                    label = { Text(strings.deviceNameHint, color = colors.textSecondary) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text(strings.deviceIdLabel, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Text(deviceId, color = colors.cyan, fontSize = 12.sp)
                if (prefs.getDeviceMode() == "obd") {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(strings.macObdFmt.format(obdMac ?: strings.noAdapterSelected), color = colors.textSecondary, fontSize = 11.sp)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(strings.deviceIdNote, color = colors.textSecondary, fontSize = 11.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Hiệu chuẩn ODO: khi ECU không hỗ trợ PID 01A6, nhập số ODO trên đồng hồ táp
        val activeVehicle = vehicles.firstOrNull { it.active } ?: vehicles.firstOrNull()
        var odoInput by remember { mutableStateOf("") }
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.odometerLbl, color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    strings.odoEcuNote.format(activeVehicle?.odometerKm?.let { String.format(java.util.Locale.US, "%.0f km", it) } ?: "—"),
                    color = colors.textSecondary,
                    fontSize = 11.sp,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = odoInput,
                        onValueChange = { odoInput = it.filter { ch -> ch.isDigit() }.take(7) },
                        label = { Text(strings.realOdoKm, color = colors.textSecondary) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            odoInput.toDoubleOrNull()?.let { km ->
                                AppContainer.launch {
                                    AppContainer.odometerEngine.manualCalibration(km)
                                    android.os.Handler(android.os.Looper.getMainLooper()).post {
                                        Toast.makeText(context, strings.odoSetFmt.format("${km.toInt()} km"), Toast.LENGTH_SHORT).show()
                                    }
                                }
                                odoInput = ""
                            }
                        },
                        enabled = odoInput.toDoubleOrNull()?.let { it > 0 } == true,
                    ) { Text(strings.save) }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.deviceModeLabel, color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                listOf("obd" to strings.modeObd, "gps" to strings.modeGps).forEach { (mode, label) ->
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable {
                            deviceMode = mode
                            prefs.setDeviceMode(mode)
                            AppContainer.setDeviceMode(mode)
                        },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = deviceMode == mode, onClick = {
                            deviceMode = mode
                            prefs.setDeviceMode(mode)
                            AppContainer.setDeviceMode(mode)
                        })
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(label, color = colors.textPrimary, fontSize = 14.sp)
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    if (deviceMode == "gps") strings.modeGpsNote else strings.modeObdNote,
                    color = colors.textSecondary,
                    fontSize = 11.sp,
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(strings.gpsInterval, color = colors.textPrimary, fontSize = 14.sp)
                OutlinedTextField(
                    value = gpsInterval.toString(),
                    onValueChange = { v ->
                        gpsInterval = v.filter { c -> c.isDigit() }.toIntOrNull()?.coerceIn(2, 60) ?: 5
                        prefs.setGpsIntervalSec(gpsInterval)
                    },
                    modifier = Modifier.width(70.dp),
                    singleLine = true,
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.assignVehicle, color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                Text(strings.syncWebHint + (if (webSynced) " ✓" else ""), color = if (webSynced) colors.emerald else colors.textSecondary, fontSize = 11.sp)

                Button(
                    onClick = {
                        requirePassword {
                            syncingWeb = true
                            AppContainer.launch {
                                val synced = AppContainer.vehicleRepository.pullWebVehicles()
                                webSynced = true
                                syncingWeb = false
                                withContext(Dispatchers.Main) {
                                    Toast.makeText(
                                        context,
                                        if (synced.isNotEmpty()) strings.syncedFromWeb.format(synced.size)
                                        else strings.noVehiclesFromWeb,
                                        Toast.LENGTH_SHORT,
                                    ).show()
                                }
                            }
                        }
                    },
                    enabled = !syncingWeb,
                ) {
                    Text(if (syncingWeb) strings.syncingNow else strings.syncWeb)
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (vehicles.isEmpty()) {
                    Text(strings.noVehicles, color = colors.textSecondary, fontSize = 12.sp)
                } else {
                    vehicles.forEach { v ->
                        val isAssigned = v.id == assignedId
                        val assignAction: () -> Unit = {
                            assignedId = v.id
                            prefs.setAssignedVehicleId(v.id)
                            AppContainer.launch {
                                AppContainer.vehicleRepository.setActive(v.id)
                                AppContainer.odometerEngine.adoptVehicleOdometer()
                                AppContainer.vehicleRepository.registerDeviceWithVehicle(v.id, prefs.getDeviceName() ?: "Tracker")
                            }
                            Toast.makeText(context, strings.assignedFmt.format(v.displayName()), Toast.LENGTH_SHORT).show()
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable { requirePassword(assignAction) },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(selected = isAssigned, onClick = { requirePassword(assignAction) })
                            Spacer(modifier = Modifier.width(4.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    v.displayName(),
                                    color = if (isAssigned) colors.cyan else colors.textPrimary,
                                    fontSize = 14.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                val meta = listOfNotNull(
                                    v.licensePlate.takeIf { it.isNotBlank() },
                                    v.year.takeIf { it > 0 }?.toString(),
                                ).joinToString(" • ")
                                if (meta.isNotEmpty()) {
                                    Text(meta, color = colors.textSecondary, fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                val assignedName = vehicles.firstOrNull { it.id == assignedId }?.displayName()
                Text(
                    if (assignedId != null) strings.assignedFixedFmt.format(assignedName ?: "—")
                    else strings.assignNote,
                    color = colors.textSecondary,
                    fontSize = 11.sp,
                )
            }
        }

        if (showPassDialog) {
            AlertDialog(
                onDismissRequest = { showPassDialog = false },
                title = { Text(strings.passwordTitle, color = colors.textPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold) },
                text = {
                    Column {
                        Text(strings.enterPasswordNote, color = colors.textSecondary, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = passInput,
                            onValueChange = { passInput = it; passError = false },
                            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                            isError = passError,
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        if (passError) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(strings.wrongPassword, color = colors.red, fontSize = 11.sp)
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        if (passInput == "0075") {
                            showPassDialog = false
                            pendingAction?.invoke()
                            pendingAction = null
                        } else {
                            passError = true
                        }
                    }) { Text("OK", color = colors.cyan, fontWeight = FontWeight.Bold) }
                },
                dismissButton = {
                    TextButton(onClick = { showPassDialog = false }) { Text("HỦY", color = colors.textSecondary) }
                },
                containerColor = colors.surface,
            )
        }
    }
}

@Composable
fun ConnectionScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val strings = LocalStrings.current
    val vm: ConnectionViewModel = viewModel()
    val devices by vm.devices.collectAsStateWithLifecycle(emptyList())
    val scanning by vm.scanning.collectAsStateWithLifecycle(false)
    val state by vm.connectionState.collectAsStateWithLifecycle(com.fmms.carlogger.core.obd.OBDConnectionState.DISCONNECTED)
    val colors = LocalFmmsColors.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        BackHeader(strings.connection, onBack)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Status: ${state.name}",
            color = if (state == com.fmms.carlogger.core.obd.OBDConnectionState.CONNECTED) colors.emerald else colors.amber,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(strings.pairHint, color = colors.textSecondary, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { vm.scan() }) {
                Text(if (scanning) "SCANNING..." else "SCAN BLUETOOTH")
            }
            Button(onClick = { vm.disconnect() }) { Text(strings.disconnectBtn) }
        }
        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(devices) { device ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                    onClick = { vm.connect(device.address, device.name) },
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(device.name, color = colors.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                            Text(device.address, color = colors.textSecondary, fontSize = 12.sp)
                        }
                        Text(strings.tapToConnect, color = colors.cyan, fontSize = 12.sp)
                    }
                }
            }
            if (devices.isEmpty()) {
                item { Text(strings.noPairedDevices, color = colors.textSecondary, modifier = Modifier.padding(8.dp)) }
            }
        }
    }
}

class ConnectionViewModel : ViewModel() {
    private val c = AppContainer

    private val _devices = MutableStateFlow<List<BluetoothDevice>>(emptyList())
    val devices = _devices
    private val _scanning = MutableStateFlow(false)
    val scanning = _scanning
    private val _connectionState = MutableStateFlow(com.fmms.carlogger.core.obd.OBDConnectionState.DISCONNECTED)
    val connectionState = _connectionState

    private val adapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var discoveryReceiver: android.content.BroadcastReceiver? = null

    init {
        viewModelScope.launch {
            c.obdManager.connectionState.collect { _connectionState.value = it }
        }
        if (adapter != null) {
            registerDiscoveryReceiver()
        }
    }

    private fun registerDiscoveryReceiver() {
        val receiver = object : android.content.BroadcastReceiver() {
            override fun onReceive(ctx: android.content.Context?, intent: android.content.Intent?) {
                when (intent?.action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        val device: BluetoothDevice? =
                            intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                        if (device != null && device.name?.isNotBlank() == true) {
                            val current = _devices.value
                            if (current.none { it.address == device.address }) {
                                _devices.value = current + device
                            }
                        }
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                        _scanning.value = false
                    }
                }
            }
        }
        discoveryReceiver = receiver
        androidx.core.content.ContextCompat.registerReceiver(
            c.context,
            receiver,
            android.content.IntentFilter().apply {
                addAction(BluetoothDevice.ACTION_FOUND)
                addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
            },
            androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    fun scan() {
        _scanning.value = true
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                if (adapter == null || !adapter.isEnabled) {
                    _scanning.value = false
                    return@withContext
                }
                // 1) Already paired OBD-like devices (fast path).
                val bonded = adapter.bondedDevices.toList().filter {
                    it.name?.contains("KW", ignoreCase = true) == true ||
                        it.name?.contains("OBD", ignoreCase = true) == true ||
                        it.name?.contains("ELM", ignoreCase = true) == true ||
                        it.name?.contains("V-LINK", ignoreCase = true) == true
                }
                // 2) Start discovery so unpaired adapters can be found too.
                try {
                    adapter.cancelDiscovery()
                    adapter.startDiscovery()
                } catch (_: Exception) {
                    _scanning.value = false
                }
                _devices.value = if (bonded.isNotEmpty()) bonded else adapter.bondedDevices.toList()
                // _scanning reset by ACTION_DISCOVERY_FINISHED; safety fallback:
                kotlinx.coroutines.delay(15000)
                if (bonded.isNotEmpty()) _scanning.value = false
            }
        }
    }

    fun connect(address: String, name: String?) {
        c.prefs.setMac(address)
        c.prefs.setDeviceName(name ?: "KW906")
        viewModelScope.launch {
            c.obdManager.connect(address)
            c.vehicleRepository.getActive()?.let { vehicle ->
                c.vehicleRepository.registerDevice(address, name ?: "KW906")
            }
        }
    }

    fun disconnect() {
        viewModelScope.launch { c.obdManager.disconnect() }
    }

    /** Forget the paired adapter: disconnect, clear saved MAC + name. */
    fun unlink() {
        viewModelScope.launch {
            c.obdManager.disconnect()
            c.prefs.setMac(null)
            c.prefs.setDeviceName(null)
        }
    }

    override fun onCleared() {
        try {
            adapter?.cancelDiscovery()
            discoveryReceiver?.let { c.context.unregisterReceiver(it) }
        } catch (_: Exception) {
        }
        super.onCleared()
    }
}