const appJson = require("./app.json");

module.exports = ({ config }) => {
  const baseExpoConfig = appJson.expo || config;
  const mapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "";

  const androidConfig = {
    ...(baseExpoConfig.android || {}),
  };

  if (mapsApiKey) {
    androidConfig.config = {
      ...(androidConfig.config || {}),
      googleMaps: {
        apiKey: mapsApiKey,
      },
    };
  }

  return {
    ...baseExpoConfig,
    android: androidConfig,
  };
};
