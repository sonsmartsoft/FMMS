package com.fmms.carlogger.ui.more

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.ui.DashboardViewModel
import kotlinx.coroutines.Dispatchers
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

    when (page) {
        is MoreViewModel.Page.Menu -> MoreMenu(onOpen = moreVm::open, vm = vm)
        is MoreViewModel.Page.Live -> LiveDataScreen(vm = vm, onBack = moreVm::back)
        is MoreViewModel.Page.Vehicles -> VehiclesScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Diagnostics -> DiagnosticsScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Cloud -> CloudScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Settings -> SettingsScreen(onBack = moreVm::back)
        is MoreViewModel.Page.Connection -> ConnectionScreen(onBack = moreVm::back)
    }
}

@Composable
private fun MoreMenu(onOpen: (MoreViewModel.Page) -> Unit, vm: DashboardViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        Text("MORE", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(10.dp))
        MenuItem("LIVE DATA", "All OBD + GPS readings in real time") { onOpen(MoreViewModel.Page.Live) }
        MenuItem("VEHICLES", "Manage your fleet and active vehicle") { onOpen(MoreViewModel.Page.Vehicles) }
        MenuItem("DIAGNOSTICS", "Raw ELM327 command / response log") { onOpen(MoreViewModel.Page.Diagnostics) }
        MenuItem("CLOUD", "Sync status with Supabase") { onOpen(MoreViewModel.Page.Cloud) }
        MenuItem("CONNECTION", "Pair & connect the KW906 adapter") { onOpen(MoreViewModel.Page.Connection) }
        MenuItem("SETTINGS", "App preferences, trip timeout, sync") { onOpen(MoreViewModel.Page.Settings) }
    }
}

@Composable
private fun MenuItem(title: String, subtitle: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
        onClick = onClick,
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Color.Gray, fontSize = 12.sp)
        }
    }
}

@Composable
private fun BackHeader(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Start,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(onClick = onBack) { Text("‹ Back", color = Color(0xFF06B6D4)) }
        Spacer(modifier = Modifier.width(8.dp))
        Text(title, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun LiveDataScreen(vm: DashboardViewModel, onBack: () -> Unit) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val t = state.telemetry

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        BackHeader("LIVE DATA", onBack)
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
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(cells.size) { i ->
            val (label, value) = cells[i]
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(label, color = Color.Gray, fontSize = 14.sp)
                    Text(value, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun DiagnosticsScreen(onBack: () -> Unit) {
    val entries by AppContainer.diagLog.entries.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var crashLog by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        BackHeader("DIAGNOSTICS", onBack)
        Spacer(modifier = Modifier.height(8.dp))

        if (crashLog == null && entries.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                Text("No diagnostic entries. Enable diag logging in Settings, then connect OBD.", color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                val lines = crashLog?.split("\n") ?: entries
                items(lines.size) { i -> Text(lines[i], color = Color(0xFF4ADE80), fontSize = 11.sp) }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = {
                crashLog = com.fmms.carlogger.FmmsApplication.crashLogPath(context)
                    .takeIf { it.exists() }?.readText()?.let { "--- CRASH LOG ---\n$it" }
                    ?: "No crash log found."
            }) { Text("SHOW CRASH LOG") }
            OutlinedButton(onClick = { AppContainer.diagLog.clear() }) { Text("CLEAR") }
        }
    }
}

@Composable
private fun CloudScreen(onBack: () -> Unit) {
    val pending by AppContainer.syncQueueRepository.observePendingCount().collectAsStateWithLifecycle(0)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        BackHeader("CLOUD", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text("PENDING SYNC", color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text("$pending records", color = Color(0xFF06B6D4), fontSize = 24.sp, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Background WorkManager syncs every 15 min when online.", color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun SettingsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = AppContainer.prefs
    var autoStart by remember { mutableStateOf(prefs.getAutoStart()) }
    var diag by remember { mutableStateOf(prefs.getDiagEnabled()) }
    var sync by remember { mutableStateOf(prefs.getSyncEnabled()) }
    var timeoutMin by remember { mutableStateOf((prefs.getTripTimeoutMs() / 60000).toInt()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        BackHeader("SETTINGS", onBack)
        Spacer(modifier = Modifier.height(8.dp))

        SettingRow("Auto-start on boot", autoStart) { v -> autoStart = v; prefs.setAutoStart(v) }
        SettingRow("Diagnostic logging", diag) { v -> diag = v; prefs.setDiagEnabled(v) }
        SettingRow("Sync to cloud", sync) { v -> sync = v; prefs.setSyncEnabled(v) }

        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Trip end timeout (min)", color = Color.White, fontSize = 14.sp)
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
private fun SettingRow(title: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, color = Color.White, fontSize = 14.sp)
            Switch(checked = checked, onCheckedChange = onChange)
    }
}
}

@Composable
private fun VehiclesScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val vehicles by AppContainer.vehicleRepository.observeAll().collectAsStateWithLifecycle(emptyList())

    var showAdd by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BackHeader("VEHICLES", onBack)
            Button(onClick = { showAdd = true }) { Text("+ ADD") }
        }
        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(vehicles, key = { it.id }) { v ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (v.active) {
                                    Box(modifier = Modifier.size(8.dp).background(Color(0xFF10B981), shape = RoundedCornerShape(50)))
                                    Spacer(modifier = Modifier.width(6.dp))
                                }
                                Text("${v.make} ${v.model} ${v.year}", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Text("${v.licensePlate} • ${v.trim} • ${v.fuelType} • ${v.tankCapacityLiters.toInt()}L", color = Color.Gray, fontSize = 12.sp)
                            Text("ODO ${v.odometerKm.toInt()} km", color = Color(0xFF06B6D4), fontSize = 12.sp)
                        }
                        if (!v.active) {
                            TextButton(onClick = {
                                AppContainer.launch { AppContainer.vehicleRepository.setActive(v.id) }
                                Toast.makeText(context, "Active: ${v.model}", Toast.LENGTH_SHORT).show()
                            }) { Text("SET ACTIVE", color = Color(0xFF06B6D4)) }
                        }
                    }
                }
            }
        }
    }

    if (showAdd) {
        AddVehicleDialog(onDismiss = { showAdd = false })
    }
}

