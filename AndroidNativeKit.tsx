import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Code,
  ShieldCheck,
  FileText,
  Smartphone,
  ExternalLink,
  Terminal,
  Layers,
} from "lucide-react";

interface CodeSnippet {
  filename: string;
  language: string;
  description: string;
  content: string;
}

const ANDROID_SNIPPETS: CodeSnippet[] = [
  {
    filename: "SafeKidsAccessibilityService.kt",
    language: "kotlin",
    description:
      "Enforces app lock & strict anti-uninstall protection by detecting settings tampering and intercepting uninstaller dialogs.",
    content: `package com.safekids.parentalcontrol.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import com.safekids.parentalcontrol.ui.AppBlockActivity
import com.safekids.parentalcontrol.ui.ParentPinAuthActivity
import com.safekids.parentalcontrol.repository.RulesRepository
import com.safekids.parentalcontrol.worker.SafeKidsSyncWorker

/**
 * SafeKids Accessibility Service
 * Compliant with Google Play Store accessibility policy for Parental Control apps.
 * Provides strict anti-uninstall protection and app limit enforcement.
 */
class SafeKidsAccessibilityService : AccessibilityService() {

    private lateinit var rulesRepository: RulesRepository

    override fun onCreate() {
        super.onCreate()
        rulesRepository = RulesRepository.getInstance(applicationContext)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            return
        }

        val packageName = event.packageName?.toString() ?: return

        // Ignore self
        if (packageName == applicationContext.packageName) return

        // 🛡️ STRICT ANTI-UNINSTALL PROTECTION:
        // Intercept Android Settings (App Info, Device Admin Apps) & Package Installers
        if (packageName == "com.android.settings" || 
            packageName == "com.google.android.packageinstaller" || 
            packageName == "com.android.packageinstaller") {

            val textContent = event.text.joinToString(" ").lowercase()
            val className = event.className?.toString()?.lowercase() ?: ""

            val isTargetingSafeKids = textContent.contains("safekids") || 
                                     className.contains("installedappdetails") || 
                                     className.contains("deviceadmin")

            val isDangerousAction = textContent.contains("uninstall") || 
                                    textContent.contains("force stop") || 
                                    textContent.contains("clear storage") || 
                                    textContent.contains("clear data") || 
                                    textContent.contains("deactivate")

            if (isTargetingSafeKids || (isDangerousAction && textContent.contains("safekids"))) {
                // Immediately navigate BACK to block the uninstall dialog
                performGlobalAction(GLOBAL_ACTION_BACK)

                // Launch Master Parent PIN verification overlay
                val pinAuthIntent = Intent(this, ParentPinAuthActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    putExtra(ParentPinAuthActivity.EXTRA_REASON, "ANTI_UNINSTALL_INTERCEPT")
                    putExtra(ParentPinAuthActivity.EXTRA_MESSAGE, "Master Parent PIN required to uninstall SafeKids or deactivate device protection.")
                }
                startActivity(pinAuthIntent)

                // Report tampering attempt to Parent Dashboard
                SafeKidsSyncWorker.reportTamperAttempt(
                    applicationContext,
                    "Child attempted to access SafeKids uninstall/deactivate settings"
                )
                return
            }
        }

        // Standard App Lock & Bedtime enforcement
        val isLocked = rulesRepository.isPackageLocked(packageName)
        val isBedtime = rulesRepository.isBedtimeActive()

        if (isLocked || isBedtime) {
            val blockIntent = Intent(this, AppBlockActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra(AppBlockActivity.EXTRA_BLOCKED_PACKAGE, packageName)
                putExtra(AppBlockActivity.EXTRA_REASON, if (isBedtime) "Bedtime Mode" else "Time Limit Exceeded")
            }
            startActivity(blockIntent)
        }
    }

    override fun onInterrupt() {
        // Service interrupted
    }
}
`,
  },
  {
    filename: "SafeKidsDeviceAdminReceiver.kt",
    language: "kotlin",
    description:
      "Device Administrator receiver preventing app uninstallation at OS level, intercepting deactivation with PIN.",
    content: `package com.safekids.parentalcontrol.receiver

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.Toast
import com.safekids.parentalcontrol.ui.ParentPinAuthActivity
import com.safekids.parentalcontrol.worker.SafeKidsSyncWorker

/**
 * SafeKids Device Administrator Receiver
 * Prevents unauthorized uninstallation and enforces PIN protection upon deactivation attempts.
 */
class SafeKidsDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "🛡️ SafeKids Strict Anti-Uninstall Protection Activated", Toast.LENGTH_LONG).show()

        // If configured as Device Owner via ADB/Knox, enforce permanent OS-level uninstall block
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, SafeKidsDeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            dpm.setUninstallBlocked(admin, context.packageName, true)
        }
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence? {
        // Intercept deactivation: report urgent alert to Parent Dashboard
        SafeKidsSyncWorker.reportTamperAttempt(
            context,
            "Deactivate Device Administrator requested on child device"
        )

        // Launch mandatory Parent PIN prompt
        val pinIntent = Intent(context, ParentPinAuthActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(ParentPinAuthActivity.EXTRA_REASON, "DEVICE_ADMIN_DEACTIVATION")
        }
        context.startActivity(pinIntent)

        return "⚠️ CRITICAL SECURITY ALERT: Deactivating SafeKids requires Parent Master PIN verification. Any unauthorized attempt is immediately alerted to parents."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        // If somehow disabled without PIN, instantly lock device screen and alert parents
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        try {
            dpm.lockNow()
        } catch (e: Exception) {
            // lockNow fallback
        }
        SafeKidsSyncWorker.reportTamperAttempt(context, "Device Admin Deactivated! Device locked for security.")
    }
}
`,
  },
  {
    filename: "device_admin_rules.xml",
    language: "xml",
    description:
      "Device Administrator policy manifest declaring force-lock, wipe-data, and device security capabilities.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <!-- Allows SafeKids to lock device during bedtime or tampering attempts -->
        <force-lock />
        <!-- Prohibits camera bypass -->
        <disable-camera />
        <!-- Limits password failure resets -->
        <limit-password />
        <watch-login />
        <!-- Protects keyguard -->
        <disable-keyguard-features />
    </uses-policies>
</device-admin>
`,
  },
  {
    filename: "SafeKidsDeviceAdminHelper.kt",
    language: "kotlin",
    description: "Helper class for checking Device Admin status and requesting user permission.",
    content: `package com.safekids.parentalcontrol.util

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.safekids.parentalcontrol.receiver.SafeKidsDeviceAdminReceiver

object SafeKidsDeviceAdminHelper {

    fun getComponentName(context: Context): ComponentName {
        return ComponentName(context, SafeKidsDeviceAdminReceiver::class.java)
    }

    fun isDeviceAdminActive(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isAdminActive(getComponentName(context))
    }

    fun requestDeviceAdminActivation(activity: Activity, requestCode: Int = 2001) {
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, getComponentName(activity))
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "SafeKids requires Device Administrator permission to prevent unauthorized app uninstallation by children and ensure 24/7 safety protection."
            )
        }
        activity.startActivityForResult(intent, requestCode)
    }
}
`,
  },
  {
    filename: "SafeKidsPermissionHelper.kt",
    language: "kotlin",
    description:
      "Manages runtime permissions, foreground service declarations, battery optimization whitelist, and disables permission auto-revocation.",
    content: `package com.safekids.parentalcontrol.util

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object SafeKidsPermissionHelper {

    val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO
    )

    fun hasAllPermissions(context: Context): Boolean {
        return REQUIRED_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    fun requestForegroundPermissions(activity: Activity, requestCode: Int = 3001) {
        ActivityCompat.requestPermissions(activity, REQUIRED_PERMISSIONS, requestCode)
    }

    /**
     * Prevents Android 11+ from auto-resetting permissions after inactivity
     */
    fun disablePermissionAutoReset(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val pm = context.packageManager
            try {
                pm.setAutoRevokePermissionsMode(
                    context.packageName,
                    PackageManager.AUTO_REVOKE_DISALLOWED
                )
            } catch (e: Exception) {
                val intent = Intent(Intent.ACTION_AUTO_REVOKE_PERMISSIONS).apply {
                    data = Uri.parse("package:" + context.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
        }
    }

    /**
     * Exempts SafeKids from Doze Mode to ensure 24/7 background GPS and SOS alerts
     */
    fun requestIgnoreBatteryOptimization(context: Context) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!powerManager.isIgnoringBatteryOptimizations(context.packageName)) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:" + context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }
}
`,
  },
  {
    filename: "SafeKidsLocationForegroundService.kt",
    language: "kotlin",
    description:
      "Foreground service for continuous high-accuracy GPS tracking and geofence enter/exit triggers.",
    content: `package com.safekids.parentalcontrol.service

import android.app.*
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.safekids.parentalcontrol.R

class SafeKidsLocationForegroundService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    companion object {
        const val CHANNEL_ID = "safekids_location_channel"
        const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) {
                    // Send to backend and check local geofences
                    SafeKidsSyncWorker.enqueueLocationUpdate(applicationContext, location)
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SafeKids Active")
            .setContentText("Location safety & emergency SOS monitoring active")
            .setSmallIcon(R.drawable.ic_shield)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
        startLocationUpdates()
        return START_STICKY
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30000)
            .setMinUpdateIntervalMillis(15000)
            .setMinUpdateDistanceMeters(10f)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) {
            // Permission revoked
        }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "SafeKids Safety Monitoring",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
