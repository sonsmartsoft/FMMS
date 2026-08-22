package com.fmms.carlogger.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.data.sync.SyncWorker
import com.fmms.carlogger.ui.dashboard.DashboardScreen
import com.fmms.carlogger.ui.dashboard.SpeedometerScreen
import com.fmms.carlogger.ui.fuel.FuelScreen
import com.fmms.carlogger.ui.i18n.En
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.i18n.ProvideStrings
import com.fmms.carlogger.ui.i18n.Vi
import com.fmms.carlogger.ui.lunar.LunarCalendarScreen
import com.fmms.carlogger.ui.more.ConnectionScreen
import com.fmms.carlogger.ui.more.MoreScreen
import com.fmms.carlogger.ui.stats.StatsScreen
import com.fmms.carlogger.ui.theme.FmmsTheme
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import com.fmms.carlogger.ui.theme.ThemeMode
import com.fmms.carlogger.ui.trips.TripsScreen
import com.fmms.carlogger.ui.weather.WeatherScreen
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.MoreHoriz

private data class TopLevelDestination(val route: String, val label: String, val icon: ImageVector)

private val destinations = listOf(
    TopLevelDestination("home", "home", Icons.Filled.Home),
    TopLevelDestination("trips", "trips", Icons.Filled.Route),
    TopLevelDestination("fuel", "fuel", Icons.Filled.LocalGasStation),
    TopLevelDestination("stats", "stats", Icons.Filled.BarChart),
    TopLevelDestination("more", "more", Icons.Filled.MoreHoriz),
)

class MainActivity : ComponentActivity() {

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppContainer.init(applicationContext)
        try {
            AppContainer.startTelemetryService()
        } catch (e: Exception) {
            // Never let a background-service failure kill the UI.
            android.util.Log.e("FMMS", "startTelemetryService failed", e)
        }
        try {
            AppContainer.scheduleSync()
        } catch (e: Exception) {
            android.util.Log.e("FMMS", "scheduleSync failed", e)
        }

        requestPermissionsIfNeeded()