@Composable
private fun AddVehicleDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    var model by remember { mutableStateOf("Mazda2") }
    var plate by remember { mutableStateOf("") }
    var year by remember { mutableStateOf("2026") }
    var tank by remember { mutableStateOf("44") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Vehicle") },
        text = {
            Column {
                OutlinedTextField(value = model, onValueChange = { model = it }, label = { Text("Model") }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = plate, onValueChange = { plate = it }, label = { Text("License plate") }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = year, onValueChange = { year = it }, label = { Text("Year") }, singleLine = true)
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(value = tank, onValueChange = { tank = it }, label = { Text("Tank (L)") }, singleLine = true)
            }
        },
        confirmButton = {
            Button(onClick = {
                AppContainer.launch {
                    AppContainer.vehicleRepository.addVehicle(
                        make = "Mazda",
                        model = model.ifBlank { "Mazda2" },
                        year = year.toIntOrNull() ?: 2026,
                        trim = "BASE",
                        licensePlate = plate.ifBlank { "WIP" },
                        vin = null,
                        engine = "1.5L Petrol",
                        fuelType = "Petrol",
                        tankCapacityLiters = tank.toDoubleOrNull() ?: 44.0,
                    )
                }
                Toast.makeText(context, "Vehicle added", Toast.LENGTH_SHORT).show()
                onDismiss()
            }) { Text("SAVE") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("CANCEL") }
        },
    )
}

@Composable
private fun ConnectionScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val vm: ConnectionViewModel = viewModel()
    val devices by vm.devices.collectAsStateWithLifecycle(emptyList())
    val scanning by vm.scanning.collectAsStateWithLifecycle(false)
    val state by vm.connectionState.collectAsStateWithLifecycle(com.fmms.carlogger.core.obd.OBDConnectionState.DISCONNECTED)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        BackHeader("OBD CONNECTION", onBack)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Status: ${state.name}",
            color = if (state == com.fmms.carlogger.core.obd.OBDConnectionState.CONNECTED) Color(0xFF10B981) else Color(0xFFF59E0B),
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text("Pair the KW906 in Android Bluetooth settings first, then choose it below.", color = Color.Gray, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { vm.scan() }) {
                Text(if (scanning) "SCANNING..." else "SCAN BLUETOOTH")
            }
            Button(onClick = { vm.disconnect() }) { Text("DISCONNECT") }
        }
        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(devices) { device ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                    onClick = { vm.connect(device.address, device.name) },
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(device.name, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                            Text(device.address, color = Color.Gray, fontSize = 12.sp)
                        }
                        Text("Tap to connect", color = Color(0xFF06B6D4), fontSize = 12.sp)
                    }
                }
            }
            if (devices.isEmpty()) {
                item { Text("No paired devices found. Enable Bluetooth.", color = Color.Gray, modifier = Modifier.padding(8.dp)) }
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

    init {
        viewModelScope.launch {
            c.obdManager.connectionState.collect { _connectionState.value = it }
        }
    }

    fun scan() {
        _scanning.value = true
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                val adapter = BluetoothAdapter.getDefaultAdapter()
                if (adapter == null || !adapter.isEnabled) {
                    _scanning.value = false
                    return@withContext
                }
                val result = adapter.bondedDevices.toList().filter {
                    it.name?.contains("KW", ignoreCase = true) == true ||
                        it.name?.contains("OBD", ignoreCase = true) == true ||
                        it.name?.contains("ELM", ignoreCase = true) == true ||
                        it.name?.contains("V-LINK", ignoreCase = true) == true
                }
                _devices.value = if (result.isNotEmpty()) result else adapter.bondedDevices.toList()
                _scanning.value = false
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
}