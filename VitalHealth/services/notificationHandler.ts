import notifee, { EventType } from '@notifee/react-native';
import { router } from "expo-router";

////////////////////////////////////////////////////////////
// FOREGROUND NOTIFICATION HANDLER
// (Runs when app is OPEN)
////////////////////////////////////////////////////////////

export const registerNotificationListeners = () => {

  return notifee.onForegroundEvent(({ type, detail }) => {

    const { notification, pressAction } = detail;

    if (!notification) return;

    const action = pressAction?.id;
    const data = notification.data as {
      type?: string;
      symptomId?: number;
    };

    /////////////////////////////////////////////////////////
    // 🔘 BUTTON ACTIONS (WHEN APP IS OPEN)
    /////////////////////////////////////////////////////////

    if (type === EventType.ACTION_PRESS) {

      if (action === "MEDICINE_TAKEN") {
        console.log("💊 Medicine taken (foreground)");
        return;
      }

      if (action === "MEDICINE_SNOOZE") {
        console.log("⏰ Medicine snoozed (foreground)");
        return;
      }

      if (action === "HYDRATION_100") {
        console.log("💧 +100ml water (foreground)");
        return;
      }

      if (action === "HYDRATION_SNOOZE") {
        console.log("⏰ Hydration snoozed (foreground)");
        return;
      }

      if (action === "SYMPTOM_NO") {
        console.log("🩺 Symptom cleared (foreground)");
        return;
      }

      if (action === "SYMPTOM_YES") {
        console.log("🩺 Symptom still present");
        return;
      }
    }

    /////////////////////////////////////////////////////////
    // 📱 NORMAL NOTIFICATION TAP (OPEN APP)
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