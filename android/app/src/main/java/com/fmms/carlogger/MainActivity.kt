package com.fmms.carlogger.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.data.sync.SyncWorker
import com.fmms.carlogger.ui.dashboard.DashboardScreen
import com.fmms.carlogger.ui.fuel.FuelScreen
import com.fmms.carlogger.ui.i18n.En
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.i18n.ProvideStrings
import com.fmms.carlogger.ui.i18n.Vi
import com.fmms.carlogger.ui.more.ConnectionScreen
import com.fmms.carlogger.ui.more.MoreScreen
import com.fmms.carlogger.ui.stats.StatsScreen
import com.fmms.carlogger.ui.theme.FmmsTheme
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import com.fmms.carlogger.ui.theme.ThemeMode
import com.fmms.carlogger.ui.trips.TripsScreen
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

    Scaffold(
        containerColor = colors.background,
        bottomBar = {
            NavigationBar(containerColor = colors.surface) {
                destinations.forEach { dest ->
                    val label = when (dest.label) {
                        "home" -> strings.home
                        "trips" -> strings.trips
                        "fuel" -> strings.fuel
                        "stats" -> strings.stats
                        else -> strings.more
                    }
                    NavigationBarItem(
                        selected = currentRoute == dest.route,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = label) },
                        label = {
                            Text(label, style = MaterialTheme.typography.labelMedium)
                        },
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
            NavHost(navController = navController, startDestination = "home") {
                composable("home") { DashboardScreen(vm = vm, onAddDevice = {
                    navController.navigate("connection") { launchSingleTop = true }
                }) }
                composable("trips") { TripsScreen() }
                composable("fuel") { FuelScreen() }
                composable("stats") { StatsScreen() }
                composable("more") { MoreScreen(vm = vm) }
                composable("connection") {
                    ConnectionScreen(onBack = { navController.popBackStack() })
                }
            }
        }
    }
}