        setContent {
            val themeMode by AppContainer.themeMode.collectAsState()
            val lang by AppContainer.language.collectAsState()
            val systemDark = isSystemInDarkTheme()
            val dark = ThemeMode.resolve(themeMode, systemDark)
            FmmsTheme(dark = dark) {
                ProvideStrings(strings = if (lang == "vi") Vi else En) {
                    FmmsApp()
                }
            }
        }
    }

    private fun requestPermissionsIfNeeded() {
        val list = mutableListOf(
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            list += Manifest.permission.BLUETOOTH_SCAN
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            list += Manifest.permission.POST_NOTIFICATIONS
        }
        val ungranted = list.filter {
            checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }
        if (ungranted.isNotEmpty()) {
            permissionLauncher.launch(ungranted.toTypedArray())
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FmmsApp(vm: DashboardViewModel = viewModel()) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: "home"
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    fun labelOf(dest: TopLevelDestination): String = when (dest.label) {
        "home" -> strings.home
        "trips" -> strings.trips
        "fuel" -> strings.fuel
        "stats" -> strings.stats
        else -> strings.more
    }

    // Bấm icon điều hướng khi đang mở màn phụ (tốc độ / lịch / thời tiết)
    // sẽ tự đóng màn phụ và chuyển tới đích.
    fun goTo(dest: TopLevelDestination) {
        navController.navigate(dest.route) {
            popUpTo(navController.graph.startDestinationId) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    // Toast chỉ khi BẮT ĐẦU ghi và KẾT THÚC ghi hành trình (yêu cầu: bỏ toast rail)
    val tripToastContext = androidx.compose.ui.platform.LocalContext.current
    var tripWasActive by rememberSaveable { mutableStateOf(false) }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        AppContainer.tripEngine.state.collect { st ->
            if (st.active && !tripWasActive) {
                android.widget.Toast.makeText(tripToastContext, strings.tripStartToast, android.widget.Toast.LENGTH_SHORT).show()
            } else if (!st.active && tripWasActive) {
                android.widget.Toast.makeText(tripToastContext, strings.tripEndToast, android.widget.Toast.LENGTH_SHORT).show()
            }
            tripWasActive = st.active
        }
    }

    androidx.compose.foundation.layout.BoxWithConstraints {
        val isLandscape = maxWidth >= 560.dp

        if (isLandscape) {
            // MÀN NGANG / TABLET: thanh điều hướng DỌC bên trái, có chế độ ghim / tự ẩn
            val context = androidx.compose.ui.platform.LocalContext.current
            var railPinned by rememberSaveable { mutableStateOf(AppContainer.prefs.getRailPinned()) }
            var railTempOpen by rememberSaveable { mutableStateOf(false) }

            LaunchedEffect(railPinned, railTempOpen) {
                if (!railPinned && railTempOpen) {
                    kotlinx.coroutines.delay(6000)
                    railTempOpen = false
                }
            }

            Row(modifier = Modifier.fillMaxSize().background(colors.background)) {
                if (railPinned || railTempOpen) {
                    Box {
                        NavigationRail(containerColor = colors.surface) {
                            Spacer(modifier = Modifier.height(4.dp))
                            destinations.forEach { dest ->
                                NavigationRailItem(
                                    selected = currentRoute == dest.route,
                                    onClick = { goTo(dest) },
                                    icon = { Icon(dest.icon, contentDescription = labelOf(dest)) },
                                    label = { Text(labelOf(dest), style = MaterialTheme.typography.labelSmall) },
                                )
                            }
                        }
                        // Chấm nhỏ ở đáy rail (vùng bấm 40dp): đặc cyan = ghim, rỗng = tự ẩn
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(bottom = 6.dp)
                                .size(40.dp)
                                .clickable {
                                    android.util.Log.d("FmmsRail", "dot tapped, was pinned=$railPinned")
                                    if (railPinned) {
                                        railPinned = false
                                        AppContainer.prefs.setRailPinned(false)
                                        railTempOpen = true
                                    } else {
                                        railPinned = true
                                        AppContainer.prefs.setRailPinned(true)
                                        railTempOpen = false
                                    }
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (railPinned) colors.cyan.copy(alpha = 0.9f)
                                        else Color.Transparent
                                    )
                                    .then(
                                        if (railPinned) Modifier
                                        else Modifier.border(1.5.dp, colors.cyan.copy(alpha = 0.7f), CircleShape)
                                    ),
                            )
                        }
                    }
                } else {
                    // Đã tự ẩn — KHÔNG hiển thị gì; vuốt từ mép trái để mở lại
                    Box(modifier = Modifier.width(0.dp))
                }
                Box(modifier = Modifier.weight(1f)) {
                    FmmsNavHost(navController = navController, vm = vm)
                    // Dải cảm ứng vô hình ở mép trái màn hình: vuốt sang phải mở rail
                    if (!(railPinned || railTempOpen)) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .fillMaxHeight()
                                .width(28.dp)
                                .pointerInput(Unit) {
                                    var accumulated = 0f
                                    detectHorizontalDragGestures(
                                        onDragStart = { accumulated = 0f },
                                        onDragEnd = { accumulated = 0f },
                                        onDragCancel = { accumulated = 0f },
                                    ) { _, dragAmount ->
                                        accumulated += dragAmount
                                        if (accumulated > 90f) {
                                            android.util.Log.d("FmmsRail", "edge swipe open")
                                            railTempOpen = true
                                            accumulated = 0f
                                        }
                                    }
                                },
                        )
                    }
                }
            }
        } else {
            // MÀN DỌC: thanh điều hướng dưới, có chữ
            Scaffold(
                containerColor = colors.background,
                bottomBar = {
                    NavigationBar(containerColor = colors.surface) {
                        destinations.forEach { dest ->
                            NavigationBarItem(
                                selected = currentRoute == dest.route,
                                onClick = { goTo(dest) },
                                icon = { Icon(dest.icon, contentDescription = labelOf(dest)) },
                                label = { Text(labelOf(dest), style = MaterialTheme.typography.labelMedium) },
                            )
                        }
                    }
                },
            ) { padding ->
                androidx.compose.foundation.layout.Box(
                    modifier = androidx.compose.ui.Modifier
                        .padding(padding)
                        .background(colors.background)
                ) {
                    FmmsNavHost(navController = navController, vm = vm)
                }
            }
        }
    }
}

@Composable
private fun FmmsNavHost(navController: androidx.navigation.NavHostController, vm: DashboardViewModel) {
    NavHost(navController = navController, startDestination = "home") {
        composable("home") { DashboardScreen(vm = vm, onAddDevice = {
            navController.navigate("connection") { launchSingleTop = true }
        }, onSpeedometer = {
            navController.navigate("speedometer") { launchSingleTop = true }
        }, onLunar = {
            navController.navigate("lunar_calendar") { launchSingleTop = true }
        }, onWeather = {
            navController.navigate("weather") { launchSingleTop = true }
        }, onOpenDate = { y, m, d ->
            navController.navigate("lunar_calendar?y=$y&m=$m&d=$d") { launchSingleTop = true }
        }) }
        composable("trips") { TripsScreen() }
        composable("fuel") { FuelScreen() }
        composable("stats") { StatsScreen() }
        composable("more") { MoreScreen(vm = vm) }
        composable("connection") {
            ConnectionScreen(onBack = { navController.popBackStack() })
        }
        composable("speedometer") {
            SpeedometerScreen(vm = vm)
        }
        composable(
            route = "lunar_calendar?y={y}&m={m}&d={d}",
            arguments = listOf(
                androidx.navigation.navArgument("y") { type = androidx.navigation.NavType.IntType; defaultValue = 0 },
                androidx.navigation.navArgument("m") { type = androidx.navigation.NavType.IntType; defaultValue = 0 },
                androidx.navigation.navArgument("d") { type = androidx.navigation.NavType.IntType; defaultValue = 0 },
            ),
        ) { entry ->
            LunarCalendarScreen(
                initialY = entry.arguments?.getInt("y") ?: 0,
                initialM = entry.arguments?.getInt("m") ?: 0,
                initialD = entry.arguments?.getInt("d") ?: 0,
            )
        }
        composable("weather") {
            WeatherScreen(vm = vm)
        }
    }
}