import notifee, { AndroidImportance } from "@notifee/react-native";
import { Platform } from "react-native";

///////////////////////////////////////////////////////////
// INITIALIZE NOTIFICATIONS (NOTIFEE)
///////////////////////////////////////////////////////////

export async function initializeNotifications(): Promise<void> {
  try {

    ///////////////////////////////////////////////////////
    // 🔐 REQUEST PERMISSION
    ///////////////////////////////////////////////////////

    const settings = await notifee.requestPermission();

    if (settings.authorizationStatus < 1) {
      console.log("❌ Notification permission not granted");
      return;
    }

    console.log("✅ Notification permission granted");

    ///////////////////////////////////////////////////////
    // 🤖 ANDROID CHANNELS (VERY IMPORTANT)
    ///////////////////////////////////////////////////////

    if (Platform.OS === "android") {

      // 🔔 MAIN CHANNEL (use this everywhere)
      await notifee.createChannel({
        id: "health",
        name: "Health Notifications",
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: "default",
      });

      // Optional separate channels (if you want)
      await notifee.createChannel({
        id: "hydration",
        name: "Hydration Reminders",
        importance: AndroidImportance.HIGH,
      });

      await notifee.createChannel({
        id: "medicine",
        name: "Medicine Reminders",
        importance: AndroidImportance.HIGH,
      });

      console.log("🔔 Android notification channels ready");
    }

    ///////////////////////////////////////////////////////
    // ℹ️ INFO
    ///////////////////////////////////////////////////////

    console.log("✅ Notifee notification system initialized");

  } catch (error) {
    console.log("❌ initializeNotifications error:", error);
  }
}