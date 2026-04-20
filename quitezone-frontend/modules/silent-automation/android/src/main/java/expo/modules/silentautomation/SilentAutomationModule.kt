package expo.modules.silentautomation

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SilentAutomationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SilentAutomation")

    AsyncFunction("getSilentAutomationStatus") {
      val context = resolveContext() ?: return@AsyncFunction mapOf(
        "canControlRinger" to false,
        "reason" to "Context unavailable — run from foreground once to initialise."
      )
      val hasAudioPermission = hasModifyAudioPermission(context)
      val canControl = hasAudioPermission && canControlRinger(context)
      mapOf(
        "canControlRinger" to canControl,
        "reason" to when {
          canControl -> null
          !hasAudioPermission -> "Missing MODIFY_AUDIO_SETTINGS permission"
          else -> "Notification policy access not granted"
        }
      )
    }

    AsyncFunction("requestSilentAutomationAccess") {
      val context = resolveContext() ?: return@AsyncFunction mapOf(
        "granted" to false,
        "reason" to "Context unavailable"
      )

      if (!hasModifyAudioPermission(context)) {
        return@AsyncFunction mapOf(
          "granted" to false,
          "reason" to "Missing MODIFY_AUDIO_SETTINGS permission. Rebuild the app after updating Android permissions."
        )
      }

      if (canControlRinger(context)) {
        return@AsyncFunction mapOf("granted" to true)
      }

      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)

      mapOf(
        "granted" to false,
        "reason" to "Notification policy access screen opened"
      )
    }

    AsyncFunction("setRingerMode") { mode: String ->
      val context = resolveContext() ?: return@AsyncFunction mapOf(
        "applied" to false,
        "blocked" to true,
        "reason" to "Context unavailable in background — make sure policy access is granted."
      )

      if (!hasModifyAudioPermission(context)) {
        return@AsyncFunction mapOf(
          "applied" to false,
          "blocked" to true,
          "reason" to "Missing MODIFY_AUDIO_SETTINGS permission"
        )
      }

      if (!canControlRinger(context)) {
        return@AsyncFunction mapOf(
          "applied" to false,
          "blocked" to true,
          "reason" to "Notification policy access not granted"
        )
      }

      val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val nextMode = when (mode.lowercase()) {
        "silent" -> AudioManager.RINGER_MODE_SILENT
        "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
        "normal" -> AudioManager.RINGER_MODE_NORMAL
        else -> {
          return@AsyncFunction mapOf(
            "applied" to false,
            "blocked" to true,
            "reason" to "Unsupported mode: $mode"
          )
        }
      }

      try {
        audioManager.ringerMode = nextMode
        val applied = audioManager.ringerMode == nextMode
        mapOf(
          "applied" to applied,
          "blocked" to !applied,
          "reason" to if (applied) null else "Android blocked the ringer mode change"
        )
      } catch (securityError: SecurityException) {
        mapOf(
          "applied" to false,
          "blocked" to true,
          "reason" to "Security error: ${securityError.message ?: "permission denied"}"
        )
      } catch (error: Exception) {
        mapOf(
          "applied" to false,
          "blocked" to true,
          "reason" to "Failed to apply ringer mode: ${error.message ?: "unknown error"}"
        )
      }
    }
  }

  // ReactApplicationContext keeps a strong reference to the Application object,
  // so applicationContext remains valid even when there is no active React instance
  // (i.e. the geofence task fires while the app is backgrounded).
  // Falls back to the current Activity's context for edge cases.
  private fun resolveContext(): Context? {
    return appContext.reactContext?.applicationContext
      ?: appContext.currentActivity?.applicationContext
  }

  private fun hasModifyAudioPermission(context: Context): Boolean {
    return context.checkCallingOrSelfPermission(Manifest.permission.MODIFY_AUDIO_SETTINGS) ==
      PackageManager.PERMISSION_GRANTED
  }

  private fun canControlRinger(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      return true
    }
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return notificationManager.isNotificationPolicyAccessGranted
  }
}
