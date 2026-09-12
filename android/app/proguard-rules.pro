# ============================================================
# FMMS CarLogger — ProGuard / R8 rules (Rev 131+)
# ============================================================

# ── General: keep line numbers for crash stack traces ──────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Room: keep all @Entity, @Dao, @Database classes ────────
-keep class com.fmms.carlogger.core.database.** { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }
-dontwarn androidx.room.**

# ── AppContainer singleton + domain models ─────────────────
-keep class com.fmms.carlogger.AppContainer { *; }
-keep class com.fmms.carlogger.domain.model.** { *; }
-keep class com.fmms.carlogger.data.repository.** { *; }

# ── BuildConfig (accessed by string at runtime) ─────────────
-keep class com.fmms.carlogger.BuildConfig { *; }

# ── OkHttp + Okio (Supabase HTTP client) ───────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# ── TensorFlow Lite (ADAS detector) ────────────────────────
-keep class org.tensorflow.** { *; }
-keepclassmembers class org.tensorflow.** { *; }
-dontwarn org.tensorflow.**

# ── CameraX ────────────────────────────────────────────────
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ── ExoPlayer / Media3 (YouTube HLS player) ────────────────
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# ── Kotlin coroutines & serialization ──────────────────────
-keepclassmembers class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# ── Android Security (EncryptedSharedPreferences) ──────────
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**

# ── WorkManager ─────────────────────────────────────────────
-keep class androidx.work.** { *; }
-keep class com.fmms.carlogger.data.sync.SyncWorker { *; }

# ── Enum classes (used in when/switch) ──────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Parcelable ──────────────────────────────────────────────
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ── Serializable ────────────────────────────────────────────
-keepclassmembers class * implements java.io.Serializable {
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