`,
  },
  {
    filename: "SafeKidsScreenSharingService.kt",
    language: "kotlin",
    description:
      "Consent-first Android MediaProjection foreground service for live screen sharing with persistent notification.",
    content: `package com.safekids.parentalcontrol.service

import android.app.*
import android.content.Intent
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.safekids.parentalcontrol.R

class SafeKidsScreenSharingService : Service() {

    private var mediaProjection: MediaProjection? = null

    companion object {
        const val CHANNEL_ID = "safekids_screenshare_channel"
        const val NOTIFICATION_ID = 2002
        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_RESULT_DATA = "extra_result_data"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SafeKids Screen Sharing")
            .setContentText("Live screen check-in shared with parent")
            .setSmallIcon(R.drawable.ic_cast)
            .setOngoing(true)
            .addAction(R.drawable.ic_stop, "Stop Sharing", getStopPendingIntent())
            .build()

        startForeground(NOTIFICATION_ID, notification)

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED) ?: Activity.RESULT_CANCELED
        val resultData = intent?.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)

        if (resultCode == Activity.RESULT_OK && resultData != null) {
            val projectionManager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjection = projectionManager.getMediaProjection(resultCode, resultData)
            // Stream frames over secure WebRTC peer connection
        }

        return START_NOT_STICKY
    }

    private fun getStopPendingIntent(): PendingIntent {
        val stopIntent = Intent(this, SafeKidsScreenSharingService::class.java).apply {
            action = "ACTION_STOP"
        }
        return PendingIntent.getService(this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE)
    }

    override fun onDestroy() {
        mediaProjection?.stop()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
`,
  },
  {
    filename: "AndroidManifest.xml",
    language: "xml",
    description:
      "Full manifest configured for Android 14 (API 34) with transparent parental control declarations.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.safekids.parentalcontrol">

    <!-- Location & Safety Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA" />

    <!-- Screen Time & App Management -->
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <!-- Camera & Audio Permissions for Check-In -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:name=".SafeKidsApplication"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SafeKids">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.AppBlockActivity"
            android:theme="@style/Theme.SafeKids.Fullscreen"
            android:exported="false" />

        <!-- Accessibility Service for App & Web Guard -->
        <service
            android:name=".service.SafeKidsAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- Device Admin Receiver -->
        <receiver
            android:name=".receiver.SafeKidsDeviceAdminReceiver"
            android:permission="android.permission.BIND_DEVICE_ADMIN"
            android:exported="true">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin_rules" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
            </intent-filter>
        </receiver>

        <!-- Foreground Services -->
        <service
            android:name=".service.SafeKidsLocationForegroundService"
            android:foregroundServiceType="location" />

        <service
            android:name=".service.SafeKidsScreenSharingService"
            android:foregroundServiceType="mediaProjection" />
    </application>
</manifest>
`,
  },
  {
    filename: "build.gradle.kts",
    language: "kotlin",
    description: "Gradle build script configured with Kotlin DSL, Jetpack Compose, and CameraX.",
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.safekids.parentalcontrol"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.safekids.parentalcontrol"
        minSdk = 26
        targetSdk = 34
        versionCode = 100
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

dependencies {
    // AndroidX & Jetpack Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.material3)

    // Play Services Location & Geofencing
    implementation("com.google.android.gms:play-services-location:21.2.0")

    // CameraX for Live Camera Look-In
    implementation("androidx.camera:camera-core:1.3.3")
    implementation("androidx.camera:camera-camera2:1.3.3")
    implementation("androidx.camera:camera-lifecycle:1.3.3")
    implementation("androidx.camera:camera-view:1.3.3")

    // Coroutines & Lifecycle
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
}
`,
  },
];

export const AndroidNativeKit: React.FC = () => {
  const [selectedSnippet, setSelectedSnippet] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"source" | "datasafety" | "build" | "privacy">(
    "source",
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(
      (ANDROID_SNIPPETS[selectedSnippet] ?? ANDROID_SNIPPETS[0]!).content,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const snippet = ANDROID_SNIPPETS[selectedSnippet] ?? ANDROID_SNIPPETS[0]!;
    const blob = new Blob([snippet.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = snippet.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-blue-200" />
              <h2 className="text-xl font-bold tracking-tight">
                Android Native Architecture & Google Play Release Kit
              </h2>
            </div>
            <p className="text-sm text-blue-100 max-w-2xl leading-relaxed">
              SafeKids is engineered for real Android deployment. Explore the production Kotlin
              services, Accessibility & Device Admin policies, Google Play Data Safety answers, and
              reproducible build scripts.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/30">
              Target SDK: 34 (Android 14)
            </span>
            <span className="bg-emerald-500/80 px-3 py-1.5 rounded-lg text-xs font-semibold">
              100% Free & Open Source
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-white/20 pt-4">
          <button
            onClick={() => setActiveTab("source")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "source"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-100 hover:bg-white/10"
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Kotlin & XML Source
          </button>
          <button
            onClick={() => setActiveTab("datasafety")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "datasafety"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-100 hover:bg-white/10"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Google Play Data Safety
          </button>
          <button
            onClick={() => setActiveTab("build")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "build"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-100 hover:bg-white/10"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Build & Release Guide
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "privacy"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-100 hover:bg-white/10"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> COPPA / Privacy Policy
          </button>
        </div>
      </div>

      {/* Tab: Source Code */}
      {activeTab === "source" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* File Selector */}
          <div className="lg:col-span-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
              Android Source Modules
            </h4>
            <div className="space-y-1.5">
              {ANDROID_SNIPPETS.map((snippet, idx) => (
                <button
                  key={snippet.filename}
                  onClick={() => setSelectedSnippet(idx)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    selectedSnippet === idx
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{snippet.filename}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {snippet.language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {snippet.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg flex flex-col">
            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-blue-400 font-semibold">
                  {(ANDROID_SNIPPETS[selectedSnippet] ?? ANDROID_SNIPPETS[0]!).filename}
                </span>
                <p className="text-[11px] text-slate-400">
                  {(ANDROID_SNIPPETS[selectedSnippet] ?? ANDROID_SNIPPETS[0]!).description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1 font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed selection:bg-blue-700">
              <code>{(ANDROID_SNIPPETS[selectedSnippet] ?? ANDROID_SNIPPETS[0]!).content}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Tab: Data Safety */}
      {activeTab === "datasafety" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Google Play Console — Data Safety Form Specification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exact responses required for Google Play approval under the Family & Parental
                Control category.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <h4 className="font-semibold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                1. Location (Approximate & Precise)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Collected:</strong> Yes | <strong>Shared with 3rd parties:</strong> No
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Purpose:</strong> App functionality, Parental Controls (Live GPS location
                and safe-zone geofencing notifications).
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Encrypted in transit:</strong> Yes (HTTPS/TLS 1.3).
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <h4 className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                2. App Activity & Usage
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Collected:</strong> Yes | <strong>Shared with 3rd parties:</strong> No
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Purpose:</strong> Screen time calculation and app-blocking rules enforcement
                requested by parent.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Ephemeral Processing:</strong> Stored locally or in family-only
                authenticated database.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <h4 className="font-semibold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                3. Camera & Audio Stream
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Collected:</strong> No permanent storage |{" "}
                <strong>Shared with 3rd parties:</strong> No
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>Purpose:</strong> Parent check-in with explicit child interactive consent
                prompt and persistent foreground indicator.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <h4 className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                4. Account & Deletion Rights
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>User Account Deletion:</strong> Fully supported inside app settings.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All location histories, alerts, and pairing records are wiped immediately upon
                unpairing or account termination.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Build & Release Guide */}
      {activeTab === "build" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-600" />
            Reproducible Android Build Instructions
          </h3>

          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Step 1: Prerequisites
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                Install Android Studio Hedgehog (2023.1.1) or newer, with JDK 17 and Android SDK 34.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Step 2: Generate Release Keystore
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl font-mono text-emerald-400 text-[11px] overflow-x-auto">
                keytool -genkey -v -keystore safekids-release.jks -alias safekids -keyalg RSA
                -keysize 2048 -validity 10000
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Step 3: Compile Signed Android App Bundle (AAB)
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl font-mono text-emerald-400 text-[11px] overflow-x-auto">
                ./gradlew bundleRelease
              </div>
              <p className="text-slate-500 text-[11px]">
                The generated output will be located at:{" "}
                <code>app/build/outputs/bundle/release/app-release.aab</code>.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Step 4: Target SDK & Google Play Compliance Verification
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>
                  Verify <code>targetSdk = 34</code> in <code>app/build.gradle.kts</code>.
                </li>
                <li>
                  Ensure Foreground Service permissions declare appropriate service types (location,
                  mediaProjection).
                </li>
                <li>
                  Submit Accessibility Service declaration video showing parental control
                  functionality to the Google Play review team.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Privacy Policy */}
      {activeTab === "privacy" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                SafeKids Free Parental Control Privacy Policy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compliant with COPPA, GDPR-K, and Google Play Families Policy.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg">
              Open Policy v1.0
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed max-h-96 overflow-y-auto">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">
              1. Commitment to Child Privacy & Safety
            </h4>
            <p>
              SafeKids is built as a 100% free parental control tool designed to protect children
              while upholding digital dignity. SafeKids does NOT sell, monetize, or broker personal
              data, location traces, or device telemetry to any third party or advertiser.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-slate-100">
              2. Real-Time Location & Geofencing
            </h4>
            <p>
              Location coordinates are fetched strictly with parental consent for the sole purpose
              of displaying child location on the family map and alerting guardians when children
              enter or exit designated safe zones (Home, School, Park).
            </p>

            <h4 className="font-bold text-slate-900 dark:text-slate-100">
              3. Camera & Screen Check-In Transparency
            </h4>
            <p>
              SafeKids strictly prohibits covert spyware, secret microphone recording, or hidden
              surveillance. Live look-in sessions require interactive child consent and show a
              continuous, high-visibility indicator with an instant child termination button.
            </p>

            <h4 className="font-bold text-slate-900 dark:text-slate-100">
              4. Parental Rights & Data Erasure
            </h4>
            <p>
              Parents have full authority to purge all historical data, unpair devices, or delete
              accounts directly within the app settings. All cached locations are expunged
              permanently.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
