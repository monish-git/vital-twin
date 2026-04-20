// services/notifeeService.ts

import notifee, {
  AndroidImportance,
  EventType,
  TriggerType,
  RepeatFrequency,
} from "@notifee/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { markMedicineTakenByNotificationId, getMedicineByNotificationId } from "../database/medicineDB";

// ✅ FIXED (Bug 2): Import from plain storage utility, NOT from HydrationContext
import { saveWaterToStorage } from "../utils/hydrationStorage";

///////////////////////////////////////////////////////////
// ACTION IDs
///////////////////////////////////////////////////////////

export const ACTION_MEDICINE_TAKEN = "MEDICINE_TAKEN";
export const ACTION_MEDICINE_SNOOZE = "MEDICINE_SNOOZE";

export const ACTION_WATER_100 = "HYDRATION_100";
export const ACTION_WATER_150 = "HYDRATION_150";
export const ACTION_WATER_200 = "HYDRATION_200";
export const ACTION_WATER_SKIP = "HYDRATION_SNOOZE";

// Keep old export name for backwards compatibility
export const ACTION_WATER_DRINK = "HYDRATION_100";

export const ACTION_SYMPTOM_DONE = "SYMPTOM_DONE";

const CHANNEL_ID = "health";

///////////////////////////////////////////////////////////
// SETUP
// ✅ FIXED (Bug 3): Battery optimization prompt is now shown ONCE only,
//    gated behind an AsyncStorage flag. Previously it popped on every launch.
///////////////////////////////////////////////////////////

export async function setupNotifee() {
  const settings = await notifee.requestPermission();

  if (settings.authorizationStatus < 1) {
    console.log("❌ Notification permission denied");
    return;
  }

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Health Notifications",
    importance: AndroidImportance.HIGH,
    vibration: true,
  });

  // ✅ FIXED: Only prompt for battery optimization once per install
  try {
    const alreadyPrompted = await AsyncStorage.getItem("battery_opt_prompted");

    if (!alreadyPrompted) {
      const powerManagerInfo = await notifee.getPowerManagerInfo();
      console.log("🔋 Power Manager:", powerManagerInfo);

      if (powerManagerInfo.activity) {
        console.log("⚡ Opening battery optimization settings (first time only)...");
        await notifee.openPowerManagerSettings();
        await AsyncStorage.setItem("battery_opt_prompted", "true");
      }
    } else {
      console.log("⚡ Battery optimization already prompted — skipping");
    }
  } catch (e) {
    console.log("⚠️ Power manager settings unavailable:", e);
  }

  console.log("✅ Notifee initialized");
}

///////////////////////////////////////////////////////////
// 💊 ONE-TIME MEDICINE
///////////////////////////////////////////////////////////

