// index.js
// ⚠️ CRITICAL: notifee.onBackgroundEvent MUST be registered BEFORE expo-router/entry

import notifee, { EventType } from '@notifee/react-native';

import {
  ACTION_MEDICINE_SNOOZE,
  ACTION_MEDICINE_TAKEN,
  ACTION_WATER_100,
  ACTION_WATER_150,
  ACTION_WATER_200,
  ACTION_WATER_SKIP,
  ACTION_SYMPTOM_DONE,
  snoozeMedicine,
  scheduleHydrationReminder,
  cancelSymptomNotification,
  cancelMedicineNotification,
} from './services/notifeeService';

import {
  markMedicineTakenByNotificationId,
  getMedicineByNotificationId,
} from './database/medicineDB';

// ✅ Correct storage utility
import { saveWaterToStorage } from './utils/hydrationStorage';

////////////////////////////////////////////////////////////
// ✅ FOREGROUND SERVICE (REQUIRED FOR ANDROID 13+)
// Keeps app alive for background notifications
////////////////////////////////////////////////////////////
notifee.registerForegroundService(() => {
  return new Promise(() => {
    console.log("🚀 Foreground service running");
    // Keep running forever
  });
});

////////////////////////////////////////////////////////////
// 🔥 BACKGROUND HANDLER — MUST BE FIRST
////////////////////////////////////////////////////////////
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const action = detail.pressAction?.id;
    const notificationId = detail.notification?.id || "";

    console.log("🔥 Background Action:", action);

    try {
      switch (action) {

        //////////////////////////////////////////////////////
        // 💊 MEDICINE TAKEN
        //////////////////////////////////////////////////////
        case ACTION_MEDICINE_TAKEN: {
          console.log("✅ Medicine taken (background)");

          markMedicineTakenByNotificationId(notificationId);

          const medicine = getMedicineByNotificationId(notificationId);
          const frequency = medicine ? medicine.frequency : null;

          if (medicine && frequency && frequency.toLowerCase() === "once") {
            await cancelMedicineNotification(notificationId);
            console.log("🔕 One-time medicine notification cancelled");
          } else {
            await notifee.cancelDisplayedNotification(notificationId);
            console.log("💊 Daily medicine — trigger kept alive for tomorrow");
          }
          break;
        }

        //////////////////////////////////////////////////////
        // 💊 MEDICINE SNOOZE
        //////////////////////////////////////////////////////
        case ACTION_MEDICINE_SNOOZE: {
          await snoozeMedicine(detail.notification?.body || "");
          await notifee.cancelDisplayedNotification(notificationId);
          break;
        }

        //////////////////////////////////////////////////////
        // 💧 HYDRATION
        //////////////////////////////////////////////////////
        case ACTION_WATER_100:
          console.log("💧 +100ml logged (background)");
          await saveWaterToStorage(100);
          await scheduleHydrationReminder();
          await notifee.cancelDisplayedNotification(notificationId);
          break;

        case ACTION_WATER_150:
          console.log("💧 +150ml logged (background)");
          await saveWaterToStorage(150);
          await scheduleHydrationReminder();
          await notifee.cancelDisplayedNotification(notificationId);
          break;

        case ACTION_WATER_200:
          console.log("💧 +200ml logged (background)");
          await saveWaterToStorage(200);
          await scheduleHydrationReminder();
          await notifee.cancelDisplayedNotification(notificationId);
          break;

        case ACTION_WATER_SKIP:
          console.log("⏭️ Hydration skipped (background)");
          await scheduleHydrationReminder();
          await notifee.cancelDisplayedNotification(notificationId);
          break;

        //////////////////////////////////////////////////////
        // 🩺 SYMPTOM
        //////////////////////////////////////////////////////
        case ACTION_SYMPTOM_DONE:
          console.log("🩺 Symptom resolved (background)");
          await cancelSymptomNotification();
          await notifee.cancelDisplayedNotification(notificationId);
          break;

        //////////////////////////////////////////////////////
        // 🔁 DEFAULT
        //////////////////////////////////////////////////////
        default:
          await notifee.cancelDisplayedNotification(notificationId);
          break;
      }

    } catch (error) {
      console.log("❌ Background handler error:", error);
    }
  }
});

////////////////////////////////////////////////////////////
// ⚠️ expo-router entry MUST come AFTER everything
////////////////////////////////////////////////////////////
import 'expo-router/entry';