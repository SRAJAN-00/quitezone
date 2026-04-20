const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

function withSilentAutomation(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const manifest = configWithManifest.modResults;
    AndroidConfig.Permissions.addPermission(manifest, "android.permission.ACCESS_NOTIFICATION_POLICY");
    AndroidConfig.Permissions.addPermission(manifest, "android.permission.MODIFY_AUDIO_SETTINGS");
    return configWithManifest;
  });
}

module.exports = withSilentAutomation;
