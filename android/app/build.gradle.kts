plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.fmms.carlogger"
    compileSdk = 34

    // Build dir ngoài vùng iCloud-sync (~/Documents) — sync tạo file trùng
    // " 2.class"/" 2.dex" làm D8 fail "defined multiple times".
    layout.buildDirectory.set(file(
        "/var/folders/z9/l4ns5bmx58s_vbsrt6vpd34c0000gn/T/opencode/fmms-android-build/app"))

    defaultConfig {
        applicationId = "com.fmms.carlogger"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "1.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        buildConfigField("String", "SUPABASE_URL", "\"https://opslebsdmwsnsyfmbynf.supabase.co\"")
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", "\"sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3\"")
        buildConfigField("String", "MAZDA2_ASSET_ID", "\"20260308-0001-4222-8888-19b213872026\"")
        // Số REV hiển thị ở Settings/About — tăng lên sau mỗi bản build.
        buildConfigField("String", "REV", "\"113\"")
    }

    signingConfigs {
        create("release") {
            // Dùng debug keystore để release cài đè được lên bản debug đã cài
            // (cùng chữ ký) — không phải uninstall mất dữ liệu.
            storeFile = file(System.getProperty("user.home") + "/.android/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("io.coil-kt:coil-compose:2.6.0")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // WorkManager for Sync
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // Coroutines & Flow
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Navigation Compose
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Network (Supabase PostgREST / Google Sheets)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Player YouTube nhúng (Piped API + HLS)
    implementation("androidx.media3:media3-exoplayer:1.3.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.3.1")
    implementation("androidx.media3:media3-ui:1.3.1")

    // Bản đồ miễn phí (OpenStreetMap) cho tab Car UI - khung MAP
}
