/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Gym Crew",
  slug: "kareem-hanafy",
  owner: "kaghim0s-team",
  version: "0.5.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "gymcrew",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.karrim.gymcrew",
    buildNumber: "5",
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
    },
  },
  android: {
    package: "com.karrim.gymcrew",
    versionCode: 5,
    adaptiveIcon: {
      backgroundColor: "#99E61A",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: true,
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
      "android.permission.VIBRATE",
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-asset",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F4F6F2",
        dark: { backgroundColor: "#070B0D" },
        image: "./assets/images/splash-icon.png",
        imageWidth: 180,
        resizeMode: "contain",
      },
    ],
    "expo-sqlite",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission: "Allow Gym Crew to protect your account.",
      },
    ],
    [
      "expo-localization",
      { supportedLocales: { ios: ["ar", "en"], android: ["ar", "en"] } },
    ],
    [
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
      },
    ],
    [
      "expo-notifications",
      {
        sounds: ["./assets/sounds/rest_complete.wav"],
        defaultChannel: "rest-timer",
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    eas: {
      projectId: "a73ececd-b073-4e7c-a39a-52371c186f9a",
    },
  },
};

module.exports = config;
