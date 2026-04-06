// services/symptomScheduler.ts

import { scheduleNotification } from "./notificationService";

export const scheduleSymptomCheck = async (
  symptomId: number,
  symptomName: string
) => {
  try {
    const timestamp = Date.now() + 60 * 60 * 1000;

    await scheduleNotification(
      "🩺 Symptom Check",
      `Is your ${symptomName} still there?`,
      "symptom",
      timestamp,
      {
        symptomId,
        symptomName,
      }
    );

    console.log("🩺 Symptom check scheduled");
  } catch (error) {
    console.log("❌ Error scheduling symptom check:", error);
  }
};