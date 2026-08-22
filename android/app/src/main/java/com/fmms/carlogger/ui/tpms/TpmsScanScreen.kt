package com.fmms.carlogger.ui.tpms

import android.Manifest
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors

/** Cảm biến BLE bắt được khi quét thô (dùng để học giao thức TPMS). */
data class TpmsDevice(
    val mac: String,
    val name: String?,
    val rssi: Int,
    val serviceUuids: String,
    val mfgData: String,
    val rawAdv: String,
    val lastSeen: Long,
)

private fun bytesToHex(bytes: ByteArray?): String =
    bytes?.joinToString("") { String.format("%02x", it) } ?: ""

/**
 * Màn "học cảm biến": quét BLE thô, log toàn bộ quảng cáo ra logcat tag `FmmsTpms`
 * để phân tích cấu trúc byte áp suất/nhiệt độ của cảm biến ZESHTECH.
 */
@Composable
fun TpmsScanScreen(onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    var permsGranted by remember { mutableStateOf(false) }
    var scanning by remember { mutableStateOf(false) }
    var callback by remember { mutableStateOf<ScanCallback?>(null) }
    val devices = remember { mutableStateMapOf<String, TpmsDevice>() }

    val requiredPerms = if (Build.VERSION.SDK_INT >= 31)
        listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
    else listOf(Manifest.permission.ACCESS_FINE_LOCATION)

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result -> permsGranted = result.values.all { it } }

    LaunchedEffect(Unit) {
        val missing = requiredPerms.filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) permsGranted = true else permLauncher.launch(missing.toTypedArray())
    }

    val bluetoothManager = remember {
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    }
    val bleScanner = remember { bluetoothManager?.adapter?.bluetoothLeScanner }

    fun stopScan() {
        callback?.let { runCatching { bleScanner?.stopScan(it) } }
        callback = null
        scanning = false
    }

    fun startScan() {
        if (bleScanner == null) return
        val cb = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val record = result.scanRecord
                val mfg = record?.manufacturerSpecificData
                val mfgStr = buildString {
                    if (mfg != null) {
                        for (i in 0 until mfg.size()) {
                            append(String.format("%04x", mfg.keyAt(i)))
                            append(":")
                            append(bytesToHex(mfg.valueAt(i)))
                            append(" ")
                        }
                    }
                }.trim()
                val svc = record?.serviceUuids
                    ?.joinToString(",") { it.uuid.toString() } ?: ""
                val name = record?.deviceName
                android.util.Log.d(
                    "FmmsTpms",
                    "ADV mac=${result.device.address} name=$name rssi=${result.rssi} " +
                        "svc=[$svc] mfg=[$mfgStr] raw=${bytesToHex(record?.bytes)}"
                )
                devices[result.device.address] = TpmsDevice(
                    mac = result.device.address,
                    name = name,
                    rssi = result.rssi,
                    serviceUuids = svc,
                    mfgData = mfgStr,
                    rawAdv = bytesToHex(record?.bytes),
                    lastSeen = System.currentTimeMillis(),
                )
            }

            override fun onScanFailed(errorCode: Int) {
                android.util.Log.e("FmmsTpms", "scan failed: $errorCode")
                scanning = false
            }
        }
        callback = cb
        runCatching { bleScanner.startScan(cb) }
        scanning = true
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "TPMS — HỌC CẢM BIẾN",
                color = colors.textPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            Button(onClick = { if (scanning) stopScan() else startScan() }, enabled = permsGranted) {
                Text(if (scanning) "■ DỪNG" else "▶ QUÉT")
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            if (!permsGranted) "Cần cấp quyền Bluetooth để quét"
            else "Bật quét rồi vặn/xả nhẹ cảm biến ZESHTECH để chúng phát sóng. " +
                "Dữ liệu thô ghi ra logcat tag FmmsTpms.",
            color = colors.textSecondary,
            fontSize = 11.sp,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "${devices.size} thiết bị",
            color = colors.cyan,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(6.dp))

        val sorted = devices.values.sortedByDescending { it.rssi }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(sorted, key = { it.mac }) { d ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                d.name ?: "(không tên)",
                                color = colors.textPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                            )
                            Box(
                                modifier = Modifier
                                    .background(colors.cyan.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("${d.rssi} dBm", color = colors.cyan, fontSize = 10.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(d.mac, color = colors.textSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        if (d.serviceUuids.isNotBlank()) {
                            Text("svc: ${d.serviceUuids}", color = colors.textSecondary, fontSize = 9.sp, fontFamily = FontFamily.Monospace, maxLines = 1)
                        }
                        if (d.mfgData.isNotBlank()) {
                            Text("mfg: ${d.mfgData}", color = colors.amber, fontSize = 9.sp, fontFamily = FontFamily.Monospace, maxLines = 2)
                        }
                        Text("raw: ${d.rawAdv}", color = colors.textSecondary, fontSize = 9.sp, fontFamily = FontFamily.Monospace, maxLines = 2)
                    }
                }
            }
        }
    }
}
