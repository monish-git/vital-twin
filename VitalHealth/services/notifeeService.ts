// services/notifeeService.ts

import notifee, {
  AndroidImportance,
  EventType,
  TriggerType,
} from "@notifee/react-native";

///////////////////////////////////////////////////////////
// ACTION IDs
///////////////////////////////////////////////////////////

export const ACTION_MEDICINE_TAKEN = "MEDICINE_TAKEN";
export const ACTION_MEDICINE_SNOOZE = "MEDICINE_SNOOZE";

export const ACTION_WATER_DRINK = "HYDRATION_100";
export const ACTION_WATER_SKIP = "HYDRATION_SNOOZE";

export const ACTION_SYMPTOM_DONE = "SYMPTOM_DONE";

///////////////////////////////////////////////////////////
// SETUP
///////////////////////////////////////////////////////////

export async function setupNotifee() {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: "health",
    name: "Health Notifications",
    importance: AndroidImportance.HIGH,
  });
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
  const timestamp = date.getTime();

  console.log("⏰ One-time medicine at:", date);

  await notifee.createTriggerNotification(
    {
      id,
      title: "💊 Medicine Reminder",
      body: title,
      data: {
        type: "medicine",
        medicineId: String(medicineId || ""),
      },
      android: {
        channelId: "health",
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
      timestamp,
      alarmManager: true, // 🔥 CRITICAL
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

  trigger.setHours(hour);
  trigger.setMinutes(minute);
  trigger.setSeconds(0);

  if (trigger.getTime() <= now.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  console.log("⏰ Daily medicine at:", trigger);

  await notifee.createTriggerNotification(
    {
      id,
      title: "💊 Medicine Reminder",
      body: title,
      data: {
        type: "medicine",
        medicineId: String(medicineId || ""),
      },
      android: {
        channelId: "health",
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
      repeatFrequency: 1, // daily
      alarmManager: true,
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// 💧 HYDRATION
///////////////////////////////////////////////////////////

export const scheduleHydration = async (
  minutes: number = 60
): Promise<string> => {
  const id = `hydration_${Date.now()}`;
  const timestamp = Date.now() + minutes * 60 * 1000;

  await notifee.createTriggerNotification(
    {
      id,
      title: "💧 Drink Water",
      body: "Stay hydrated!",
      data: { type: "hydration" },
      android: {
        channelId: "health",
        pressAction: { id: "default" },
        actions: [
          {
            title: "💧 +100ml",
            pressAction: {
              id: ACTION_WATER_DRINK,
              launchActivity: "none",
            },
          },
          {
            title: "Skip",
            pressAction: {
              id: ACTION_WATER_SKIP,
              launchActivity: "none",
            },
          },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: true,
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// 🩺 SYMPTOM
///////////////////////////////////////////////////////////

export const showSymptomNotification = async (symptom: string) => {
  await notifee.displayNotification({
    title: "🩺 Symptom Check",
    body: `Are you experiencing ${symptom}?`,
    data: { type: "symptom", symptom },
    android: {
      channelId: "health",
      pressAction: { id: "default" },
      actions: [
        {
          title: "Done",
          pressAction: {
            id: ACTION_SYMPTOM_DONE,
            launchActivity: "none",
          },
        },
      ],
    },
  });
};

///////////////////////////////////////////////////////////
// 🔁 SNOOZE
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
        channelId: "health",
        pressAction: { id: "default" },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: true,
    }
  );

  return id;
};

///////////////////////////////////////////////////////////
// ❌ CANCEL
///////////////////////////////////////////////////////////

export const cancelMedicineNotification = async (id: string) => {
  try {
    await notifee.cancelNotification(id);
  } catch (e) {
    console.log("Cancel error:", e);
  }
};

///////////////////////////////////////////////////////////
// FOREGROUND HANDLER
///////////////////////////////////////////////////////////

export function registerNotifeeForegroundHandler() {
  return notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
      console.log("Foreground Action:", detail.pressAction?.id);

      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    }
  });
}

///////////////////////////////////////////////////////////
// BACKGROUND HANDLER (🔥 CRITICAL)
///////////////////////////////////////////////////////////

export function registerNotifeeBackgroundHandler() {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
      console.log("Background Action:", detail.pressAction?.id);

      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    }
  });
}

///////////////////////////////////////////////////////////
// 🔧 COMPATIBILITY HELPERS (FIX ERRORS)
///////////////////////////////////////////////////////////

// Hydration wrappers
export const scheduleHydrationReminder = async () => {
  return scheduleHydration(60); // default 1 hour
};

export const cancelHydrationReminders = async () => {
  const notifications = await notifee.getTriggerNotifications();
  for (const n of notifications) {
    if (n.notification.data?.type === "hydration") {
      await notifee.cancelNotification(n.notification.id!);
    }
  }
};

export const snoozeHydrationReminder = async () => {
  return scheduleHydration(10);
};

// Symptom wrappers
export const scheduleSymptomCheck = async (
  symptom: string
): Promise<string> => {
  await showSymptomNotification(symptom);

  // ✅ Return fake ID for compatibility
  return `symptom_${Date.now()}`;
};

export const cancelSymptomNotification = async () => {
  const notifications = await notifee.getDisplayedNotifications();
  for (const n of notifications) {
    if (n.notification?.data?.type === "symptom") {
      await notifee.cancelNotification(n.notification.id!);
    }
  }
};