package com.fmms.carlogger.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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
import com.fmms.carlogger.ui.stats.StatsScreen
import com.fmms.carlogger.ui.trips.TripsScreen
import com.fmms.carlogger.ui.more.MoreScreen
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.MoreHoriz

private data class TopLevelDestination(val route: String, val label: String, val icon: ImageVector)

private val destinations = listOf(
    TopLevelDestination("home", "HOME", Icons.Filled.Home),
    TopLevelDestination("trips", "TRIPS", Icons.Filled.Route),
    TopLevelDestination("fuel", "FUEL", Icons.Filled.LocalGasStation),
    TopLevelDestination("stats", "STATS", Icons.Filled.BarChart),
    TopLevelDestination("more", "MORE", Icons.Filled.MoreHoriz),
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
            MaterialTheme(colorScheme = darkColorScheme()) {
                FmmsApp()
            }
        }
    }

    private fun requestPermissionsIfNeeded() {
        val list = mutableListOf(
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION,
        )
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

    Scaffold(
        containerColor = Color(0xFF0B0F19),
        bottomBar = {
            NavigationBar(containerColor = Color(0xFF111827)) {
                destinations.forEach { dest ->
                    NavigationBarItem(
                        selected = currentRoute == dest.route,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = {
                            Text(dest.label, style = MaterialTheme.typography.labelMedium)
                        },
                    )
                }
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .padding(padding)
                .background(Color(0xFF0B0F19))
        ) {
            NavHost(navController = navController, startDestination = "home") {
                composable("home") { DashboardScreen(vm = vm) }
                composable("trips") { TripsScreen() }
                composable("fuel") { FuelScreen() }
                composable("stats") { StatsScreen() }
                composable("more") { MoreScreen(vm = vm) }
            }
        }
    }
}