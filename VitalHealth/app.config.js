export default {
  expo: {
    name: "VitalHealth",
    slug: "vitaltwin",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "vitalhealth",
    userInterfaceStyle: "automatic",

    // ✅ Required for reanimated + stable Notifee background handling
    newArchEnabled: true,

    assetBundlePatterns: ["**/*"],
    owner: "monish_k",

    /////////////////////////////////////////////////////////
    // IOS CONFIGURATION
    /////////////////////////////////////////////////////////
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.monish2005.vitaltwin",
      infoPlist: {
        NSCameraUsageDescription:
          "Allow VitalHealth to access your camera for heart rate measurement.",
        NSMicrophoneUsageDescription:
          "Microphone access may be required by the camera system.",
        NSMotionUsageDescription:
          "Allow VitalHealth to access motion sensors for step counting.",
        NSHealthShareUsageDescription:
          "Allow VitalHealth to access your health data.",
        NSHealthUpdateUsageDescription:
          "Allow VitalHealth to update your health data.",
        UIBackgroundModes: [
          "fetch",
          "processing",
          "remote-notification",
        ],
      },
    },

    /////////////////////////////////////////////////////////
    // ANDROID CONFIGURATION
    /////////////////////////////////////////////////////////
    android: {
      package: "com.monish2005.vitaltwin",
      versionCode: 11,

      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage:
          "./assets/images/android-icon-foreground.png",
      },

      /////////////////////////////////////////////////////
      // ✅ NOTIFICATION CONFIG (IMPORTANT)
      /////////////////////////////////////////////////////
      notification: {
        icon: "./assets/images/icon.png",
        color: "#4CAF50",
      },

      /////////////////////////////////////////////////////
      // ✅ REQUIRED PERMISSIONS
      /////////////////////////////////////////////////////
      permissions: [
        "CAMERA",
        "FLASHLIGHT",
        "ACTIVITY_RECOGNITION",
        "BODY_SENSORS",
        "WAKE_LOCK",
        "VIBRATE",
        "INTERNET",

        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_DATA_SYNC",

        "RECEIVE_BOOT_COMPLETED",

        "POST_NOTIFICATIONS",

        "USE_EXACT_ALARM",
        "SCHEDULE_EXACT_ALARM",
      ],

      /////////////////////////////////////////////////////
      // ✅ FIX: Allow background services properly
      /////////////////////////////////////////////////////
      usesCleartextTraffic: true,
    },

    /////////////////////////////////////////////////////////
    // PLUGINS
    /////////////////////////////////////////////////////////
    plugins: [
      "expo-router",

      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],

      "expo-sqlite",
      "expo-task-manager",
      "expo-background-fetch",
      "expo-secure-store",
      "expo-web-browser",

      [
        "expo-sensors",
        {
          motionPermission:
            "Allow VitalHealth to access motion sensors for step counting.",
        },
      ],

      [
        "react-native-vision-camera",
        {
          cameraPermission:
            "Allow VitalHealth to access your camera for heart rate measurement.",
          microphonePermission:
            "Allow VitalHealth to access your microphone.",
          enableFrameProcessors: true,
        },
      ],

      /////////////////////////////////////////////////////
      // ✅ BUILD PROPERTIES (CRITICAL FOR NOTIFEE)
      /////////////////////////////////////////////////////
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,

            extraMavenRepos: [
              "$rootDir/../node_modules/@notifee/react-native/android/libs",
            ],

            enableProguardInReleaseBuilds: true,

            // ✅ FIX: Stability for Notifee background execution
            kotlinVersion: "2.1.20",

            ///////////////////////////////////////////////////
            // 🔥 IMPORTANT: Prevent background task crash
            ///////////////////////////////////////////////////
            packagingOptions: {
              pickFirst: ["**/*.so"],
            },
          },
          ios: {
            useFrameworks: "static",
          },
        },
      ],
    ],

    /////////////////////////////////////////////////////////
    // EXPERIMENTAL
    /////////////////////////////////////////////////////////
    experiments: {
      typedRoutes: true,
    },

    /////////////////////////////////////////////////////////
    // EXTRA
    /////////////////////////////////////////////////////////
    extra: {
      eas: {
        projectId: "b6fe37d0-985e-4458-9790-a30dc86ba92b",
      },
    },
  },
};