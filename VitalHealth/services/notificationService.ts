// services/notificationService.ts

import notifee, {
  AndroidAction,
  AndroidImportance,
  TriggerType,
} from "@notifee/react-native";

////////////////////////////////////////////////////////////
// TYPES
////////////////////////////////////////////////////////////

type NotificationType = "medicine" | "hydration" | "symptom";

////////////////////////////////////////////////////////////
// CANCEL NOTIFICATION
////////////////////////////////////////////////////////////

export const cancelMedicineNotification = async (notificationId: string) => {
  try {
    if (!notificationId) return;

    await notifee.cancelNotification(notificationId);

    console.log("🔕 Notification cancelled:", notificationId);
  } catch (error) {
    console.log("❌ Cancel notification error:", error);
  }
};

////////////////////////////////////////////////////////////
// REQUEST PERMISSION
////////////////////////////////////////////////////////////

export const requestPermission = async () => {
  await notifee.requestPermission();
};

////////////////////////////////////////////////////////////
// CREATE CHANNEL
////////////////////////////////////////////////////////////

export const createChannel = async () => {
  return await notifee.createChannel({
    id: "health",
    name: "Health Alerts",
    importance: AndroidImportance.HIGH,
  });
};

////////////////////////////////////////////////////////////
// ACTIONS (🔥 FIXED)
////////////////////////////////////////////////////////////

const getActions = (type: NotificationType): AndroidAction[] => {
  if (type === "medicine") {
    return [
      {
        title: "✅ Taken",
        pressAction: {
          id: "MEDICINE_TAKEN",
          launchActivity: "none", // ✅ BACKGROUND
        },
      },
      {
        title: "⏰ Snooze",
        pressAction: {
          id: "MEDICINE_SNOOZE",
          launchActivity: "none",
        },
      },
    ];
  }

  if (type === "hydration") {
    return [
      {
        title: "💧 +100ml",
        pressAction: {
          id: "HYDRATION_100",
          launchActivity: "none",
        },
      },
      {
        title: "⏰ Snooze",
        pressAction: {
          id: "HYDRATION_SNOOZE",
          launchActivity: "none",
        },
      },
    ];
  }

  if (type === "symptom") {
    return [
      {
        title: "😊 Better",
        pressAction: {
          id: "SYMPTOM_NO",
          launchActivity: "none",
        },
      },
      {
        title: "🤒 Still Sick",
        pressAction: {
          id: "SYMPTOM_YES",
          launchActivity: "none",
        },
      },
    ];
  }

  return [];
};

////////////////////////////////////////////////////////////
// SHOW INSTANT NOTIFICATION
////////////////////////////////////////////////////////////

export const showHealthNotification = async (
  title: string,
  body: string,
  type: NotificationType,
  data: any = {}
) => {
  const channelId = await createChannel();

  await notifee.displayNotification({
    title,
    body,
    data: {
      type,
      ...data,
    },
    android: {
      channelId,
      pressAction: { id: "default" },
      actions: getActions(type),
    },
  });
};

////////////////////////////////////////////////////////////
// 🔥 SCHEDULE NOTIFICATION (FIXED)
////////////////////////////////////////////////////////////

export const scheduleNotification = async (
  title: string,
  body: string,
  type: NotificationType,
  timestamp: number,
  data: any = {}
) => {
  const channelId = await createChannel();

  // ✅ Ensure future time
  let triggerTime = timestamp;
  if (triggerTime <= Date.now()) {
    triggerTime += 24 * 60 * 60 * 1000;
  }

  console.log("⏰ Scheduling notification at:", new Date(triggerTime));

  await notifee.createTriggerNotification(
    {
      title,
      body,
      data: {
        type,
        ...data,
      },
      android: {
        channelId,
        pressAction: { id: "default" },
        actions: getActions(type),
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTime,
      alarmManager: true, // 🔥 CRITICAL FIX
    }
  );
};