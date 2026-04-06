// utils/expoGo.ts
// ─────────────────────────────────────────────────────────────────
// Detects if running in Expo Go vs a real APK/IPA build.
// Critical: background notification tasks only work in real builds.
// ─────────────────────────────────────────────────────────────────

import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * ✅ FIXED: Returns true ONLY when running inside Expo Go client.
 *
 * Previous bug: used `!Constants.easConfig?.projectId` which returned
 * true in real APK builds too (easConfig can be undefined in some SDK versions).
 *
 * Correct method: use ExecutionEnvironment which is set by Expo at build time:
 *   - "storeClient"  → Expo Go
 *   - "standalone"   → real APK/IPA build
 *   - "bare"         → bare React Native
 */
export function isExpoGo(): boolean {
  try {
    // ✅ Primary check — most reliable across all SDK versions
    const env = Constants.executionEnvironment;
    if (env === ExecutionEnvironment.StoreClient) {
      return true;  // Running in Expo Go
    }
    if (
      env === ExecutionEnvironment.Standalone ||
      env === ExecutionEnvironment.Bare
    ) {
      return false; // Running in real APK/IPA build
    }

    // ✅ Fallback check for older SDK versions
    // In Expo Go the appOwnership is "expo", in standalone it's "standalone"
    const appOwnership = (Constants as any).appOwnership;
    if (appOwnership === "expo") return true;
    if (appOwnership === "standalone") return false;

    // ✅ Final fallback — check if running as standalone build
    // If we have a real package name it's a real build
    const appId = Constants.expoConfig?.android?.package ||
                  Constants.expoConfig?.ios?.bundleIdentifier;
    if (appId) return false;

    // Default to false (assume real build) so background tasks work
    return false;
  } catch {
    // If any error, assume real build so background tasks are NOT skipped
    return false;
  }
}

/**
 * Push notifications (remote) only work in real builds, not Expo Go.
 */
export function pushNotificationsSupported(): boolean {
  return !isExpoGo();
}

/**
 * Local notifications work in both Expo Go and real builds.
 */
export function localNotificationsSupported(): boolean {
  return true;
}