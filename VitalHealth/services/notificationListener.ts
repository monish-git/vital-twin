import notifee, { EventType, TriggerType } from '@notifee/react-native';
import { router } from "expo-router";

import { deleteMedicineByNotificationId } from "../database/medicineDB";
import { resolveSymptom } from "../database/symptomDB";

////////////////////////////////////////////////////////////
// FOREGROUND NOTIFICATION LISTENER (NOTIFEE)
////////////////////////////////////////////////////////////

export const startNotificationListener = () => { 

  return notifee.onForegroundEvent(async ({ type, detail }) => {

    const { notification, pressAction } = detail;

    if (!notification) return;

    const action = pressAction?.id;
    const notificationId = notification.id ?? "";

    const data = notification.data as {
      type?: string;
      schedule?: string;
      symptomId?: number;
      symptomName?: string;
    };

    /////////////////////////////////////////////////////////
    // 🚫 Skip hydration (handled in background file)
    /////////////////////////////////////////////////////////

    if (data?.type === "hydration_reminder") return;

    /////////////////////////////////////////////////////////
    // 🔘 BUTTON ACTIONS (APP OPEN)
    /////////////////////////////////////////////////////////

    if (type === EventType.ACTION_PRESS) {

      // ⏰ SNOOZE (5 min)
      if (action === "SNOOZE" || action === "MEDICINE_SNOOZE") {

        const body = notification.body ?? "Take your medicine";

        await notifee.createTriggerNotification(
          {
            title: "💊 Snoozed Reminder",
            body,
            data: { type: "medicine_reminder" },
            android: {
              channelId: "health",
              actions: [
                { title: "Taken", pressAction: { id: "MEDICINE_TAKEN" } },
                { title: "Snooze", pressAction: { id: "MEDICINE_SNOOZE" } },
              ],
            },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: Date.now() + 5 * 60 * 1000,
          }
        );

        console.log("⏰ Medicine snoozed (foreground)");
        return;
      }

      // 💊 TAKEN
      if (action === "TAKEN" || action === "MEDICINE_TAKEN") {

        if (data?.schedule === "once") {
          deleteMedicineByNotificationId(notificationId);
          console.log("💊 One-time medicine deleted");
        }

        await notifee.cancelNotification(notificationId);

        return;
      }

      /////////////////////////////////////////////////////////
      // 🩺 SYMPTOM ACTIONS
      /////////////////////////////////////////////////////////

      // ❌ NO (I'm fine)
      if (action === "NO" || action === "SYMPTOM_NO") {

        if (data?.symptomId) {
          resolveSymptom(data.symptomId);
          router.push("/");
        }

        await notifee.cancelNotification(notificationId);

        return;
      }

      // ✅ YES (Still there)
      if (action === "YES" || action === "SYMPTOM_YES") {

        if (data?.symptomId) {
          router.push({
            pathname: "/symptom-followup",
            params: {
              id: data.symptomId.toString(),
              name: data.symptomName || "",
            },
          });
        }

        return;
      }
    }

    /////////////////////////////////////////////////////////
    // 📱 NORMAL NOTIFICATION TAP
    /////////////////////////////////////////////////////////

    if (type === EventType.PRESS) {

      if (data?.type === "medicine_reminder") {
        router.push("/MedicationVault");
        return;
      }

      if (data?.type === "symptom_reminder") {
        router.push("/SymptomHistory" as any);
        return;
      }

      if (data?.type === "hydration_reminder") {
        router.push("/Hydration" as any);
        return;
      }
    }

  });
};