export const scheduleMedicineOnce = async (
  title: string,
  date: Date,
  medicineId?: number
): Promise<string> => {
  const id = `med_once_${Date.now()}`;

  await notifee.createTriggerNotification(
    {
      id,
      title: "💊 Medicine Reminder",
      body: title,
      data: {
        type: "medicine",
        medicineId: String(medicineId ?? ""),
      },
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: "default" },
        actions: [
          {
            title: "✅ Taken",
            pressAction: {
              id: ACTION_MEDICINE_TAKEN,
              launchActivity: "none",
            },
          },
          {
            title: "⏰ Snooze",
            pressAction: {
              id: ACTION_MEDICINE_SNOOZE,
              launchActivity: "none",
            },
          },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
      alarmManager: {
        allowWhileIdle: true,
      },
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// 💊 DAILY MEDICINE
///////////////////////////////////////////////////////////

export const scheduleMedicineDaily = async (
  title: string,
  hour: number,
  minute: number,
  medicineId?: number
): Promise<string> => {
  const id = `med_daily_${Date.now()}`;

  const now = new Date();
  const trigger = new Date();

  trigger.setHours(hour, minute, 0, 0);

  if (trigger.getTime() <= now.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  console.log("📅 Daily trigger:", trigger);

  await notifee.createTriggerNotification(
    {
      id,
      title: "💊 Medicine Reminder",
      body: title,
      data: {
        type: "medicine",
        medicineId: String(medicineId ?? ""),
      },
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: "default" },
        actions: [
          {
            title: "✅ Taken",
            pressAction: {
              id: ACTION_MEDICINE_TAKEN,
              launchActivity: "none",
            },
          },
          {
            title: "⏰ Snooze",
            pressAction: {
              id: ACTION_MEDICINE_SNOOZE,
              launchActivity: "none",
            },
          },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: trigger.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: {
        allowWhileIdle: true,
      },
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// 💧 HYDRATION REMINDER
///////////////////////////////////////////////////////////

export const scheduleHydration = async (
  minutes: number = 60
): Promise<string> => {
  const id = `hydration_${Date.now()}`;
  const timestamp = Date.now() + minutes * 60 * 1000;

  console.log("💧 Hydration in minutes:", minutes);

  await notifee.createTriggerNotification(
    {
      id,
      title: "💧 Drink Water",
      body: "Stay hydrated!",
      data: { type: "hydration" },
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: "default" },
        actions: [
          {
            title: "💧 100ml",
            pressAction: { id: ACTION_WATER_100, launchActivity: "none" },
          },
          {
            title: "💧 150ml",
            pressAction: { id: ACTION_WATER_150, launchActivity: "none" },
          },
          {
            title: "💧 200ml",
            pressAction: { id: ACTION_WATER_200, launchActivity: "none" },
          },
          {
            title: "Skip",
            pressAction: { id: ACTION_WATER_SKIP, launchActivity: "none" },
          },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: {
        allowWhileIdle: true,
      },
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// 🩺 SYMPTOM NOTIFICATION (INSTANT)
///////////////////////////////////////////////////////////

export const showSymptomNotification = async (symptom: string) => {
  await notifee.displayNotification({
    title: "🩺 Symptom Check",
    body: `Are you experiencing ${symptom}?`,
    data: { type: "symptom", symptom },
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: "default" },
      actions: [
        {
          title: "I'm fine",
          pressAction: {
            id: ACTION_SYMPTOM_DONE,
            launchActivity: "none",
          },
        },
      ],
    },
  });
};

export const scheduleSymptomHourly = async (
  symptom: string
): Promise<string> => {
  const id = `symptom_hourly_${Date.now()}`;

  await notifee.createTriggerNotification(
    {
      id,
      title: "🩺 Symptom Check",
      body: `Are you still experiencing ${symptom}?`,
      data: { type: "symptom", symptom },
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: "default" },
        actions: [
          {
            title: "I'm fine",
            pressAction: {
              id: ACTION_SYMPTOM_DONE,
              launchActivity: "none",
            },
          },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + 60 * 60 * 1000,
      repeatFrequency: RepeatFrequency.HOURLY,
      alarmManager: {
        allowWhileIdle: true,
      },
    }
  );

  return id;
};

// DEPRECATED: Use scheduleSymptomHourly instead
export const scheduleSymptomCheck = async (
  symptom: string,
  hour: number = 20,
  minute: number = 0
): Promise<string> => {
  const id = `symptom_${Date.now()}`;

  const trigger = new Date();
  trigger.setHours(hour, minute, 0, 0);

  if (trigger.getTime() <= Date.now()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id,
      title: "🩺 Symptom Check",
      body: `Are you experiencing ${symptom}?`,
      data: { type: "symptom", symptom },
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: "default" },
        actions: [
          {
            title: "I'm fine",
            pressAction: {
              id: ACTION_SYMPTOM_DONE,
              launchActivity: "none",
            },
          },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: trigger.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: {
        allowWhileIdle: true,
      },
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// 🔁 SNOOZE MEDICINE
///////////////////////////////////////////////////////////

export const snoozeMedicine = async (
  title: string,
  minutes: number = 10
): Promise<string> => {
  const id = `snooze_${Date.now()}`;
  const timestamp = Date.now() + minutes * 60 * 1000;

  await notifee.createTriggerNotification(
    {
      id,
      title: "💊 Snoozed Reminder",
      body: title,
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: "default" },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: {
        allowWhileIdle: true,
      },
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// ❌ CANCEL MEDICINE NOTIFICATION
///////////////////////////////////////////////////////////

export const cancelMedicineNotification = async (id: string) => {
  try {
    await notifee.cancelNotification(id);
  } catch (error) {
    console.log("Cancel error:", error);
  }
};

///////////////////////////////////////////////////////////
// ❌ CANCEL SYMPTOM NOTIFICATIONS
///////////////////////////////////////////////////////////

export const cancelSymptomNotification = async () => {
  try {
    const triggers = await notifee.getTriggerNotifications();
    for (const n of triggers) {
      if (n.notification?.data?.type === "symptom") {
        await notifee.cancelNotification(n.notification.id!);
      }
    }

    const displayed = await notifee.getDisplayedNotifications();
    for (const n of displayed) {
      if (n.notification?.data?.type === "symptom") {
        await notifee.cancelNotification(n.notification.id!);
      }
    }

    console.log("🛑 Symptom notifications cancelled");
  } catch (error) {
    console.log("❌ Error cancelling symptom notification:", error);
  }
};

///////////////////////////////////////////////////////////
// FOREGROUND HANDLER
// ✅ FIXED (Bug 2): Hydration actions now use saveWaterToStorage directly.
//    Previously used a dynamic import of addWaterFromNotification from
//    HydrationContext — which risked a race condition if the provider
//    hadn't mounted yet. saveWaterToStorage always works regardless of
//    React tree state, and HydrationContext reloads from AsyncStorage
//    on appState change when the user returns to the app.
//
// ✅ Registered here only — NOT in index.js
///////////////////////////////////////////////////////////

export function registerNotifeeForegroundHandler() {
  return notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
      const action = detail.pressAction?.id;

      console.log("⚡ Foreground Action:", action);

      if (action === ACTION_MEDICINE_SNOOZE) {
        await snoozeMedicine(detail.notification?.body || "");
        if (detail.notification?.id) {
          await notifee.cancelDisplayedNotification(detail.notification.id);
        }
        return;
      }

      if (action === ACTION_MEDICINE_TAKEN) {
        const notifId = detail.notification?.id || "";
        markMedicineTakenByNotificationId(notifId);

        const med = getMedicineByNotificationId(notifId);
        if (med && med.frequency?.toLowerCase() === "once") {
          await notifee.cancelNotification(notifId);
        } else {
          await notifee.cancelDisplayedNotification(notifId);
        }
        return;
      }

      if (
        action === ACTION_WATER_100 ||
        action === ACTION_WATER_150 ||
        action === ACTION_WATER_200 ||
        action === ACTION_WATER_SKIP
      ) {
        if (action !== ACTION_WATER_SKIP) {
          const ml =
            action === ACTION_WATER_100 ? 100
            : action === ACTION_WATER_150 ? 150
            : 200;

          // ✅ FIXED: Use saveWaterToStorage instead of dynamic Context import.
          //    HydrationContext picks up the new value from AsyncStorage the next
          //    time the user opens the app (via appState "active" handler in the provider).
          //    If the app is already open and globalAddWater is set, the Context
          //    will refresh via reloadHistory() on appState change.
          await saveWaterToStorage(ml);

          // ✅ Also update the live Context if the app is foregrounded
          //    (globalAddWater will be set if HydrationProvider is mounted)
          try {
            const { addWaterFromNotification } = await import("../context/HydrationContext");
            await addWaterFromNotification(ml);
          } catch {
            // Provider not mounted yet — AsyncStorage fallback already handled above
            console.log("💧 HydrationContext not ready — AsyncStorage updated");
          }
        }

        await scheduleHydrationReminder();

        if (detail.notification?.id) {
          await notifee.cancelDisplayedNotification(detail.notification.id);
        }
        return;
      }

      if (action === ACTION_SYMPTOM_DONE) {
        console.log("🩺 Symptom resolved");
        await cancelSymptomNotification();
        if (detail.notification?.id) {
          await notifee.cancelDisplayedNotification(detail.notification.id);
        }
        return;
      }

      // Default dismiss
      if (detail.notification?.id) {
        await notifee.cancelDisplayedNotification(detail.notification.id);
      }
    }
  });
}

///////////////////////////////////////////////////////////
// 🔧 COMPATIBILITY HELPERS
///////////////////////////////////////////////////////////

export const scheduleHydrationReminder = async () => {
  const value = await AsyncStorage.getItem("hydration_interval");
  const minutes = value ? Number(value) : 60;

  console.log("💧 Using hydration interval:", minutes);

  return scheduleHydration(minutes);
};

export const cancelHydrationReminders = async () => {
  const notifications = await notifee.getTriggerNotifications();
  for (const n of notifications) {
    if (n.notification?.data?.type === "hydration") {
      await notifee.cancelNotification(n.notification.id!);
    }
  }
};

export const snoozeHydrationReminder = async () => {
  return scheduleHydration(10);
};